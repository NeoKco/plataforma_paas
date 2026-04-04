from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

DEFAULT_TENANT_TIMEZONE = "America/Santiago"


def normalize_timezone(value: str | None, *, allow_none: bool = False) -> str | None:
    if value is None:
        if allow_none:
            return None
        return DEFAULT_TENANT_TIMEZONE

    normalized = value.strip()
    if not normalized:
        if allow_none:
            return None
        return DEFAULT_TENANT_TIMEZONE

    try:
        ZoneInfo(normalized)
    except ZoneInfoNotFoundError as exc:
        raise ValueError("Zona horaria no soportada") from exc

    return normalized


def resolve_effective_timezone(
    tenant_timezone: str | None,
    user_timezone: str | None = None,
) -> str:
    return (
        normalize_timezone(user_timezone, allow_none=True)
        or normalize_timezone(tenant_timezone)
        or DEFAULT_TENANT_TIMEZONE
    )
