export function formatFinanceMoney(
  value: number,
  currencyCode = "USD",
  language: "es" | "en" = "es"
): string {
  return new Intl.NumberFormat(language === "es" ? "es-CL" : "en-US", {
    style: "currency",
    currency: currencyCode,
  }).format(value);
}
