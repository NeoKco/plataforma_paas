import type { CSSProperties } from "react";

export type FinanceIconName =
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
  | "focus";

type FinanceIconProps = {
  name: FinanceIconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
};

export function FinanceIcon({
  name,
  size = 18,
  className,
  style,
}: FinanceIconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      style={style}
      viewBox="0 0 24 24"
      width={size}
    >
      {renderIconPath(name)}
    </svg>
  );
}

function renderIconPath(name: FinanceIconName) {
  switch (name) {
    case "transactions":
      return (
        <>
          <path d="M4 7h16" />
          <path d="M4 12h10" />
          <path d="M4 17h16" />
          <path d="m16 10 3 2-3 2" />
        </>
      );
    case "budgets":
      return (
        <>
          <path d="M5 19h14" />
          <path d="M7 19V9" />
          <path d="M12 19V5" />
          <path d="M17 19v-7" />
        </>
      );
    case "loans":
      return (
        <>
          <path d="M7 7h10a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h8" />
          <path d="M12 4v16" />
        </>
      );
    case "planning":
      return (
        <>
          <rect height="14" rx="2" width="16" x="4" y="6" />
          <path d="M8 3v6" />
          <path d="M16 3v6" />
          <path d="M4 11h16" />
        </>
      );
    case "reports":
      return (
        <>
          <path d="M5 19V8" />
          <path d="M10 19V5" />
          <path d="M15 19v-9" />
          <path d="M20 19v-6" />
        </>
      );
    case "accounts":
      return (
        <>
          <rect height="12" rx="2" width="16" x="4" y="6" />
          <path d="M4 10h16" />
          <path d="M8 15h3" />
        </>
      );
    case "categories":
      return (
        <>
          <path d="M4 7h7l2 2h7v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
          <path d="M4 7V6a2 2 0 0 1 2-2h4l2 2" />
        </>
      );
    case "catalogs":
      return (
        <>
          <path d="M6 4h11a2 2 0 0 1 2 2v12H8a2 2 0 0 0-2 2Z" />
          <path d="M6 4a2 2 0 0 0-2 2v14" />
          <path d="M9 8h6" />
          <path d="M9 12h6" />
        </>
      );
    case "settings":
      return (
        <>
          <path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z" />
          <path d="m4.8 13.5-.8-1.5.8-1.5 1.9-.4.8-1.8 1.9.1 1.2-1.4h1.8l1.2 1.4 1.9-.1.8 1.8 1.9.4.8 1.5-.8 1.5-1.9.4-.8 1.8-1.9-.1-1.2 1.4h-1.8l-1.2-1.4-1.9.1-.8-1.8Z" />
        </>
      );
    case "income":
      return (
        <>
          <path d="M12 19V5" />
          <path d="m7 10 5-5 5 5" />
        </>
      );
    case "expense":
      return (
        <>
          <path d="M12 5v14" />
          <path d="m17 14-5 5-5-5" />
        </>
      );
    case "balance":
      return (
        <>
          <path d="M4 12h16" />
          <path d="m15 7 5 5-5 5" />
          <path d="m9 17-5-5 5-5" />
        </>
      );
    case "pulse":
      return (
        <>
          <path d="M3 12h4l2-4 4 8 2-4h6" />
        </>
      );
    case "focus":
      return (
        <>
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M12 2v3" />
          <path d="M12 19v3" />
          <path d="M2 12h3" />
          <path d="M19 12h3" />
        </>
      );
  }
}
