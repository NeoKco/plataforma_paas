export const DEFAULT_TENANT_TIMEZONE = "America/Santiago";

export const TIMEZONE_OPTIONS = [
  "America/Santiago",
  "America/Buenos_Aires",
  "America/Sao_Paulo",
  "America/Lima",
  "America/Bogota",
  "America/Mexico_City",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/Madrid",
  "UTC",
] as const;

export function getBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TENANT_TIMEZONE;
  } catch {
    return DEFAULT_TENANT_TIMEZONE;
  }
}

export function getTimeZoneLabel(value: string, language: "es" | "en"): string {
  if (value === "UTC") {
    return "UTC";
  }
  if (language === "es" && value === "America/Santiago") {
    return "America/Santiago (Chile)";
  }
  return value;
}
