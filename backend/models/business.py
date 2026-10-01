from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, CheckConstraint, Boolean, Text, Index, UniqueConstraint, text

from core.database import Base
from models.common import Money, new_id, utcnow


class BusinessProfile(Base):
    __tablename__ = "business_profiles"
    __table_args__ = (
        CheckConstraint("custom_rhythm_days IS NULL OR custom_rhythm_days BETWEEN 1 AND 365", name="ck_profile_rhythm_days"),
    )

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    business_name = Column(String, nullable=True)
    currency = Column(String, nullable=False, default="NGN")
    goal = Column(String, nullable=True)
    customer_style = Column(String, nullable=True)
    business_type = Column(String, nullable=True)
    sales_rhythm = Column(String, nullable=True)
    custom_rhythm_days = Column(Integer, nullable=True)
    sales_channel = Column(String, nullable=True)
    communication_tone = Column(String, nullable=True)
    price_range = Column(String, nullable=True)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("price >= 0", name="ck_product_price"),
        CheckConstraint("repurchase_days IS NULL OR repurchase_days BETWEEN 1 AND 365", name="ck_product_repurchase"),
        # Partial unique index — SQLite supports these natively. The service
        # also checks first so the client gets a friendly 409.
        Index("uq_products_user_name_active", "user_id", "name_key", unique=True,
              sqlite_where=text("archived_at IS NULL"), postgresql_where=text("archived_at IS NULL")),
    )

    id = Column(String(36), primary_key=True, default=new_id)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    name_key = Column(String, nullable=False)  # lower(trim(name))
    price = Column(Money, nullable=False)
    repurchase_days = Column(Integer, nullable=True)
    is_replenishable = Column(Boolean, nullable=True)
    archived_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)


class Customer(Base):
    __tablename__ = "customers"
    __table_args__ = (
        Index("uq_customers_user_phone_active", "user_id", "phone", unique=True,
              sqlite_where=text("phone IS NOT NULL AND archived_at IS NULL"),
              postgresql_where=text("phone IS NOT NULL AND archived_at IS NULL")),
    )

    id = Column(String(36), primary_key=True, default=new_id)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String, nullable=False)
    name_key = Column(String, nullable=False, index=True)  # lower(trim(name))
    phone = Column(String, nullable=True)  # E.164
    email = Column(String, nullable=True)  # lowercased
    note = Column(Text, nullable=True)
    archived_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)


class Sale(Base):
    """Evolution of the legacy `transactions` table (§6)."""
    __tablename__ = "sales"
    __table_args__ = (
        CheckConstraint("quantity BETWEEN 1 AND 100000", name="ck_sale_quantity"),
        CheckConstraint("unit_price >= 0", name="ck_sale_unit_price"),
        CheckConstraint("amount >= 0", name="ck_sale_amount"),
        CheckConstraint("source IN ('manual','voice')", name="ck_sale_source"),
        UniqueConstraint("user_id", "idempotency_key", name="uq_sales_user_idempotency"),
        Index("ix_sales_user_sold_at", "user_id", "sold_at"),
        Index("ix_sales_user_customer_sold_at", "user_id", "customer_id", "sold_at"),
        Index("ix_sales_user_product_sold_at", "user_id", "product_id", "sold_at"),
    )

    id = Column(String(36), primary_key=True, default=new_id)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(String(36), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    product_name = Column(String, nullable=False)  # snapshot at time of sale
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Money, nullable=False)
    amount = Column(Money, nullable=False)
    source = Column(String, nullable=False, default="manual")
    transcript = Column(Text, nullable=True)
    note = Column(Text, nullable=True)
    sold_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, nullable=False, default=utcnow)
    updated_at = Column(DateTime, nullable=False, default=utcnow, onupdate=utcnow)
    deleted_at = Column(DateTime, nullable=True)
    idempotency_key = Column(String(64), nullable=True)
    # Set for rows copied from the legacy `transactions` table.
    legacy_transaction_id = Column(Integer, nullable=True, unique=True)


class FollowUpAction(Base):
    __tablename__ = "follow_up_actions"
    __table_args__ = (
        CheckConstraint("action IN ('done','snoozed','dismissed')", name="ck_follow_up_action"),
        Index("ix_follow_up_actions_user_key", "user_id", "follow_up_key"),
    )

    id = Column(String(36), primary_key=True, default=new_id)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    follow_up_key = Column(String, nullable=False)
    customer_id = Column(String(36), nullable=True, index=True)
    product_name = Column(String, nullable=True)
    action = Column(String, nullable=False)
    channel = Column(String, nullable=True)
    snooze_until = Column(DateTime, nullable=True)  # local date stored as midnight
    created_at = Column(DateTime, nullable=False, default=utcnow)


class IdempotencyKey(Base):
    __tablename__ = "idempotency_keys"
    __table_args__ = (UniqueConstraint("user_id", "key", name="uq_idempotency_user_key"),)

    id = Column(String(36), primary_key=True, default=new_id)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    key = Column(String(64), nullable=False)
    endpoint = Column(String, nullable=False)
    request_hash = Column(String(64), nullable=False)
    response_status = Column(Integer, nullable=False)
    response_body = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=utcnow)
