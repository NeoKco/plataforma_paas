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
    "restore-tenant": "Restauración de tenant",
    "delete-tenant": "Borrado seguro de tenant",
    "create-platform-user": "Alta de usuario de plataforma",
    "identity-platform-user": "Identidad de usuario de plataforma",
    "status-platform-user": "Estado de usuario de plataforma",
    "reset-platform-user-password": "Contraseña de usuario de plataforma",
    "delete-platform-user": "Borrado de usuario de plataforma",
    status: "Estado del tenant",
    maintenance: "Mantenimiento",
    billing: "Facturación",
    plan: "Plan",
    "rate-limit": "Límites de tasa",
    "billing-identity": "Identidad de facturación",
    "module-limits": "Límites por módulo",
    "sync-schema": "Esquema tenant",
    "run-provisioning-job": "Ejecución de provisioning",
    "requeue-provisioning-job": "Reintento de provisioning",
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
    "restore-tenant": "El tenant fue restaurado correctamente.",
    "delete-tenant": "El tenant fue eliminado correctamente.",
    "create-platform-user": "El usuario de plataforma fue creado correctamente.",
    "identity-platform-user": "La identidad del usuario de plataforma fue actualizada correctamente.",
    "status-platform-user": "El estado del usuario de plataforma fue actualizado correctamente.",
    "reset-platform-user-password": "La contraseña del usuario de plataforma fue actualizada correctamente.",
    "delete-platform-user": "El usuario de plataforma fue eliminado correctamente.",
    status: "El estado del tenant fue actualizado correctamente.",
    maintenance: "La ventana de mantenimiento fue actualizada correctamente.",
    billing: "La facturación del tenant fue actualizada correctamente.",
    plan: "El plan del tenant fue actualizado correctamente.",
    "rate-limit": "Los límites de tasa fueron actualizados correctamente.",
    "billing-identity": "La identidad de facturación fue actualizada correctamente.",
    "module-limits": "Los límites por módulo fueron actualizados correctamente.",
    "sync-schema": "La sincronización del esquema tenant fue lanzada correctamente.",
    "run-provisioning-job": "El job de provisioning fue ejecutado correctamente.",
    "requeue-provisioning-job":
      "El job de provisioning volvió a cola para un nuevo intento.",
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
