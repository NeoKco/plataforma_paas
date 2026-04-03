function slugifySegment(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function buildInternalTaxonomyCode(prefix: string, name: string, fallbackId?: number | null): string {
  const slug = slugifySegment(name);
  if (slug) {
    return `${prefix}-${slug}`;
  }
  if (fallbackId) {
    return `${prefix}-${fallbackId}`;
  }
  return `${prefix}-item`;
}

export function stripLegacyVisibleText(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const cleaned = value
    .split("\n")
    .map((line) =>
      line
        .replace(/\blegacy[_-][a-z0-9_-]+\s*=\s*[^,\n]+/gi, "")
        .replace(/\blegacy[_-][a-z0-9_-]+\b/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim()
    )
    .filter((line) => line)
    .join("\n")
    .trim();
  return cleaned || null;
}
