import type { Language } from "../store/language-context";
import { getCurrentLanguage } from "./i18n";

const CODE_LABELS: Record<Language, Record<string, string>> = {
  es: {
    active: "activo",
    inactive: "inactivo",
    pending: "pendiente",
    retry_pending: "pendiente de reintento",
    running: "en ejecución",
    completed: "completado",
    failed: "fallido",
    error: "error",
    archived: "archivado",
    suspended: "suspendido",
    canceled: "cancelado",
    trialing: "en prueba",
    past_due: "con deuda",
    allowed: "permitido",
    blocked: "bloqueado",
    reconciled: "reconciliado",
    duplicate: "duplicado",
    ignored: "ignorado",
    income: "ingreso",
    expense: "egreso",
    unknown: "sin dato",
    none: "ninguno",
    status: "estado operativo",
    billing: "facturación",
    write_block: "bloquear escrituras",
    full_block: "bloquear todo el acceso",
    superadmin: "superadministrador",
    admin: "administrador",
    manager: "manager",
    operator: "operador",
    support: "soporte",
  },
  en: {
    active: "active",
    inactive: "inactive",
    pending: "pending",
    retry_pending: "retry pending",
    running: "running",
    completed: "completed",
    failed: "failed",
    error: "error",
    archived: "archived",
    suspended: "suspended",
    canceled: "canceled",
    trialing: "trialing",
    past_due: "past due",
    allowed: "allowed",
    blocked: "blocked",
    reconciled: "reconciled",
    duplicate: "duplicate",
    ignored: "ignored",
    income: "income",
    expense: "expense",
    unknown: "unknown",
    none: "none",
    status: "status",
    billing: "billing",
    write_block: "block writes",
    full_block: "block all access",
    superadmin: "superadmin",
    admin: "admin",
    manager: "manager",
    operator: "operator",
    support: "support",
  },
};

const ACCESS_DETAIL_LABELS: Record<Language, Record<string, string>> = {
  es: {
    "tenant provisioning pending":
      "Este tenant todavía está en provisioning y aún no queda listo para operar.",
    "tenant suspended":
      "Este tenant está suspendido y el acceso queda bloqueado hasta que se reactive desde plataforma.",
    "tenant unavailable due to operational error":
      "Este tenant no está disponible por un problema operativo y debe revisarse desde plataforma.",
    "tenant archived":
      "Este tenant está archivado y no admite acceso hasta que se restaure formalmente.",
    "tenant suspended due to overdue billing":
      "Este tenant quedó suspendido por deuda vencida y el acceso está bloqueado hasta regularizar la facturación.",
    "tenant suspended by billing policy":
      "Este tenant está suspendido por política de facturación y el acceso está bloqueado.",
    "tenant subscription canceled":
      "La suscripción de este tenant está cancelada y el acceso ya no está disponible.",
  },
  en: {
    "tenant provisioning pending":
      "This tenant is still provisioning and is not ready to operate yet.",
    "tenant suspended":
      "This tenant is suspended and access remains blocked until it is reactivated from the platform.",
    "tenant unavailable due to operational error":
      "This tenant is unavailable due to an operational issue and must be reviewed from the platform.",
    "tenant archived":
      "This tenant is archived and access remains blocked until it is formally restored.",
    "tenant suspended due to overdue billing":
      "This tenant was suspended due to overdue billing and access stays blocked until payment is regularized.",
    "tenant suspended by billing policy":
      "This tenant is suspended by billing policy and access is blocked.",
    "tenant subscription canceled":
      "This tenant subscription is canceled and access is no longer available.",
  },
};

export function displayPlatformCode(
  value: string | null | undefined,
  language: Language = getCurrentLanguage()
): string {
  if (!value) {
    return language === "es" ? "sin dato" : "unknown";
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return language === "es" ? "sin dato" : "unknown";
  }
  return (
    CODE_LABELS[language][normalized] ||
    normalized
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

export function displayAccessBlockingSource(
  value: string | null | undefined,
  language: Language = getCurrentLanguage()
): string {
  if (!value) {
    return language === "es" ? "ninguna" : "none";
  }
  return displayPlatformCode(value, language);
}

export function displayMaintenanceAccessMode(
  value: string | null | undefined,
  language: Language = getCurrentLanguage()
): string {
  if (!value) {
    return language === "es" ? "bloquear escrituras" : "block writes";
  }
  return displayPlatformCode(value, language);
}

export function displayTenantAccessDetail(
  value: string | null | undefined,
  language: Language = getCurrentLanguage()
): string {
  if (!value) {
    return language === "es" ? "sin detalle" : "no detail";
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return language === "es" ? "sin detalle" : "no detail";
  }

  if (normalized.includes("subscription canceled")) {
    return language === "es"
      ? "La suscripción de este tenant está cancelada y el acceso ya no está disponible."
      : "This tenant subscription is canceled and access is no longer available.";
  }

  if (normalized.includes("invoice overdue")) {
    return language === "es"
      ? "El tenant tiene facturación vencida y el acceso quedó bloqueado hasta regularizar el pago."
      : "This tenant has overdue billing and access was blocked until payment is regularized.";
  }

  return ACCESS_DETAIL_LABELS[language][normalized] || value;
}
