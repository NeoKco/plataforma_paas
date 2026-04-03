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
