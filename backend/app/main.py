from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Generator
from urllib.parse import quote

import httpx
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./opensuno.db")
JWT_SECRET = os.getenv("JWT_SECRET", "")
if len(JWT_SECRET) < 32:
    # Safe local development default only. Production must provide a secret.
    if os.getenv("APP_ENV") == "production":
        raise RuntimeError("JWT_SECRET must contain at least 32 characters in production")
    JWT_SECRET = "local-development-only-change-this-secret-32"
TOKEN_MINUTES = int(os.getenv("ACCESS_TOKEN_MINUTES", "10080"))
STARTER_CREDITS = int(os.getenv("STARTER_CREDITS", "20"))
ENGINE_URL = os.getenv("ACESTEP_BASE_URL", "").rstrip("/")
ENGINE_KEY = os.getenv("ACESTEP_API_KEY", "")
ENGINE_MODEL = os.getenv("ACESTEP_MODEL", "acestep-v15-turbo")
POLL_SECONDS = float(os.getenv("ACESTEP_POLL_SECONDS", "5"))

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(256))
    credits: Mapped[int] = mapped_column(Integer, default=STARTER_CREDITS)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class MusicJob(Base):
    __tablename__ = "music_jobs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String(20), default="queued", index=True)
    caption: Mapped[str] = mapped_column(Text)
    lyrics: Mapped[str] = mapped_column(Text, default="")
    model: Mapped[str] = mapped_column(String(80))
    duration: Mapped[int] = mapped_column(Integer, default=120)
    engine_job_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    audio_path: Mapped[str | None] = mapped_column(Text, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


Base.metadata.create_all(engine)


def db_session() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _password_hash(password: str, salt: bytes | None = None) -> str:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 310_000)
    return f"{_b64(salt)}.{_b64(digest)}"


def _verify_password(password: str, stored: str) -> bool:
    try:
        salt_s, digest_s = stored.split(".", 1)
        salt = base64.urlsafe_b64decode(salt_s + "=" * (-len(salt_s) % 4))
        expected = base64.urlsafe_b64decode(digest_s + "=" * (-len(digest_s) % 4))
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 310_000)
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def _token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    header = _b64(b'{"alg":"HS256","typ":"JWT"}')
    payload = _b64(json.dumps({"sub": str(user_id), "iat": int(now.timestamp()), "exp": int((now + timedelta(minutes=TOKEN_MINUTES)).timestamp())}).encode())
    signing = f"{header}.{payload}".encode()
    signature = _b64(hmac.new(JWT_SECRET.encode(), signing, hashlib.sha256).digest())
    return f"{header}.{payload}.{signature}"


def _decode_token(token: str) -> int:
    try:
        header, payload, signature = token.split(".")
        signing = f"{header}.{payload}".encode()
        expected = _b64(hmac.new(JWT_SECRET.encode(), signing, hashlib.sha256).digest())
        if not hmac.compare_digest(signature, expected):
            raise ValueError("signature")
        data = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
        if int(data["exp"]) < int(datetime.now(timezone.utc).timestamp()):
            raise ValueError("expired")
        return int(data["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired access token")


class RegisterInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)


class LoginInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class GenerateInput(BaseModel):
    caption: str = Field(min_length=5, max_length=2000)
    lyrics: str = Field(default="", max_length=5000)
    model: str = Field(default=ENGINE_MODEL, max_length=80)
    duration: int = Field(default=120, ge=15, le=600)
    thinking: bool = True


def current_user(authorization: str | None = None, db: Session = Depends(db_session)) -> User:
    # Header is parsed by the explicit dependency below.
    raise RuntimeError("Use authenticated_user dependency")


from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
bearer = HTTPBearer(auto_error=False)


def authenticated_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(db_session)) -> User:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Bearer access token required")
    user_id = _decode_token(credentials.credentials)
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="Account no longer exists")
    return user


app = FastAPI(title="OpenSuno Native Music Backend", version="0.1.0", description="Independent account, job, credit and inference orchestration API.")
origins = [x.strip() for x in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",") if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["GET", "POST"], allow_headers=["Authorization", "Content-Type"])


@app.get("/health")
def health():
    try:
        with engine.connect() as conn:
            conn.exec_driver_sql("SELECT 1")
        return {"status": "ok", "database": "connected", "inference_configured": bool(ENGINE_URL), "engine": "ACE-Step"}
    except Exception:
        raise HTTPException(status_code=503, detail="Database unavailable")


@app.post("/v1/auth/register", status_code=201)
def register(body: RegisterInput, db: Session = Depends(db_session)):
    email = str(body.email).lower().strip()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(email=email, password_hash=_password_hash(body.password), credits=STARTER_CREDITS)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"access_token": _token(user.id), "token_type": "bearer", "user": {"id": user.id, "email": user.email, "credits": user.credits}}


@app.post("/v1/auth/login")
def login(body: LoginInput, db: Session = Depends(db_session)):
    user = db.scalar(select(User).where(User.email == str(body.email).lower().strip()))
    if not user or not _verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return {"access_token": _token(user.id), "token_type": "bearer", "user": {"id": user.id, "email": user.email, "credits": user.credits}}


@app.get("/v1/me")
def me(user: User = Depends(authenticated_user)):
    return {"id": user.id, "email": user.email, "credits": user.credits}


@app.post("/v1/music/generate", status_code=202)
def generate(body: GenerateInput, user: User = Depends(authenticated_user), db: Session = Depends(db_session)):
    if not ENGINE_URL:
        raise HTTPException(status_code=503, detail="Music inference engine is not configured. Set ACESTEP_BASE_URL to your own ACE-Step server.")
    if user.credits < 1:
        raise HTTPException(status_code=402, detail="No credits remaining")
    if body.model not in {"acestep-v15-turbo", "acestep-v15-base", "acestep-v15-sft"}:
        raise HTTPException(status_code=422, detail="Unsupported native model. Choose an installed ACE-Step model.")
    job = MusicJob(id=str(secrets.token_urlsafe(24)), user_id=user.id, caption=body.caption, lyrics=body.lyrics, model=body.model, duration=body.duration, status="queued")
    user.credits -= 1
    db.add(job)
    db.commit()
    return {"job_id": job.id, "status": job.status, "credits_remaining": user.credits}


@app.get("/v1/music/jobs/{job_id}")
def get_job(job_id: str, user: User = Depends(authenticated_user), db: Session = Depends(db_session)):
    job = db.get(MusicJob, job_id)
    if not job or job.user_id != user.id:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"job_id": job.id, "status": job.status, "model": job.model, "error": job.error, "audio_ready": bool(job.audio_path), "created_at": job.created_at}


@app.get("/v1/music/jobs/{job_id}/audio")
async def get_audio(job_id: str, user: User = Depends(authenticated_user), db: Session = Depends(db_session)):
    job = db.get(MusicJob, job_id)
    if not job or job.user_id != user.id:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "succeeded" or not job.audio_path:
        raise HTTPException(status_code=409, detail="Audio is not ready")
    if not ENGINE_URL or not job.audio_path.startswith("/"):
        raise HTTPException(status_code=502, detail="Audio reference is invalid")
    headers = {"Authorization": f"Bearer {ENGINE_KEY}"} if ENGINE_KEY else {}
    url = f"{ENGINE_URL}/v1/audio?path={quote(job.audio_path, safe='')}"
    client = httpx.AsyncClient(timeout=120)
    try:
        response = await client.send(client.build_request("GET", url, headers=headers), stream=True)
        if response.status_code != 200:
            await response.aclose()
            await client.aclose()
            raise HTTPException(status_code=502, detail="Audio engine could not return the file")
        async def stream():
            try:
                async for chunk in response.aiter_bytes():
                    yield chunk
            finally:
                await response.aclose()
                await client.aclose()
        return StreamingResponse(stream(), media_type=response.headers.get("content-type", "audio/mpeg"), headers={"Content-Disposition": f'attachment; filename="{job.id}.mp3"'})
    except HTTPException:
        raise
    except Exception:
        await client.aclose()
        raise HTTPException(status_code=502, detail="Audio engine connection failed")


@app.get("/v1/credits")
def credits(user: User = Depends(authenticated_user)):
    return {"credits": user.credits}


@app.get("/v1/admin/engine")
def engine_status(user: User = Depends(authenticated_user)):
    # Private configuration is deliberately never returned.
    return {"configured": bool(ENGINE_URL), "provider": "ACE-Step", "default_model": ENGINE_MODEL}
