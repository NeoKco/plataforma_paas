# E2E Browser

Primer corte de pruebas `browser` del frontend con `Playwright`.

Cobertura inicial:

- login de `platform_admin`
- navegación base de `platform_admin`
- lifecycle básico de tenant en `platform_admin` (`create`, `archive`, `restore`)
- acceso rápido al `tenant_portal` desde `Tenants` con slug precargado
- bloqueo visible del acceso rápido al `tenant_portal` cuando el tenant todavía no es elegible
- matriz visible por rol en `platform_admin` para `admin` y `support`
- workspace de `Billing` con evento tenant y reconcile individual
- workspace de `Billing` con reconcile batch sobre eventos filtrados
- `Histórico tenants` con filtros, export y detalle del retiro
- visibilidad de job nuevo en `Provisioning` después de crear tenant
- ejecución manual de un job `pending` desde `Provisioning`
- requeue de un job `failed` desde `Provisioning`
- disparo de `schema auto-sync` desde `Provisioning`
- requeue individual de una fila DLQ desde `Provisioning` cuando el backend usa broker
- requeue batch de filas DLQ filtradas desde `Provisioning` cuando el backend usa broker
- filtros finos DLQ por `error contains` y revisión de `delay/reset attempts` antes del requeue individual cuando el backend usa broker
- login de `tenant_portal`
- enforcement visible de límites de usuarios activos en `tenant_portal`
- enforcement visible de límites de `finance` en `tenant_portal`
- enforcement de límites mensuales de `finance` en `tenant_portal`
- smoke real de `finance` creando una transacción
- smoke de adjuntos en `finance`
- smoke de anulación en `finance`
- smoke de conciliación en `finance`

Specs actuales:

- [platform-admin.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin.smoke.spec.ts)
- [platform-admin-tenant-lifecycle.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-lifecycle.smoke.spec.ts)
- [platform-admin-tenant-portal-access.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-portal-access.smoke.spec.ts)
- [platform-admin-tenant-portal-blocked.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-portal-blocked.smoke.spec.ts)
- [platform-admin-role-access.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-role-access.smoke.spec.ts)
- [platform-admin-billing-reconcile.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-billing-reconcile.smoke.spec.ts)
- [platform-admin-billing-batch-reconcile.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-billing-batch-reconcile.smoke.spec.ts)
- [platform-admin-tenant-history.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-history.smoke.spec.ts)
- [platform-admin-provisioning.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning.smoke.spec.ts)
- [platform-admin-provisioning-run-now.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-run-now.smoke.spec.ts)
- [platform-admin-provisioning-retry.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-retry.smoke.spec.ts)
- [platform-admin-schema-auto-sync.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-schema-auto-sync.smoke.spec.ts)
- [platform-admin-provisioning-dlq-row.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-row.smoke.spec.ts)
- [platform-admin-provisioning-dlq.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq.smoke.spec.ts)
- [platform-admin-provisioning-dlq-filters.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-filters.smoke.spec.ts)
- [tenant-portal-users-limit.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-users-limit.smoke.spec.ts)
- [tenant-portal-users-admin-limit.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-users-admin-limit.smoke.spec.ts)
- [tenant-portal-users-monthly-limit.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-users-monthly-limit.smoke.spec.ts)
- [tenant-portal-finance-limit.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-limit.smoke.spec.ts)
- [tenant-portal-finance-limit-precedence.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-limit-precedence.smoke.spec.ts)
- [tenant-portal-finance-monthly-limit.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-monthly-limit.smoke.spec.ts)
- [tenant-portal-finance-monthly-type-limits.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-monthly-type-limits.smoke.spec.ts)
- [tenant-portal-finance-catalogs.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-catalogs.smoke.spec.ts)
- [tenant-portal-finance-budgets.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-budgets.smoke.spec.ts)
- [tenant-portal-finance-budgets-advanced.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-budgets-advanced.smoke.spec.ts)
- [tenant-portal-finance-settings.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-settings.smoke.spec.ts)
- [tenant-portal-finance-loans.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-loans.smoke.spec.ts)
- [tenant-portal-finance-loans-batch.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-loans-batch.smoke.spec.ts)
- [tenant-portal-finance-loans-accounting.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-loans-accounting.smoke.spec.ts)
- [tenant-portal-finance.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance.smoke.spec.ts)
- [tenant-portal-finance-attachments-void.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-attachments-void.smoke.spec.ts)
- [tenant-portal-finance-reconciliation.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-reconciliation.smoke.spec.ts)

Variables de entorno:

- usar `.env.e2e.example` como referencia
- si tu demo local usa otro tenant o credenciales, sobreescribe `E2E_TENANT_*` y `E2E_PLATFORM_*`
- si `Playwright` no encuentra su browser exacto, puedes apuntar `E2E_CHROMIUM_EXECUTABLE_PATH` a un `chromium` ya instalado
- el baseline actualmente validado usa `empresa-bootstrap`, porque quedó `active`, con login operativo y datos reproducibles para los smokes tenant
- si tu entorno no tiene ese tenant o usa otra clave, sobreescribe `E2E_TENANT_*`

Comandos útiles:

- `npm run e2e:platform`
- `npm run e2e:tenant`
- `npm run e2e`

Notas:

- el backend debe estar levantado antes de correr las pruebas
- el frontend puede levantarse automáticamente desde `playwright.config.ts`, o reutilizar uno existente con `E2E_USE_EXISTING_FRONTEND=1`
- para instalar el navegador local usa `npm run e2e:install`
- el baseline tenant actualmente validado es `empresa-bootstrap`
- credenciales validadas para esta iteración:
	- `E2E_TENANT_SLUG=empresa-bootstrap`
	- `E2E_TENANT_EMAIL=admin@empresa-bootstrap.local`
	- `E2E_TENANT_PASSWORD=TenantAdmin123!`
- cuando el smoke sube una imagen en `finance`, el frontend la comprime antes del upload y el nombre final visible queda en `WEBP`
- `npm run e2e:platform` ya ejecuta todo el bloque `platform-admin*.spec.ts`, no solo el smoke de login/navegación base
- `npm run e2e:tenant` ya ejecuta todo el bloque `tenant-portal*.spec.ts`, no solo el smoke base de `finance`
- el smoke de `retry` de provisioning siembra un job `failed` controlado en la DB de control usando el Python del backend; si tu entorno usa otra ruta, sobreescribe `E2E_BACKEND_PYTHON`
- el smoke de DLQ requiere `PROVISIONING_DISPATCH_BACKEND=broker`; si el entorno usa `database`, el spec queda omitido automáticamente
- el smoke DLQ individual y el smoke DLQ batch comparten ese requisito broker-only y se omiten automáticamente en backend `database`
- los smokes de límites tenant ahora fijan y limpian overrides por control DB para evitar fragilidad al preparar estado por UI
- el smoke de roles `platform_admin` crea un `admin` efímero, valida sus redirecciones/navegación visibles y luego crea un `support` efímero para congelar el modo solo lectura del bloque `Usuarios de plataforma`
- el smoke de `Billing` crea un tenant efímero, siembra un evento `invoice.payment_failed` por backend-control y valida la lectura del workspace tenant más el reconcile individual sobre la fila persistida
- el smoke batch de `Billing` crea un tenant efímero, siembra dos eventos persistidos del mismo filtro y valida `Reconciliar eventos filtrados` sobre el workspace tenant
- el smoke de `Histórico tenants` crea un tenant efímero, le siembra billing, lo archiva y elimina para validar filtros, exportaciones y lectura del snapshot histórico desde UI real
- el smoke admin de `tenant users` valida bloqueo de creación de un admin extra y bloqueo de reactivación de un admin inactivo cuando `core.users.admin` queda agotado
- el smoke mensual de `tenant users` siembra un usuario del mes por backend-control y valida que `core.users.monthly` bloquee nuevas altas en el portal
- el smoke de precedencia de `finance` fuerza a la vez `finance.entries` y `finance.entries.monthly` para validar que el bloqueo visible prioriza el límite total
- el smoke mensual de `finance` fija `finance.entries.monthly` sobre el uso real del mes y valida el bloqueo de nuevas transacciones
- el smoke mensual por tipo de `finance` fija `finance.entries.monthly.income` y `finance.entries.monthly.expense` sobre el uso real del tenant para validar bloqueos específicos por ingreso y egreso
- el smoke de catálogos `finance` valida altas básicas, desactivación y borrado seguro de cuentas y categorías desde `tenant_portal`
- el smoke de `finance budgets` valida alta de presupuesto mensual y clonación al mes visible para cubrir el primer flujo operativo de planificación
- el smoke avanzado de `finance budgets` valida aplicación de plantilla sobre el mes visible y ajuste guiado de foco para desactivar categorías sin uso
- el smoke de `finance settings` valida configuración operativa con altas y mutaciones sobre monedas, tipos de cambio y parámetros del módulo
- el smoke de `finance loans` valida alta de préstamo y registro simple de pago de cuota desde el cronograma
- el smoke batch de `finance loans` valida pago en lote y reversa en lote sobre cuotas seleccionadas
- el smoke contable de `finance loans` valida lectura derivada tras pago + reversa y confirma exportaciones `CSV`/`JSON` desde el detalle del préstamo
- los smokes de `finance loans` quedaron estabilizados para tolerar cronogramas ya abiertos, distinguir formularios simples vs batch y usar selectores consistentes sobre `Cuenta origen`, nota operativa y motivo de reversa
- en esta iteración no hicieron falta cambios funcionales del módulo `finance`: los fallos detectados fueron de sincronización/selección E2E y el flujo real ya soportaba creación, pago simple, pago batch, reversa batch y exportación/lectura contable derivada
