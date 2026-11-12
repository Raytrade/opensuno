import os
os.environ.setdefault("DATABASE_URL", "sqlite:///./test-opensuno.db")
os.environ.setdefault("JWT_SECRET", "test-secret-that-is-long-enough-for-hmac-256")

from app.main import _decode_token, _password_hash, _token, _verify_password


def test_password_hash_round_trip():
    encoded = _password_hash("correct horse battery staple")
    assert _verify_password("correct horse battery staple", encoded)
    assert not _verify_password("wrong password", encoded)


def test_token_round_trip():
    token = _token(42)
    assert _decode_token(token) == 42
