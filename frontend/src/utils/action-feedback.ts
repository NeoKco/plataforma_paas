import type { Language } from "../store/language-context";
import { getCurrentLanguage } from "./i18n";

export function getPlatformActionFeedbackLabel(
  scope: string,
  language: Language = getCurrentLanguage()
): string {
  if (scope.startsWith("reconcile-")) {
    return language === "es" ? "Reconcile de evento" : "Event reconcile";
  }
  if (scope.startsWith("Reencolar job #")) {
    return language === "es" ? "Requeue job" : "Requeue job";
  }

  const knownLabels: Record<Language, Record<string, string>> = {
    es: {
      "create-tenant": "Alta de tenant",
      "identity-tenant": "Identidad básica",
      "archive-tenant": "Archivo de tenant",
      "deprovision-tenant": "Desprovisionado de tenant",
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
      "bulk-sync-schema": "Auto-sync de esquemas",
      "run-provisioning-job": "Ejecución de provisioning",
      "requeue-provisioning-job": "Reintento de provisioning",
      "requeue-dlq-batch": "Reencolado DLQ",
      "reprovision-tenant": "Reprovisionado de tenant",
      "rotate-tenant-db-credentials": "Credenciales técnicas tenant",
      "reset-tenant-portal-password": "Contraseña portal tenant",
      "reconcile-batch": "Reconcile en lote",
      "Reencolado DLQ": "Reencolado DLQ",
    },
    en: {
      "create-tenant": "Create tenant",
      "identity-tenant": "Tenant identity",
      "archive-tenant": "Archive tenant",
      "deprovision-tenant": "Deprovision tenant",
      "restore-tenant": "Restore tenant",
      "delete-tenant": "Delete tenant",
      "create-platform-user": "Create platform user",
      "identity-platform-user": "Platform user identity",
      "status-platform-user": "Platform user status",
      "reset-platform-user-password": "Platform user password",
      "delete-platform-user": "Delete platform user",
      status: "Tenant status",
      maintenance: "Maintenance",
      billing: "Billing",
      plan: "Plan",
      "rate-limit": "Rate limits",
      "billing-identity": "Billing identity",
      "module-limits": "Module limits",
      "sync-schema": "Tenant schema",
      "bulk-sync-schema": "Schema auto-sync",
      "run-provisioning-job": "Run provisioning",
      "requeue-provisioning-job": "Retry provisioning",
      "requeue-dlq-batch": "Requeue DLQ",
      "reprovision-tenant": "Reprovision tenant",
      "rotate-tenant-db-credentials": "Tenant technical credentials",
      "reset-tenant-portal-password": "Tenant portal password",
      "reconcile-batch": "Batch reconcile",
      "Reencolado DLQ": "Requeue DLQ",
    },
  };

  return knownLabels[language][scope] || scope;
}

export function getPlatformActionSuccessMessage(
  scope: string,
  fallback?: string,
  language: Language = getCurrentLanguage()
): string {
  if (scope.startsWith("reconcile-")) {
    return language === "es"
      ? "El evento de billing fue reconciliado correctamente."
      : "The billing event was reconciled successfully.";
  }
  if (scope.startsWith("Reencolar job #")) {
    return language === "es"
      ? "El job volvió a cola para un nuevo procesamiento."
      : "The job returned to the queue for reprocessing.";
  }

  const knownMessages: Record<Language, Record<string, string>> = {
    es: {
      "create-tenant": "El tenant fue creado correctamente y quedó listo para provisioning.",
      "identity-tenant": "La identidad básica del tenant fue actualizada correctamente.",
      "archive-tenant": "El tenant fue archivado correctamente.",
      "deprovision-tenant":
        "Se creó un job para desprovisionar la infraestructura técnica del tenant.",
      "restore-tenant": "El tenant fue restaurado correctamente.",
      "delete-tenant": "El tenant fue eliminado correctamente.",
      "create-platform-user": "El usuario de plataforma fue creado correctamente.",
      "identity-platform-user":
        "La identidad del usuario de plataforma fue actualizada correctamente.",
      "status-platform-user":
        "El estado del usuario de plataforma fue actualizado correctamente.",
      "reset-platform-user-password":
        "La contraseña del usuario de plataforma fue actualizada correctamente.",
      "delete-platform-user": "El usuario de plataforma fue eliminado correctamente.",
      status: "El estado del tenant fue actualizado correctamente.",
      maintenance: "La ventana de mantenimiento fue actualizada correctamente.",
      billing: "La facturación del tenant fue actualizada correctamente.",
      plan: "El plan del tenant fue actualizado correctamente.",
      "rate-limit": "Los límites de tasa fueron actualizados correctamente.",
      "billing-identity": "La identidad de facturación fue actualizada correctamente.",
      "module-limits": "Los límites por módulo fueron actualizados correctamente.",
      "sync-schema": "La sincronización del esquema tenant fue lanzada correctamente.",
      "bulk-sync-schema":
        "Se encolaron jobs de sincronización de esquema para tenants activos.",
      "run-provisioning-job": "El job de provisioning fue ejecutado correctamente.",
      "requeue-provisioning-job":
        "El job de provisioning volvió a cola para un nuevo intento.",
      "requeue-dlq-batch":
        "Las filas DLQ volvieron a cola para nuevo procesamiento.",
      "reprovision-tenant":
        "Se creó un nuevo job de provisioning para recomponer la base tenant.",
      "rotate-tenant-db-credentials":
        "Las credenciales técnicas tenant fueron rotadas correctamente.",
      "reset-tenant-portal-password":
        "La contraseña del usuario del portal tenant fue actualizada correctamente.",
      "reconcile-batch": "Los eventos filtrados fueron reconciliados correctamente.",
      "Reencolado DLQ": "Las filas DLQ volvieron a cola para nuevo procesamiento.",
    },
    en: {
      "create-tenant":
        "The tenant was created successfully and is ready for provisioning.",
      "identity-tenant": "The tenant identity was updated successfully.",
      "archive-tenant": "The tenant was archived successfully.",
      "deprovision-tenant":
        "A job was created to deprovision the tenant technical infrastructure.",
      "restore-tenant": "The tenant was restored successfully.",
      "delete-tenant": "The tenant was deleted successfully.",
      "create-platform-user": "The platform user was created successfully.",
      "identity-platform-user": "The platform user identity was updated successfully.",
      "status-platform-user": "The platform user status was updated successfully.",
      "reset-platform-user-password":
        "The platform user password was updated successfully.",
      "delete-platform-user": "The platform user was deleted successfully.",
      status: "The tenant status was updated successfully.",
      maintenance: "The maintenance window was updated successfully.",
      billing: "The tenant billing status was updated successfully.",
      plan: "The tenant plan was updated successfully.",
      "rate-limit": "The rate limits were updated successfully.",
      "billing-identity": "The billing identity was updated successfully.",
      "module-limits": "The module limits were updated successfully.",
      "sync-schema": "The tenant schema sync was started successfully.",
      "bulk-sync-schema":
        "Schema sync jobs were queued for active tenants.",
      "run-provisioning-job": "The provisioning job was started successfully.",
      "requeue-provisioning-job":
        "The provisioning job was returned to the queue for retry.",
      "requeue-dlq-batch": "The DLQ rows were returned to the queue.",
      "reprovision-tenant":
        "A new provisioning job was created to rebuild the tenant database.",
      "rotate-tenant-db-credentials":
        "The tenant technical credentials were rotated successfully.",
      "reset-tenant-portal-password":
        "The tenant portal user password was updated successfully.",
      "reconcile-batch": "The filtered events were reconciled successfully.",
      "Reencolado DLQ": "The DLQ rows were returned to the queue.",
    },
  };

  return (
    knownMessages[language][scope] ||
    fallback ||
    (language === "es"
      ? "La acción se completó correctamente."
      : "The action completed successfully.")
  );
}

export function getTenantPortalActionSuccessMessage(
  scope: string,
  fallback?: string,
  language: Language = "es"
): string {
  if (scope === "create-user") {
    return language === "es"
      ? "El usuario fue creado correctamente."
      : "The user was created successfully.";
  }
  if (scope.startsWith("user-status-")) {
    return language === "es"
      ? "El estado del usuario fue actualizado correctamente."
      : "The user status was updated successfully.";
  }
  if (scope === "create-entry") {
    return language === "es"
      ? "El movimiento fue registrado correctamente."
      : "The transaction was registered successfully.";
  }

  return (
    fallback ||
    (language === "es"
      ? "La acción se completó correctamente."
      : "The action completed successfully.")
  );
}
