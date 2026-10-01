from sqlalchemy.ext.asyncio import AsyncSession

from models import BusinessProfile, User
from schemas.business import BusinessProfileUpdate, validate_rhythm

PROFILE_FIELDS = (
    "business_name", "currency", "goal", "customer_style", "business_type", "sales_rhythm",
    "custom_rhythm_days", "sales_channel", "communication_tone", "price_range",
)


async def get_profile(db: AsyncSession, user: User) -> BusinessProfile:
    """Never 404s — creates the row if it is somehow missing (§7.1)."""
    profile = await db.get(BusinessProfile, user.id)
    if profile is None:
        profile = BusinessProfile(user_id=user.id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    return profile


def profile_out(profile: BusinessProfile) -> dict:
    out = {f: getattr(profile, f) for f in PROFILE_FIELDS}
    out["updated_at"] = profile.updated_at
    return out


async def update_profile(db: AsyncSession, user: User, body: BusinessProfileUpdate) -> BusinessProfile:
    profile = await get_profile(db, user)
    changes = body.model_dump(exclude_unset=True)
    merged_rhythm = changes.get("sales_rhythm", profile.sales_rhythm)
    merged_days = changes.get("custom_rhythm_days", profile.custom_rhythm_days)
    # Switching away from "custom" without sending days: clear them for the user.
    if "sales_rhythm" in changes and merged_rhythm != "custom" and "custom_rhythm_days" not in changes:
        merged_days = None
        changes["custom_rhythm_days"] = None
    validate_rhythm(merged_rhythm, merged_days)
    for field, value in changes.items():
        setattr(profile, field, value)
    await db.commit()
    await db.refresh(profile)
    return profile
