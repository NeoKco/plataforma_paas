# E2E Browser Local

Este runbook deja el primer stack `E2E` browser del proyecto sobre `Playwright`.

Marco transversal complementario:

- [Gobernanza de implementacion](../architecture/implementation-governance.md)

No busca cubrir todo el producto en la primera iteración.

Busca dejar una base útil, mantenible y rápida para validar recorridos reales de:

- `platform_admin`
- `tenant_portal`
- `finance`

## Ubicación

Archivos principales:

- [playwright.config.ts](/home/felipe/platform_paas/frontend/playwright.config.ts)
- [package.json](/home/felipe/platform_paas/frontend/package.json)
- [README.md](/home/felipe/platform_paas/frontend/e2e/README.md)
- [auth.ts](/home/felipe/platform_paas/frontend/e2e/support/auth.ts)
- [env.ts](/home/felipe/platform_paas/frontend/e2e/support/env.ts)
- [platform-admin.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin.smoke.spec.ts)
- [platform-admin-tenant-lifecycle.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-lifecycle.smoke.spec.ts)
- [platform-admin-tenant-portal-access.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-portal-access.smoke.spec.ts)
- [platform-admin-tenant-portal-blocked.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-portal-blocked.smoke.spec.ts)
- [platform-admin-tenant-provisioning-context.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-provisioning-context.smoke.spec.ts)
- [platform-admin-provisioning.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning.smoke.spec.ts)
- [platform-admin-provisioning-run-now.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-run-now.smoke.spec.ts)
- [platform-admin-provisioning-retry.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-retry.smoke.spec.ts)
- [platform-admin-schema-auto-sync.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-schema-auto-sync.smoke.spec.ts)
- [platform-admin-tenants-create-form.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenants-create-form.smoke.spec.ts)
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
- [tenant-portal-sidebar-modules.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-sidebar-modules.smoke.spec.ts)
- [tenant-portal-finance-limit.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-limit.smoke.spec.ts)
- [tenant-portal-finance-limit-precedence.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-limit-precedence.smoke.spec.ts)
- [tenant-portal-finance-monthly-limit.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-monthly-limit.smoke.spec.ts)
- [tenant-portal-finance-monthly-type-limits.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-monthly-type-limits.smoke.spec.ts)
- [tenant-portal-finance-catalogs.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-catalogs.smoke.spec.ts)
- [tenant-portal-finance-budgets.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-budgets.smoke.spec.ts)
- [tenant-portal-finance-loans.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-loans.smoke.spec.ts)
- [tenant-portal-finance-loans-batch.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-loans-batch.smoke.spec.ts)
- [tenant-portal-finance.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance.smoke.spec.ts)
- [tenant-portal-finance-attachments-void.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-attachments-void.smoke.spec.ts)
- [tenant-portal-finance-reconciliation.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-reconciliation.smoke.spec.ts)
- [tenant-portal-business-core-maintenance-import.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-business-core-maintenance-import.smoke.spec.ts)
- [tenant-portal-maintenance-finance-defaults.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-maintenance-finance-defaults.smoke.spec.ts)
- [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh)

## Alcance inicial

Cobertura actual:

- login `platform_admin`
- navegación corta a `Tenants` y `Provisioning`
- acceso rápido al `tenant_portal` desde `Tenants` con `slug` precargado
- bloqueo visible del acceso rápido al `tenant_portal` cuando el tenant no está operativo para abrir portal
- lifecycle básico de tenant en `platform_admin` con `create`, `archive` y `restore`
- enforcement visible de `Nuevo tenant` con admin inicial explícito y preview de módulos por `plan`
- visibilidad de job nuevo en `Provisioning` después de crear tenant
- ejecución manual de un job `pending` desde `Provisioning`
- requeue de un job `failed` desde `Provisioning`
- disparo de `schema auto-sync` desde `Provisioning`
- salto desde `Tenants` a `Provisioning` con `tenantSlug` precargado
- requeue individual de una fila DLQ desde `Provisioning` cuando el backend usa broker
- requeue batch de filas DLQ filtradas desde `Provisioning` cuando el backend usa broker
- filtros finos DLQ por texto de error y revisión de `delay/reset attempts` antes del requeue individual cuando el backend usa broker
- navegación asistida desde `Fallos por código` y `Alertas activas` hacia el panel `Operación DLQ`, con prefill visible de filtros
- observabilidad visible de `Provisioning` con snapshots recientes por tenant e historial de alertas persistidas
- `requeue guiado` desde una fila DLQ para acotar filtros y disparar el reintento sugerido
- visibilidad del `dispatch backend` activo dentro de `Provisioning`, para fijar si el entorno corre con `broker` o `database`
- gating visible de la superficie `Operación DLQ`, para que el panel broker-only se alinee al backend activo del entorno publicado
- foco broker-only de `familias DLQ visibles`, para convertir una familia homogénea del subconjunto visible en filtros operativos coherentes
- batch broker-only homogéneo sobre múltiples `familias DLQ visibles`, con selección explícita y requeue sobre el mismo `tenant + job type`
- recomendación operativa broker-only sobre `familias DLQ visibles`, para decidir entre `single`, `family`, `family-batch` o limpiar selección según el subconjunto actual
- prioridad ejecutiva broker-only por `tenant` visible, para aislar primero un tenant cargado antes de operar sus familias
- diagnóstico técnico broker-only `DLQ / BD visible`, para distinguir si el atasco dominante cae en rol postgres, base postgres, esquema tenant o drop de base tenant
- matriz broker-only `tenant + capa técnica`, para aislar la combinación visible correcta entre tenant y capa técnica antes de reencolar
- login `tenant_portal`
- enforcement visible de límites de usuarios activos en `tenant_portal`
- visibilidad del sidebar `tenant_portal` según `effective_enabled_modules`
- enforcement visible de cuota admin y reactivación bloqueada en `tenant_portal > Usuarios`
- enforcement visible de límite mensual de creación en `tenant_portal > Usuarios`
- enforcement visible de límites de `finance` en `tenant_portal`
- precedencia visible de `finance.entries` sobre `finance.entries.monthly` cuando ambos quedan agotados
- enforcement de límites mensuales de `finance.entries.monthly` en `tenant_portal`
- enforcement de límites mensuales por tipo `finance.entries.monthly.income` y `finance.entries.monthly.expense` en `tenant_portal`
- mantenimiento básico de catálogos `finance` para cuentas y categorías en `tenant_portal`
- flujo base de `finance budgets` con creación y clonación mensual en `tenant_portal`
- flujo avanzado de `finance budgets` con plantillas y ajustes guiados sobre el mes visible en `tenant_portal`
- flujo base de `finance loans` con creación de préstamo y pago simple de cuota en `tenant_portal`
- operaciones batch de `finance loans` con pago y reversa sobre cuotas seleccionadas en `tenant_portal`
- lectura contable derivada y exportaciones `CSV`/`JSON` de `finance loans` en `tenant_portal`
- alta básica de una transacción en `finance`
- carga de adjunto sobre transacción creada en `finance`
- anulación básica de una transacción creada en `finance`
- conciliación básica de una transacción creada en `finance`
- visibilidad de datos ya importados desde `ieris_app` en `business-core` y `maintenance`
- visibilidad de la política tenant de auto-sync `maintenance -> finance` desde `Resumen técnico`
- visibilidad de los defaults efectivos `maintenance -> finance` desde `Resumen técnico` y `Costos y cobro`, resueltos por backend

Esto no reemplaza:

- tests backend
- pruebas guiadas manuales
- validación visual profunda

## Regla de mantenimiento de E2E

Cuando un cambio visible toca un flujo ya cubierto por browser:

- actualizar el spec existente antes de abrir uno nuevo
- si solo cambia copy o estructura menor, al menos validar `--list`
- si cambia el flujo real, correr el subset afectado o la baseline correspondiente
- actualizar este runbook y [frontend/e2e/README.md](/home/felipe/platform_paas/frontend/e2e/README.md) si cambia tenant baseline, credenciales, scripts o alcance

Regla operativa añadida tras la estabilización tenant de `2026-04-04`:

- en `tenant_portal` ya no conviene depender de selectores globales del tipo `form().first()` cuando el flujo real abre un modal
- en `platform_admin` aplica la misma regla para `Nuevo tenant` y `Nuevo usuario`
- si el flujo abre `Nueva cuenta`, `Nuevo usuario`, `Nueva mantención`, `Nueva programación`, `Detalle operacional` o cualquier diálogo similar, el spec debe localizar primero el modal visible y trabajar dentro de él
- si una acción deja abierto un modal de detalle, el spec debe cerrarlo explícitamente antes de volver a interactuar con botones de fila como `Conciliar`, `Anular`, `Activar` o equivalentes

Regla operativa añadida para fallos Playwright:

- la suite debe retener `trace`, screenshot final y video en cualquier fallo real
- además, cada spec adjunta un `error-context` en markdown con URL final, headings visibles, diálogos abiertos y `storageState`
- el objetivo es que toda regresión visible deje evidencia utilizable sin depender de reproducción manual inmediata
- los artefactos quedan en [frontend/e2e/test-results](../../frontend/e2e/test-results) y el reporte consolidado en [frontend/e2e/playwright-report](../../frontend/e2e/playwright-report)

Si el flujo visible no tiene cobertura browser todavia, dejar explicitado en el roadmap o en el `CHANGELOG` del modulo por que sigue sin smoke.

## Regla de handoff para otra IA

La otra IA debe poder descubrir rapido:

- cual es el tenant baseline
- que spec valida el flujo tocado
- que comando rapido confirma que la suite compila
- que subset conviene correr primero
- que dependencias de entorno existen

Por eso, cada cambio E2E o cada cambio visible importante debe dejar actualizados:

- [frontend/e2e/README.md](/home/felipe/platform_paas/frontend/e2e/README.md)
- este runbook
- el roadmap o changelog del modulo afectado cuando cambia cobertura real

## Precondiciones

- backend levantado
- datos demo o tenant real de desarrollo disponibles
- navegador `chromium` instalado para `Playwright`

## Variables de entorno

Archivo de referencia:

- [\.env.e2e.example](/home/felipe/platform_paas/frontend/.env.e2e.example)

Variables principales:

- `E2E_BASE_URL`
- `E2E_USE_EXISTING_FRONTEND`
- `E2E_CHROMIUM_EXECUTABLE_PATH`
- `E2E_PLATFORM_EMAIL`
- `E2E_PLATFORM_PASSWORD`
- `E2E_TENANT_SLUG`
- `E2E_TENANT_EMAIL`
- `E2E_TENANT_PASSWORD`
- `E2E_BACKEND_ROOT`
- `E2E_BACKEND_PYTHON`
- `E2E_BACKEND_ENV_FILE`
- `E2E_AUTO_CLEANUP`
- `E2E_ALLOW_PROD_SEED`

Nota operativa para cortes broker-only de `Provisioning`:

- si el smoke toca DLQ real del broker, puede quedar `skipped` en un entorno publicado cuyo `PROVISIONING_DISPATCH_BACKEND` no sea `broker`
- ese `skip` debe documentarse como limitación/topología del entorno, no como validación funcional verde
- antes de correr esos smokes, conviene ejecutar primero [platform-admin-provisioning-dispatch-capability.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dispatch-capability.smoke.spec.ts) para fijar por browser la capacidad activa del entorno publicado
- si además quieres validar que la UI publicada no deje acciones DLQ ambiguas en un entorno `database`, corre [platform-admin-provisioning-dlq-surface-gating.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-surface-gating.smoke.spec.ts)
- si quieres validar el nuevo foco por familia sobre `staging`, corre [platform-admin-provisioning-dlq-family-focus.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-family-focus.smoke.spec.ts) apuntando al backend publicado correcto:
  - `E2E_BACKEND_ROOT=/opt/platform_paas_staging`
  - `E2E_BACKEND_PYTHON=/opt/platform_paas_staging/platform_paas_venv/bin/python`
  - `E2E_BACKEND_ENV_FILE=/tmp/platform_paas_staging.env`
  - resultado validado actual: `staging -> 1 passed`, `production -> 1 skipped`
- desde este corte ya no hace falta armar ese setup a mano; usar:

```bash
cd /home/felipe/platform_paas
scripts/dev/run_staging_published_broker_dlq_smoke.sh --target family
```

Notas de limpieza y producción:

- los seeds E2E están bloqueados por defecto cuando el target es producción (`E2E_BASE_URL` contiene `orkestia.ddns.net` o `E2E_BACKEND_ROOT=/opt/platform_paas`)
- para permitir seeds en producción debes fijar `E2E_ALLOW_PROD_SEED=1` de forma explícita
- para limpiar automáticamente tenants E2E creados por seeds, fija `E2E_AUTO_CLEANUP=1`

- para validar el requeue directo desde el resumen por familia:

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

- para validar la matriz visible `tenant + capa técnica`:

```bash
cd /home/felipe/platform_paas
scripts/dev/run_staging_published_broker_dlq_smoke.sh --target matrix
```

- targets soportados hoy por ese helper:
  - `all`
  - `batch`
  - `row`
  - `filters`
  - `guided`
  - `family`
  - `family-requeue`
  - `family-batch`
  - `family-recommendation`
  - `tenant-focus`
  - `technical`
  - `matrix`

- el dispatch de specs broker-only ya no se mantiene duplicado a mano:
  - [run_broker_dlq_playwright_target.sh](/home/felipe/platform_paas/scripts/dev/run_broker_dlq_playwright_target.sh) centraliza el mapeo `target -> specs`
  - lo reutilizan tanto [run_local_broker_dlq_baseline.sh](/home/felipe/platform_paas/scripts/dev/run_local_broker_dlq_baseline.sh) como [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh) y el workflow manual [.github/workflows/frontend-broker-dlq-e2e.yml](/home/felipe/platform_paas/.github/workflows/frontend-broker-dlq-e2e.yml)
- para una pasada published curada de `Provisioning/DLQ` existe además [run_published_provisioning_baseline.sh](/home/felipe/platform_paas/scripts/dev/run_published_provisioning_baseline.sh):
  - corre siempre `dispatch-capability`, `surface-gating` y `observability-visible`
  - suma el bloque broker-only solo si el entorno publicado realmente usa `broker`
  - puede forzar `broker|database` con `--dispatch-backend` si no quieres depender del env file
  - wrappers por ambiente ya disponibles:
    - [run_staging_published_provisioning_baseline.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_provisioning_baseline.sh)
    - [run_production_published_provisioning_baseline.sh](/home/felipe/platform_paas/scripts/dev/run_production_published_provisioning_baseline.sh)
- para el equivalente repo/CI de esa misma capa curada existe además [run_repo_provisioning_baseline.sh](/home/felipe/platform_paas/scripts/dev/run_repo_provisioning_baseline.sh):
  - corre siempre `dispatch-capability`, `surface-gating` y `observability-visible`
  - acepta `--dispatch-backend broker|database`
  - suma broker-only solo si el backend activo es `broker`

Baseline recomendado para desarrollo local:

- usar un tenant realmente `active`
- el baseline actual del smoke tenant usa:
- `E2E_TENANT_SLUG=empresa-bootstrap`
- `E2E_TENANT_EMAIL=admin@empresa-bootstrap.local`
- `E2E_TENANT_PASSWORD=TenantAdmin123!`
- regla fija: no usar `ieris-ltda` para E2E; solo `empresa-bootstrap` y `empresa-demo`

Nota:

- esas credenciales siguen siendo válidas para el baseline demo `empresa-bootstrap`
- no describen el alta de tenants nuevos
- desde `2026-04-08`, los smokes de `platform_admin` ya deben completar admin explícito en `Nuevo tenant`
- desde `2026-04-10`, los smokes publicados que usan `backend-control` contra árboles como `/opt/platform_paas_staging` o `/opt/platform_paas` pueden además requerir `E2E_BACKEND_ENV_FILE` apuntando a una copia temporal legible del env real del servicio
- el smoke más directo de esa regla ahora es:
  - [platform-admin-tenants-create-form.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenants-create-form.smoke.spec.ts)
  - puede correrse contra `staging` o `production` con `E2E_USE_EXISTING_FRONTEND=1`
- para smokes publicados en `staging` que siembran backend, el env correcto del servicio es `/opt/platform_paas_staging/.env.staging`
- si hace falta `sudo` para leer ese env, exporta `HOME=/home/felipe` dentro del comando para reutilizar el cache real de Playwright y luego corrige la propiedad de `frontend/e2e/test-results` y `frontend/e2e/playwright-report`
- si el escenario broker-only solo necesita un tenant efímero instrumental, créalo con `backend-control` sobre el mismo `E2E_BACKEND_ROOT`; no mezcles alta UI en un host y seeds en otro árbol backend

Se prioriza `empresa-bootstrap` como baseline browser estable del repo para no mezclar la automatización con el tenant operativo `empresa-demo`.

Si tu entorno no tiene `empresa-bootstrap` operativo o usa otra clave, sobreescribe `E2E_TENANT_*`.

## Secuencia corta para otra IA

Si otra IA tiene que correr la baseline sin rearmar el contexto del proyecto, esta es la secuencia mínima recomendada:

1. confirmar backend en `127.0.0.1:8100`
2. confirmar tenant baseline `empresa-bootstrap`
3. validar el spec de importación/mantenciones:

```bash
cd /home/felipe/platform_paas/frontend
npx playwright test e2e/specs/tenant-portal-business-core-maintenance-import.smoke.spec.ts --list
```

3.a validar el spec de sidebar backend-driven:

```bash
cd /home/felipe/platform_paas/frontend
npx playwright test e2e/specs/tenant-portal-sidebar-modules.smoke.spec.ts --list
```

4. correr baseline tenant:

```bash
cd /home/felipe/platform_paas/frontend
npm run e2e:tenant
```

5. si falla `webServer`, usar:

```bash
cd /home/felipe/platform_paas/frontend
E2E_USE_EXISTING_FRONTEND=1 npm run e2e:tenant
```

o el helper institucional:

```bash
cd /home/felipe/platform_paas
scripts/dev/run_local_browser_baseline.sh --target tenant
```

Qué debe validar esa IA en `maintenance`:

- `Resumen técnico`
- `Pendientes`
- `Costos y cobro`
- `Sincronización automática a finanzas`

Comandos separados:

```bash
npm run e2e:platform
npm run e2e:tenant
```

Eso permite validar primero la consola de plataforma y después el flujo tenant con credenciales correctas del entorno.

`npm run e2e:tenant` ya ejecuta todo `tenant-portal*.spec.ts`, incluyendo el smoke de límites y los smokes de `finance`.

Los helpers [scripts/dev/run_local_browser_baseline.sh](../../scripts/dev/run_local_browser_baseline.sh) y [scripts/dev/run_local_broker_dlq_baseline.sh](../../scripts/dev/run_local_broker_dlq_baseline.sh) limpian automáticamente los tenants efímeros `e2e-*` al terminar; si se necesita inspeccionarlos después del run, ambos aceptan `--skip-e2e-cleanup`.

Resultado validado en local a la fecha:

- `platform_admin` smoke pasando
- `platform_admin` lifecycle tenant base pasando
- acceso rápido desde `Tenants` al login de `tenant_portal` con `slug` precargado pasando
- acceso rápido desde `Tenants` correctamente bloqueado cuando el tenant no está en estado elegible pasando
- matriz visible por rol en `platform_admin` validada para `admin` y `support`, incluyendo redirecciones y modo solo lectura en `Usuarios de plataforma`
- `Billing` validado para workspace tenant con evento persistido y reconcile individual desde la fila visible
- `Billing` validado también para reconcile batch de eventos filtrados dentro del workspace tenant
- `Histórico tenants` validado para filtros, exportaciones `CSV/JSON` y apertura/cierre del detalle histórico visible
- `Provisioning` validado al menos para visibilidad de jobs nuevos disparados desde `Tenants`
- `Provisioning` validado también para ejecutar manualmente un job `pending` desde la consola
- `Provisioning` validado también para reencolar un job `failed` desde la consola

Resultado tenant revalidado al cierre de esta iteración:

- backend local en `127.0.0.1:8100/health` → `200`
- `npm run e2e:tenant` → `22 passed`
- `npm run e2e:platform` → `12 passed`, `3 skipped`
- `npm run e2e` → `34 passed`, `3 skipped`
- la baseline `empresa-bootstrap` quedó restabilizada sin cambios funcionales del producto; los ajustes fueron de alineación E2E con la UI actual basada en modales y detalles operativos
- `Provisioning` validado también para disparar `schema auto-sync` desde la toolbar
- `Provisioning` ya tiene además un smoke broker-only para reencolar una fila DLQ individual desde la tabla de resultados
- `Provisioning` ya tiene además un smoke broker-only para reencolar filas DLQ filtradas en lote
- `Provisioning` ya tiene además un smoke broker-only para validar filtros DLQ por `error contains` y confirmar opciones de requeue individual
- `tenant_portal` ya cubre además enforcement visible de límites de usuarios activos con overrides preparados de forma determinista
- `tenant_portal` ya cubre además login permitido cuando el tenant está `past_due` pero sigue en gracia, y bloqueo visible cuando la deuda vencida ya corta el acceso
- `tenant_portal` ya cubre además la visibilidad del sidebar principal según `effective_enabled_modules`, ocultando `Finanzas` y `Mantenciones` cuando `billing grace` reduce el tenant a `core,users`
- `tenant_portal` ya cubre además bloqueo por cuota `core.users.admin` al crear un admin extra y al intentar reactivar un admin inactivo
- `tenant_portal` ya cubre además bloqueo por `core.users.monthly` al intentar crear usuarios después de agotar el cupo del mes
- `tenant_portal` ya cubre además enforcement visible de límites de `finance.entries` bloqueando nuevas transacciones cuando el tenant queda al límite
- `tenant_portal` ya cubre además la precedencia visible del límite total `finance.entries` cuando coincide con `finance.entries.monthly`
- `tenant_portal` ya cubre además enforcement de `finance.entries.monthly` bloqueando nuevas transacciones cuando el tenant alcanza el cupo mensual
- `tenant_portal` ya cubre además enforcement de `finance.entries.monthly.income` y `finance.entries.monthly.expense` bloqueando nuevas transacciones según el tipo del movimiento
- `tenant_portal` ya cubre además el mantenimiento operativo de cuentas y categorías (`create`, `deactivate`, `delete`) dentro de `finance`
- `tenant_portal` ya cubre además el flujo base de presupuestos con alta mensual y clonación al mes visible
- `tenant_portal` ya cubre además plantillas y ajustes guiados de presupuestos sobre el mes visible
- `tenant_portal` ya cubre además la configuración operativa de `finance` sobre monedas, tipos de cambio y parámetros base
- `tenant_portal` ya cubre además el flujo base de préstamos con alta de cartera y pago simple de cuota
- `tenant_portal` ya cubre además pago en lote y reversa en lote de cuotas sobre préstamos seleccionados
- `tenant_portal` ya cubre además lectura contable derivada y exportaciones de préstamos tras pago y reversa
- `tenant_portal` ya cubre además visibilidad real de datos importados desde `ieris_app` en `business-core` y `maintenance`
- `tenant_portal` ya cubre además visibilidad de la política tenant para sincronización automática `maintenance -> finance` en `Resumen técnico`
- `tenant_portal` con `empresa-bootstrap` pasando
- flujo `finance` cubierto en creación, adjunto, anulación y conciliación
- datos importados validados al menos para:
  - organizaciones (`Ieris Ltda`)
  - clientes (`Cecilia Tabales`)
  - tipos de equipo (`heat pipe`)
  - órdenes de trabajo (`Mantención sst`)
- suite `platform_admin` validada en local con `12 passed` y `3 skipped` broker-only
- los `3` escenarios broker-only de DLQ quedaron además verificados explícitamente en un stack paralelo local con backend `broker` + Redis, con `3 passed`
- suite `tenant_portal` validada en local con `22 passed`
- el stack browser principal ya quedó prácticamente cerrado; lo siguiente pasa a ser regresión incremental cuando aparezcan nuevos bordes reales

## Comandos

Desde `frontend/`:

```bash
npm run e2e:install
npm run e2e
```

Baseline local consolidada desde la raíz del repo:

```bash
scripts/dev/run_local_browser_baseline.sh
```

Variantes útiles del script:

```bash
scripts/dev/run_local_browser_baseline.sh --target platform
scripts/dev/run_local_browser_baseline.sh --target tenant
scripts/dev/run_local_browser_baseline.sh --platform-only
scripts/dev/run_local_browser_baseline.sh --tenant-only
scripts/dev/run_local_browser_baseline.sh --skip-build
```

Limpieza posterior de tenants efímeros `e2e-*`:

```bash
cd /home/felipe/platform_paas/backend
PYTHONPATH=/home/felipe/platform_paas/backend \
/home/felipe/platform_paas/platform_paas_venv/bin/python \
app/scripts/cleanup_e2e_tenants.py --apply
```

Ese script usa el lifecycle seguro `archive -> deprovision -> delete`, por lo que no deja bases tenant ni jobs colgando en `platform_control`.

Si la suite dejó basura en catálogos o movimientos `finance` (por ejemplo, categorías o transacciones `e2e-*`):

```bash
cd /home/felipe/platform_paas/backend
PYTHONPATH=/home/felipe/platform_paas/backend \
/home/felipe/platform_paas/platform_paas_venv/bin/python \
app/scripts/cleanup_tenant_e2e_finance_data.py --tenant-slug <slug> --apply
```

Este cleanup es útil cuando se ejecutaron smokes contra un tenant real y se necesita limpiar cuentas, transacciones o categorías efímeras.

Validación local broker-only de DLQ:

```bash
scripts/dev/run_local_broker_dlq_baseline.sh
```

Ese helper levanta un backend paralelo con `PROVISIONING_DISPATCH_BACKEND=broker`, un frontend paralelo apuntando a ese backend y ejecuta exclusivamente los `3` smokes DLQ broker-only.

También admite un subset concreto:

```bash
scripts/dev/run_local_broker_dlq_baseline.sh --target batch
scripts/dev/run_local_broker_dlq_baseline.sh --target row
scripts/dev/run_local_broker_dlq_baseline.sh --target filters
```

Variantes útiles:

```bash
npm run e2e:headed
npm run e2e:ui
npm run e2e:report
```

## Criterio operativo

Decisiones de este primer corte:

- usar solo `chromium`
- no montar todavía una matriz completa multi-browser
- no automatizar backend en el config; se asume backend ya operativo
- permitir que `Playwright` levante el frontend o reutilice uno existente

Institucionalización del baseline:

- el baseline browser oficial queda automatizado en GitHub Actions mediante [.github/workflows/frontend-browser-e2e.yml](../../.github/workflows/frontend-browser-e2e.yml)
- el workflow prepara PostgreSQL efímero, crea `platform_control`, corre migraciones, siembra `seed_frontend_demo_baseline`, levanta backend local y ejecuta `build + e2e:platform + e2e:tenant`
- además conserva como artefactos el reporte HTML de Playwright, los resultados crudos y el log backend para acelerar la depuración cuando falle CI
- cuando se dispara manualmente, ese workflow acepta `target=all|platform|tenant` para revalidar solo la mitad afectada de la baseline principal
- esto convierte la cobertura browser actual en un check estándar de regresión para cambios de `frontend`, `backend` y contratos operativos asociados
- los smokes DLQ broker-only no bloquean ese baseline estándar porque en CI principal siguen quedando como `skip` sobre backend `database`; su validación broker real sigue siendo una pasada específica complementaria
- para ejecución local repetible existe además [scripts/dev/run_local_browser_baseline.sh](../../scripts/dev/run_local_browser_baseline.sh), pensado para developers que quieren reproducir el baseline sin recordar la secuencia completa manual
- ese helper local también acepta `--target all|platform|tenant` para revalidar solo el subset afectado sin correr siempre toda la baseline principal
- para la validación complementaria broker-only existe además [scripts/dev/run_local_broker_dlq_baseline.sh](../../scripts/dev/run_local_broker_dlq_baseline.sh), pensado para reproducir los smokes DLQ sin rearmar manualmente el stack paralelo
- para una pasada CI manual del bloque broker-only existe [.github/workflows/frontend-broker-dlq-e2e.yml](../../.github/workflows/frontend-broker-dlq-e2e.yml), que prepara PostgreSQL + Redis y ejecuta únicamente ese pack DLQ/Provisioning
- el `workflow_dispatch` de ese job ya permite escoger `target=all|batch|row|filters|guided|family|family-requeue|family-batch|family-recommendation|tenant-focus|technical|matrix` para revalidar solo el subset afectado cuando el cambio no toca todo el bloque
- para una pasada CI manual del baseline curado completo existe además [.github/workflows/frontend-provisioning-baseline-e2e.yml](../../.github/workflows/frontend-provisioning-baseline-e2e.yml)
- ese workflow prepara PostgreSQL + Redis, siembra `seed_frontend_demo_baseline`, levanta backend/frontend locales y ejecuta [run_repo_provisioning_baseline.sh](/home/felipe/platform_paas/scripts/dev/run_repo_provisioning_baseline.sh)
- el `workflow_dispatch` permite escoger:
  - `dispatch_backend=database|broker`
  - `include_broker_only=true|false`
  - `broker_target=all|batch|row|filters|guided|family|family-requeue|family-batch|family-recommendation|tenant-focus|technical|matrix`

Notas del flujo `finance` que conviene recordar:

- el smoke tenant validado usa `empresa-bootstrap` como baseline activo de esta iteración
- la subida de imágenes en transacciones comprime el archivo antes de enviarlo
- cuando la imagen se comprime, el nombre visible final del adjunto puede cambiar a extensión `webp`
- los smokes de límites tenant ya no dependen de preparar overrides por UI de `Tenants`; usan control DB para fijar y limpiar estado reproducible
- el smoke de roles `platform_admin` crea usuarios efímeros `admin` y `support` para congelar la navegación visible, la redirección por ruta y el modo solo lectura sin depender de seeds manuales
- el smoke de `Billing` crea un tenant efímero y siembra un evento `invoice.payment_failed` controlado directamente en la DB de control para validar el workspace tenant y el reconcile individual sin depender de webhooks externos
- el smoke batch de `Billing` reutiliza la misma siembra backend-control con dos eventos del mismo filtro para validar `Reconciliar eventos filtrados` sin depender de webhooks externos
- el smoke de `Histórico tenants` recorre `create -> billing seed -> archive -> delete` sobre un tenant efímero para validar el archivo real sin tocar fixtures manuales
- el smoke de login billing tenant reutiliza el baseline `empresa-bootstrap`, siembra estados de billing controlados y luego restaura el tenant a `active` al finalizar para no ensuciar la suite
- el smoke admin de `tenant users` prepara primero un admin inactivo efímero y luego fija `core.users.admin=1` para comprobar el borde real de reactivación bloqueada sin depender de fixtures manuales
- el smoke mensual de `tenant users` usa snapshot real de uso y una siembra determinista con `created_at` del mes actual para fijar `core.users.monthly` sin asumir conteos hardcodeados
- el smoke de precedencia de `finance` fija en paralelo `finance.entries` y `finance.entries.monthly` para confirmar que el error visible y el `403` priorizan el límite total
- el smoke mensual de `finance` usa además un snapshot real del uso tenant para fijar `finance.entries.monthly` sin asumir conteos hardcodeados
- el smoke mensual por tipo de `finance` reutiliza ese snapshot real para fijar `finance.entries.monthly.income` y `finance.entries.monthly.expense` sin depender de conteos estáticos
- el smoke de catálogos `finance` usa registros efímeros con nombres únicos para validar alta, desactivación y borrado seguro sin depender del catálogo inicial
- el smoke de presupuestos usa meses futuros efímeros para evitar colisiones con planificación real y verificar alta + clonación sin ensuciar meses operativos actuales
- el smoke avanzado de presupuestos crea una categoría efímera, aplica la plantilla `previous_month` con escala/redondeo y ejecuta un ajuste guiado de desactivación para validar foco operativo sin depender de datos fijos
- el smoke de configuración financiera usa códigos y claves efímeras para validar creación, activación/desactivación y limpieza segura de monedas, tipos de cambio y parámetros del módulo
- el smoke de préstamos usa un préstamo efímero con 3 cuotas para validar la ruta mínima `create -> schedule -> payment` sin depender de cartera previa
- el smoke batch de préstamos reutiliza un préstamo efímero con 3 cuotas para validar `schedule -> batch payment -> batch reversal` sobre selección múltiple
- el smoke contable de préstamos reutiliza un préstamo efímero con pago + reversa simple para verificar la tabla de lectura derivada y las descargas `finance-loan-accounting-*.csv/json`
- ambos smokes de préstamos quedaron endurecidos contra variaciones legítimas de UI: cronograma ya expandido, formularios de pago con etiquetas parecidas y selects que cambian de posición según el modo
- no hubo parche funcional en frontend/backend de `finance loans` porque la evidencia mostró que el comportamiento de producto era correcto; lo inestable eran los locators y supuestos del smoke

## Estado de cierre actual

Con la validación local actual, el frente E2E browser queda cubierto en lo principal para:

- `platform_admin`
  - navegación y acceso
  - lifecycle base tenant
  - acceso rápido al `tenant_portal`
  - política visible por rol
  - `Provisioning` principal y variantes broker-only
  - `Billing` individual y batch
  - `Histórico tenants`
- `tenant_portal`
  - login base y login condicionado por billing
  - enforcement visible de límites de usuarios
  - slice amplio de `finance`

Lo que sigue después de este punto ya no es un hueco obvio de cobertura base, sino regresión incremental cuando aparezcan:

- nuevos bordes funcionales reales
- cambios de UX relevantes
- nuevos módulos tenant o administrativos

Nota operativa del smoke `retry`:

- el spec crea un tenant de prueba y luego siembra un job `failed` controlado directamente en la DB de control para validar la recuperación visible sin depender de un fallo accidental del worker
- por defecto usa `/home/felipe/platform_paas/platform_paas_venv/bin/python`; si tu entorno cambia, puedes sobreescribir `E2E_BACKEND_PYTHON`

Nota operativa del smoke `DLQ`:

- requiere `PROVISIONING_DISPATCH_BACKEND=broker`, porque la DLQ no existe operativamente sobre el backend `database`
- cuando el entorno no soporta broker, el spec se omite sin romper la suite general

Nota operativa del smoke `DLQ row`:

- requiere `PROVISIONING_DISPATCH_BACKEND=broker`
- siembra una fila DLQ controlada y valida el reencolado individual desde la tabla visible del workspace

Nota operativa del smoke `DLQ filters`:

- requiere `PROVISIONING_DISPATCH_BACKEND=broker`
- siembra más de una fila DLQ para el mismo tenant y valida que el filtro `error contains` aísle solo el subconjunto esperado
- además verifica que la confirmación del requeue individual refleje el `delay` y el `reset attempts` visibles en la UI
