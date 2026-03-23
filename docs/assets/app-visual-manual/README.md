# Capturas del Manual Visual

Guardar aqui las capturas del recorrido visual de la app.

Nombres sugeridos:

- `00-installer-first-run.png`
- `01-platform-login.png`
- `02-platform-dashboard.png`
- `03-tenants-catalog.png`
- `04-tenant-pending.png`
- `05a-tenant-active-header.png`
- `05b-tenant-active-usage.png`
- `05c-tenant-billing-past-due-summary.png`
- `05d-tenant-billing-controls-identity.png`
- `05e-tenant-billing-controls-identity-detail.png`
- `05f-tenant-module-limits-finance-override.png`
- `05g-tenant-module-limits-users-admin-override.png`
- `06a-provisioning-jobs-overview.png`
- `06b-provisioning-metrics-alerts.png`
- `06c-provisioning-dlq.png`
- `07a-billing-overview-filters.png`
- `07b-billing-summary-alerts-workspace.png`
- `07c-billing-tenant-events-reconcile.png`
- `07d-billing-reconciled-workspace.png`
- `08a-platform-settings-overview.png`
- `08b-platform-settings-capabilities.png`
- `08c-platform-settings-enums-scope.png`
- `09-tenant-portal-login.png`
- `10-tenant-portal-overview.png`
- `10b-tenant-portal-posture-current-user.png`
- `10c-tenant-portal-module-usage.png`
- `10d-tenant-portal-overview-billing-posture.png`
- `10e-tenant-portal-module-usage-live.png`
- `10f-tenant-portal-module-usage-multi-limit.png`
- `11a-tenant-users-overview.png`
- `11b-tenant-users-form-list.png`
- `11c-tenant-users-created-success.png`
- `11d-tenant-users-admin-limit-blocked.png`
- `11e-tenant-users-admin-reactivation-attempt.png`
- `11f-tenant-users-admin-reactivation-blocked.png`
- `12a-tenant-finance-overview-form.png`
- `12b-tenant-finance-entry-created.png`
- `12c-tenant-finance-usage-before-limit-override.png`
- `12d-tenant-finance-at-limit-override.png`
- `12e-tenant-finance-limit-blocked-message.png`

Nombres de pruebas guiadas recientes:

- `05e-tenant-billing-controls-identity-detail.png`: detalle fino del bloque billing en `Tenants`
- `10d-tenant-portal-overview-billing-posture.png`: overview tenant con billing visible
- `10e-tenant-portal-module-usage-live.png`: uso por modulo despues de crear usuarios y movimientos
- `11c-tenant-users-created-success.png`: alta de usuario con feedback verde
- `12b-tenant-finance-entry-created.png`: movimiento financiero ya creado con KPIs actualizados
- `05f-tenant-module-limits-finance-override.png`: ajuste central del limite `finance.entries`
- `05g-tenant-module-limits-users-admin-override.png`: ajuste central del limite `core.users.admin`
- `12c-tenant-finance-usage-before-limit-override.png`: lectura normal de uso antes del override
- `12d-tenant-finance-at-limit-override.png`: modulo `finance.entries` en `al_límite` despues del override
- `12e-tenant-finance-limit-blocked-message.png`: intento bloqueado cuando el modulo ya esta al limite
- `10f-tenant-portal-module-usage-multi-limit.png`: uso por modulo con `finance.entries` y `core.users.admin` ya tensionados
- `11d-tenant-users-admin-limit-blocked.png`: intento bloqueado al crear un segundo admin sin cupo
- `11e-tenant-users-admin-reactivation-attempt.png`: estado previo a reactivar un admin cuando ya existe uno activo
- `11f-tenant-users-admin-reactivation-blocked.png`: reactivacion bloqueada con mensaje claro de limite admin

Este directorio existe para que el manual visual tenga una ubicacion estable y no queden imagenes sueltas por el repositorio.
