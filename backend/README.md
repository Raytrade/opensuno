# OpenSuno Native Backend

An independent music-generation application backend for OpenSuno. It does not call Suno's private API, use Suno cookies, or require a Suno account.

## Current architecture

- FastAPI: registration, login, JWT sessions, credits, generation jobs and audio proxy.
- PostgreSQL: accounts, credit balances and job state.
- Worker: claims queued jobs and talks to the official ACE-Step 1.5 asynchronous task API.
- ACE-Step 1.5: separate self-hosted model inference service. It needs a suitable GPU host; the Android phone is for controlling the studio, not running the full model.

## Start the application backend

1. Copy `.env.example` to `.env`.
2. Set the same strong database password in both `POSTGRES_PASSWORD` and the password portion of `DATABASE_URL`.
3. Set a unique `JWT_SECRET` with at least 32 characters.
4. Set `ACESTEP_BASE_URL` to the network address of your ACE-Step 1.5 server. The default `host.docker.internal` is only suitable when the inference server is reachable from Docker on that host.
5. Start the API and worker:

```bash
docker compose up --build
```

API docs: http://localhost:8080/docs  
Health: http://localhost:8080/health

## ACE-Step integration contract

The worker follows ACE-Step 1.5's documented native task API:

1. `POST /release_task` with `prompt`, `lyrics`, `model`, `thinking` and `audio_duration`.
2. Poll `POST /query_result` with `{"task_id_list":["..."]}`.
3. Treat status `0` as queued/running, `1` as succeeded and `2` as failed.
4. Parse the JSON-encoded `result` field and retain the returned `/v1/audio?path=...` reference.
5. Proxy that exact ACE-Step audio route to the authenticated owner.

The official API reference is linked in the project documentation and upstream ACE-Step 1.5 repository. Model identifiers must match models actually installed on the inference host.

## API

- `POST /v1/auth/register` — { email, password }
- `POST /v1/auth/login` — { email, password }
- `GET /v1/me` — current account and credits
- `GET /v1/credits` — current balance
- `POST /v1/music/generate` — { caption, lyrics?, model?, duration?, thinking? }
- `GET /v1/music/jobs/{job_id}` — owner-only job status
- `GET /v1/music/jobs/{job_id}/audio` — owner-only audio proxy after completion
- `GET /health` — database and inference configuration health

Protected endpoints require `Authorization: Bearer <access_token>`.

## Validation status and production boundary

The worker has been aligned to the documented ACE-Step 1.5 task endpoints and audio-reference format. Unit tests have been added for parsing the result payload, but **tests have not yet been executed** and no live GPU inference server has been connected. This is source-code progress, not proof of end-to-end generation.

Before a public launch, we still need automated test execution, integration testing against a running ACE-Step server, migrations, safer worker recovery and credit accounting, request throttling, email verification/password recovery, monitoring, backups, HTTPS, content/abuse controls and a real billing ledger. Starter credits are development defaults, not a payment system.

ACE-Step is an independent open model engine; its weights and compute are not included in this repository. Review the upstream code and model-weight licences before commercial deployment.
