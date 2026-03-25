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
