import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
import bcrypt
from core.config import settings

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # bcrypt requires bytes, so we encode the strings
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except ValueError:
        return False

def get_password_hash(password: str) -> str:
    # Generate salt and hash (cost 12, §21.6)
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt(rounds=12)
    hashed_password = bcrypt.hashpw(pwd_bytes, salt)
    return hashed_password.decode('utf-8') # return as string to save in DB

def create_access_token(email: str, user_public_id: str, expires_delta: Optional[timedelta] = None) -> tuple[str, str, datetime]:
    """Returns (token, jti, expires_at). Payload keeps `sub` and `exp` (§4)."""
    now = datetime.now(timezone.utc)
    expire = now + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    jti = uuid.uuid4().hex
    payload = {"sub": email, "uid": user_public_id, "iat": now, "exp": expire, "jti": jti}
    encoded_jwt = jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt, jti, expire.replace(tzinfo=None)

def verify_token(token: str, verify_exp: bool = True) -> Optional[dict]:
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm],
            options={"verify_exp": verify_exp},
        )
        return payload
    except jwt.PyJWTError:
        return None

def new_opaque_token(prefix: str) -> str:
    return f"{prefix}{secrets.token_urlsafe(32)}"

def hash_token(token: str) -> str:
    """SHA-256 for refresh / reset tokens — stored hashed, never plaintext."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
