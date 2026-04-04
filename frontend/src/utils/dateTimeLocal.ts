import { DEFAULT_TENANT_TIMEZONE, getBrowserTimeZone } from "./timezone-options";

function normalizeDateInput(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function getFormatterLocale(language: "es" | "en") {
  return language === "es" ? "es-CL" : "en-US";
}

function getTimeZoneParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";

  return {
    year: Number(read("year")),
    month: Number(read("month")),
    day: Number(read("day")),
    hour: Number(read("hour")),
    minute: Number(read("minute")),
    second: Number(read("second")),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = getTimeZoneParts(date, timeZone);
  const zonedUtcMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return zonedUtcMs - date.getTime();
}

function resolveTimeZone(timeZone?: string | null): string {
  return timeZone || getBrowserTimeZone() || DEFAULT_TENANT_TIMEZONE;
}

export function toDateTimeLocalInputValue(
  value: Date | string | null | undefined,
  timeZone?: string | null,
): string {
  const parsed = normalizeDateInput(value);
  if (!parsed) {
    return "";
  }
  const parts = getTimeZoneParts(parsed, resolveTimeZone(timeZone));
  const pad = (item: number) => String(item).padStart(2, "0");
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function currentDateTimeLocalInputValue(timeZone?: string | null): string {
  return toDateTimeLocalInputValue(new Date(), timeZone);
}

export function fromDateTimeLocalInputValue(value: string, timeZone?: string | null): string {
  if (!value) {
    return "";
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return "";
  }
  const [, year, month, day, hour, minute] = match;
  const targetTimeZone = resolveTimeZone(timeZone);
  const wallClockUtcMs = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    0,
  );
  let resolvedUtcMs =
    wallClockUtcMs - getTimeZoneOffsetMs(new Date(wallClockUtcMs), targetTimeZone);
  const refinedOffsetMs = getTimeZoneOffsetMs(new Date(resolvedUtcMs), targetTimeZone);
  resolvedUtcMs = wallClockUtcMs - refinedOffsetMs;
  return new Date(resolvedUtcMs).toISOString();
}

export function formatDateTimeInTimeZone(
  value: Date | string | null | undefined,
  language: "es" | "en" = "es",
  timeZone?: string | null,
): string {
  const parsed = normalizeDateInput(value);
  if (!parsed) {
    return "—";
  }
  return new Intl.DateTimeFormat(getFormatterLocale(language), {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: resolveTimeZone(timeZone),
  }).format(parsed);
}
