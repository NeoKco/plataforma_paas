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

export function toDateTimeLocalInputValue(value: Date | string | null | undefined): string {
  const parsed = normalizeDateInput(value);
  if (!parsed) {
    return "";
  }
  const offsetMinutes = parsed.getTimezoneOffset();
  const local = new Date(parsed.getTime() - offsetMinutes * 60_000);
  return local.toISOString().slice(0, 16);
}

export function currentDateTimeLocalInputValue(): string {
  return toDateTimeLocalInputValue(new Date());
}

export function fromDateTimeLocalInputValue(value: string): string {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toISOString();
}
