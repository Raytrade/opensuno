from __future__ import annotations

import asyncio
import os
from datetime import datetime, timezone

import httpx
from sqlalchemy import select

from .main import ENGINE_KEY, ENGINE_MODEL, ENGINE_URL, MusicJob, SessionLocal

POLL_SECONDS = float(os.getenv("ACESTEP_POLL_SECONDS", "5"))
IDLE_SECONDS = 2


def _headers():
    return {"Authorization": f"Bearer {ENGINE_KEY}"} if ENGINE_KEY else {}


def _unwrap(payload):
    return payload.get("data", payload) if isinstance(payload, dict) else payload


def _find_audio_path(value):
    if isinstance(value, dict):
        for key in ("audio_path", "file_path", "path"):
            candidate = value.get(key)
            if isinstance(candidate, str) and candidate.startswith("/"):
                return candidate
        for child in value.values():
            found = _find_audio_path(child)
            if found:
                return found
    elif isinstance(value, list):
        for child in value:
            found = _find_audio_path(child)
            if found:
                return found
    return None


async def process(job: MusicJob):
    if not ENGINE_URL:
        raise RuntimeError("ACESTEP_BASE_URL is not configured")
    async with httpx.AsyncClient(base_url=ENGINE_URL, headers=_headers(), timeout=120) as client:
        if not job.engine_job_id:
            response = await client.post("/v1/music/generate", json={
                "caption": job.caption,
                "lyrics": job.lyrics,
                "model": job.model or ENGINE_MODEL,
                "thinking": True,
                "audio_duration": job.duration,
            })
            response.raise_for_status()
            data = _unwrap(response.json())
            engine_id = data.get("job_id") or data.get("task_id")
            if not engine_id:
                raise RuntimeError("Inference engine did not return a job_id")
            with SessionLocal() as db:
                current = db.get(MusicJob, job.id)
                if current:
                    current.engine_job_id = str(engine_id)
                    db.commit()
        else:
            engine_id = job.engine_job_id

        for _ in range(720):  # up to one hour at five-second intervals
            response = await client.get(f"/v1/jobs/{engine_id}")
            if response.status_code == 404:
                # Older compatible ACE-Step API: batch query_result endpoint.
                response = await client.post("/query_result", json={"task_id_list": [engine_id]})
            response.raise_for_status()
            data = _unwrap(response.json())
            if isinstance(data, list):
                data = data[0] if data else {}
            state = str(data.get("status", "")).lower()
            if state in ("succeeded", "success", "1"):
                audio_path = _find_audio_path(data.get("result", data))
                if not audio_path:
                    raise RuntimeError("Generation completed but the engine returned no audio path")
                with SessionLocal() as db:
                    current = db.get(MusicJob, job.id)
                    if current:
                        current.status = "succeeded"
                        current.audio_path = audio_path
                        current.updated_at = datetime.now(timezone.utc)
                        db.commit()
                return
            if state in ("failed", "error", "2"):
                raise RuntimeError(str(data.get("error") or "Music generation failed"))
            await asyncio.sleep(POLL_SECONDS)
        raise TimeoutError("Music generation timed out after one hour")


async def run():
    while True:
        with SessionLocal() as db:
            job = db.scalar(select(MusicJob).where(MusicJob.status == "queued").order_by(MusicJob.created_at).limit(1))
            if job:
                job.status = "running"
                job.updated_at = datetime.now(timezone.utc)
                db.commit()
                db.refresh(job)
                job_id = job.id
                snapshot = MusicJob(id=job.id, user_id=job.user_id, status=job.status, caption=job.caption, lyrics=job.lyrics, model=job.model, duration=job.duration, engine_job_id=job.engine_job_id)
            else:
                job_id = None
                snapshot = None
        if not snapshot:
            await asyncio.sleep(IDLE_SECONDS)
            continue
        try:
            await process(snapshot)
        except Exception as exc:
            with SessionLocal() as db:
                current = db.get(MusicJob, job_id)
                if current:
                    current.status = "failed"
                    current.error = str(exc)[:1000]
                    current.updated_at = datetime.now(timezone.utc)
                    # Refund one credit when generation fails.
                    from .main import User
                    owner = db.get(User, current.user_id)
                    if owner:
                        owner.credits += 1
                    db.commit()


if __name__ == "__main__":
    asyncio.run(run())
