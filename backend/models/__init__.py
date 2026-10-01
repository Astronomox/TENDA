# Import every model so Base.metadata knows all tables before create_all.
from models.user import User  # noqa: F401
from models.transaction import Transaction  # noqa: F401  (legacy table, kept as backup)
from models.business import BusinessProfile, Product, Customer, Sale, FollowUpAction, IdempotencyKey  # noqa: F401
from models.activity import (  # noqa: F401
    AIConversation, AIMessage, VoiceSession, VoiceTurn, Notification,
    MessageTemplate, RevokedToken, RefreshToken, PasswordResetToken,
)
