from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text, Float, Index, UniqueConstraint, CheckConstraint

from core.database import Base
from models.common import new_id, utcnow


class AIConversation(Base):
    __tablename__ = "ai_conversations"
    __table_args__ = (Index("ix_ai_conversations_user_updated", "user_id", "updated_at"),)

    id = Column(String(36), primary_key=True, default=new_id)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow)


class AIMessage(Base):
    __tablename__ = "ai_messages"
    __table_args__ = (CheckConstraint("role IN ('user','assistant')", name="ck_ai_message_role"),)

    id = Column(String(36), primary_key=True, default=new_id)
    conversation_id = Column(String(36), ForeignKey("ai_conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    error = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=utcnow)


class VoiceSession(Base):
    __tablename__ = "voice_sessions"
    __table_args__ = (Index("ix_voice_sessions_user_created", "user_id", "created_at"),)

    id = Column(String(36), primary_key=True, default=new_id)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    duration_sec = Column(Float, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow)


class VoiceTurn(Base):
    __tablename__ = "voice_turns"

    id = Column(String(36), primary_key=True, default=new_id)
    session_id = Column(String(36), ForeignKey("voice_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String, nullable=False)  # user | assistant
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=utcnow)


class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        UniqueConstraint("user_id", "dedupe_key", name="uq_notifications_user_dedupe"),
        Index("ix_notifications_user_created", "user_id", "created_at"),
    )

    id = Column(String(36), primary_key=True, default=new_id)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=True)
    link = Column(String, nullable=True)
    dedupe_key = Column(String, nullable=False)
    created_at = Column(DateTime, nullable=False, default=utcnow)
    read_at = Column(DateTime, nullable=True)
    dismissed_at = Column(DateTime, nullable=True)


class MessageTemplate(Base):
    __tablename__ = "message_templates"

    id = Column(String(36), primary_key=True, default=new_id)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    body = Column(Text, nullable=False)
    is_default = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)


class RevokedToken(Base):
    __tablename__ = "revoked_tokens"

    jti = Column(String(64), primary_key=True)
    expires_at = Column(DateTime, nullable=False, index=True)


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(String(36), primary_key=True, default=new_id)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(64), nullable=False, unique=True)  # SHA-256, never plaintext
    family_id = Column(String(36), nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime, nullable=True)
    replaced_by = Column(String(36), nullable=True)
    created_at = Column(DateTime, nullable=False, default=utcnow)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id = Column(String(36), primary_key=True, default=new_id)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(64), nullable=False, unique=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=utcnow)
