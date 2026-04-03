import re
import unicodedata


def build_internal_taxonomy_code(prefix: str, name: str, fallback: str = "item") -> str:
    normalized = (
        unicodedata.normalize("NFD", name)
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
    )
    slug = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")[:48]
    if slug:
        return f"{prefix}-{slug}"
    return f"{prefix}-{fallback}"


def strip_legacy_visible_text(value: str | None) -> str | None:
    if not value:
        return None
    cleaned_lines: list[str] = []
    for raw_line in value.splitlines():
        line = re.sub(r"\blegacy[_-][a-z0-9_-]+\s*=\s*[^,\n]+", "", raw_line, flags=re.I)
        line = re.sub(r"\blegacy[_-][a-z0-9_-]+\b", "", line, flags=re.I)
        line = re.sub(r"\s{2,}", " ", line).strip()
        if line:
            cleaned_lines.append(line)
    cleaned = "\n".join(cleaned_lines).strip()
    return cleaned or None
