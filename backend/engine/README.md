# GPU inference server — ACE-Step 1.5

This folder documents the separate GPU service. It is deliberately not bundled into the API container: the model needs NVIDIA GPU compute and model storage.

## Hardware choice

Use a Linux x86_64 host with NVIDIA CUDA support. ACE-Step's current guide recommends:
- 8–12 GB VRAM for the 2B model with the 0.6B language model.
- 12–16 GB VRAM for the 2B model with the 1.7B language model.
- 20–24 GB or more for the larger XL model without CPU offload.

For the first real integration test, start with a single NVIDIA GPU with at least 12 GB VRAM and the default turbo model. Actual speed depends on the GPU, CPU, RAM, and selected model. Check the upstream compatibility guide before renting a machine.

## Build the official engine

On the rented GPU host:

```bash
git clone https://github.com/ACE-Step/ACE-Step-1.5.git
cd ACE-Step-1.5
docker build -t acestep:1.5 .
```

Create a persistent model directory, then start the REST API. Replace the placeholder with a long random secret:

```bash
mkdir -p checkpoints
docker run --gpus all -d --name acestep-api \
  --restart unless-stopped \
  -p 8001:8001 \
  -v "$PWD/checkpoints:/app/checkpoints" \
  -e ACESTEP_MODE=api \
  -e ACESTEP_API_HOST=0.0.0.0 \
  -e ACESTEP_API_PORT=8001 \
  -e ACESTEP_INIT_SERVICE=true \
  -e ACESTEP_CONFIG_PATH=acestep-v15-turbo \
  -e ACESTEP_API_KEY='REPLACE_WITH_LONG_RANDOM_SECRET' \
  acestep:1.5
```

The first startup downloads model files and can take time. Keep the checkpoint directory on persistent disk so a stopped/restarted GPU instance does not download all weights again.

## Secure networking

Do not leave port 8001 open to the public internet without protection. Prefer a private network or provider tunnel between the API host and GPU host. If the provider only offers public ingress, restrict inbound traffic to the API host where possible and keep the ACE-Step API key secret. Use HTTPS for public network traffic.

## Connect OpenSuno

Set these secrets in the backend deployment environment (not in Git):

- `ACESTEP_BASE_URL=https://YOUR_PRIVATE_OR_SECURED_GPU_HOST` — base URL, without a trailing slash or `/release_task`.
- `ACESTEP_API_KEY=the-same-random-secret-used-by-the-engine`
- `ACESTEP_MODEL=acestep-v15-turbo`

Then restart the API and worker. Sign in to OpenSuno and call the authenticated `GET /v1/engine/health` endpoint. It should return `configured: true`, `reachable: true`, and a model list. Only then submit a test generation and verify that the resulting audio can be played through `GET /v1/music/jobs/{job_id}/audio`.

## Upstream references

- ACE-Step 1.5 install guide: https://github.com/ACE-Step/ACE-Step-1.5/blob/main/docs/en/INSTALL.md
- GPU compatibility: https://github.com/ACE-Step/ACE-Step-1.5/blob/main/docs/en/GPU_COMPATIBILITY.md
- REST API: https://github.com/ACE-Step/ACE-Step-1.5/blob/main/docs/en/API.md

The GPU host is a separate paid resource. Do not create or leave a rented GPU running until the owner has selected a provider and approved its hourly budget.
