import type { Language } from "../../../../../store/language-context";

export function getFinanceAccountTypeLabel(
  accountType: string,
  language: Language
): string {
  const labels: Record<string, { es: string; en: string }> = {
    cash: { es: "Efectivo", en: "Cash" },
    bank: { es: "Banco", en: "Bank" },
    card: { es: "Tarjeta", en: "Card" },
    savings: { es: "Ahorro", en: "Savings" },
    investment: { es: "Inversión", en: "Investment" },
    credit: { es: "Crédito", en: "Credit" },
    other: { es: "Otro", en: "Other" },
  };
  return labels[accountType]?.[language] || accountType;
}

export function getFinanceCategoryTypeLabel(
  categoryType: string,
  language: Language
): string {
  const labels: Record<string, { es: string; en: string }> = {
    income: { es: "Ingreso", en: "Income" },
    expense: { es: "Egreso", en: "Expense" },
    transfer: { es: "Transferencia", en: "Transfer" },
  };
  return labels[categoryType]?.[language] || categoryType;
}

export function getActiveStateLabel(isActive: boolean, language: Language): string {
  if (language === "en") {
    return isActive ? "active" : "inactive";
  }
  return isActive ? "activa" : "inactiva";
}

export function getSimpleStateLabel(isActive: boolean, language: Language): string {
  if (language === "en") {
    return isActive ? "active" : "inactive";
  }
  return isActive ? "activo" : "inactivo";
}

export function getBooleanLabel(value: boolean, language: Language): string {
  if (language === "en") {
    return value ? "yes" : "no";
  }
  return value ? "sí" : "no";
}
