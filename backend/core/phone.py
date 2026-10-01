"""Phone normalisation to E.164 (§9.4).

Nigerian inputs: 0803 123 4567 / 08031234567 / +2348031234567 / 2348031234567
(spaces, dashes, dots and brackets allowed) -> +2348031234567.
Other countries: must start with "+" and have 8–15 digits.
"""
import re

INVALID = "Enter a valid phone number"
_ALLOWED = re.compile(r"^\+?[0-9\s\-().]+$")


def normalize_phone(raw: str) -> str:
    text = raw.strip()
    if not _ALLOWED.match(text):
        raise ValueError(INVALID)
    has_plus = text.startswith("+")
    digits = re.sub(r"\D", "", text)
    if len(digits) < 7 or len(digits) > 15:
        raise ValueError(INVALID)

    if digits.startswith("234") and len(digits) == 13:
        return "+" + digits
    if not has_plus:
        if digits.startswith("0") and len(digits) == 11:
            return "+234" + digits[1:]
        if len(digits) == 10 and digits[0] in "789":
            return "+234" + digits
        raise ValueError(INVALID)
    if 8 <= len(digits) <= 15:
        return "+" + digits
    raise ValueError(INVALID)


def search_variants(q: str) -> list[str]:
    """Digit strings to match against stored E.164 numbers for a search box."""
    digits = re.sub(r"\D", "", q)
    if len(digits) < 3:
        return []
    variants = {digits}
    if digits.startswith("0"):
        variants.add("234" + digits[1:])
    return sorted(variants)
