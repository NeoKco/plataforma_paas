export function formatFinanceDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  return new Intl.DateTimeFormat().format(new Date(value));
}
