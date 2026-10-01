from typing import Annotated, Optional

from pydantic import BaseModel, BeforeValidator, EmailStr, Field, field_validator

from schemas.common import Name80, UTCDateTime


def _clean_email(v):
    if isinstance(v, str):
        v = v.strip()
        if len(v) > 254:
            raise ValueError("Email must be at most 254 characters")
    return v


def _check_password(v: str) -> str:
    if not v.strip():
        raise ValueError("Password can't be only spaces")
    size = len(v.encode("utf-8"))
    if size < 8:
        raise ValueError("Password must be at least 8 characters")
    if size > 72:
        raise ValueError("Password is too long (maximum 72 bytes)")
    return v


Email = Annotated[EmailStr, BeforeValidator(_clean_email)]


class RegisterIn(BaseModel):
    email: Email
    password: str
    full_name: Optional[Name80] = None
    business_name: Optional[Name80] = None

    @field_validator("email")
    @classmethod
    def _lower(cls, v: str) -> str:
        return v.lower()

    @field_validator("password")
    @classmethod
    def _password(cls, v: str) -> str:
        return _check_password(v)


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(..., max_length=200)


class UserBrief(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None


class UserOut(UserBrief):
    created_at: UTCDateTime
    timezone: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: str
    user: UserBrief


class RegisterOut(BaseModel):
    user: UserOut
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: str
    # Kept so older clients that read {"message"} keep working.
    message: str = "User created successfully"


class MeUpdate(BaseModel):
    full_name: Optional[Name80] = None


class LogoutIn(BaseModel):
    refresh_token: Optional[str] = None


class RefreshIn(BaseModel):
    refresh_token: str = Field(..., min_length=1, max_length=200)


class ChangePasswordIn(BaseModel):
    current_password: str = Field(..., max_length=200)
    new_password: str

    @field_validator("new_password")
    @classmethod
    def _password(cls, v: str) -> str:
        return _check_password(v)


class ForgotPasswordIn(BaseModel):
    email: Email


class ResetPasswordIn(BaseModel):
    token: str = Field(..., min_length=1, max_length=200)
    new_password: str

    @field_validator("new_password")
    @classmethod
    def _password(cls, v: str) -> str:
        return _check_password(v)
