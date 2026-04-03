export function buildAddressLine(street: string | null, streetNumber: string | null): string {
  const parts = [street?.trim() ?? "", streetNumber?.trim() ?? ""].filter(Boolean);
  return parts.join(" ").trim();
}

export function parseAddressLine(addressLine: string | null | undefined): {
  street: string;
  streetNumber: string;
} {
  const raw = addressLine?.trim() ?? "";
  if (!raw) {
    return { street: "", streetNumber: "" };
  }

  const parts = raw.split(/\s+/);
  const maybeNumber = parts[parts.length - 1] ?? "";
  if (/[0-9]/.test(maybeNumber) && parts.length > 1) {
    return {
      street: parts.slice(0, -1).join(" "),
      streetNumber: maybeNumber,
    };
  }

  return {
    street: raw,
    streetNumber: "",
  };
}

export function getVisibleAddressLabel(site: {
  address_line: string | null;
  name: string;
}): string {
  return site.address_line?.trim() || site.name;
}
