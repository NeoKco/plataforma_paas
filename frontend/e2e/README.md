# E2E Browser

Estado actual de la suite `browser` del frontend con `Playwright`.

Marco transversal complementario:

- [Gobernanza de implementacion](/home/felipe/platform_paas/docs/architecture/implementation-governance.md)
- [E2E Browser Local](/home/felipe/platform_paas/docs/runbooks/frontend-e2e-browser.md)

Cobertura validada:

- login de `platform_admin`
- navegación base de `platform_admin`
- lifecycle básico de tenant en `platform_admin` (`create`, `archive`, `restore`)
- enforcement visible de `Nuevo tenant` con admin inicial explícito y preview de módulos por `plan`
- export portable por tenant desde `Tenants`
- import portable controlado por tenant desde `Tenants`, incluyendo `dry_run` y `apply`
- export/import portable también desde `tenant_portal` para admin tenant
- selección visible del modo portable:
  - `Paquete completo`
  - `Solo datos funcionales`
- acceso rápido al `tenant_portal` desde `Tenants` con slug precargado
- bloqueo visible del acceso rápido al `tenant_portal` cuando el tenant todavía no es elegible
- acceso rápido a `Provisioning` desde `Tenants` con `tenantSlug` precargado
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
- navegación asistida desde `Fallos por código` hacia filtros DLQ dentro de `Provisioning`
- `requeue guiado` desde una fila DLQ dentro de `Provisioning` cuando el backend usa broker
- visibilidad del `dispatch backend` activo dentro de `Provisioning`, para distinguir si el entorno publicado corre con `broker` o `database`
- gating visible de la superficie `Operación DLQ`, para que el panel broker-only desaparezca o se reemplace cuando el entorno corre con `database`
- foco broker-only de `familias DLQ visibles` dentro de `Provisioning`, agrupando el subconjunto visible antes de reencolar
- batch broker-only homogéneo sobre múltiples `familias DLQ visibles`, con selección explícita y requeue por lote sobre el mismo `tenant + job type`
- recomendación operativa broker-only sobre `familias DLQ visibles`, para decidir entre `single`, `family`, `family-batch` o limpiar selección según el subconjunto visible
- prioridad ejecutiva broker-only por `tenant` visible, para aislar primero un tenant cargado antes de operar sus familias
- diagnóstico técnico broker-only `DLQ / BD visible`, para distinguir si el atasco dominante cae en rol postgres, base postgres, esquema tenant o drop de base tenant
- matriz broker-only `tenant + capa técnica`, para aislar la combinación visible correcta entre tenant y capa técnica antes de reencolar
- login de `tenant_portal`
- enforcement visible de límites de usuarios activos en `tenant_portal`
- login `tenant_portal` permitido en `past_due` con gracia y bloqueado al vencer la deuda
- visibilidad del sidebar `tenant_portal` alineada a `effective_enabled_modules`
- enforcement visible de límites de `finance` en `tenant_portal`
- enforcement de límites mensuales de `finance` en `tenant_portal`
- smoke real de `finance` creando una transacción
- smoke de adjuntos en `finance`
- smoke de anulación en `finance`
- smoke de conciliación en `finance`
- visibilidad de datos importados de `ieris_app` en `business-core` y `maintenance`
- configuración tenant de auto-sync `maintenance -> finance` visible desde `Resumen técnico`
- defaults efectivos `maintenance -> finance` visibles desde `Resumen técnico` y `Costos y cobro`, resueltos por backend
- las mejoras futuras no bloqueantes de `maintenance` quedan documentadas en [docs/modules/maintenance/improvements/README.md](/home/felipe/platform_paas/docs/modules/maintenance/improvements/README.md) y deben sumar smoke solo cuando introduzcan un flujo visible nuevo

Specs actuales:

- [platform-admin.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin.smoke.spec.ts)
- [platform-admin-installer-availability.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-installer-availability.smoke.spec.ts)
- [platform-admin-tenant-lifecycle.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-lifecycle.smoke.spec.ts)
- [platform-admin-tenant-portal-access.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-portal-access.smoke.spec.ts)
- [platform-admin-tenant-portal-blocked.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-portal-blocked.smoke.spec.ts)
- [platform-admin-tenant-provisioning-context.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-provisioning-context.smoke.spec.ts)
- [platform-admin-role-access.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-role-access.smoke.spec.ts)
- [platform-admin-billing-reconcile.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-billing-reconcile.smoke.spec.ts)
- [platform-admin-billing-batch-reconcile.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-billing-batch-reconcile.smoke.spec.ts)
- [platform-admin-tenant-history.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-history.smoke.spec.ts)
- [platform-admin-provisioning.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning.smoke.spec.ts)
- [platform-admin-provisioning-run-now.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-run-now.smoke.spec.ts)
- [platform-admin-provisioning-retry.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-retry.smoke.spec.ts)
- [platform-admin-schema-auto-sync.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-schema-auto-sync.smoke.spec.ts)
- [platform-admin-tenants-create-form.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenants-create-form.smoke.spec.ts)
- [platform-admin-tenant-data-export.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-data-export.smoke.spec.ts)
- [tenant-portal-data-portability.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-data-portability.smoke.spec.ts)
- [platform-admin-provisioning-dlq-row.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-row.smoke.spec.ts)
- [platform-admin-provisioning-dlq.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq.smoke.spec.ts)
- [platform-admin-provisioning-dlq-filters.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-filters.smoke.spec.ts)
- [platform-admin-provisioning-dlq-investigation.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-investigation.smoke.spec.ts)
- [platform-admin-provisioning-observability-history.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-observability-history.smoke.spec.ts)
- [platform-admin-provisioning-observability-visible.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-observability-visible.smoke.spec.ts)
- [platform-admin-provisioning-guided-requeue.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-guided-requeue.smoke.spec.ts)
- [platform-admin-provisioning-dispatch-capability.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dispatch-capability.smoke.spec.ts)
- [platform-admin-provisioning-dlq-surface-gating.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-surface-gating.smoke.spec.ts)
- [platform-admin-provisioning-dlq-family-focus.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-family-focus.smoke.spec.ts)
- [platform-admin-provisioning-dlq-family-requeue.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-family-requeue.smoke.spec.ts)
- [platform-admin-provisioning-dlq-family-batch-requeue.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-family-batch-requeue.smoke.spec.ts)
- [platform-admin-provisioning-dlq-family-recommendation.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-family-recommendation.smoke.spec.ts)
- [platform-admin-provisioning-dlq-tenant-focus.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-tenant-focus.smoke.spec.ts)
- [platform-admin-provisioning-dlq-technical-diagnosis.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-technical-diagnosis.smoke.spec.ts)
- [platform-admin-provisioning-dlq-tenant-technical-matrix.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-tenant-technical-matrix.smoke.spec.ts)
- [tenant-portal-users-limit.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-users-limit.smoke.spec.ts)
- [tenant-portal-login-billing.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-login-billing.smoke.spec.ts)
- [tenant-portal-sidebar-modules.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-sidebar-modules.smoke.spec.ts)
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
- [tenant-portal-maintenance-finance-defaults.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-maintenance-finance-defaults.smoke.spec.ts)

Variables de entorno:

- usar `.env.e2e.example` como referencia
- si tu demo local usa otro tenant o credenciales, sobreescribe `E2E_TENANT_*` y `E2E_PLATFORM_*`
- si un smoke necesita sembrar datos contra un backend distinto al repo local, sobreescribe además `E2E_BACKEND_ROOT` y `E2E_BACKEND_PYTHON`
- si además ese árbol publicado usa un env protegido no legible para tu usuario, sobreescribe `E2E_BACKEND_ENV_FILE` apuntando a una copia temporal legible del env real del servicio
- si `Playwright` no encuentra su browser exacto, puedes apuntar `E2E_CHROMIUM_EXECUTABLE_PATH` a un `chromium` ya instalado
- el baseline actualmente validado usa `empresa-bootstrap`, porque queda reservado como tenant estable para pruebas browser tenant
- si tu entorno no tiene ese tenant o usa otra clave, sobreescribe `E2E_TENANT_*`
- en el mini PC ya existe además un `staging` separado en `http://192.168.7.42:8081`; usarlo solo cuando quieras validar sobre el entorno de pruebas publicado, no para la baseline local por defecto
- si un smoke publicado en `staging` necesita sembrar datos backend, no basta con `source /opt/platform_paas_staging/.env`: el servicio vivo usa `/opt/platform_paas_staging/.env.staging`
- si ese `.env.staging` está protegido para el usuario de servicio, el comando publicado puede requerir `sudo`, `HOME=/home/felipe` y luego devolver la propiedad de `frontend/e2e/test-results` y `frontend/e2e/playwright-report` a `felipe`
- en este entorno de agente, algunos smokes tenant-side publicados pueden fallar al arrancar Chromium dentro del sandbox con `SIGTRAP` o errores de `sandbox_host_linux`; si ocurre, reejecutar el mismo spec fuera del sandbox antes de diagnosticar un fallo funcional
- si quieres validar el instalador inicial, primero resetea `staging` a modo bootstrap con [reset_staging_bootstrap.sh](/home/felipe/platform_paas/deploy/reset_staging_bootstrap.sh) y luego corre el smoke opt-in del instalador
- para evitar ensuciar `production`, los seeds E2E están bloqueados por defecto:
  - activa `E2E_ALLOW_PROD_SEED=1` solo si necesitas crear tenants/datos en producción
  - usa `E2E_AUTO_CLEANUP=1` para eliminar automáticamente los tenants E2E creados por seeds al terminar la suite

## Regla oficial de continuidad

Todo cambio visible que toque un flujo ya cubierto por `Playwright` debe revisar esta suite.

Minimo esperado:

- actualizar el spec afectado si cambió la interacción real
- correr `npx playwright test <spec> --list` para validar compilación y wiring
- actualizar este README y el runbook si cambian baseline, credenciales, seeds, scripts o alcance

Regla práctica adicional para esta iteración:

- si la UI abrió un modal o `detail dialog`, el spec debe abrirlo explícitamente y acotar sus selectores a ese contenedor activo
- evitar asumir que `page.locator("form").first()` o un `getByLabel(...)` global siguen apuntando al flujo correcto cuando la pantalla pasó a un patrón `modal-first`
- cuando una alta deja abierto un `detail modal` operativo, el spec debe decidir explícitamente si continúa dentro de ese modal o si lo cierra antes de volver a interactuar con la grilla
- esto aplica ya tanto a `tenant_portal` como a `platform_admin`, especialmente en flujos de `Nuevo tenant` y `Nuevo usuario`
- desde `2026-04-08`, `Nuevo tenant` exige además admin explícito (`nombre`, `correo`, `password`) y los smokes deben rellenarlo vía [frontend/e2e/support/platform-admin.ts](support/platform-admin.ts)
- los módulos visibles de `Nuevo tenant` ya no se testean como toggles manuales; se leen como preview del `plan` seleccionado
- smoke visible específico del alta tenant:
  - [platform-admin-tenants-create-form.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenants-create-form.smoke.spec.ts)
  - valida que `Nuevo tenant` no habilite el submit sin admin inicial explícito
  - valida que el `plan` seleccionado muestre preview de módulos

Regla operativa adicional para artefactos de fallo:

- todo fallo `Playwright` debe dejar `trace`, screenshot final, video retenido y un adjunto `error-context`
- `error-context` resume al menos título del test, archivo, proyecto, URL final, headings visibles, diálogos abiertos y `storageState`
- la configuración oficial usa `trace: retain-on-failure`, `screenshot: only-on-failure` y `video: retain-on-failure`
- los artefactos se concentran en [frontend/e2e/test-results](test-results) y el reporte HTML en [frontend/e2e/playwright-report](playwright-report)

Regla operativa adicional para datos efímeros:

- los slugs, nombres y emails efímeros de `platform_admin` ya deben salir del helper [frontend/e2e/support/e2e-data.ts](support/e2e-data.ts)
- el mismo helper ya empezó a usarse también en `tenant_portal` para emails efímeros de usuarios, descripciones únicas de `finance` y fechas relativas de billing
- evitar seguir creando variantes locales con `Date.now()` disperso cuando el dato se usa para `tenantSlug`, usuarios de plataforma o identificadores visibles del smoke
- los helpers compartidos, como [frontend/e2e/support/finance.ts](support/finance.ts), también deben reutilizar ese generador cuando necesiten nombres o códigos únicos

Si el flujo visible nuevo aun no tiene smoke, debe quedar anotado explícitamente en el `ROADMAP.md` o `CHANGELOG.md` del módulo.

Comandos útiles:

- `npm run e2e:platform`
- `npm run e2e:tenant`
- `npm run e2e`
- `../../scripts/dev/run_local_browser_baseline.sh`
- `../../scripts/dev/run_local_broker_dlq_baseline.sh`
- `../../scripts/dev/run_staging_published_broker_dlq_smoke.sh`
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
- si corres el smoke broker-only nuevo [platform-admin-provisioning-guided-requeue.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-guided-requeue.smoke.spec.ts) sobre un published env no-broker, el resultado correcto también será `skipped`
- el smoke [platform-admin-provisioning-dispatch-capability.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dispatch-capability.smoke.spec.ts) sirve precisamente para fijar esa lectura visible antes de correr los casos broker-only
- el smoke [platform-admin-provisioning-dlq-surface-gating.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-surface-gating.smoke.spec.ts) valida además que la propia UI retire o reemplace acciones broker-only cuando el entorno publicado no usa `broker`
- el smoke [platform-admin-provisioning-dlq-family-focus.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-family-focus.smoke.spec.ts) valida el nuevo foco por familia DLQ; para published `staging` debe apuntar al árbol backend real con `E2E_BACKEND_ROOT=/opt/platform_paas_staging`, `E2E_BACKEND_PYTHON=/opt/platform_paas_staging/platform_paas_venv/bin/python` y `E2E_BACKEND_ENV_FILE=/tmp/platform_paas_staging.env`
- ese setup publicado ya quedó encapsulado en [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh)
- ejemplo corto:

```bash
cd /home/felipe/platform_paas
scripts/dev/run_staging_published_broker_dlq_smoke.sh --target family
```
- para validar el reintento directo de una familia homogénea:

```bash
cd /home/felipe/platform_paas
scripts/dev/run_staging_published_broker_dlq_smoke.sh --target family-requeue
```

- para validar el batch homogéneo sobre varias familias visibles:
 
```bash
cd /home/felipe/platform_paas
scripts/dev/run_staging_published_broker_dlq_smoke.sh --target family-batch
```

- para validar la recomendación operativa sobre la selección visible:

```bash
cd /home/felipe/platform_paas
scripts/dev/run_staging_published_broker_dlq_smoke.sh --target family-recommendation
```

- para validar la priorización ejecutiva por tenant visible:

```bash
cd /home/felipe/platform_paas
scripts/dev/run_staging_published_broker_dlq_smoke.sh --target tenant-focus
```
- para validar el diagnóstico técnico visible DLQ/BD:

```bash
cd /home/felipe/platform_paas
scripts/dev/run_staging_published_broker_dlq_smoke.sh --target technical
```

- para validar la matriz visible `tenant + capa técnica` sobre el publicado de `staging`:

```bash
cd /home/felipe/platform_paas
scripts/dev/run_staging_published_broker_dlq_smoke.sh --target matrix
```
- los escenarios broker-only quedan documentados y validados aparte cuando se necesite una pasada específica con Redis/broker real
- para desarrollo local existe además [scripts/dev/run_local_browser_baseline.sh](../../scripts/dev/run_local_browser_baseline.sh), que corre migraciones, siembra baseline, levanta backend si hace falta y ejecuta `build + e2e:platform + e2e:tenant`
- ese helper local acepta además `--target all|platform|tenant`, útil para revalidar solo la mitad necesaria sin correr toda la baseline principal
- los smokes `platform_admin` que crean tenants efímeros `e2e-*` ya quedan limpiados automáticamente al terminar [scripts/dev/run_local_browser_baseline.sh](../../scripts/dev/run_local_browser_baseline.sh) y [scripts/dev/run_local_broker_dlq_baseline.sh](../../scripts/dev/run_local_broker_dlq_baseline.sh); si se necesita conservarlos temporalmente, ambos helpers aceptan `--skip-e2e-cleanup`
- para barridos manuales o recuperación operativa sigue disponible [cleanup_e2e_tenants.py](/home/felipe/platform_paas/backend/app/scripts/cleanup_e2e_tenants.py), que usa `archive -> deprovision -> delete`
- para validar específicamente el bloque broker-only DLQ existe [scripts/dev/run_local_broker_dlq_baseline.sh](../../scripts/dev/run_local_broker_dlq_baseline.sh), que levanta un stack paralelo `broker` sobre Redis y delega el subset Playwright al runner compartido [run_broker_dlq_playwright_target.sh](../../scripts/dev/run_broker_dlq_playwright_target.sh)
- ese helper local acepta hoy `--target all|batch|row|filters|guided|family|family-requeue|family-batch|family-recommendation|tenant-focus|technical|matrix`, útil para revalidar un smoke o subgrupo broker-only concreto sin correr todo el bloque
- el helper published broker-only de `staging` acepta hoy `--target all|batch|row|filters|guided|family|family-requeue|family-batch|family-recommendation|tenant-focus|technical|matrix`
- para una pasada published curada de `Provisioning/DLQ` existe además [run_published_provisioning_baseline.sh](../../scripts/dev/run_published_provisioning_baseline.sh)
- ese baseline corre siempre:
  - `platform-admin-provisioning-dispatch-capability.smoke.spec.ts`
  - `platform-admin-provisioning-dlq-surface-gating.smoke.spec.ts`
  - `platform-admin-provisioning-observability-visible.smoke.spec.ts`
- y suma broker-only solo si el entorno publicado realmente usa `broker`
- para CI manual de esos casos broker-only existe además [.github/workflows/frontend-broker-dlq-e2e.yml](../../.github/workflows/frontend-broker-dlq-e2e.yml), pensado para lanzarse con `workflow_dispatch`
- ese workflow manual ya quedó alineado al mismo runner compartido y acepta `target=all|batch|row|filters|guided|family|family-requeue|family-batch|family-recommendation|tenant-focus|technical|matrix`

Notas:

- el backend debe estar levantado antes de correr las pruebas
- el frontend puede levantarse automáticamente desde `playwright.config.ts`, o reutilizar uno existente con `E2E_USE_EXISTING_FRONTEND=1`
- para instalar el navegador local usa `npm run e2e:install`
- el baseline tenant actualmente validado es `empresa-bootstrap`
- el smoke `platform-admin-installer-availability` no entra al baseline normal; solo corre si `E2E_EXPECT_INSTALLER=1`
- para usar ese smoke sobre el mini PC:
	- ejecutar `sudo bash deploy/reset_staging_bootstrap.sh --execute`
	- correr `E2E_BASE_URL=http://192.168.7.42:8081 E2E_EXPECT_INSTALLER=1 E2E_USE_EXISTING_FRONTEND=1 npx playwright test e2e/specs/platform-admin-installer-availability.smoke.spec.ts`
	- estado validado actual: `1 passed` sobre `staging bootstrap`
	- cuando termine esa validación, devolver `staging` a espejo con `sudo bash deploy/restore_staging_mirror.sh --execute`
- credenciales validadas para esta iteración:
	- `E2E_TENANT_SLUG=empresa-bootstrap`
	- `E2E_TENANT_EMAIL=admin@empresa-bootstrap.local`
	- `E2E_TENANT_PASSWORD=TenantAdmin123!`
- cuando el smoke sube una imagen en `finance`, el frontend la comprime antes del upload y el nombre final visible queda en `WEBP`
- `npm run e2e:platform` ya ejecuta todo el bloque `platform-admin*.spec.ts`, no solo el smoke de login/navegación base
- `npm run e2e:tenant` ya ejecuta todo el bloque `tenant-portal*.spec.ts`, no solo el smoke base de `finance`
- el smoke de `retry` de provisioning siembra un job `failed` controlado en la DB de control usando el Python del backend; si tu entorno usa otra ruta, sobreescribe `E2E_BACKEND_PYTHON`
- los smokes de `Provisioning` que siembran tenant/jobs pueden además usar `E2E_BACKEND_ROOT` para apuntar a un árbol publicado como `/opt/platform_paas_staging` y así compartir DB/control real del entorno browser
- cuando un smoke published broker-only solo necesita un tenant efímero de soporte, es preferible crearlo con `backend-control` en el mismo backend objetivo antes que depender del flujo UI `Nuevo tenant`
- el smoke de DLQ requiere `PROVISIONING_DISPATCH_BACKEND=broker`; si el entorno usa `database`, el spec queda omitido automáticamente
- el smoke DLQ individual y el smoke DLQ batch comparten ese requisito broker-only y se omiten automáticamente en backend `database`
- los smokes de límites tenant ahora fijan y limpian overrides por control DB para evitar fragilidad al preparar estado por UI
- el smoke [platform-admin-tenant-data-export.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-data-export.smoke.spec.ts) hoy valida el ciclo completo `export + dry_run + apply`
- ese smoke prioriza `empresa-bootstrap` como tenant baseline para evitar falsos negativos si `condominio-demo` arrastra una credencial técnica desalineada en un entorno heredado
- el smoke [tenant-portal-data-portability.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-data-portability.smoke.spec.ts) ya quedó validado sobre `staging` y `production`
- el smoke [platform-admin-provisioning-observability-history.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-observability-history.smoke.spec.ts) ya quedó validado sobre `staging` y `production`
- el smoke de roles `platform_admin` crea un `admin` efímero, valida sus redirecciones/navegación visibles y luego crea un `support` efímero para congelar el modo solo lectura del bloque `Usuarios de plataforma`
- el smoke de `Billing` crea un tenant efímero, siembra un evento `invoice.payment_failed` por backend-control y valida la lectura del workspace tenant más el reconcile individual sobre la fila persistida
- el smoke batch de `Billing` crea un tenant efímero, siembra dos eventos persistidos del mismo filtro y valida `Reconciliar eventos filtrados` sobre el workspace tenant
- el smoke de `Histórico tenants` crea un tenant efímero, le siembra billing, lo archiva y elimina para validar filtros, exportaciones y lectura del snapshot histórico desde UI real
- el smoke de login billing tenant usa el baseline `empresa-bootstrap`, fuerza primero `past_due` con gracia para validar acceso permitido y luego `invoice overdue` sin gracia para congelar el mensaje visible de bloqueo en el login
- el smoke `tenant-portal-sidebar-modules` reutiliza ese baseline y valida que `effective_enabled_modules` también gobierna visualmente el sidebar principal: en gracia siguen visibles `Resumen`, `Usuarios` y `Core negocio`, mientras `Finanzas` y `Mantenciones` desaparecen si la política efectiva no incluye `finance` ni `maintenance`
- durante esta iteración también se corrigió un desalineamiento real del `dev` local: CORS seguía apuntando a `4173` y faltaba declarar `TENANT_BILLING_GRACE_*` en `.env`, lo que impedía reproducir el gating tenant esperado en browser
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
	- `npm run e2e` → `34 passed`, `3 skipped`
	- revalidado localmente otra vez el `2026-04-04` sobre `empresa-bootstrap` después de alinear los smokes tenant con la UI actual basada en modales para `Usuarios`, `Finance`, `Business Core` y `Maintenance`
	- revalidado también el bloque `platform_admin` el `2026-04-04` después de alinear los smokes con los modales actuales de `Nuevo tenant` y `Nuevo usuario`
	- los `3 skipped` corresponden a escenarios DLQ broker-only cuando el entorno no usa `PROVISIONING_DISPATCH_BACKEND=broker`
	- los `3` escenarios DLQ broker-only también quedaron verificados aparte sobre un stack local paralelo en modo `broker` apuntando a Redis, con `3 passed`
	- fuera de esos casos dependientes de entorno, el frente E2E browser principal queda prácticamente cerrado
