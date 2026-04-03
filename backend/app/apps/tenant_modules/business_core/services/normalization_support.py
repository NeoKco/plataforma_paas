import re
import unicodedata


def normalize_human_key(value: str | None) -> str:
    if not value:
        return ""
    normalized = (
        unicodedata.normalize("NFD", value)
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
    )
    return re.sub(r"\s+", " ", normalized).strip()


def normalize_phone_key(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"[^0-9+]", "", value).strip()


def normalize_tax_id_key(value: str | None) -> str:
    if not value:
        return ""
    normalized = (
        unicodedata.normalize("NFD", value)
        .encode("ascii", "ignore")
        .decode("ascii")
        .upper()
    )
    return re.sub(r"[^0-9A-Z]", "", normalized).strip()


def normalize_email_key(value: str | None) -> str:
    if not value:
        return ""
    return value.strip().lower()
