const CODE_LABELS: Record<string, string> = {
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
  support: "soporte",
};

const ACCESS_DETAIL_LABELS: Record<string, string> = {
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
};

export function displayPlatformCode(value: string | null | undefined): string {
  if (!value) {
    return "sin dato";
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return "sin dato";
  }
  return (
    CODE_LABELS[normalized] ||
    normalized
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

export function displayAccessBlockingSource(value: string | null | undefined): string {
  if (!value) {
    return "ninguna";
  }
  return displayPlatformCode(value);
}

export function displayMaintenanceAccessMode(value: string | null | undefined): string {
  if (!value) {
    return "bloquear escrituras";
  }
  return displayPlatformCode(value);
}

export function displayTenantAccessDetail(
  value: string | null | undefined
): string {
  if (!value) {
    return "sin detalle";
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return "sin detalle";
  }

  if (normalized.includes("subscription canceled")) {
    return "La suscripción de este tenant está cancelada y el acceso ya no está disponible.";
  }

  if (normalized.includes("invoice overdue")) {
    return "El tenant tiene facturación vencida y el acceso quedó bloqueado hasta regularizar el pago.";
  }

  return ACCESS_DETAIL_LABELS[normalized] || value;
}
