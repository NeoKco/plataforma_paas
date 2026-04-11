# ESTADO_ACTUAL

## Última actualización

- fecha: 2026-04-10
- foco de iteración: `platform-core hardening + E2E` sobre `Provisioning/DLQ`, cerrando el subfrente broker-only `familias DLQ visibles + Enfocar familia`
- estado general: `staging` y `production` quedaron republicados con el nuevo slice DLQ; `staging` lo valida en verde y `production` lo publica con smoke `skipped` coherente porque su backend activo sigue sin ser `broker`

## Resumen ejecutivo en 30 segundos

- `finance` ya está cerrado en su alcance actual y `business-core` + `maintenance` ya operan en su primer corte funcional
- la topología real ya está estabilizada en el mini PC: `dev` separado, `staging` separado y `production` con HTTPS en `https://orkestia.ddns.net`
- `Provisioning` ya cerró los subfrentes visibles de `Investigar en DLQ`, `observabilidad visible`, `requeue guiado`, `capacidad activa de dispatch backend`, `gating visible` del panel DLQ y `familias DLQ visibles`
- la portabilidad tenant dual (`portable_full` + `functional_data_only`) ya quedó operativa en `platform_admin` y `tenant_portal`
- la documentación viva, runbooks E2E y handoff ya quedaron actualizados y sincronizados con lo publicado

## Qué ya quedó hecho

- `Nuevo tenant` ya exige `admin_full_name`, `admin_email` y `admin_password`, sin bootstrap fijo compartido
- `Tenants` ya abre `Provisioning` con `tenantSlug` precargado y lectura operativa enfocada por tenant
- `Provisioning` ya permite leer jobs, métricas, alertas, investigación DLQ, observabilidad visible y requeue guiado
- `Provisioning` ya muestra explícitamente el `dispatch backend` activo del entorno
- `Provisioning` ya adapta la superficie `Operación DLQ`:
  - `broker`: filtros, batch, requeue guiado y requeue por fila visibles
  - `database`: estado broker-only no activo y derivación al entorno correcto
- `Provisioning` ya agrupa el subconjunto broker visible en `familias DLQ visibles` y permite convertir una familia homogénea en filtros operativos mediante `Enfocar familia`
- la portabilidad tenant ya soporta export/import controlado con `dry_run` y `apply` desde `platform_admin` y `tenant_portal`
- `staging` ya quedó operativo como espejo instalado por defecto, con posibilidad de reset bootstrap controlado
- `production` ya quedó publicado y validado sobre `https://orkestia.ddns.net`

## Qué archivos se tocaron

- código visible de este último corte:
  - `frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx`
  - `frontend/e2e/specs/platform-admin-provisioning-dlq-family-focus.smoke.spec.ts`
- estado y handoff:
  - `ESTADO_ACTUAL.md`
  - `SIGUIENTE_PASO.md`
  - `SESION_ACTIVA.md`
  - `HANDOFF_STATE.json`
  - `HISTORIAL_ITERACIONES.md`
- documentación canónica:
  - `docs/modules/platform-core/ROADMAP.md`
  - `docs/modules/platform-core/CHANGELOG.md`
  - `docs/modules/platform-core/USER_GUIDE.md`
  - `docs/modules/platform-core/DEV_GUIDE.md`
  - `frontend/e2e/README.md`
  - `docs/runbooks/frontend-e2e-browser.md`
  - `docs/runbooks/provisioning-guided-test.md`
  - `PAQUETE_RELEASE_OPERADOR.md`

## Qué decisiones quedaron cerradas

- el host productivo real sigue siendo el mini PC con topología single-host y HTTPS activo
- `staging` sigue siendo el carril previo oficial para validar UI visible antes de `production`
- los smokes broker-only no deben asumirse verdes en `production` si el backend activo no es `broker`
- la consola `Provisioning` debe exponer la capacidad activa del entorno en vez de dejarla implícita
- la propia superficie `Operación DLQ` debe alinearse a esa capacidad y no mostrar acciones broker-only ambiguas en entornos `database`
- las acciones broker-only de foco operativo no deben romperse por sincronización tardía `URL -> estado local`; una acción in-page como `Enfocar familia` debe prevalecer sobre el reflejo diferido de la URL
- la portabilidad tenant CSV sigue siendo portabilidad/migración, no reemplazo del backup PostgreSQL real

## Qué falta exactamente

- abrir el siguiente subfrente de endurecimiento E2E/browser para `Provisioning/DLQ` publicado:
  - encapsular el setup real `E2E_BACKEND_ROOT + E2E_BACKEND_PYTHON + E2E_BACKEND_ENV_FILE` de `staging` en un helper o runbook operativo más corto
  - o seguir con otra profundización broker-only funcional sobre el subconjunto visible
- mantener el repo y los árboles `/opt/platform_paas` y `/opt/platform_paas_staging` alineados en cada iteración visible

## Qué no debe tocarse

- no reabrir `Nuevo tenant` salvo bug real
- no reabrir la base portable tenant salvo necesidad explícita
- no modificar auth, lifecycle tenant, provisioning base o billing sin necesidad clara del siguiente subfrente
- no volver a hardcodear visibilidad tenant-side que ya depende de backend/capabilities
- no tratar CSV portable como respaldo técnico sustituto de `pg_dump`

## Validaciones ya ejecutadas

- repo:
  - `npm run build` OK para el último corte UI de `Provisioning`
  - `npx playwright test e2e/specs/platform-admin-provisioning-dlq-family-focus.smoke.spec.ts --list` OK
- `staging`:
  - rebuild frontend OK
  - `platform-admin-provisioning-dlq-family-focus.smoke.spec.ts`: `1 passed`
- `production`:
  - rebuild frontend OK
  - `platform-admin-provisioning-dlq-family-focus.smoke.spec.ts`: `1 skipped`
- validaciones acumuladas que siguen vigentes:
  - `platform-admin-provisioning-dispatch-capability`: OK en `staging` y `production`
  - `platform-admin-provisioning-guided-requeue`: OK en `staging`, `skipped_non_broker` en `production`
  - `platform-admin-provisioning-dlq-family-focus`: OK en `staging`, `skipped_non_broker` en `production`
  - `platform-admin-provisioning-observability-history`: OK en `staging` y `production`
  - `platform-admin-tenant-provisioning-context`: OK en `staging` y `production`
  - portabilidad tenant dual: OK en `staging` y `production`

## Bloqueos reales detectados

- no hay bloqueo funcional activo en este corte
- el único límite operativo vigente es topológico:
  - `production` hoy no corre con `dispatch backend = broker`
  - por eso los smokes broker-only allí deben seguir tratándose como `not applicable/skipped`
- el único paso operativo no automatizado todavía para smokes broker-only publicados es preparar un env legible temporal, por ejemplo `/tmp/platform_paas_staging.env`, cuando el servicio usa `/opt/platform_paas_staging/.env.staging`
- en este entorno de agente, algunos smokes browser pueden requerir salir de sandbox si Chromium falla al arrancar

## Mi conclusión

- el estado vivo del proyecto ya quedó alineado a la plantilla oficial
- `Provisioning/DLQ` ya tiene capacidad visible, superficie visible y foco por familia coherentes
- el siguiente paso correcto ya no es descubrir cómo validar published broker-only: es encapsular mejor ese setup o abrir el siguiente slice broker-only sobre esta base ya estable
