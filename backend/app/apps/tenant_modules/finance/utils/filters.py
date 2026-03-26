def normalize_search_term(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None
