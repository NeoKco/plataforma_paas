export function getPlatformActionFeedbackLabel(scope: string): string {
  if (scope.startsWith("reconcile-")) {
    return "Reconcile de evento";
  }
  if (scope.startsWith("Reencolar job #")) {
    return "Reencolar job";
  }

  const knownLabels: Record<string, string> = {
    "create-tenant": "Alta de tenant",
    "identity-tenant": "Identidad básica",
    "archive-tenant": "Archivo de tenant",
    status: "Estado del tenant",
    maintenance: "Mantenimiento",
    billing: "Facturación",
    plan: "Plan",
    "rate-limit": "Límites de tasa",
    "billing-identity": "Identidad de facturación",
    "module-limits": "Límites por módulo",
    "sync-schema": "Esquema tenant",
    "reconcile-batch": "Reconcile en lote",
    "Reencolado DLQ": "Reencolado DLQ",
  };

  return knownLabels[scope] || scope;
}

export function getPlatformActionSuccessMessage(
  scope: string,
  fallback?: string
): string {
  if (scope.startsWith("reconcile-")) {
    return "El evento de billing fue reconciliado correctamente.";
  }
  if (scope.startsWith("Reencolar job #")) {
    return "El job volvió a cola para un nuevo procesamiento.";
  }

  const knownMessages: Record<string, string> = {
    "create-tenant": "El tenant fue creado correctamente y quedó listo para provisioning.",
    "identity-tenant": "La identidad básica del tenant fue actualizada correctamente.",
    "archive-tenant": "El tenant fue archivado correctamente.",
    status: "El estado del tenant fue actualizado correctamente.",
    maintenance: "La ventana de mantenimiento fue actualizada correctamente.",
    billing: "La facturación del tenant fue actualizada correctamente.",
    plan: "El plan del tenant fue actualizado correctamente.",
    "rate-limit": "Los límites de tasa fueron actualizados correctamente.",
    "billing-identity": "La identidad de facturación fue actualizada correctamente.",
    "module-limits": "Los límites por módulo fueron actualizados correctamente.",
    "sync-schema": "La sincronización del esquema tenant fue lanzada correctamente.",
    "reconcile-batch": "Los eventos filtrados fueron reconciliados correctamente.",
    "Reencolado DLQ": "Las filas DLQ volvieron a cola para nuevo procesamiento.",
  };

  return knownMessages[scope] || fallback || "La acción se completó correctamente.";
}

export function getTenantPortalActionSuccessMessage(
  scope: string,
  fallback?: string
): string {
  if (scope === "create-user") {
    return "El usuario fue creado correctamente.";
  }
  if (scope.startsWith("user-status-")) {
    return "El estado del usuario fue actualizado correctamente.";
  }
  if (scope === "create-entry") {
    return "El movimiento fue registrado correctamente.";
  }

  return fallback || "La acción se completó correctamente.";
}
