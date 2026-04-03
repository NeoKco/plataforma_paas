import { stripLegacyVisibleText } from "../../../../../utils/legacyVisibleText";

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

export { stripLegacyVisibleText };
