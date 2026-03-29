import type { Language } from "../../../../../store/language-context";
import type { FinanceIconName } from "../components/common/FinanceIcon";

export type FinanceAccountIconName = Extract<
  FinanceIconName,
  | "accounts"
  | "cash"
  | "bank"
  | "card"
  | "savings"
  | "investment"
  | "credit"
  | "finance"
  | "billing"
  | "balance"
>;

type FinanceAccountIconOption = {
  value: FinanceAccountIconName;
  label: Record<Language, string>;
};

export const FINANCE_ACCOUNT_ICON_OPTIONS: FinanceAccountIconOption[] = [
  { value: "accounts", label: { es: "General", en: "General" } },
  { value: "cash", label: { es: "Efectivo", en: "Cash" } },
  { value: "bank", label: { es: "Banco", en: "Bank" } },
  { value: "card", label: { es: "Tarjeta", en: "Card" } },
  { value: "savings", label: { es: "Ahorro", en: "Savings" } },
  { value: "investment", label: { es: "Inversión", en: "Investment" } },
  { value: "credit", label: { es: "Crédito", en: "Credit" } },
  { value: "billing", label: { es: "Cobro", en: "Billing" } },
  { value: "balance", label: { es: "Transferencia", en: "Transfer" } },
  { value: "finance", label: { es: "Finanzas", en: "Finance" } },
];

const FINANCE_ACCOUNT_ICON_OPTION_MAP = new Map(
  FINANCE_ACCOUNT_ICON_OPTIONS.map((option) => [option.value, option])
);

const ACCOUNT_TYPE_FALLBACK_ICON: Record<string, FinanceAccountIconName> = {
  cash: "cash",
  bank: "bank",
  card: "card",
  savings: "savings",
  investment: "investment",
  credit: "credit",
  other: "accounts",
};

export function isFinanceAccountIconName(
  value: string | null | undefined
): value is FinanceAccountIconName {
  if (!value) {
    return false;
  }
  return FINANCE_ACCOUNT_ICON_OPTION_MAP.has(value as FinanceAccountIconName);
}

export function getFinanceAccountIconName(
  value: string | null | undefined,
  accountType?: string
): FinanceAccountIconName {
  if (isFinanceAccountIconName(value)) {
    return value;
  }
  return ACCOUNT_TYPE_FALLBACK_ICON[accountType || ""] || "accounts";
}

export function getFinanceAccountIconLabel(
  value: string | null | undefined,
  language: Language,
  accountType?: string
): string {
  const explicitOption = value
    ? FINANCE_ACCOUNT_ICON_OPTION_MAP.get(value as FinanceAccountIconName)
    : null;
  if (explicitOption) {
    return explicitOption.label[language];
  }
  const fallbackIcon = getFinanceAccountIconName(value, accountType);
  return (
    FINANCE_ACCOUNT_ICON_OPTION_MAP.get(fallbackIcon)?.label[language] ||
    fallbackIcon
  );
}
