import type { CSSProperties } from "react";
import { AppIcon, type AppIconName } from "../../../../../../design-system/AppIcon";

export type FinanceIconName = Extract<
  AppIconName,
  | "transactions"
  | "budgets"
  | "loans"
  | "planning"
  | "reports"
  | "accounts"
  | "categories"
  | "catalogs"
  | "settings"
  | "income"
  | "expense"
  | "balance"
  | "pulse"
  | "focus"
  | "car"
  | "home"
  | "health"
  | "gift"
  | "education"
  | "food"
  | "salary"
  | "travel"
  | "leisure"
  | "pet"
  | "bills"
  | "insurance"
  | "shopping"
  | "personal-care"
  | "childcare"
  | "cash"
>;

type FinanceIconProps = {
  name: FinanceIconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
};

export function FinanceIcon(props: FinanceIconProps) {
  return <AppIcon {...props} />;
}
