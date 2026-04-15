# HISTORIAL_ITERACIONES

## 2026-04-14 - Alta masiva anual desde instalaciones activas sin plan preventivo

- objetivo:
  - evitar crear una a una las programaciones para instalaciones activas sin cobertura preventiva
  - dejar una acción masiva coherente con la regla solicitada: próxima mantención el próximo año
- cambios principales:
  - [MaintenanceDueItemsPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceDueItemsPage.tsx) agrega el botón `Crear planes anuales` dentro del bloque `Instalaciones activas sin plan preventivo`
  - la acción masiva reutiliza el mismo `POST /tenant/maintenance/schedules`
  - para cada instalación activa sin plan:
    - si existe una mantención cerrada este año, usa esa referencia para fijar el mismo día/mes del próximo año
    - si no existe cierre útil este año, fija la próxima mantención a un año desde hoy
    - deja la frecuencia forzada en `1 year`
    - intenta usar `mantencion` como `task_type` por defecto si existe en el tenant
- validaciones:
  - `cd frontend && npm run build` -> `OK`
  - frontend publicado en:
    - `/opt/platform_paas_staging/frontend/dist`
    - `/opt/platform_paas/frontend/dist`
- resultado:
  - el operador ya puede sembrar de una vez los planes preventivos base para instalaciones activas descubiertas
  - la alta individual manual sigue existiendo y no fue removida
- siguiente paso:
  - si hace falta, agregar un resumen previo tipo `N instalaciones -> N planes` o confirmación modal antes del alta masiva

## 2026-04-14 - Cleanup de duplicados históricos legacy en ieris-ltda

- objetivo:
  - eliminar duplicados funcionales entre el histórico recién importado desde `ieris_app` y OT ya existentes en `ieris-ltda`
  - usar el criterio operativo correcto definido para este tenant:
    - `cliente`
    - `dirección`
    - `fecha de cierre`
- cambios principales:
  - se agrega [remove_duplicate_legacy_historical_work_orders.py](/home/felipe/platform_paas/backend/app/scripts/remove_duplicate_legacy_historical_work_orders.py)
  - el script:
    - trabaja en `dry_run` por defecto
    - detecta solo work orders legacy `LEGACY-HIST-MAINT-*`
    - conserva siempre la OT no legacy existente
    - elimina solo la duplicada legacy
  - usa como clave:
    - nombre de cliente normalizado
    - etiqueta de dirección normalizada
    - fecha de cierre (`completed_at/cancelled_at`)
- validaciones:
  - `python3 -m py_compile backend/app/scripts/remove_duplicate_legacy_historical_work_orders.py` -> `OK`
  - `dry_run` real sobre `production` / `ieris-ltda`:
    - `duplicates_detected=3`
    - casos confirmados:
      - `LEGACY-HIST-MAINT-104` vs OT `#5`
      - `LEGACY-HIST-MAINT-105` vs OT `#4`
      - `LEGACY-HIST-MAINT-111` vs OT `#2`
  - `apply` real sobre `production` / `ieris-ltda`:
    - `duplicates_deleted=3`
  - verificación posterior en runtime:
    - `closed_total=114`
    - `legacy_total=110`
    - `history_total=114`
- resultado:
  - `ieris-ltda` conserva las OT propias ya existentes
  - el histórico importado desde `ieris_app` ya no duplica esos tres cierres
  - el cleanup queda reusable como script explícito y no como operación manual en BD
- siguiente paso:
  - continuar con normalización funcional sobre `ieris-ltda` solo si aparece drift visible en UI o reportes

## 2026-04-14 - Import histórico de mantenciones desde ieris_app hacia ieris-ltda

- objetivo:
  - traer solo `historico_mantenciones` desde la BD legacy de `ieris_app` a `ieris-ltda`
  - evitar arrastrar también `mantenciones` activas/base al tenant destino
- cambios principales:
  - se agrega [import_ieris_historical_maintenance_only.py](/home/felipe/platform_paas/backend/app/scripts/import_ieris_historical_maintenance_only.py)
  - el wrapper reutiliza el importador combinado existente, pero fuerza `mantenciones=[]`
  - mantiene el upsert mínimo de catálogos/relaciones necesarias para que el histórico no quede huérfano
  - evita la verificación estricta `source == processed` y la reemplaza por una validación `best_effort`, porque `ieris-ltda` ya estaba poblado previamente
- validaciones:
  - `python3 -m py_compile backend/app/scripts/import_ieris_historical_maintenance_only.py` -> `OK`
  - `dry_run` real sobre `ieris-ltda`:
    - `historico_mantenciones`: `113`
    - `maintenance.work_orders.created=113`
    - `maintenance.status_logs.created=113`
    - `maintenance.visits.created=113`
    - además detectó faltantes mínimos:
      - `organizations.created=1`
      - `clients.created=1`
      - `contacts.created=1`
      - `sites.created=4`
      - `function_profiles.created=1`
      - `installations.created=11`
  - `apply` real ejecutado sobre `production`
  - verificación runtime posterior en `ieris-ltda`:
    - `historical_work_orders=113`
    - `historical_status_logs=113`
    - `historical_visits=113`
    - `history_total=117`
    - `legacy_visible_in_history=113`
    - `organizations=205`
    - `clients=192`
    - `contacts=219`
    - `sites=198`
    - `function_profiles=7`
    - `installations=203`
- resultado:
  - `ieris-ltda` ya recupera el histórico de mantenciones realizadas desde `ieris_app`
  - el corte no arrastró `mantenciones` activas/base
  - el repositorio queda con un wrapper reutilizable para repetir la misma operación sin mezclar histórico con órdenes abiertas
- siguiente paso:
  - validar en UI de `ieris-ltda` que `Historial técnico` muestre esas mantenciones importadas y que la navegación asociada siga estable

## 2026-04-14 - Salvaguarda de borrado seguro tenant + cierre real de convergencia productiva

- objetivo:
  - evitar repetir un caso como `ieris-ltda`, donde un tenant borrado/recreado puede interpretarse después como pérdida "misteriosa" de datos
  - endurecer la consola y el backend para que no se pueda eliminar un tenant sin evidencia mínima de recuperación
  - cerrar `production` otra vez en `4/4` tenants activos auditados sin dejar drift runtime
- cambios principales:
  - [schemas.py](/home/felipe/platform_paas/backend/app/apps/platform_control/schemas.py) agrega [TenantDeleteRequest](/home/felipe/platform_paas/backend/app/apps/platform_control/schemas.py) con `confirm_tenant_slug` y `portable_export_job_id`
  - [tenant_service.py](/home/felipe/platform_paas/backend/app/apps/platform_control/services/tenant_service.py) ahora bloquea el borrado definitivo si:
    - el slug confirmado no coincide
    - no existe un job export completado del mismo tenant
    - el export no tiene artefactos
  - [tenant_routes.py](/home/felipe/platform_paas/backend/app/apps/platform_control/api/tenant_routes.py) exige el payload explícito también en API
  - [TenantsPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/tenants/TenantsPage.tsx) deshabilita `Eliminar tenant` hasta que exista export portable completado y muestra esa evidencia al operador
  - el archivo de retiro tenant ahora guarda evidencia del export usado para autorizar el delete
  - `production` requirió una reparación runtime adicional de `condominio-demo`:
    - se rotó otra vez la credencial DB tenant con [TenantService.rotate_tenant_db_credentials](/home/felipe/platform_paas/backend/app/apps/platform_control/services/tenant_service.py)
    - se reejecutó convergencia completa
- validaciones:
  - repo: `python3 -m py_compile backend/app/apps/platform_control/schemas.py backend/app/apps/platform_control/services/tenant_service.py backend/app/apps/platform_control/api/tenant_routes.py backend/app/tests/test_platform_flow.py` -> `OK`
  - repo: `cd frontend && npm run build` -> `OK`
  - `staging`: `bash deploy/deploy_backend_staging.sh` -> `525 tests OK`
  - `production`: `bash deploy/deploy_backend_production.sh` -> `525 tests OK`
  - `production`: rotación runtime `condominio-demo` -> `OK`
  - `production`: `seed_missing_tenant_defaults.py --apply` -> `processed=4, changed=3, failed=0`
  - `production`: `repair_maintenance_finance_sync.py --all-active --limit 100` -> `processed=4, failures=0`
  - `production`: `audit_active_tenant_convergence.py --all-active --limit 100` -> `processed=4, warnings=0, failed=0`
- resultado:
  - ya no se puede borrar un tenant productivo/operativo sin export portable previo del mismo tenant
  - el backend también bloquea el salto de UI, así que la regla no queda solo como ayuda visual
  - `production` y `staging` terminan nuevamente convergidos `4/4`
  - el caso `ieris-ltda` queda documentado correctamente: no fue drift fantasma; hubo delete + recreate + import parcial `functional_data_only`
- siguiente paso:
  - volver al siguiente slice fino de `maintenance -> finance` sobre esta base ya endurecida

## 2026-04-14 - Copia selectiva empresa-demo -> ieris-ltda de datos base operativos ampliada

- objetivo:
  - copiar desde `empresa-demo` hacia `ieris-ltda` solo:
    - empresas
    - clientes
    - contactos
    - sitios
    - grupos
    - tipos de equipo
    - instalaciones
  - evitar un paquete portable más grande de lo necesario
- cambios principales:
  - se agrega [copy_selected_business_core_maintenance_data.py](/home/felipe/platform_paas/backend/app/scripts/copy_selected_business_core_maintenance_data.py)
  - el script trabaja en `dry_run` por defecto y luego en `apply`
  - usa `upsert` por clave natural para no depender de ids entre tenants
  - el script ahora también resuelve relaciones:
    - `organization -> client -> site -> installation`
    - `organization -> contact`
    - `equipment_type -> installation`
- validaciones:
  - `python3 -m py_compile backend/app/scripts/copy_selected_business_core_maintenance_data.py` -> `OK`
  - `dry_run` real `empresa-demo -> ieris-ltda`:
    - `business_organizations`: `unchanged=204`
    - `business_clients`: `unchanged=191`
    - `business_contacts`: `created=217`
    - `business_sites`: `created=194`
    - `business_work_groups`: `unchanged=4`
    - `maintenance_equipment_types`: `unchanged=4`
    - `maintenance_installations`: `created=192`
  - `apply` real ejecutado con el mismo origen/destino
  - verificación posterior en runtime real:
    - `ieris-ltda organizations=204`
    - `ieris-ltda clients=191`
    - `ieris-ltda contacts=217`
    - `ieris-ltda sites=194`
    - `ieris-ltda work_groups=4`
    - `ieris-ltda equipment_types=4`
    - `ieris-ltda installations=192`
- resultado:
  - `ieris-ltda` ya quedó alineado con `empresa-demo` en esos catálogos base y sus relaciones operativas mínimas
  - la operación quedó reusable en un script explícito y no como comando ad hoc perdido en chat
- siguiente paso:
  - continuar con el siguiente ajuste funcional del roadmap sobre la base ya copiada

## 2026-04-14 - Deep-link Mantenciones -> Finanzas y blindaje de Historial

- objetivo:
  - permitir abrir la transacción financiera exacta desde `Historial técnico`
  - evitar crash frontend cuando una OT antigua no trae `finance_summary`
- cambios principales:
  - [MaintenanceHistoryPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceHistoryPage.tsx) agrega botones directos para abrir ingreso/egreso en `Finanzas`
  - [FinanceTransactionsPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/finance/pages/FinanceTransactionsPage.tsx) acepta query params de focalización y abre automáticamente el detalle si recibe `transactionId`
  - el historial usa fallback seguro para `finance_summary` ausente y no rompe la vista en tenants con payload viejo
- validaciones:
  - repo: `cd frontend && npm run build` -> `OK`
  - `staging`: frontend publicado
  - `production`: frontend publicado
- resultado:
  - el operador puede saltar desde Mantenciones a la transacción exacta sin buscarla manualmente
  - el slice queda más resistente frente a históricos legacy
- siguiente paso:
  - endurecer hints y controles de egreso seleccionable y evaluar endpoint atómico `close-with-costs`

## 2026-04-14 - Slice maintenance -> finance promovido completo con snapshots financieros vinculados

- objetivo:
  - evitar que el modal de costeo vuelva a defaults ciegos cuando la OT ya está sincronizada con Finanzas
  - cerrar el slice bajo la nueva regla de promoción completa por ambiente y tenant
- cambios principales:
  - [costing_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/services/costing_service.py) ahora devuelve snapshots de `income/expense` vinculados
  - [costing.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/api/costing.py) serializa esos snapshots al contrato tenant
  - [MaintenanceCostingModal.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceCostingModal.tsx) ya reconstruye el formulario de sync usando cuenta/categoría/moneda/fecha/glosa/notas desde la transacción financiera real cuando existe
  - [costingService.ts](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/services/costingService.ts) agrega el contrato tipado de snapshots vinculados
  - [test_maintenance_costing_service.py](/home/felipe/platform_paas/backend/app/tests/test_maintenance_costing_service.py) cubre el detalle con snapshots financieros ligados
  - se repara `condominio-demo` en `production` rotando credenciales DB tenant para poder cerrar la convergencia real del ambiente
- validaciones:
  - repo: `python -m unittest app.tests.test_maintenance_costing_service` -> `12 tests OK`
  - repo: `cd frontend && npm run build` -> `OK`
  - `staging`: `bash deploy/deploy_backend_staging.sh` -> `525 tests OK`
  - `production`: `bash deploy/deploy_backend_production.sh` -> `525 tests OK`
  - `staging`: frontend publicado
  - `production`: frontend publicado
  - `production`: `seed_missing_tenant_defaults.py --apply` -> `processed=4, changed=4, failed=0`
  - `production`: `repair_maintenance_finance_sync.py --all-active --limit 100` -> `processed=4, failures=0`
  - `production`: `audit_active_tenant_convergence.py --all-active --limit 100` -> `processed=4, warnings=0, failed=0`
- resultado:
  - el slice ya quedó promovido y convergido en `staging` y `production`
  - `maintenance -> finance` ahora recuerda los datos reales ya sincronizados al reabrir el cierre económico
  - ambos ambientes quedan otra vez en `4/4` tenants activos auditados sin fallos críticos
- siguiente paso:
  - abrir el siguiente subcorte fino de UX/operación sobre la base ya convergida

## 2026-04-14 - Hotfix cierre con costos usa cuentas y categorías elegidas en el modal

- objetivo:
  - corregir que `Cerrar con costos` cerraba la OT pero dejaba el sync financiero dependiendo solo de la política/defaults del tenant
  - evitar ingresos/egresos creados con `account/category = null` cuando el operador sí había elegido esos campos en el modal
- cambios principales:
  - [MaintenanceCostingModal.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceCostingModal.tsx) ahora:
    - captura el payload financiero seleccionado antes del cierre
    - guarda costo real
    - cambia estado a `completed`
    - reaplica `syncTenantMaintenanceWorkOrderToFinance(...)` con las cuentas/categorías/glosas/fecha elegidas en el modal
- validaciones:
  - repo: `cd frontend && npm run build` -> `OK`
  - `staging`: frontend publicado con el hotfix
  - `production`: frontend publicado con el hotfix
- resultado:
  - los cierres nuevos ya deben impactar la cuenta correcta y persistir la categoría correcta en Finanzas
  - el saldo por cuenta vuelve a variar porque la transacción deja de quedar `accountless`
- nota operativa:
  - las transacciones antiguas que ya nacieron con `account/category = null` no se corrigen solas con este hotfix; requieren re-sync manual o un backfill explícito

## 2026-04-14 - Regla de promoción completa + cierre limpio de convergencia en staging

- objetivo:
  - dejar explícito que un cambio declarado correcto para la PaaS debe cerrarse en todos los ambientes y tenants afectados, no solo en repo o en un tenant puntual
  - cerrar el último drift crítico conocido en `staging`
- cambios principales:
  - [REGLAS_IMPLEMENTACION.md](/home/felipe/platform_paas/REGLAS_IMPLEMENTACION.md) agrega la regla `Cambio correcto = promoción completa por ambiente y tenant`
  - [CHECKLIST_CIERRE_ITERACION.md](/home/felipe/platform_paas/CHECKLIST_CIERRE_ITERACION.md) exige confirmar promoción por ambiente, convergencia por tenant y documentación explícita del cierre
  - [implementation-governance.md](/home/felipe/platform_paas/docs/architecture/implementation-governance.md) fija la promoción completa como parte del estándar de implementación
  - `condominio-demo` en `staging` se repara rotando credenciales DB tenant desde [tenant_service.py](/home/felipe/platform_paas/backend/app/apps/platform_control/services/tenant_service.py), dejando consistente:
    - rol PostgreSQL tenant
    - secreto runtime en `TENANT_SECRETS_FILE`
    - metadata de rotación en control
- validaciones:
  - `seed_missing_tenant_defaults.py --apply` en `staging` -> `processed=4, changed=2, failed=0`
  - `repair_maintenance_finance_sync.py --all-active --limit 100` en `staging` -> `processed=4, failures=0`
  - `audit_active_tenant_convergence.py --all-active --limit 100` en `staging` -> `processed=4, warnings=0, failed=0`
- resultado:
  - `staging` y `production` quedan convergidos y auditados sin fallos críticos en tenants activos
  - se cierra la ambigüedad operativa de “funciona en repo / en un tenant / en un ambiente” como criterio insuficiente
- siguiente paso:
  - aplicar esta misma regla como gate del próximo slice funcional real del roadmap

## 2026-04-13 - Convergencia multi-tenant real entre repo, staging y production

- objetivo:
  - evitar el patrón "funciona en `empresa-demo` pero no en `ieris-ltda`" cuando el código ya fue corregido en repo
- cambios principales:
  - [transaction_repository.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/repositories/transaction_repository.py) repara automáticamente la secuencia `finance_transactions` al detectar colisión PK
  - [transaction_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/services/transaction_service.py) replica esa autocorrección en `stage_system_transaction`, que es la ruta usada por `maintenance -> finance`
  - [seed_missing_tenant_defaults.py](/home/felipe/platform_paas/backend/app/scripts/seed_missing_tenant_defaults.py) ya no aborta todo el barrido y trabaja sobre tenants activos por defecto
  - [repair_maintenance_finance_sync.py](/home/felipe/platform_paas/backend/app/scripts/repair_maintenance_finance_sync.py) opera sobre tenants activos por defecto en barridos masivos
  - [audit_active_tenant_convergence.py](/home/felipe/platform_paas/backend/app/scripts/audit_active_tenant_convergence.py) se agrega para auditar drift crítico por tenant después del deploy
  - [verify_backend_deploy.sh](/home/felipe/platform_paas/deploy/verify_backend_deploy.sh) ahora corre:
    - sync de schema tenant
    - seed de defaults
    - repair `maintenance -> finance`
    - audit activo por tenant
- validaciones:
  - backend targeted tests: `35 OK`
  - frontend build local: `OK`
  - deploy backend `staging`: `OK` con warning real sobre `condominio-demo` por credenciales DB tenant
  - deploy backend `production`: `OK`
  - publish frontend `staging`: `OK`
  - publish frontend `production`: `OK`
  - `production` audit directo: `processed=4, warnings=0, failed=0`
  - verificación directa en `production` para `ieris-ltda`:
    - OT `#2` -> ingreso `#202`, egreso `#203`
    - política efectiva `auto_on_close`
- causa confirmada:
  - no bastaba con "tener el cambio en repo"
  - el gap real era `repo != runtime` y `tenant saludable != tenant con drift técnico`
- siguiente paso:
  - reparar `staging` para tenants con credenciales/runtime dañados y rerun de la auditoría activa

## 2026-04-13 - Hotfix productivo de chunks lazy en Mantenciones

- objetivo:
  - evitar pantalla blanca/`Unexpected Application Error` al abrir subrutas lazy de Mantenciones después de publicar frontend nuevo
- cambios principales:
  - [main.tsx](/home/felipe/platform_paas/frontend/src/main.tsx) agrega recuperación automática ante `error loading dynamically imported module` o `ChunkLoadError`
  - plantillas nginx del frontend ahora envían `Cache-Control: no-store, no-cache, must-revalidate` para `index.html` y rutas SPA
  - republish de `production` hecho copiando `dist` nuevo sin purgar de golpe `/opt/platform_paas/frontend/dist/assets`
- validaciones:
  - `cd frontend && npm run build` -> `OK`
  - `nginx -t` y `systemctl reload nginx` -> `OK`
- causa confirmada:
  - no era sincronización de esquema tenant
  - era desalineación entre `index/chunk` cacheado y assets hash ya rotados en `production`
- siguiente paso:
  - validar en navegador real que `Instalaciones`, `Tipos de equipo`, `Costos de mantención`, `Agenda` y `Reportes` vuelven a abrir con normalidad

## 2026-04-13 - Claridad UX para histórico vs sync de Finanzas

- objetivo:
  - evitar que `Ver costos` desde `Historial` se interprete como la acción que dispara la sincronización con Finanzas
- cambios principales:
  - [MaintenanceHistoryPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceHistoryPage.tsx) cambia el copy a `Ver costos (hist.)` y agrega alerta operativa en la vista histórica
  - [MaintenanceWorkOrderDetailModal.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceWorkOrderDetailModal.tsx) replica el label `Ver costos (hist.)`
  - [MaintenanceCostingModal.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceCostingModal.tsx) muestra:
    - modal readonly identificado como `solo lectura`
    - alerta verde cuando la mantención ya quedó reflejada en Finanzas
    - alerta amarilla cuando hay costo real guardado pero no se ve vínculo financiero
    - texto explícito de que la sección readonly no dispara sincronización
- validaciones:
  - `cd frontend && npm run build` -> `OK`
  - frontend production rebuild + publish -> `OK`
- bloqueos:
  - pendiente validación visual final en browser
- siguiente paso:
  - validar una OT sincronizada y otra no sincronizada desde Historial

## 2026-04-13 - Validación productiva real del puente maintenance -> finance

- objetivo:
  - confirmar con datos reales si el cierre de mantenciones estaba o no generando ingresos/egresos en Finanzas
- cambios principales:
  - se valida `empresa-demo` directo en `production` con cruce OT cerradas + `maintenance_cost_actuals` + `finance_transactions`
  - se confirma que la política efectiva del tenant está en `auto_on_close`
  - se confirma que no quedan OT completadas pendientes de sync usando [repair_maintenance_finance_sync.py](/home/felipe/platform_paas/backend/app/scripts/repair_maintenance_finance_sync.py)
  - se deja explícito que `Ver costos` desde `Historial` es una lectura consolidada y no el punto de disparo de sincronización
- validaciones:
  - OT `#321` -> ingreso `#196`, egreso `#202`
  - OT `#322` -> ingreso `#203`, egreso `#204`
  - OT `#323` -> ingreso `#205`, egreso `#206`
  - `repair_maintenance_finance_sync.py --tenant-slug empresa-demo --dry-run` -> `OT pendientes de sync: []`
- bloqueos:
  - ninguno técnico; el gap detectado es UX
- siguiente paso:
  - endurecer el copy/feedback visual para separar mejor lectura histórica vs cierre operativo

## 2026-04-12 - Control por línea de egreso en costeo

- objetivo:
  - permitir seleccionar qué líneas de costo impactan el egreso sincronizado
- cambios principales:
  - `maintenance_cost_lines` agrega `include_in_expense` (migración `0037`)
  - `Costos y cobro` expone checkbox por línea para incluir/excluir del egreso
  - los totales y el egreso sincronizado usan sólo líneas marcadas
- validaciones:
  - pendiente validación UI en `empresa-demo`

## 2026-04-12 - Sincronización de costos obliga egreso cuando hay ingreso

- objetivo:
  - evitar utilidades infladas si se registra cobro pero no se registra egreso por costos reales
- cambios principales:
  - [costing_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/services/costing_service.py) fuerza egreso cuando `sync_income` y `total_actual_cost > 0`
  - [test_maintenance_costing_service.py](/home/felipe/platform_paas/backend/app/tests/test_maintenance_costing_service.py) ajusta caso con costo 0 para evitar egreso forzado
- validaciones:
  - deploy backend `staging` -> `523 tests OK`
  - deploy backend `production` -> `523 tests OK`
  - script `repair_maintenance_finance_expenses.py` aplicado en `empresa-demo` (6 egresos creados)
- bloqueos:
  - pendiente validación UI en `empresa-demo` para ver ingreso + egreso en Finanzas

## 2026-04-12 - Backfill defaults core/finance + cleanup E2E finance + fix Pendientes PK

- objetivo:
  - eliminar 500 en `Pendientes` por secuencias PK desfasadas
  - re-sembrar perfiles, tipos de tarea y categorías default en `ieris-ltda`
  - limpiar basura E2E en finanzas dentro de un tenant real
- cambios principales:
  - [due_item_repository.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/repositories/due_item_repository.py) repara secuencia `maintenance_due_items` y reintenta insert
  - [seed_tenant_defaults.py](/home/felipe/platform_paas/backend/app/scripts/seed_tenant_defaults.py) agrega backfill core/finance por tenant
  - [cleanup_tenant_e2e_finance_data.py](/home/felipe/platform_paas/backend/app/scripts/cleanup_tenant_e2e_finance_data.py) limpia residuos E2E en finanzas
  - docs: [frontend-e2e-browser.md](/home/felipe/platform_paas/docs/runbooks/frontend-e2e-browser.md) y [tenant-basic-cycle.md](/home/felipe/platform_paas/docs/runbooks/tenant-basic-cycle.md) actualizados
- validaciones:
  - backend reiniciado en production y staging
  - seed defaults ejecutado en production para `ieris-ltda`
  - cleanup E2E finance ejecutado en production para `ieris-ltda` (45 transacciones)
- validaciones adicionales:
  - backfill masivo aplicado en production (`condominio-demo`, `empresa-bootstrap`, `empresa-demo`, `ieris-ltda`)

## 2026-04-12 - Familias obligatorias en categorías finance

- objetivo:
  - asegurar que todas las categorías default tengan familia (parent) por tipo
  - corregir el catálogo de `ieris-ltda` para que ninguna categoría quede sin familia
- cambios principales:
  - [default_category_profiles.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/default_category_profiles.py) agrega familias `Ingresos`, `Egresos`, `Transferencias` y parent_name en seeds
  - [tenant_db_bootstrap_service.py](/home/felipe/platform_paas/backend/app/apps/provisioning/services/tenant_db_bootstrap_service.py) asigna parent a categorías existentes sin familia
  - [repair_finance_category_families.py](/home/felipe/platform_paas/backend/app/scripts/repair_finance_category_families.py) repara tenants existentes
- validaciones:
  - `ieris-ltda`: reparación aplicada (`updated_categories=89`)
- bloqueos:
  - pendiente validar en UI que las familias aparecen correctamente
- siguiente paso:
  - abrir `finance/categories` en `ieris-ltda` y confirmar familia visible para todas las categorías

## 2026-04-12 - Reset catálogo finance a baseline default (ieris-ltda)

- objetivo:
  - limpiar categorías no default y dejar solo baseline por familias
- cambios principales:
  - [reset_finance_categories_to_defaults.py](/home/felipe/platform_paas/backend/app/scripts/reset_finance_categories_to_defaults.py) remapea transacciones/presupuestos y elimina categorías fuera de baseline
- validaciones:
  - `ieris-ltda`: `removed_categories=21`, `remapped_transactions=55`
- bloqueos:
  - pendiente confirmar en UI que el catálogo quedó limpio
- siguiente paso:
  - abrir `finance/categories` en `ieris-ltda` y validar

## 2026-04-12 - Regla E2E tenants permitidos

- objetivo:
  - proteger `ieris-ltda` de ejecuciones E2E
- cambios principales:
  - [REGLAS_IMPLEMENTACION.md](/home/felipe/platform_paas/REGLAS_IMPLEMENTACION.md) fija que E2E solo use `empresa-bootstrap` y `empresa-demo`
  - [frontend-e2e-browser.md](/home/felipe/platform_paas/docs/runbooks/frontend-e2e-browser.md) replica la regla
- validaciones:
  - no aplica
- bloqueos:
  - ninguno
- siguiente paso:
  - decidir si se agrega enforcement técnico en scripts E2E

## 2026-04-12 - Hotfix deprovision Permission denied runtime env

- objetivo:
  - permitir eliminar tenants aunque el runtime `.env` no sea escribible
- cambios principales:
  - [tenant_service.py](/home/felipe/platform_paas/backend/app/apps/platform_control/services/tenant_service.py) ahora ignora `PermissionError` al limpiar secrets runtime en deprovision
- validaciones:
  - backend reiniciado en production y staging
- bloqueos:
  - falta validar eliminación desde UI
- siguiente paso:
  - reintentar desprovision + delete del tenant con error
- bloqueos:
  - falta validar en UI que `Pendientes` carga sin 500
- siguiente paso:
  - abrir `/tenant-portal/maintenance/due-items` y confirmar que el error ya no aparece

## 2026-04-12 - Hotfix deprovision: omitir cleanup de `.env` legacy no escribible

- objetivo:
  - evitar que el deprovision falle por `Permission denied` al intentar escribir `/opt/platform_paas/.env`
- cambios principales:
  - [tenant_service.py](/home/felipe/platform_paas/backend/app/apps/platform_control/services/tenant_service.py) salta el cleanup del `.env` legacy si no es escribible
  - [docs/modules/platform-core/CHANGELOG.md](/home/felipe/platform_paas/docs/modules/platform-core/CHANGELOG.md) actualizado con el ajuste
-- validaciones:
  - deploy backend `staging` -> `523 tests OK`
  - deploy backend `production` -> `523 tests OK`
  - deploy backend `staging` (hash invalid fix) -> `523 tests OK`
  - deploy backend `production` (hash invalid fix) -> `523 tests OK`
  - cleanup `cleanup_e2e_tenants.py --apply --prefix e2e-` -> `2 deleted`
-- bloqueos:
  - ninguno
-- siguiente paso:
  - validar login tenant en UI para cerrar el hotfix

## 2026-04-12 - Hotfix login tenant: evitar 500 por sesión no instanciada

- objetivo:
  - evitar `500` en `/tenant/auth/login` cuando la sesión tenant falla antes de instanciarse
- cambios principales:
  - [auth_routes.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/core/api/auth_routes.py) ahora protege el cierre de `tenant_db`
  - [password_service.py](/home/felipe/platform_paas/backend/app/common/security/password_service.py) trata hashes inválidos como credenciales inválidas
- validaciones:
  - deploy backend `staging` -> `523 tests OK`
  - deploy backend `production` -> `523 tests OK`
  - deploy backend `staging` (hash invalid fix) -> `523 tests OK`
  - deploy backend `production` (hash invalid fix) -> `523 tests OK`
  - cleanup `cleanup_e2e_tenants.py --apply --prefix debug-` -> `1 deleted`
- bloqueos:
  - pendiente confirmar en UI (sin `500`)
- siguiente paso:
  - probar login tenant con credenciales inválidas o tenant no provisionado

## 2026-04-12 - Acceso rápido portal tenant con contraseña temporal

- objetivo:
  - permitir abrir el portal tenant desde `Tenants` sin copiar manualmente la contraseña
- cambios principales:
  - `TenantsPage` guarda un prefill temporal en `sessionStorage` tras reset
  - `TenantLoginPage` aplica el prefill y lo limpia al abrir el portal
  - `USER_GUIDE` documenta el flujo y aclara que no se exponen contraseñas reales
- validaciones:
  - frontend publish `staging` -> `OK`
  - frontend publish `production` -> `OK`
- bloqueos:
  - falta validar UX en UI
- siguiente paso:
  - publicar frontend y validar UX

## 2026-04-12 - Segundo corte maintenance -> finance (glosa y fecha contable) abierto en repo

- objetivo:
  - abrir el segundo subcorte de llenado fino entre `maintenance` y `finance` sin tocar el contrato base
- cambios principales:
  - `finance-sync` acepta glosas editables (`income_description`, `expense_description`) y `transaction_at` opcional
  - `Costos y cobro` ahora muestra `Referencia OT` y permite ajustar fecha contable solo con toggle explícito
  - se agregan verificaciones de descripción y fecha contable en [test_maintenance_costing_service.py](/home/felipe/platform_paas/backend/app/tests/test_maintenance_costing_service.py)
  - documentación actualizada en `API_REFERENCE`, `DEV_GUIDE`, `CHANGELOG` y `ROADMAP`
- validaciones:
  - `cd backend && PYTHONPATH=/home/felipe/platform_paas/backend /home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest app.tests.test_maintenance_costing_service` -> `11 tests OK`
  - smoke `tenant-portal-maintenance-finance-defaults` -> `1 passed` en `staging`
  - smoke `tenant-portal-maintenance-finance-defaults` -> `1 passed` en `production`
- bloqueos:
  - sin bloqueo técnico
- siguiente paso:
  - publicar backend + frontend en `staging` y ejecutar smoke antes de promover a `production`

## 2026-04-12 - Hotfix deprovision: tolerar `.env` legacy no legible

- objetivo:
  - evitar que el deprovision falle por `PermissionError` al leer `/opt/platform_paas/.env`
- cambios principales:
  - `tenant_secret_service` ignora `PermissionError` al leer `.env` legacy y continúa con `TENANT_SECRETS_FILE`
- validaciones:
  - backend redeploy en `production` y `staging` con `523 tests OK`
- siguiente paso:
  - reintentar deprovision desde UI y borrar tenant bloqueado

## 2026-04-12 - E2E cleanup y guard de seeds en producción

- objetivo:
  - evitar que los smokes dejen tenants basura en producción
- cambios principales:
  - `backend-control` bloquea seeds en producción salvo `E2E_ALLOW_PROD_SEED=1`
  - `seedPlatformTenantCatalogRecord` registra cleanup automático si `E2E_AUTO_CLEANUP=1`
  - `cleanupTenantCatalogRecord` intenta archivar, deprovisionar y eliminar tenant E2E
  - runbook y README E2E actualizados con las variables nuevas

## 2026-04-12 - Defaults efectivos maintenance -> finance cerrados en staging y production

- objetivo:
  - terminar de validar y promover el primer corte de defaults efectivos `maintenance -> finance`
- cambios principales:
  - se agrega el smoke [tenant-portal-maintenance-finance-defaults.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-maintenance-finance-defaults.smoke.spec.ts) como gate específico del slice
  - se actualizan [frontend/e2e/README.md](/home/felipe/platform_paas/frontend/e2e/README.md) y [frontend-e2e-browser.md](/home/felipe/platform_paas/docs/runbooks/frontend-e2e-browser.md) para reflejar esa cobertura nueva
  - se detecta un falso negativo real de runtime en `staging`: [TENANT_PLAN_ENABLED_MODULES](/home/felipe/platform_paas/backend/app/common/config/settings.py) estaba sobreescrito en `/opt/platform_paas_staging/.env.staging` con una matriz vieja sin `maintenance`
  - se corrige ese env de `staging`, se redepliega backend y se recupera `empresa-bootstrap` como baseline tenant published válido para el smoke
  - el mismo corte se sincroniza y despliega en `production`
- validaciones:
  - `cd frontend && npx playwright test e2e/specs/tenant-portal-maintenance-finance-defaults.smoke.spec.ts --list` -> `OK`
  - `staging` smoke published -> `1 passed`
  - `production` smoke published -> `1 passed`
  - `deploy_backend_staging.sh` -> `523 tests OK`
  - `deploy_backend_production.sh` -> `523 tests OK`
  - `deploy/check_frontend_static_readiness.sh` -> `OK` en `staging` y `production`
- bloqueos:
  - sin bloqueo técnico
- siguiente paso:
  - abrir el segundo corte funcional `maintenance -> finance`, ahora sobre llenado fino operativo

## 2026-04-12 - Primer corte de defaults efectivos maintenance -> finance

- objetivo:
  - cerrar el primer corte de autollenado fino `maintenance -> finance` sin duplicar la integración base ya existente
- cambios principales:
  - se confirma que el puente operativo `maintenance -> finance` ya existía y que el gap real era de defaults/sugerencias
  - se agrega [finance_sync.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/api/finance_sync.py) con `GET /tenant/maintenance/finance-sync-defaults`
  - [costing_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/services/costing_service.py) resuelve defaults efectivos de moneda, cuentas y categorías con prioridad de política tenant y fallbacks seguros
  - [MaintenanceOverviewPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceOverviewPage.tsx) y [MaintenanceCostingModal.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceCostingModal.tsx) pasan a consumir esa misma fuente de verdad
  - se actualiza documentación del módulo para fijar este contrato nuevo como fuente canónica de sugerencias
- validaciones:
  - `cd backend && PYTHONPATH=/home/felipe/platform_paas/backend /home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest app.tests.test_maintenance_costing_service` -> `10 tests OK`
  - `cd backend && ... python -m py_compile ...maintenance/api/finance_sync.py ...maintenance/services/costing_service.py ...maintenance/schemas/costing.py` -> `OK`
  - `cd frontend && npm run build` -> `OK`
  - `cd /opt/platform_paas_staging && bash deploy/deploy_backend_staging.sh` -> `523 tests OK`, servicio activo y `healthcheck` OK
  - `cd /opt/platform_paas_staging && API_BASE_URL=http://192.168.7.42:8081 RUN_NPM_INSTALL=false bash deploy/build_frontend.sh` -> `OK`
  - `cd /opt/platform_paas_staging && EXPECTED_API_BASE_URL=http://192.168.7.42:8081 bash deploy/check_frontend_static_readiness.sh` -> `OK`
- bloqueos:
  - sin bloqueo técnico
  - queda pendiente solo validación visual en `staging` antes de decidir promoción a `production`
- siguiente paso:
  - validar `Resumen técnico` y `Costos y cobro` en `staging`, y luego decidir promoción a `production`

## 2026-04-12 - Gobernanza de datos y SRED formalizados

- objetivo:
  - dejar una capa transversal explícita para ownership de datos, contratos entre módulos y criterio uniforme de cierre antes de abrir el siguiente slice `maintenance -> finance`
- cambios principales:
  - se agrega [data-governance.md](/home/felipe/platform_paas/docs/architecture/data-governance.md) como documento canónico de ownership, calidad mínima, seeds/defaults, archivo y portabilidad
  - se agrega [sred-development.md](/home/felipe/platform_paas/docs/architecture/sred-development.md) para formalizar el método `Spec`, `Rules`, `Evidence`, `Documentation`
  - se enlaza ese marco desde contexto raíz, reglas, checklist, prompt maestro, estándar modular y gobernanza de implementación
- validaciones:
  - revisión estructural de enlaces y precedencias documentales: `OK`
  - `HANDOFF_STATE.json` válido por `python3 -m json.tool`: `OK`
- bloqueos:
  - sin bloqueo técnico
  - queda pendiente solo aplicar este marco al siguiente slice funcional
- siguiente paso:
  - abrir el autollenado fino `maintenance -> finance` usando `data-governance.md` y `sred-development.md` como marco obligatorio

## 2026-04-12 - Bootstrap contractual por módulos publicado y validado con tenants reales

- objetivo:
  - cerrar el rollout real del baseline contractual por módulos y validar que el bootstrap nuevo siembra correctamente catálogos y defaults de negocio/finanzas
- cambios principales:
  - backend desplegado en `staging` y `production` con el corte que separa `seed_defaults(...)` y permite backfill por cambio de plan
  - validación real en `staging` con tenants nuevos `bootstrap-empresa-20260412002354` y `bootstrap-condominio-20260412002354`
  - confirmación de `CLP` como moneda base efectiva, coexistencia de `Casa - ...` y `Empresa - ...`, perfiles funcionales default y tipos de tarea default
  - sincronización del estado vivo y documentación canónica para mover el foco al siguiente slice `maintenance -> finance`
- validaciones:
  - `deploy_backend_staging.sh` -> `523 tests ... OK`
  - `deploy_backend_production.sh` -> `523 tests ... OK`
  - `tenant-portal-sidebar-modules.smoke.spec.ts` -> `1 passed` en `staging`
  - `tenant-portal-sidebar-modules.smoke.spec.ts` -> `1 passed` en `production`
  - healthcheck `https://orkestia.ddns.net/health` -> `healthy`
- bloqueos:
  - sin bloqueo técnico
  - sólo queda por definir el alcance funcional del autollenado `maintenance -> finance`
- siguiente paso:
  - abrir el slice fino `maintenance -> finance` revisando primero qué parte del puente ya existe y qué parte falta realmente

## 2026-04-11 - Bootstrap contractual por módulos reforzado en repo

- objetivo:
  - endurecer el baseline tenant para que `core` y `finance` siembren por defecto la taxonomía y catálogos mínimos correctos
- cambios principales:
  - [tenant_db_bootstrap_service.py](/home/felipe/platform_paas/backend/app/apps/provisioning/services/tenant_db_bootstrap_service.py) ahora separa `seed_defaults(...)` y lo reutiliza para provisioning inicial y backfill posterior
  - [default_category_profiles.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/default_category_profiles.py) ahora siembra baseline mixto con `CLP`, categorías compartidas y familias clasificadas `Casa - ...` / `Empresa - ...`
  - [default_catalog_profiles.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/business_core/default_catalog_profiles.py) agrega perfiles funcionales y tipos de tarea default con compatibilidad base
  - [tenant_service.py](/home/felipe/platform_paas/backend/app/apps/platform_control/services/tenant_service.py) ya backfillea esos defaults cuando un tenant activo gana `core` o `finance` por cambio de plan
  - se deja explícito en documentación que `maintenance -> finance` ya existe y el siguiente slice será de autollenado fino, no de integración base
- validaciones:
  - `python -m unittest app.tests.test_tenant_db_bootstrap_service app.tests.test_tenant_service_module_seed_backfill` -> `5 tests OK`
  - `python3 -m py_compile ...` sobre los archivos nuevos/modificados -> `OK`
- bloqueos:
  - no hay bloqueo técnico
  - el subcorte todavía no está validado visualmente en `staging`
- siguiente paso:
  - publicar este subcorte en `staging` y validar tenant nuevo con `core` antes de abrir el autollenado fino `maintenance -> finance`

## 2026-04-11 - Promoción a production del contrato maintenance y bootstrap financiero vertical

- objetivo:
  - terminar el rollout del corte contractual `maintenance` + bootstrap financiero por vertical publicándolo también en `production`
- cambios principales:
  - backend `production` desplegado en `/opt/platform_paas` con el mismo corte publicado antes en `staging`
  - frontend `production` reconstruido con `API_BASE_URL=https://orkestia.ddns.net` y publicado en `/opt/platform_paas/frontend/dist`
  - smoke [tenant-portal-sidebar-modules.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-sidebar-modules.smoke.spec.ts) validado en `production`
- validaciones:
  - backend production: `deploy_backend_production.sh` -> `523 tests ... OK`, `platform-paas-backend.service active`, post-deploy gate OK
  - frontend production: `deploy/check_frontend_static_readiness.sh` -> `OK`
  - `https://orkestia.ddns.net/health` -> `healthy`
  - smoke production: `tenant-portal-sidebar-modules.smoke.spec.ts` -> `1 passed`
- bloqueos:
  - sin bloqueo técnico
  - la validación visible del bootstrap vertical creando tenants nuevos sigue pendiente; no bloquea el siguiente slice funcional
- siguiente paso:
  - abrir el slice de llenado fino `maintenance -> finance`

## 2026-04-11 - Publicación en staging del contrato maintenance y bootstrap financiero vertical

- objetivo:
  - publicar en `staging` el corte donde `maintenance` pasa a ser módulo contractual independiente y el bootstrap financiero depende del tipo de tenant
- cambios principales:
  - backend `staging` desplegado usando explícitamente `/opt/platform_paas_staging/.env.staging`
  - frontend `staging` reconstruido con `API_BASE_URL=http://192.168.7.42:8081` y publicado en `/opt/platform_paas_staging/frontend/dist`
  - smoke [tenant-portal-sidebar-modules.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-sidebar-modules.smoke.spec.ts) validado en `staging`
  - se corrige en repo [deploy_backend_staging.sh](/home/felipe/platform_paas/deploy/deploy_backend_staging.sh) para que el wrapper use `/opt/platform_paas_staging` por defecto y no el root de producción
- validaciones:
  - backend staging: `deploy_backend.sh` -> `523 tests ... OK`, `platform-paas-backend-staging.service active`, post-deploy gate OK
  - frontend staging: `deploy/check_frontend_static_readiness.sh` -> `OK`
  - smoke staging: `tenant-portal-sidebar-modules.smoke.spec.ts` -> `1 passed`
- bloqueos:
  - sin bloqueo técnico
  - la validación visible del bootstrap vertical creando tenants nuevos sigue pendiente; esa parte quedó cubierta por unit tests y no por smoke browser
- siguiente paso:
  - decidir si este corte se promueve a `production` o si se abre primero el slice `maintenance -> finance`

## 2026-04-11 - Contrato maintenance independiente y bootstrap financiero por vertical

- objetivo:
  - separar `maintenance` de `core` como módulo contractual real y dejar categorías financieras iniciales distintas por vertical de tenant
- cambios principales:
  - `maintenance` deja de heredar visibilidad y entitlement desde `core`; backend y `tenant_portal` lo leen ahora como módulo `maintenance`
  - `settings.py` y ejemplos de env ya reflejan una matriz base de planes donde `maintenance` y `finance` pueden variar por plan
  - el bootstrap tenant agrega [default_category_profiles.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/default_category_profiles.py) y siembra catálogo `empresa` o `condominio/hogar`
  - el bootstrap reemplaza el catálogo neutral solo cuando la DB aún no tiene uso financiero
  - se actualizan docs canónicas, E2E README y runbooks para reflejar el contrato nuevo y el seed vertical
- validaciones:
  - backend: `python -m unittest app.tests.test_platform_flow app.tests.test_tenant_flow app.tests.test_tenant_db_bootstrap_service` -> `OK`
  - frontend: `npm run build` -> `OK`
  - playwright: `tenant-portal-sidebar-modules.smoke.spec.ts --list` -> `OK`
- bloqueos:
  - sin bloqueo técnico
  - queda pendiente decidir si este corte se publica ya a `staging/production`
- siguiente paso:
  - decidir rollout de este corte o abrir el siguiente slice de autollenado `maintenance -> finance`

## 2026-04-11 - Alineación estructural de E2E y árboles operativos

- objetivo:
  - dejar explícita en arquitectura la ubicación canónica de smokes E2E, helpers operativos y árboles `/opt/...`
- cambios principales:
  - [project-structure.md](/home/felipe/platform_paas/docs/architecture/project-structure.md) ahora documenta `frontend/e2e/specs`, `frontend/e2e/support`, `frontend/e2e/README.md` y `scripts/dev/` como parte del contrato operativo
  - el mismo documento deja explícito el rol de `/opt/platform_paas` y `/opt/platform_paas_staging` como espejos de runtime y no como fuente primaria del proyecto
- validaciones:
  - revisión manual de la estructura actual del repo: OK
  - estructura documental alineada con el estado real del workspace y de los árboles operativos: OK
- bloqueos:
  - sin bloqueo técnico; fue una alineación documental de continuidad
- siguiente paso:
  - seguir fuera de `Provisioning/DLQ` y retomar el siguiente bloque central del roadmap

## 2026-04-11 - Cierre de etapa Provisioning DLQ broker-only

- objetivo:
  - cerrar formalmente `Provisioning/DLQ broker-only` como frente suficientemente endurecido para esta etapa
- cambios principales:
  - se saca DLQ del foco activo del handoff
  - se mueve la prioridad al siguiente bloque central fuera de DLQ
  - se actualizan estado, roadmap y handoff para evitar que otra sesión siga abriendo slices por inercia
- validaciones:
  - se reutiliza la validación funcional del último corte cerrado:
    - repo build OK
    - repo playwright `--list` OK
    - staging smoke `technical` OK
    - production `skipped_non_broker` coherente
- bloqueos:
  - sin bloqueo técnico
  - el motivo del cierre es de priorización: seguir profundizando DLQ ya entra en rendimiento decreciente
- siguiente paso:
  - volver al siguiente bloque central del roadmap fuera de `Provisioning/DLQ`

## 2026-04-11 - Provisioning DLQ tenant technical matrix validado y cierre de etapa

- objetivo:
  - cerrar el último slice broker-only útil de `Provisioning/DLQ` con una matriz visible `tenant + capa técnica` y luego dar por cerrado este frente para la etapa actual
- cambios principales:
  - [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx) ahora expone la matriz `tenant + capa técnica` dentro del bloque broker-only de `Familias DLQ visibles`
  - la nueva capa cruza `tenant` con `postgres-role`, `postgres-database`, `tenant-schema`, `tenant-database-drop` y `other`
  - la consola expone `Enfocar combinación` para aislar rápidamente un `tenant + capa técnica` sin revisar fila por fila
  - se agrega [platform-admin-provisioning-dlq-tenant-technical-matrix.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-tenant-technical-matrix.smoke.spec.ts)
  - [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh) ya soporta `--target matrix`
- validaciones:
  - repo: `cd frontend && npm run build` OK
  - repo: `cd frontend && npx playwright test e2e/specs/platform-admin-provisioning-dlq-tenant-technical-matrix.smoke.spec.ts --list` OK
  - `staging`: `scripts/dev/run_staging_published_broker_dlq_smoke.sh --target matrix` -> `1 passed`
  - `production`: smoke publicado -> `1 skipped`
- bloqueos:
  - no quedó bloqueo funcional
  - apareció una suposición incorrecta en el seed del smoke y quedó corregida antes del cierre
- siguiente paso:
  - sacar `Provisioning/DLQ` del foco activo y volver al siguiente bloque central del roadmap fuera de DLQ

## 2026-04-11 - Provisioning DLQ technical diagnosis validado

- objetivo:
  - cerrar el slice broker-only `Diagnóstico DLQ / BD visible` dentro de `Familias DLQ visibles`
- cambios principales:
  - [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx) ahora clasifica el subconjunto visible entre `postgres-role`, `postgres-database`, `tenant-schema`, `tenant-database-drop` y `other`
  - la UI resume filas visibles, tenants afectados y código dominante por capa técnica
  - la consola expone la acción `Enfocar código dominante`
  - se agrega [platform-admin-provisioning-dlq-technical-diagnosis.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-technical-diagnosis.smoke.spec.ts)
  - [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh) ya soporta `--target technical`
- validaciones:
  - repo: `cd frontend && npm run build` OK
  - repo: `cd frontend && npx playwright test e2e/specs/platform-admin-provisioning-dlq-technical-diagnosis.smoke.spec.ts --list` OK
  - `staging`: `scripts/dev/run_staging_published_broker_dlq_smoke.sh --target technical` -> `1 passed`
  - `production`: smoke publicado -> `1 skipped`
- bloqueos:
  - no queda bloqueo funcional
  - aparecieron y quedaron resueltos dos detalles reales: `tone` tipado como string genérico y un seed E2E que no garantizaba una capa dominante estable
- siguiente paso:
  - decidir si el próximo corte de `Provisioning/DLQ` será una matriz visible `tenant + capa técnica` o si conviene cerrar pronto este frente y pasar al siguiente bloque del roadmap central

## 2026-04-11 - Provisioning DLQ tenant focus validado

- objetivo:
  - cerrar el slice broker-only `Prioridad por tenant visible` dentro de `Familias DLQ visibles`
- cambios principales:
  - [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx) ahora resume tenants visibles por filas, familias y tipos de job
  - la UI recomienda cuándo conviene aislar un tenant visible antes de operar familias
  - se agrega [platform-admin-provisioning-dlq-tenant-focus.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-tenant-focus.smoke.spec.ts)
  - [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh) ya soporta `--target tenant-focus`
- validaciones:
  - repo: `cd frontend && npm run build` OK
  - repo: `cd frontend && npx playwright test e2e/specs/platform-admin-provisioning-dlq-tenant-focus.smoke.spec.ts --list` OK
  - `staging`: `scripts/dev/run_staging_published_broker_dlq_smoke.sh --target tenant-focus` -> `1 passed`
  - `production`: smoke publicado -> `1 skipped`
- bloqueos:
  - no queda bloqueo funcional
  - apareció una nulabilidad TypeScript en el render del tenant activo y quedó corregida antes del publish
- siguiente paso:
  - abrir el próximo slice broker-only real dentro de `Provisioning/DLQ`

## 2026-04-11 - Provisioning DLQ family recommendation validado

- objetivo:
  - cerrar el slice broker-only `Plan operativo sugerido` dentro de `Familias DLQ visibles`
- cambios principales:
  - [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx) ahora recomienda operativamente cuándo conviene `focus single`, `requeue family`, `family-batch` o limpiar selección
  - se agrega [platform-admin-provisioning-dlq-family-recommendation.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-family-recommendation.smoke.spec.ts)
  - [run_staging_published_broker_dlq_smoke.sh](/home/felipe/platform_paas/scripts/dev/run_staging_published_broker_dlq_smoke.sh) ya soporta `--target family-recommendation`
  - el smoke se endurece para no exceder el límite real `varchar(100)` de `provisioning_jobs.error_code`
  - el release de `staging` vuelve a quedar alineado con `API_BASE_URL=http://192.168.7.42:8081` después de detectar un publish incorrecto hacia `8100`
- validaciones:
  - repo: `cd frontend && npm run build` OK
  - repo: `cd frontend && npx playwright test e2e/specs/platform-admin-provisioning-dlq-family-recommendation.smoke.spec.ts --list` OK
  - `staging`: `scripts/dev/run_staging_published_broker_dlq_smoke.sh --target family-recommendation` -> `1 passed`
  - `production`: smoke publicado -> `1 skipped`
- bloqueos:
  - no queda bloqueo funcional
  - aparecieron y quedaron resueltos un bug de seed E2E por longitud de `error_code` y un publish erróneo de `staging`
- siguiente paso:
  - abrir el próximo slice broker-only real dentro de `Provisioning/DLQ`

# 2026-04-14 - Cierre maintenance -> finance con payload explícito y convergencia runtime

- objetivo:
  - evitar que `Cerrar con costos` pierda `cuenta/categoría ingreso-egreso` por depender de defaults o de un segundo request separado
  - realinear el slice `maintenance` entre repo y runtimes `/opt/...`
  - reparar filas históricas de mantenciones ya creadas sin dimensiones financieras completas
- cambios principales:
  - [common.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/schemas/common.py) extiende `MaintenanceStatusUpdateRequest` con `finance_sync`
  - [work_order_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/services/work_order_service.py) ahora prioriza `payload.finance_sync` al completar la OT y solo usa `maybe_auto_sync_by_tenant_policy()` cuando no hay payload explícito
  - [workOrdersService.ts](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/services/workOrdersService.ts) envía `finance_sync` en `PATCH /status`
  - [MaintenanceCostingModal.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceCostingModal.tsx) deja de depender del sync manual posterior al cierre y usa el cierre mismo como acción canónica
  - [MaintenanceHistoryPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceHistoryPage.tsx) queda blindado frente a `finance_summary` faltante
  - se detecta y corrige drift repo/runtime dentro del slice `maintenance` copiando y reiniciando el backend real en `/opt/platform_paas` y `/opt/platform_paas_staging`
  - se republíca frontend en `staging` y `production`
  - [repair_maintenance_finance_dimensions.py](/home/felipe/platform_paas/backend/app/scripts/repair_maintenance_finance_dimensions.py) se ejecuta con `--apply` en ambos ambientes
  - se reparan credenciales DB tenant en `staging`:
    - `condominio-demo` rotado
    - `ieris-ltda` con secreto runtime faltante creado y validado
- validaciones:
  - backend focalizado `test_maintenance_work_order_service` + `test_maintenance_costing_service`: `35 OK`
  - frontend `npm run build`: `OK`
  - `production`:
    - `repair_maintenance_finance_dimensions.py --all-active --limit 100 --apply` -> `processed=4, updated=0, failed=0`
    - `audit_active_tenant_convergence.py --all-active --limit 100` -> `processed=4, warnings=0, failed=0`
    - verificación directa `ieris-ltda`: defaults efectivos `income_account_id=1`, `expense_account_id=1`, categorías `39/40`; OT `#7` ya persistida como ingreso `#204` y egreso `#205` con cuenta/categoría
  - `staging`:
    - `repair_maintenance_finance_dimensions.py --all-active --limit 100 --apply` -> `processed=4, updated=0, failed=0`
    - `audit_active_tenant_convergence.py --all-active --limit 100` -> `processed=4, warnings=0, failed=0`
- bloqueos:
  - no queda bloqueo crítico abierto; el riesgo vigente sigue siendo drift repo/runtime si no se promueve y audita explícitamente
- siguiente paso:
  - abrir el siguiente subcorte fino de `maintenance -> finance` ya sobre una base convergida:
    - navegación directa desde Mantenciones a la transacción exacta en Finanzas
    - endurecer UX de líneas que sí/no salen a egreso

## 2026-04-10 - Hotfix visual catálogo Tenants

- objetivo:
  - corregir el overflow visual del catálogo izquierdo en `platform-admin > Tenants`
- cambios principales:
  - [platform-admin.css](/home/felipe/platform_paas/frontend/src/styles/platform-admin.css) ahora fuerza contención del grid, `min-width: 0`, ancho máximo del item y wrap seguro para títulos/metadatos largos
  - el catálogo ya no se sale del cuadro central cuando aparecen tenants con slugs extensos
- validaciones:
  - repo: `cd frontend && npm run build` OK
  - `production`: frontend publicado con la corrección
  - `staging`: frontend publicado con la corrección
- bloqueos:
  - sin bloqueo adicional; era un bug visual de layout
- siguiente paso:
  - seguir con el roadmap central sobre `Provisioning/DLQ`
# 2026-04-12 - Maintenance -> Finance accountless + glosa cliente

- objetivo:
  - asegurar que el ingreso/egreso de mantenciones se registre en Finanzas incluso sin cuentas definidas
- cambios principales:
  - [costing_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/services/costing_service.py) permite sync accountless y glosa con cliente/sitio
  - [transaction_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/services/transaction_service.py) admite `allow_accountless` en update
  - [tenant_data_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/core/services/tenant_data_service.py) resuelve `auto_on_close` cuando no hay defaults explícitos
  - [MaintenanceCostingModal.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceCostingModal.tsx) deja de bloquear sync por falta de cuentas
  - defaults core pasan a `auto_on_close` en schemas/model
- validaciones:
  - deploy backend staging: 523 tests OK
  - deploy backend production: 523 tests OK
  - frontend build staging + production OK
- ajuste adicional:
  - hint visual agregado para mostrar el margen objetivo calculado cuando el usuario edita el precio sugerido
  - frontend production ahora fija VITE_API_BASE_URL vía `frontend/.env.production` para evitar builds con URL de staging
  - backend fuerza glosa default si el frontend envía una glosa incompleta
  - build_frontend.sh ahora lee `.env.production` y bloquea staging salvo override
  - script `repair_maintenance_finance_glosas.py` aplicado en empresa-demo (3 transacciones actualizadas)
  - backend re-publicado en staging/production tras ajustar `client_id` opcional en `_build_work_order_label`
  - frontend production re-publicado para corregir API_BASE_URL (staging -> production)
- bloqueos:
  - falta validar en empresa-demo el ingreso/egreso real en Finanzas
- siguiente paso:
  - probar cierre de OT con monto cobrado y confirmar transacción en Finanzas (glosa completa)

# 2026-04-12 - Precio sugerido editable + glosa sin equipo/sitio

- objetivo:
  - permitir editar `precio sugerido` en costeo estimado y ajustar la glosa a `mantención + trabajo + cliente`
- cambios principales:
  - [costing.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/schemas/costing.py) acepta `suggested_price` en request
  - [costing_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/services/costing_service.py) respeta suggested_price y reduce la glosa a trabajo + cliente
  - [MaintenanceCostingModal.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceCostingModal.tsx) permite editar sugerido, lo auto-ajusta si no se tocó y limpia la glosa visible
  - [costingService.ts](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/services/costingService.ts) envía suggested_price al backend
- validaciones:
  - deploy backend staging: 523 tests OK
  - deploy backend production: 523 tests OK
  - frontend build staging + production OK
- bloqueos:
  - falta validar en empresa-demo la edición y la glosa final en Finanzas
- siguiente paso:
  - editar precio sugerido en empresa-demo, guardar, reabrir y cerrar OT para confirmar la glosa en Finanzas

# 2026-04-12 - Margen objetivo sin overwrite + glosa con cliente fallback

- objetivo:
  - evitar que el precio sugerido sobreescriba el margen objetivo y asegurar que la glosa incluya cliente
- cambios principales:
  - [costing_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/services/costing_service.py) agrega fallback de cliente en la glosa por defecto
  - [MaintenanceCostingModal.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceCostingModal.tsx) deja el margen objetivo estable y muestra hint calculado según precio sugerido
  - [CHANGELOG.md](/home/felipe/platform_paas/docs/modules/maintenance/CHANGELOG.md) registra el ajuste de margen/glosa
- validaciones:
  - pendientes (no se ejecutaron tests en esta iteración)
- bloqueos:
  - validar en empresa-demo precio sugerido editable sin overwrite y glosa `mantención + trabajo + cliente`
- siguiente paso:
  - cerrar una OT con cobro > 0 y verificar glosa + egreso en Finanzas
