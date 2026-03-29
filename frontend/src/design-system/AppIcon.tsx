import type { CSSProperties } from "react";

export type AppIconName =
  | "overview"
  | "users"
  | "finance"
  | "dashboard"
  | "tenants"
  | "tenant-history"
  | "activity"
  | "provisioning"
  | "billing"
  | "settings"
  | "transactions"
  | "budgets"
  | "loans"
  | "planning"
  | "reports"
  | "accounts"
  | "categories"
  | "catalogs"
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
  | "cash";

type AppIconProps = {
  name: AppIconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
};

export function AppIcon({
  name,
  size = 18,
  className,
  style,
}: AppIconProps) {
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

function renderIconPath(name: AppIconName) {
  switch (name) {
    case "overview":
    case "dashboard":
      return (
        <>
          <rect height="7" rx="1.5" width="7" x="4" y="4" />
          <rect height="11" rx="1.5" width="7" x="13" y="4" />
          <rect height="7" rx="1.5" width="7" x="4" y="13" />
          <rect height="3" rx="1.5" width="7" x="13" y="16" />
        </>
      );
    case "users":
      return (
        <>
          <circle cx="9" cy="9" r="3" />
          <path d="M4 19a5 5 0 0 1 10 0" />
          <circle cx="17.5" cy="10" r="2.5" />
          <path d="M15 19a4 4 0 0 1 5-3.9" />
        </>
      );
    case "finance":
      return (
        <>
          <path d="M4 18h16" />
          <path d="M7 18V9" />
          <path d="M12 18V5" />
          <path d="M17 18v-7" />
        </>
      );
    case "tenants":
      return (
        <>
          <path d="M4 9 12 4l8 5v9l-8 4-8-4Z" />
          <path d="M4 9l8 4 8-4" />
          <path d="M12 13v9" />
        </>
      );
    case "tenant-history":
      return (
        <>
          <path d="M12 8v5l3 2" />
          <path d="M4 12a8 8 0 1 0 2.3-5.6" />
          <path d="M4 4v4h4" />
        </>
      );
    case "activity":
      return (
        <>
          <path d="M3 12h4l2-4 4 8 2-4h6" />
        </>
      );
    case "provisioning":
      return (
        <>
          <path d="M4 12h8" />
          <path d="m8 8 4 4-4 4" />
          <rect height="8" rx="1.5" width="6" x="14" y="8" />
        </>
      );
    case "billing":
      return (
        <>
          <path d="M7 7h10a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h8" />
          <path d="M12 4v16" />
        </>
      );
    case "settings":
      return (
        <>
          <path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z" />
          <path d="m4.8 13.5-.8-1.5.8-1.5 1.9-.4.8-1.8 1.9.1 1.2-1.4h1.8l1.2 1.4 1.9-.1.8 1.8 1.9.4.8 1.5-.8 1.5-1.9.4-.8 1.8-1.9-.1-1.2 1.4h-1.8l-1.2-1.4-1.9.1-.8-1.8Z" />
        </>
      );
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
    case "car":
      return (
        <>
          <circle cx="7.5" cy="17" r="1.5" />
          <circle cx="16.5" cy="17" r="1.5" />
          <path d="M5 17H4v-4.5L6.2 9h8.1l2.7 3.5H20V17h-2" />
          <path d="M6.5 9h7" />
        </>
      );
    case "home":
      return (
        <>
          <path d="m4 11 8-7 8 7" />
          <path d="M6 10.5V20h12v-9.5" />
          <path d="M10 20v-5h4v5" />
        </>
      );
    case "health":
      return (
        <>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8v8" />
          <path d="M8 12h8" />
        </>
      );
    case "gift":
      return (
        <>
          <rect height="12" rx="2" width="16" x="4" y="8" />
          <path d="M12 8v12" />
          <path d="M4 12h16" />
          <path d="M9.5 8C8 8 7 7.1 7 6s1-2 2.5-2C11 4 12 5.5 12 8" />
          <path d="M14.5 8C16 8 17 7.1 17 6s-1-2-2.5-2C13 4 12 5.5 12 8" />
        </>
      );
    case "education":
      return (
        <>
          <path d="m3 9 9-4 9 4-9 4-9-4Z" />
          <path d="M7 11.5v3.2c0 1.7 2.2 3.3 5 3.3s5-1.6 5-3.3v-3.2" />
          <path d="M19 10v5" />
        </>
      );
    case "food":
      return (
        <>
          <circle cx="12" cy="12" r="4.8" />
          <path d="M4 4v6" />
          <path d="M7 4v6" />
          <path d="M4 7h3" />
          <path d="M18 4v14" />
          <path d="M15.5 9H18" />
        </>
      );
    case "salary":
      return (
        <>
          <rect height="11" rx="2" width="17" x="3.5" y="6.5" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M5.5 10c1-.2 1.8-1 2-2" />
          <path d="M18.5 14c-1 .2-1.8 1-2 2" />
        </>
      );
    case "travel":
      return (
        <>
          <rect height="11" rx="2" width="16" x="4" y="7" />
          <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
          <path d="M4 12h16" />
        </>
      );
    case "leisure":
      return (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v3" />
          <path d="M12 19v3" />
          <path d="M2 12h3" />
          <path d="M19 12h3" />
          <path d="m4.9 4.9 2.1 2.1" />
          <path d="m17 17 2.1 2.1" />
          <path d="m17 7 2.1-2.1" />
          <path d="m4.9 19.1 2.1-2.1" />
        </>
      );
    case "pet":
      return (
        <>
          <circle cx="8" cy="9" r="1.35" />
          <circle cx="12" cy="7.2" r="1.35" />
          <circle cx="16" cy="9" r="1.35" />
          <path d="M9 16c0-2.1 1.4-3.6 3-3.6s3 1.5 3 3.6c0 1.3-1.1 2.4-3 2.4s-3-1.1-3-2.4Z" />
        </>
      );
    case "bills":
      return (
        <>
          <path d="M7 4h8l4 4v12H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
          <path d="M15 4v4h4" />
          <path d="M9 12h6" />
          <path d="M9 16h5" />
        </>
      );
    case "insurance":
      return (
        <>
          <path d="M12 4 6 6.5V11c0 4.1 2.5 7.8 6 9 3.5-1.2 6-4.9 6-9V6.5L12 4Z" />
          <path d="m9.5 12 1.8 1.8 3.2-3.3" />
        </>
      );
    case "shopping":
      return (
        <>
          <path d="M7 8h10l-1 10H8L7 8Z" />
          <path d="M9 8a3 3 0 1 1 6 0" />
        </>
      );
    case "personal-care":
      return (
        <>
          <path d="m12 4 1.6 4.1L18 10l-4.4 1.9L12 16l-1.6-4.1L6 10l4.4-1.9L12 4Z" />
          <path d="M18 4v2" />
          <path d="M19 5h-2" />
        </>
      );
    case "childcare":
      return (
        <>
          <circle cx="12" cy="10" r="3.2" />
          <path d="M7.5 18a4.5 4.5 0 0 1 9 0" />
          <path d="M10.5 9.7h3" />
        </>
      );
    case "cash":
      return (
        <>
          <rect height="9" rx="2" width="15" x="5" y="8" />
          <path d="M3.5 15V7.5a2 2 0 0 1 2-2H17" />
          <circle cx="12.5" cy="12.5" r="2" />
        </>
      );
  }
}
