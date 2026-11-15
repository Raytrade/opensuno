from __future__ import annotations

import asyncio
import json
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


def _decode_result(value):
    """ACE-Step returns result as a JSON-encoded string inside its data wrapper."""
    if isinstance(value, str):
        try:
            return json.loads(value)
        except (TypeError, ValueError):
            return []
    return value


def _audio_reference(task):
    result = _decode_result(task.get("result", []))
    if isinstance(result, dict):
        result = [result]
    if not isinstance(result, list):
        return None
    for item in result:
        if isinstance(item, dict):
            file_ref = item.get("file")
            if isinstance(file_ref, str) and file_ref.startswith("/v1/audio?path="):
                return file_ref
    return None


async def process(job: MusicJob):
    if not ENGINE_URL:
        raise RuntimeError("ACESTEP_BASE_URL is not configured")

    async with httpx.AsyncClient(base_url=ENGINE_URL, headers=_headers(), timeout=120) as client:
        if not job.engine_job_id:
            response = await client.post("/release_task", json={
                "prompt": job.caption,
                "lyrics": job.lyrics,
                "model": job.model or ENGINE_MODEL,
                "thinking": True,
                "audio_duration": job.duration,
            })
            response.raise_for_status()
            data = _unwrap(response.json())
            engine_id = data.get("task_id") or data.get("job_id")
            if not engine_id:
                raise RuntimeError("ACE-Step did not return a task_id")
            with SessionLocal() as db:
                current = db.get(MusicJob, job.id)
                if current:
                    current.engine_job_id = str(engine_id)
                    db.commit()
        else:
            engine_id = job.engine_job_id

        for _ in range(720):  # one hour at five-second intervals
            response = await client.post("/query_result", json={"task_id_list": [engine_id]})
            response.raise_for_status()
            data = _unwrap(response.json())
            if isinstance(data, list):
                task = data[0] if data else {}
            else:
                task = data if isinstance(data, dict) else {}
            state = str(task.get("status", "0")).lower()

            if state in ("1", "succeeded", "success"):
                audio_ref = _audio_reference(task)
                if not audio_ref:
                    raise RuntimeError("ACE-Step completed but returned no /v1/audio file reference")
                with SessionLocal() as db:
                    current = db.get(MusicJob, job.id)
                    if current:
                        current.status = "succeeded"
                        current.audio_path = audio_ref
                        current.updated_at = datetime.now(timezone.utc)
                        db.commit()
                return

            if state in ("2", "failed", "error"):
                raise RuntimeError(str(task.get("error") or "ACE-Step music generation failed"))

            await asyncio.sleep(POLL_SECONDS)

        raise TimeoutError("ACE-Step generation timed out after one hour")


async def run():
    while True:
        with SessionLocal() as db:
            job = db.scalar(
                select(MusicJob)
                .where(MusicJob.status == "queued")
                .order_by(MusicJob.created_at)
                .with_for_update(skip_locked=True)
                .limit(1)
            )
            if job:
                job.status = "running"
                job.updated_at = datetime.now(timezone.utc)
                db.commit()
                db.refresh(job)
                job_id = job.id
                snapshot = MusicJob(
                    id=job.id, user_id=job.user_id, status=job.status,
                    caption=job.caption, lyrics=job.lyrics, model=job.model,
                    duration=job.duration, engine_job_id=job.engine_job_id
                )
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
                if current and current.status != "failed":
                    current.status = "failed"
                    current.error = str(exc)[:1000]
                    current.updated_at = datetime.now(timezone.utc)
                    # A job is refunded only in the transition to failed.
                    from .main import User
                    owner = db.get(User, current.user_id)
                    if owner:
                        owner.credits += 1
                    db.commit()


if __name__ == "__main__":
    asyncio.run(run())
