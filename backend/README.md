# OpenSuno Native Backend

This is an independent account and music-generation backend for the OpenSuno project. It does **not** call Suno's private API, require a Suno login, or use a user's Suno cookies. It uses the open ACE-Step inference server as the first replaceable generation engine.

## Architecture

- FastAPI: registration, login, JWT sessions, credits, job API and private audio proxy.
- PostgreSQL: durable users, credit balances and generation jobs.
- Worker: claims queued jobs, submits them to ACE-Step, polls completion and refunds credits on failures.
- ACE-Step: self-hosted open-weight music inference service. Run it on a GPU host; the web/API service can run separately.

## Start the account/job backend

```bash
cd backend
cp .env.example .env
# Change POSTGRES_PASSWORD and JWT_SECRET in .env before exposing this service.
docker compose up --build
```

API docs: http://localhost:8080/docs  
Health: http://localhost:8080/health

Set `ACESTEP_BASE_URL` to the URL of your separately running ACE-Step API (normally port 8001). Set `ACESTEP_API_KEY` if that server has API-key authentication enabled. The worker supports the current `/v1/music/generate` + `/v1/jobs/{job_id}` interface and the older `/release_task` / `/query_result` task interface where available.

## API

- `POST /v1/auth/register` — { email, password } (password minimum 10 characters)
- `POST /v1/auth/login` — { email, password }
- `GET /v1/me` — current account and credits
- `GET /v1/credits` — current balance
- `POST /v1/music/generate` — { caption, lyrics?, model?, duration?, thinking? }; reserves one credit
- `GET /v1/music/jobs/{job_id}` — status, only visible to the owner
- `GET /v1/music/jobs/{job_id}/audio` — authenticated audio proxy after completion
- `GET /health` — database and inference configuration health

All protected endpoints require `Authorization: Bearer <access_token>`.

## Important production boundary

This repository contains the application backend and orchestration source. It does not magically include trained music model weights or GPU compute. A real generation requires deploying ACE-Step (or another licensed inference engine) on suitable hardware and setting `ACESTEP_BASE_URL`. ACE-Step documents its own asynchronous task API and GPU/model setup in its upstream project. The default model name is configurable; only model IDs installed on your inference host will work.

Before public launch, also configure HTTPS, a strong unique JWT secret, database backups, email verification/password recovery, abuse controls, monitoring, and a payment provider. The starter credits are development defaults, not a billing implementation.
