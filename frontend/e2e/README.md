# E2E Browser

Estado actual de la suite `browser` del frontend con `Playwright`.

Marco transversal complementario:

- [Gobernanza de implementacion](/home/felipe/platform_paas/docs/architecture/implementation-governance.md)
- [E2E Browser Local](/home/felipe/platform_paas/docs/runbooks/frontend-e2e-browser.md)

Cobertura validada:

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
- login `tenant_portal` permitido en `past_due` con gracia y bloqueado al vencer la deuda
- enforcement visible de límites de `finance` en `tenant_portal`
- enforcement de límites mensuales de `finance` en `tenant_portal`
- smoke real de `finance` creando una transacción
- smoke de adjuntos en `finance`
- smoke de anulación en `finance`
- smoke de conciliación en `finance`
- visibilidad de datos importados de `ieris_app` en `business-core` y `maintenance`
- configuración tenant de auto-sync `maintenance -> finance` visible desde `Resumen técnico`

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
- [tenant-portal-login-billing.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-login-billing.smoke.spec.ts)
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
- [tenant-portal-business-core-maintenance-import.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-business-core-maintenance-import.smoke.spec.ts)

Variables de entorno:

- usar `.env.e2e.example` como referencia
- si tu demo local usa otro tenant o credenciales, sobreescribe `E2E_TENANT_*` y `E2E_PLATFORM_*`
- si `Playwright` no encuentra su browser exacto, puedes apuntar `E2E_CHROMIUM_EXECUTABLE_PATH` a un `chromium` ya instalado
- el baseline actualmente validado usa `empresa-bootstrap`, porque queda reservado como tenant estable para pruebas browser tenant
- si tu entorno no tiene ese tenant o usa otra clave, sobreescribe `E2E_TENANT_*`

## Regla oficial de continuidad

Todo cambio visible que toque un flujo ya cubierto por `Playwright` debe revisar esta suite.

Minimo esperado:

- actualizar el spec afectado si cambió la interacción real
- correr `npx playwright test <spec> --list` para validar compilación y wiring
- actualizar este README y el runbook si cambian baseline, credenciales, seeds, scripts o alcance

Si el flujo visible nuevo aun no tiene smoke, debe quedar anotado explícitamente en el `ROADMAP.md` o `CHANGELOG.md` del módulo.

Comandos útiles:

- `npm run e2e:platform`
- `npm run e2e:tenant`
- `npm run e2e`
- `../../scripts/dev/run_local_browser_baseline.sh`
- `../../scripts/dev/run_local_broker_dlq_baseline.sh`
- `PYTHONPATH=/home/felipe/platform_paas/backend /home/felipe/platform_paas/platform_paas_venv/bin/python /home/felipe/platform_paas/backend/app/scripts/cleanup_e2e_tenants.py --apply`

## Handoff rápido para otra IA

Si otra IA necesita correr la baseline tenant sin volver a descubrir el repo:

1. usar `empresa-bootstrap` como tenant baseline
2. validar primero que el spec compila/lista
3. luego correr `tenant` completo
4. si `Playwright` falla levantando frontend, reutilizar uno existente o usar el helper del repo

Secuencia mínima:

```bash
cd /home/felipe/platform_paas/frontend
npx playwright test e2e/specs/tenant-portal-business-core-maintenance-import.smoke.spec.ts --list
npm run e2e:tenant
```

Si el frontend ya está levantado:

```bash
cd /home/felipe/platform_paas/frontend
E2E_USE_EXISTING_FRONTEND=1 npm run e2e:tenant
```

Si quiere la ruta más estable del repo:

```bash
cd /home/felipe/platform_paas
scripts/dev/run_local_browser_baseline.sh --target tenant
```

Señales de éxito esperadas:

- login sobre `empresa-bootstrap`
- datos importados visibles en `business-core`
- `maintenance` mostrando `Pendientes`, `Costos y cobro` y `Sincronización automática a finanzas`

Baseline institucionalizado:

- el baseline browser oficial del repo queda automatizado en GitHub Actions mediante [.github/workflows/frontend-browser-e2e.yml](../../.github/workflows/frontend-browser-e2e.yml)
- ese workflow prepara PostgreSQL, corre migraciones, siembra `seed_frontend_demo_baseline`, compila el frontend y ejecuta `npm run e2e:platform` + `npm run e2e:tenant`
- además publica como artefactos el reporte HTML de Playwright, los `test-results` crudos y el log del backend para depuración de fallos en CI
- cuando se lanza manualmente con `workflow_dispatch`, permite además `target=all|platform|tenant` para revalidar solo el subset necesario
- los `3 skipped` broker-only de DLQ siguen siendo esperables dentro de ese baseline estándar porque CI corre con `PROVISIONING_DISPATCH_BACKEND=database`
- los escenarios broker-only quedan documentados y validados aparte cuando se necesite una pasada específica con Redis/broker real
- para desarrollo local existe además [scripts/dev/run_local_browser_baseline.sh](../../scripts/dev/run_local_browser_baseline.sh), que corre migraciones, siembra baseline, levanta backend si hace falta y ejecuta `build + e2e:platform + e2e:tenant`
- ese helper local acepta además `--target all|platform|tenant`, útil para revalidar solo la mitad necesaria sin correr toda la baseline principal
- los smokes `platform_admin` que crean tenants efímeros `e2e-*` no hacen limpieza total por sí mismos; para barrerlos de forma segura queda disponible [cleanup_e2e_tenants.py](/home/felipe/platform_paas/backend/app/scripts/cleanup_e2e_tenants.py), que usa `archive -> deprovision -> delete`
- para validar específicamente los `3` smokes DLQ broker-only existe [scripts/dev/run_local_broker_dlq_baseline.sh](../../scripts/dev/run_local_broker_dlq_baseline.sh), que levanta un stack paralelo `broker` sobre Redis y ejecuta solo esos casos
- ese helper local acepta además `--target all|batch|row|filters`, útil para revalidar un smoke DLQ concreto sin correr todo el bloque
- para CI manual de esos casos broker-only existe además [.github/workflows/frontend-broker-dlq-e2e.yml](../../.github/workflows/frontend-broker-dlq-e2e.yml), pensado para lanzarse con `workflow_dispatch`
- ese workflow manual acepta además `target=all|batch|row|filters`, útil para revalidar solo un smoke DLQ concreto cuando se toca esa zona

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
- el smoke de login billing tenant usa el baseline `empresa-bootstrap`, fuerza primero `past_due` con gracia para validar acceso permitido y luego `invoice overdue` sin gracia para congelar el mensaje visible de bloqueo en el login
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
- el smoke tenant de importación valida que `empresa-bootstrap` expone en UI datos ya migrados desde `ieris_app` para `business-core` y `maintenance`, sin depender de la BD legacy en runtime
- ese mismo smoke ya valida además la tarjeta visible de política tenant para auto-sync `maintenance -> finance` dentro de `Resumen técnico`
- estado validado al cierre actual:
	- `npm run e2e:platform` → `12 passed`, `3 skipped`
	- `npm run e2e:tenant` → `22 passed`
	- los `3 skipped` corresponden a escenarios DLQ broker-only cuando el entorno no usa `PROVISIONING_DISPATCH_BACKEND=broker`
	- los `3` escenarios DLQ broker-only también quedaron verificados aparte sobre un stack local paralelo en modo `broker` apuntando a Redis, con `3 passed`
	- fuera de esos casos dependientes de entorno, el frente E2E browser principal queda prácticamente cerrado
