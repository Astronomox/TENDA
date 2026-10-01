from sqlalchemy import Column, Integer, String, DateTime, Boolean
from core.database import Base
from models.common import new_id, utcnow

class User(Base):
    __tablename__ = "users"

    # The integer primary key is internal (foreign keys use it). `public_id`
    # is the opaque UUID string exposed in JSON (§2.4).
    id = Column(Integer, primary_key=True, index=True)
    public_id = Column(String(36), unique=True, index=True, nullable=False, default=new_id)
    # Always stored trimmed + lowercased (the citext replacement); unique index.
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    timezone = Column(String, nullable=False, default="Africa/Lagos")
    # Set by the email-lowercasing migration when two accounts collided (§4.2).
    needs_review = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=utcnow)
