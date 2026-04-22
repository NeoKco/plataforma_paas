# HISTORIAL_ITERACIONES

## 2026-04-21 - `Clients` muestra señal rápida de inventario por cliente

- objetivo:
  - llevar la adopción visible de `assets` a la lectura principal de cartera
  - dejar que la tabla de clientes muestre inventario reusable sin obligar a abrir siempre la ficha
- cambios y acciones ejecutadas:
  - [frontend/src/apps/tenant_portal/modules/business_core/pages/BusinessCoreClientsPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/business_core/pages/BusinessCoreClientsPage.tsx):
    - carga `assets` del tenant
    - deriva resumen por cliente desde `client -> addresses -> assets`
    - agrega columna `Activos`
    - deja CTA contextual `Activos sitio`
  - se reconstruye y publica frontend por ambiente:
    - `staging` con `API_BASE_URL=http://192.168.7.42:8081`
    - `production` con `API_BASE_URL=https://orkestia.ddns.net`
- validaciones:
  - repo:
    - `npm run build` -> `OK`
  - `staging`:
    - publish en `/opt/platform_paas_staging/frontend/dist`
    - bundles visibles más recientes: `BusinessCoreClientsPage-Bt_QxnJo.js`, `index-JiB7nzBJ.js`
    - `cd /opt/platform_paas_staging && EXPECTED_API_BASE_URL=http://192.168.7.42:8081 bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
  - `production`:
    - publish en `/opt/platform_paas/frontend/dist`
    - bundles visibles más recientes: `BusinessCoreClientsPage-FFJAEdXw.js`, `index-DY5M49gZ.js`
    - `cd /opt/platform_paas && EXPECTED_API_BASE_URL=https://orkestia.ddns.net bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
- resultado:
  - la lectura principal de cartera ya muestra también inventario reusable del cliente
  - `assets` queda más integrado al flujo comercial y operativo del dominio
- siguiente paso:
  - decidir si el siguiente salto útil cae en merge/asimilación más rica o en otra ola visible de adopción de `assets`

## 2026-04-21 - `Resumen` ya muestra señal rápida de inventario reusable

- objetivo:
  - dejar `BusinessCoreOverviewPage` menos estática
  - hacer visible la adopción de `assets` desde la entrada del módulo, no solo desde `maintenance` o la ficha del cliente
- cambios y acciones ejecutadas:
  - [frontend/src/apps/tenant_portal/modules/business_core/pages/BusinessCoreOverviewPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/business_core/pages/BusinessCoreOverviewPage.tsx):
    - carga también `sites` y `assets`
    - reemplaza métricas placeholder por `Activos visibles` y `Sitios con activos`
    - agrega el bloque `Activos reutilizables por sitio`
    - deja CTA contextual a `Activos sitio` y a la ficha del cliente
  - se reconstruye y publica frontend por ambiente:
    - `staging` con `API_BASE_URL=http://192.168.7.42:8081`
    - `production` con `API_BASE_URL=https://orkestia.ddns.net`
- validaciones:
  - repo:
    - `npm run build` -> `OK`
  - `staging`:
    - publish en `/opt/platform_paas_staging/frontend/dist`
    - bundles visibles más recientes: `BusinessCoreOverviewPage-Bil7XgeJ.js`, `index-DCKISKuO.js`
    - `cd /opt/platform_paas_staging && EXPECTED_API_BASE_URL=http://192.168.7.42:8081 bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
  - `production`:
    - publish en `/opt/platform_paas/frontend/dist`
    - bundles visibles más recientes: `BusinessCoreOverviewPage-Cy9CbNRU.js`, `index-CuiXehcz.js`
    - `cd /opt/platform_paas && EXPECTED_API_BASE_URL=https://orkestia.ddns.net bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
- resultado:
  - `Resumen` deja de ser solo portada de altas recientes
  - la entrada del módulo ya deja lectura rápida del inventario reusable del dominio
- siguiente paso:
  - decidir si el siguiente salto útil cae en merge/asimilación más rica o en otra ola visible de adopción de `assets`

## 2026-04-21 - `Client detail` hace visible `assets` por dirección/sitio

- objetivo:
  - extender la adopción visible de `assets` fuera de `maintenance`
  - reutilizar la ficha del cliente como lectura operativa de inventario del mismo sitio sin abrir todavía una relación dura `installation.asset_id`
- cambios y acciones ejecutadas:
  - [frontend/src/apps/tenant_portal/modules/business_core/pages/BusinessCoreClientDetailPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/business_core/pages/BusinessCoreClientDetailPage.tsx):
    - carga `assets` del tenant con `includeInactive: true`
    - agrupa activos por `site_id`
    - resume activos visibles por cada dirección del cliente
    - distingue activos/inactivos y cantidad de tipos presentes
    - agrega CTA `Activos sitio` hacia la vista filtrada del mismo sitio
    - agrega el mismo salto contextual desde instalaciones relacionadas cuando existe dirección asociada
  - se reconstruye y publica frontend por ambiente:
    - `staging` con `API_BASE_URL=http://192.168.7.42:8081`
    - `production` con `API_BASE_URL=https://orkestia.ddns.net`
- validaciones:
  - repo:
    - `npm run build` -> `OK`
  - `staging`:
    - publish en `/opt/platform_paas_staging/frontend/dist`
    - bundles visibles más recientes: `BusinessCoreClientDetailPage-Bs67OtEF.js`, `index-MsvE9936.js`
    - `cd /opt/platform_paas_staging && EXPECTED_API_BASE_URL=http://192.168.7.42:8081 bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
  - `production`:
    - publish en `/opt/platform_paas/frontend/dist`
    - bundles visibles más recientes: `BusinessCoreClientDetailPage-2CcHoCz5.js`, `index-1I4zx2PP.js`
    - `cd /opt/platform_paas && EXPECTED_API_BASE_URL=https://orkestia.ddns.net bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
- resultado:
  - `assets` deja de ser lectura solo global o exclusiva de `maintenance`
  - la ficha del cliente ya sirve también como punto de entrada contextual al inventario del sitio
- siguiente paso:
  - decidir si el siguiente salto útil cae en merge/asimilación más rica o en otra ola visible de adopción de `assets`

## 2026-04-21 - `Organizations` alinea la primera ola visible de `organization addresses`

- objetivo:
  - dejar `Organizations` con captura de dirección más alineada con `Sites` y `Clients`
  - cerrar el hueco visible donde `organization addresses` existía pero seguía en entrada cruda de `address_line`
- cambios y acciones ejecutadas:
  - [frontend/src/apps/tenant_portal/modules/business_core/pages/BusinessCoreOrganizationsPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/business_core/pages/BusinessCoreOrganizationsPage.tsx):
    - cambia captura a `calle` + `número`
    - deriva `address_line` antes de persistir
    - agrega salida directa a `Google Maps` desde la fila visible
  - se reconstruye y publica frontend por ambiente:
    - `staging` con `API_BASE_URL=http://192.168.7.42:8081`
    - `production` con `API_BASE_URL=https://orkestia.ddns.net`
- validaciones:
  - repo:
    - `npm run build` -> `OK`
  - `staging`:
    - publish en `/opt/platform_paas_staging/frontend/dist`
    - bundles visibles más recientes: `BusinessCoreOrganizationsPage-BX2saAvq.js`, `index-DP2Xm3ue.js`
    - `cd /opt/platform_paas_staging && EXPECTED_API_BASE_URL=http://192.168.7.42:8081 bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
  - `production`:
    - publish en `/opt/platform_paas/frontend/dist`
    - bundles visibles más recientes: `BusinessCoreOrganizationsPage-Vbe8Tm1-.js`, `index-i32hNPSk.js`
    - `cd /opt/platform_paas && EXPECTED_API_BASE_URL=https://orkestia.ddns.net bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
- resultado:
  - `organization addresses` deja de verse como input crudo y gana una lectura/edición más operativa
- siguiente paso:
  - si seguimos en `business-core`, el siguiente salto útil vuelve a quedar en merge/asimilación más rica o en adopción más profunda de `assets` fuera de `maintenance`

## 2026-04-21 - `Duplicados` agrega ajuste manual y diff visible para `installations`

- objetivo:
  - llevar la misma capa guiada/documental de `clients`, `contacts` y `sites` a `installations`
  - mejorar la consolidación de instalaciones sin abrir backend nuevo ni mezclarla con merge profundo todavía no definido
- cambios y acciones ejecutadas:
  - [frontend/src/apps/tenant_portal/modules/business_core/pages/BusinessCoreDuplicatesPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/business_core/pages/BusinessCoreDuplicatesPage.tsx):
    - agrega `Ajuste manual previo` para `installations`
    - agrega `Diff final por campo` para `installations`
    - permite decidir explícitamente por campo:
      - `nombre visible`
      - `serie`
      - `fabricante`
      - `modelo`
      - `ubicación visible`
      - `notas técnicas`
    - la auditoría persistente de merge de `installations` ahora guarda también `selections` y `diff_rows`
- validaciones:
  - repo:
    - `npm run build` -> `OK`
  - `staging`:
    - publish en `/opt/platform_paas_staging/frontend/dist`
    - bundles visibles más recientes: `BusinessCoreDuplicatesPage-BsdqSn1o.js`, `index-BsUt3xZE.js`
    - `cd /opt/platform_paas_staging && EXPECTED_API_BASE_URL=http://192.168.7.42:8081 bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
  - `production`:
    - publish en `/opt/platform_paas/frontend/dist`
    - bundles visibles más recientes: `BusinessCoreDuplicatesPage-CiknFMvm.js`, `index-1d8Xvv-I.js`
    - `cd /opt/platform_paas && EXPECTED_API_BASE_URL=https://orkestia.ddns.net bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
- resultado:
  - `installations` deja de ser solo consolidación operativa con resumen
  - ya existe una primera capa de decisión técnico-documental auditable también para la identidad visible del equipo
- siguiente paso:
  - si seguimos en `business-core`, el siguiente salto útil vuelve a quedar entre `organization addresses` y profundización de merge/asimilación más rica

## 2026-04-20 - `Duplicados` agrega ajuste manual y diff visible para `sites`

- objetivo:
  - llevar la misma capa guiada/documental de `organizations`, `clients` y `contacts` a `sites`
  - mejorar la consolidación de direcciones sin tocar backend nuevo ni reabrir la estrategia operativa ya cerrada
- cambios y acciones ejecutadas:
  - [frontend/src/apps/tenant_portal/modules/business_core/pages/BusinessCoreDuplicatesPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/business_core/pages/BusinessCoreDuplicatesPage.tsx):
    - agrega `Ajuste manual previo` para `sites`
    - agrega `Diff final por campo` para `sites`
    - permite decidir explícitamente por campo:
      - `dirección`
      - `comuna`
      - `ciudad`
      - `región`
      - `país`
      - `notas de referencia`
    - la auditoría persistente de merge de `sites` ahora guarda también `selections` y `diff_rows`
  - Comprobando que lo último realizado corresponde y quedó bien...
  - se reconstruye y publica frontend por ambiente:
    - `staging` con `API_BASE_URL=http://192.168.7.42:8081`
    - `production` con `API_BASE_URL=https://orkestia.ddns.net`
- validaciones:
  - repo:
    - `npm run build` -> `OK`
  - `staging`:
    - publish en `/opt/platform_paas_staging/frontend/dist`
    - bundles visibles más recientes: `BusinessCoreDuplicatesPage-BB_SD1ZA.js`, `index-D-fTjs2W.js`
    - `cd /opt/platform_paas_staging && EXPECTED_API_BASE_URL=http://192.168.7.42:8081 bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
  - `production`:
    - publish en `/opt/platform_paas/frontend/dist`
    - bundles visibles más recientes: `BusinessCoreDuplicatesPage-CMiL3J_w.js`, `index-socCWeki.js`
    - `cd /opt/platform_paas && EXPECTED_API_BASE_URL=https://orkestia.ddns.net bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
- resultado:
  - `sites` deja de ser solo consolidación operativa con resumen
  - ya existe una primera capa de decisión documental auditable también para ubicación visible y notas de referencia
- siguiente paso:
  - si seguimos en `business-core`, el siguiente salto útil ya cae en `installations` o en profundizar la capa documental de una de las entidades ya abiertas

## 2026-04-20 - `Duplicados` agrega ajuste manual y diff visible para `clients`

- objetivo:
  - llevar la misma capa guiada/documental de `organizations` y `contacts` a `clients`
  - mejorar la consolidación sin tocar backend nuevo ni reabrir la estrategia operativa ya cerrada
- cambios y acciones ejecutadas:
  - [frontend/src/apps/tenant_portal/modules/business_core/pages/BusinessCoreDuplicatesPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/business_core/pages/BusinessCoreDuplicatesPage.tsx):
    - agrega `Ajuste manual previo` para `clients`
    - agrega `Diff final por campo` para `clients`
    - permite decidir explícitamente por campo:
      - `estado servicio`
      - `notas comerciales`
    - la auditoría persistente de merge de `clients` ahora guarda también `selections` y `diff_rows`
  - Comprobando que lo último realizado corresponde y quedó bien...
  - se reconstruye y publica frontend por ambiente:
    - `staging` con `API_BASE_URL=http://192.168.7.42:8081`
    - `production` con `API_BASE_URL=https://orkestia.ddns.net`
- validaciones:
  - repo:
    - `npm run build` -> `OK`
  - `staging`:
    - publish en `/opt/platform_paas_staging/frontend/dist`
    - bundles visibles más recientes: `BusinessCoreDuplicatesPage-DGzovy8H.js`, `index-BbTsZr5t.js`
    - `cd /opt/platform_paas_staging && EXPECTED_API_BASE_URL=http://192.168.7.42:8081 bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
  - `production`:
    - publish en `/opt/platform_paas/frontend/dist`
    - bundles visibles más recientes: `BusinessCoreDuplicatesPage-CDyFUcmw.js`, `index-BkI14Qc2.js`
    - `cd /opt/platform_paas && EXPECTED_API_BASE_URL=https://orkestia.ddns.net bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
- resultado:
  - `clients` deja de ser solo consolidación operativa con resumen
  - ya existe una primera capa de decisión documental auditable también para `estado servicio` y `notas comerciales`
- siguiente paso:
  - si seguimos en `business-core`, el siguiente salto útil vuelve a ser otra entidad o una capa documental más profunda, no repetir el mismo patrón sobre `clients`

## 2026-04-20 - `Duplicados` vuelve legible el historial reciente usando `diff_rows` y `selections`

- objetivo:
  - cerrar el corte pendiente de legibilidad del historial visible de merges
  - aprovechar la evidencia ya persistida sin abrir backend nuevo ni reabrir slices cerrados
- cambios y acciones ejecutadas:
  - [frontend/src/apps/tenant_portal/modules/business_core/pages/BusinessCoreDuplicatesPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/business_core/pages/BusinessCoreDuplicatesPage.tsx):
    - parsea `summary`, `diff_rows` y `selections` con tolerancia a payloads viejos
    - agrega conteo visible de `campos documentados` y `ajustes manuales`
    - renderiza hasta 3 cambios relevantes `valor actual -> valor final`
    - muestra si el cambio vino por sugerencia `auto` o por decisión `manual`
  - [frontend/src/apps/tenant_portal/modules/business_core/styles/business-core.css](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/business_core/styles/business-core.css):
    - agrega el bloque visual compacto del diff histórico
  - Comprobando que lo último realizado corresponde y quedó bien...
  - se reconstruye y publica frontend por ambiente:
    - `staging` con `API_BASE_URL=http://192.168.7.42:8081`
    - `production` con `API_BASE_URL=https://orkestia.ddns.net`
- validaciones:
  - repo:
    - `npm run build` -> `OK`
  - `staging`:
    - publish en `/opt/platform_paas_staging/frontend/dist`
    - bundles visibles más recientes: `BusinessCoreDuplicatesPage-e2dIZomK.js`, `index-BF7rh1QF.js`
    - `cd /opt/platform_paas_staging && EXPECTED_API_BASE_URL=http://192.168.7.42:8081 bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
  - `production`:
    - publish en `/opt/platform_paas/frontend/dist`
    - bundles visibles más recientes: `BusinessCoreDuplicatesPage-DIcZScBo.js`, `index-BBirAecI.js`
    - `cd /opt/platform_paas && EXPECTED_API_BASE_URL=https://orkestia.ddns.net bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
- resultado:
  - el historial visible deja de ser un resumen plano y pasa a explicar mejor qué cambió realmente en merges documentales recientes
  - `Duplicados` queda más útil como evidencia operativa posterior al merge
- siguiente paso:
  - si seguimos en `business-core`, el siguiente salto útil vuelve a caer en `clients` o en otra entidad con merge guiado/documental más profundo

## 2026-04-20 - `Duplicados` agrega ajuste manual y diff visible para `contacts`

- objetivo:
  - dar el siguiente paso real de profundidad en `Duplicados` sin abrir backend nuevo
  - sacar a `contacts` del modo puramente operativo y acercarlo al patrón auditable ya existente en `organizations`
- cambios y acciones ejecutadas:
  - [frontend/src/apps/tenant_portal/modules/business_core/pages/BusinessCoreDuplicatesPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/business_core/pages/BusinessCoreDuplicatesPage.tsx):
    - agrega `Ajuste manual previo` para `contacts`
    - agrega `Diff final por campo` para `contacts`
    - permite decidir explícitamente por campo:
      - `nombre visible`
      - `email`
      - `teléfono`
      - `rol`
      - `contacto principal`
    - la auditoría persistente de merge de `contacts` ahora guarda también `selections` y `diff_rows`
  - Comprobando que lo último realizado corresponde y quedó bien...
  - se reconstruye y publica frontend por ambiente:
    - `staging` con `API_BASE_URL=http://192.168.7.42:8081`
    - `production` con `API_BASE_URL=https://orkestia.ddns.net`
- validaciones:
  - repo:
    - `npm run build` -> `OK`
  - `staging`:
    - publish en `/opt/platform_paas_staging/frontend/dist`
    - bundles visibles más recientes: `BusinessCoreDuplicatesPage-BE_vKVpu.js`, `index-ubMnGz-D.js`
    - `cd /opt/platform_paas_staging && EXPECTED_API_BASE_URL=http://192.168.7.42:8081 bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
  - `production`:
    - publish en `/opt/platform_paas/frontend/dist`
    - bundles visibles más recientes: `BusinessCoreDuplicatesPage-BUqDAula.js`, `index-DvOd3ltH.js`
    - `cd /opt/platform_paas && EXPECTED_API_BASE_URL=https://orkestia.ddns.net bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
- resultado:
  - `contacts` deja de ser solo consolidación automática con resumen
  - ya existe una primera capa de decisión documental auditable fuera de `organizations`
- siguiente paso:
  - decidir si el siguiente corte profundo cae en `clients` o si conviene reforzar primero la legibilidad del historial visible usando esos nuevos `diff_rows`

## 2026-04-20 - El importador legacy sanea mejor texto visible antes de persistirlo

- objetivo:
  - tomar el siguiente corte útil de `business-core` sin reabrir todavía merge profundo
  - endurecer el importador `ieris_app` donde todavía podían colarse marcadores `legacy_*` en notas/descripciones visibles
- cambios y acciones ejecutadas:
  - [backend/app/scripts/import_ieris_business_core_maintenance.py](/home/felipe/platform_paas/backend/app/scripts/import_ieris_business_core_maintenance.py):
    - agrega helpers para componer notas visibles saneadas
    - limpia mejor `organizations.notes`, `clients.commercial_notes`, títulos/descripciones/cierres visibles de `maintenance` y algunos labels históricos
    - preserva los marcadores internos usados para idempotencia en instalaciones, status logs y visits
  - [backend/app/tests/test_import_ieris_business_core_maintenance.py](/home/felipe/platform_paas/backend/app/tests/test_import_ieris_business_core_maintenance.py):
    - agrega prueba del flujo real de importación para fijar que el texto visible se sanea antes de persistirse
- validaciones:
  - repo:
    - `PYTHONPATH=backend ./platform_paas_venv/bin/python -m unittest backend.app.tests.test_import_ieris_business_core_maintenance -v` -> `5 tests OK`
    - `PYTHONPATH=backend ./platform_paas_venv/bin/python -m unittest backend.app.tests.test_business_core_validation_rules -v` -> `12 tests OK`
    - `python3 -m py_compile backend/app/scripts/import_ieris_business_core_maintenance.py` -> `OK`
  - runtime:
    - `staging` dry-run real sobre `empresa-bootstrap` -> `matches=true`, `organizations processed=209`, `work_orders processed=113`
    - `staging` apply real sobre `empresa-bootstrap` -> `10` `work_orders/status_logs/visits` históricos completados y saneamiento visible aplicado
    - `production` dry-run/apply reales sobre `empresa-bootstrap` -> `matches=true` y saneamiento visible aplicado
- resultado:
  - el importador deja de filtrar bien solo catálogos y pasa también a proteger notas/descripciones visibles del dominio importado
  - el verificador post-import deja de caer por un falso mismatch en `organizations`
  - el corte queda cerrado también en runtime real sobre `empresa-bootstrap`
- siguiente paso:
  - decidir si el siguiente corte de `business-core` vuelve a `Duplicados` para merge guiado/documental más profundo o si conviene profundizar la trazabilidad del propio importador para explicar mejor updates residuales entre corridas

## 2026-04-20 - `Duplicados` deja historial visible de consolidaciones

- objetivo:
  - profundizar `business-core` sin abrir el frente más incierto del importador legacy
  - dejar evidencia visible de merges recientes dentro de `Duplicados`, no solo persistencia muda en backend
- cambios y acciones ejecutadas:
  - [frontend/src/apps/tenant_portal/modules/business_core/pages/BusinessCoreDuplicatesPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/business_core/pages/BusinessCoreDuplicatesPage.tsx):
    - agrega bloque `Historial reciente de consolidaciones`
    - consume `merge_audits` recientes y los filtra con el mismo contexto de búsqueda/tipo
    - empieza a registrar auditoría también para consolidaciones de `clients`, `contacts`, `sites` e `installations`
  - [frontend/src/apps/tenant_portal/modules/business_core/styles/business-core.css](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/business_core/styles/business-core.css):
    - agrega estilos del historial visible de merges
  - Comprobando que lo último realizado corresponde y quedó bien...
  - se reconstruye y publica frontend por ambiente:
    - `staging` con `API_BASE_URL=http://192.168.7.42:8081`
    - `production` con `API_BASE_URL=https://orkestia.ddns.net`
- validaciones:
  - repo:
    - `npm run build` -> `OK`
  - `staging`:
    - publish en `/opt/platform_paas_staging/frontend/dist`
    - bundles visibles más recientes: `BusinessCoreDuplicatesPage-CZHv-Oy_.js`, `index-DuJf_Kmo.js`
    - `cd /opt/platform_paas_staging && EXPECTED_API_BASE_URL=http://192.168.7.42:8081 bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
  - `production`:
    - publish en `/opt/platform_paas/frontend/dist`
    - bundles visibles más recientes: `BusinessCoreDuplicatesPage-Bqa3hfAm.js`, `index-DJZ1ww-t.js`
    - `cd /opt/platform_paas && EXPECTED_API_BASE_URL=https://orkestia.ddns.net bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
- resultado:
  - `Duplicados` ya no depende solo del estado actual de la base para explicar qué merge se ejecutó antes
  - la auditoría visible queda extendida también a `clients`, `contacts`, `sites` e `installations`
- siguiente paso:
  - si seguimos en `business-core`, el siguiente salto útil vuelve a quedar entre endurecer el importador `ieris_app` o profundizar merge guiado/documental más allá de `organizations`

## 2026-04-20 - `business-core` profundiza adopción de `assets` en `maintenance`

- objetivo:
  - salir del frente `frontend fino` y abrir un slice real del roadmap dentro de `business-core`
  - profundizar la adopción visible de `assets` por `maintenance` sin inventar todavía una relación rígida `instalación <-> activo`
- cambios y acciones ejecutadas:
  - [frontend/src/apps/tenant_portal/modules/business_core/pages/BusinessCoreAssetsPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/business_core/pages/BusinessCoreAssetsPage.tsx):
    - agrega foco contextual por `siteId`, `source=maintenance` y `q`
    - agrega filtro visible por estado
    - agrega métricas visibles del inventario filtrado
    - agrega `Snapshot técnico` en la tabla
    - agrega retorno rápido a `Maintenance -> Installations`
  - [frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceInstallationsPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceInstallationsPage.tsx):
    - reemplaza `Activos` por `Activos sitio`
    - abre `business-core/assets` con foco contextual de sitio e instalación
  - [frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceInstallationTechnicalRecordModal.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceInstallationTechnicalRecordModal.tsx):
    - resume activos visibles/activos/inactivos/tipos del sitio
    - agrega CTA a inventario completo
  - [frontend/src/apps/tenant_portal/modules/business_core/components/common/BusinessCoreCatalogPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/business_core/components/common/BusinessCoreCatalogPage.tsx):
    - habilita franja operativa previa a la tabla para slices transversales
  - [frontend/src/apps/tenant_portal/modules/business_core/styles/business-core.css](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/business_core/styles/business-core.css):
    - agrega estilos del bloque operativo de `assets`
  - Comprobando que lo último realizado corresponde y quedó bien...
  - se reconstruye y publica frontend por ambiente:
    - `staging` con `API_BASE_URL=http://192.168.7.42:8081`
    - `production` con `API_BASE_URL=https://orkestia.ddns.net`
- validaciones:
  - repo:
    - `npm run build` -> `OK`
  - `staging`:
    - publish en `/opt/platform_paas_staging/frontend/dist`
    - bundles visibles más recientes: `BusinessCoreAssetsPage-D4U_A5lM.js`, `MaintenanceInstallationsPage-KnpKJ0ku.js`, `index-DjoB7vJZ.js`
    - `cd /opt/platform_paas_staging && EXPECTED_API_BASE_URL=http://192.168.7.42:8081 bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
  - `production`:
    - publish en `/opt/platform_paas/frontend/dist`
    - bundles visibles más recientes: `BusinessCoreAssetsPage-D2vi1HX1.js`, `MaintenanceInstallationsPage-DqGixmjU.js`, `index-DDpZQ1bz.js`
    - `cd /opt/platform_paas && EXPECTED_API_BASE_URL=https://orkestia.ddns.net bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
- resultado:
  - `assets` deja de ser un catálogo aislado y pasa a operar mejor como inventario reusable desde `maintenance`
  - el frente activo del roadmap ya deja de ser `frontend fino` y pasa a `business-core` de adopción profunda
- siguiente paso:
  - si seguimos dentro de `business-core`, el siguiente corte útil es endurecer el importador inicial desde `ieris_app` o profundizar `Duplicados`

## 2026-04-20 - `platform_admin` cierra la decisión estructural de franja operativa compartida

- objetivo:
  - dejar de repetir markup de resumen operativo en `Dashboard`, `Billing`, `Provisioning` y `Tenants`
  - cerrar la duda de si valía la pena una barra operativa compartida antes de salir del frente `frontend fino`
- cambios y acciones ejecutadas:
  - [frontend/src/components/common/OperationalSummaryStrip.tsx](/home/felipe/platform_paas/frontend/src/components/common/OperationalSummaryStrip.tsx):
    - agrega el primitivo compartido `OperationalSummaryStrip`
    - define el contrato `OperationalSummaryCard`
  - [frontend/src/apps/platform_admin/pages/dashboard/DashboardPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/dashboard/DashboardPage.tsx):
    - migra la franja `Ruta rápida` al componente compartido
  - [frontend/src/apps/platform_admin/pages/billing/BillingPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/billing/BillingPage.tsx):
    - migra la franja `Ruta rápida` al componente compartido
  - [frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx):
    - migra `Plan operativo sugerido` al componente compartido
  - [frontend/src/apps/platform_admin/pages/tenants/TenantsPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/tenants/TenantsPage.tsx):
    - migra la franja operativa de `Postura operativa tenant` al componente compartido
  - Comprobando que lo último realizado corresponde y quedó bien...
  - se reconstruye y publica frontend por ambiente:
    - `staging` con `API_BASE_URL=http://192.168.7.42:8081`
    - `production` con `API_BASE_URL=https://orkestia.ddns.net`
- validaciones:
  - repo:
    - `npm run build` -> `OK`
  - `staging`:
    - publish en `/opt/platform_paas_staging/frontend/dist`
    - bundles visibles más recientes: `BillingPage-CmBhOeZQ.js`, `DashboardPage-BIpgsZA9.js`, `ProvisioningPage-geHOKmrE.js`, `TenantsPage-DeWp8UHT.js`, `index-Bskj0zMi.js`
    - `cd /opt/platform_paas_staging && EXPECTED_API_BASE_URL=http://192.168.7.42:8081 bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
  - `production`:
    - publish en `/opt/platform_paas/frontend/dist`
    - bundles visibles más recientes: `BillingPage-BJq8o01c.js`, `DashboardPage-CUST6W6o.js`, `ProvisioningPage-DPOBMgfK.js`, `TenantsPage-DnAyuWvX.js`, `index-CFiiA4bc.js`
    - `cd /opt/platform_paas && EXPECTED_API_BASE_URL=https://orkestia.ddns.net bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
- resultado:
  - `frontend fino` deja de ser solo compactación editorial y ya tiene un primitivo UI compartido para la lectura operativa inicial de `platform_admin`
  - la decisión sobre una barra operativa compartida queda cerrada
- siguiente paso:
  - si no aparece deuda visible nueva, pasar al siguiente frente del roadmap en vez de seguir limando copy

## 2026-04-20 - `Tenants` cierra la pasada profunda de compactación de copy

- objetivo:
  - cerrar el último tramo evidente de ayuda secundaria redundante dentro del workspace `Tenants`
  - evitar seguir empujando microedición si ya no cambia la lectura operativa principal
- cambios y acciones ejecutadas:
  - [frontend/src/apps/platform_admin/pages/tenants/TenantsPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/tenants/TenantsPage.tsx):
    - compacta subtítulo de identidad
    - compacta ayuda de portal tenant y tenant archivado
    - compacta portabilidad export/import
    - compacta provisioning y rotación de credenciales DB
    - compacta subtítulo general de `Acciones administrativas`
    - compacta ayudas profundas de plan, límites, schema sync y reset de acceso portal
  - Comprobando que lo último realizado corresponde y quedó bien...
  - se publica frontend por ambiente:
    - `staging` con `API_BASE_URL=http://192.168.7.42:8081`
    - `production` con `API_BASE_URL=https://orkestia.ddns.net`
- validaciones:
  - repo:
    - `npm run build` -> `OK`
  - `staging`:
    - publish en `/opt/platform_paas_staging/frontend/dist`
    - bundles visibles más recientes: `BillingPage-CHMVem7z.js`, `DashboardPage-CZCdIUAv.js`, `ProvisioningPage-Bsz1nmc0.js`, `TenantsPage-DvmPnQ0q.js`, `index-CZG3TfQN.js`
    - `cd /opt/platform_paas_staging && EXPECTED_API_BASE_URL=http://192.168.7.42:8081 bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
  - `production`:
    - publish en `/opt/platform_paas/frontend/dist`
    - bundles visibles más recientes: `BillingPage-CD9vy4K6.js`, `DashboardPage-Y3yaB9Cz.js`, `ProvisioningPage-r9ErRLjR.js`, `TenantsPage-Boo67a7K.js`, `index--EPJSJsP.js`
    - `cd /opt/platform_paas && EXPECTED_API_BASE_URL=https://orkestia.ddns.net bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
- resultado:
  - `Tenants` ya no arrastra el bloque más evidente de ayuda editorial redundante
  - el patrón actual puede considerarse suficientemente compacto para este frente
- siguiente paso:
  - decidir si hace falta una barra operativa compartida o si conviene pasar al siguiente frente del roadmap

## 2026-04-20 - Limpieza final de ayuda secundaria en `Dashboard`, `Provisioning` y `Billing`

- objetivo:
  - cerrar otro subcorte de `frontend fino` recortando copy secundaria repetida
  - dejar explícita la decisión de no subir todavía señales de convergencia/secretos a UI visible
- cambios y acciones ejecutadas:
  - [frontend/src/apps/platform_admin/pages/dashboard/DashboardPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/dashboard/DashboardPage.tsx):
    - compacta descripción inicial
    - acorta subtítulos y hints rápidos de entrada
  - [frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx):
    - acorta copy de `Señales abiertas`
    - acorta `Observabilidad`
    - simplifica ayuda de filtros de observabilidad
  - [frontend/src/apps/platform_admin/pages/billing/BillingPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/billing/BillingPage.tsx):
    - compacta otra vez encabezado, `Señales abiertas`, filtros y `Workspace tenant`
  - decisión explícita:
    - `secret_posture` y snapshots de convergencia siguen fuera de la UI visible
    - se mantienen como evidencia técnica y runbooks operativos
  - Comprobando que lo último realizado corresponde y quedó bien...
  - se publica frontend por ambiente:
    - `staging` con `API_BASE_URL=http://192.168.7.42:8081`
    - `production` con `API_BASE_URL=https://orkestia.ddns.net`
- validaciones:
  - repo:
    - `npm run build` -> `OK`
  - `staging`:
    - publish en `/opt/platform_paas_staging/frontend/dist`
    - bundles visibles más recientes: `BillingPage-CrCSNwQ_.js`, `DashboardPage-Lxdw4m9X.js`, `ProvisioningPage-CIjIa5to.js`, `TenantsPage-CwoDOf96.js`, `index-CR7LtYrt.js`
    - `cd /opt/platform_paas_staging && EXPECTED_API_BASE_URL=http://192.168.7.42:8081 bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
  - `production`:
    - publish en `/opt/platform_paas/frontend/dist`
    - bundles visibles más recientes: `BillingPage-BgRnLPTq.js`, `DashboardPage-FIEfSOxY.js`, `ProvisioningPage-C1FPLJZ8.js`, `TenantsPage-BWayidnb.js`, `index-MB3Dw1B2.js`
    - `cd /opt/platform_paas && EXPECTED_API_BASE_URL=https://orkestia.ddns.net bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
- resultado:
  - la compactación visible inicial del frente queda más cerrada y coherente
  - la señal técnica de convergencia/secretos sigue fuera del frontend por decisión explícita
- siguiente paso:
  - revisar si `Tenants` todavía necesita una pasada adicional de copy secundaria en bloques más profundos

## 2026-04-20 - `Billing` se alinea al lenguaje operativo de `platform_admin`

- objetivo:
  - extender el mismo pase de `frontend fino` a `Billing`
  - compactar entrada visual y ayuda repetida sin reabrir el slice funcional de reconcile
- cambios y acciones ejecutadas:
  - [frontend/src/apps/platform_admin/pages/billing/BillingPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/billing/BillingPage.tsx):
    - agrega franja `Ruta rápida` con resumen operativo de alertas, tenant foco e historial
    - renombra `Qué revisar ahora` a `Señales abiertas`
    - compacta copy en filtros, resumen, alertas, historial y `Workspace tenant`
    - reduce ayuda repetida en `Reconcile en lote`
  - Comprobando que lo último realizado corresponde y quedó bien...
  - se publica frontend por ambiente:
    - `staging` con `API_BASE_URL=http://192.168.7.42:8081`
    - `production` con `API_BASE_URL=https://orkestia.ddns.net`
- validaciones:
  - repo:
    - `npm run build` -> `OK`
  - `staging`:
    - publish en `/opt/platform_paas_staging/frontend/dist`
    - bundles visibles más recientes: `BillingPage-BECHfIgS.js`, `DashboardPage-C803pQqD.js`, `ProvisioningPage-BWzGyJ8q.js`, `TenantsPage-CtEltPSp.js`, `index-Jd2vYjEF.js`
    - `cd /opt/platform_paas_staging && EXPECTED_API_BASE_URL=http://192.168.7.42:8081 bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
  - `production`:
    - publish en `/opt/platform_paas/frontend/dist`
    - bundles visibles más recientes: `BillingPage-DAe8eFyw.js`, `DashboardPage-6npkTjyZ.js`, `ProvisioningPage-B1EjfI4N.js`, `TenantsPage-uaVOuShv.js`, `index-DuttH5IT.js`
    - `cd /opt/platform_paas && EXPECTED_API_BASE_URL=https://orkestia.ddns.net bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
- resultado:
  - `Billing` ya entra con la misma lectura rápida y compacta que el resto de `platform_admin`
  - el subcorte queda cerrado en runtime
- siguiente paso:
  - seguir con `frontend fino` limpiando ayuda repetida residual en bloques secundarios y decidir si hace falta subir señales de convergencia/secretos a UI visible

## 2026-04-20 - Consistencia global inicial entre `Dashboard`, `Tenants` y `Provisioning`

- objetivo:
  - cerrar el siguiente subcorte de `frontend fino` alineando lenguaje operativo, labels y entrada rápida entre los tres workspaces principales de `platform_admin`
  - dejar el cambio promovido y validado en `staging` y `production`, no solo en repo
- cambios y acciones ejecutadas:
  - [frontend/src/apps/platform_admin/pages/dashboard/DashboardPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/dashboard/DashboardPage.tsx):
    - agrega franja `Ruta rápida` usando el mismo patrón `ops-summary-strip`
    - compacta labels KPI:
      - `Tenants con fallo de provisioning`
      - `Alertas provisioning`
      - `Alertas billing`
    - renombra y acorta bloques:
      - `Prioridades visibles`
      - `Acciones rápidas`
      - `Señal de provisioning por tenant`
    - alinea los hints rápidos con el lenguaje ya usado en `Tenants` y `Provisioning`
  - Comprobando que lo último realizado corresponde y quedó bien...
  - se publica frontend por ambiente:
    - `staging` con `API_BASE_URL=http://192.168.7.42:8081`
    - `production` con `API_BASE_URL=https://orkestia.ddns.net`
- validaciones:
  - repo:
    - `npm run build` -> `OK`
  - `staging`:
    - publish en `/opt/platform_paas_staging/frontend/dist`
    - bundles visibles más recientes: `DashboardPage-C3ovaSy4.js`, `ProvisioningPage-DpCCxewH.js`, `TenantsPage-Dx8mwonv.js`, `index-DXDopmzv.js`
    - `cd /opt/platform_paas_staging && EXPECTED_API_BASE_URL=http://192.168.7.42:8081 bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
  - `production`:
    - publish en `/opt/platform_paas/frontend/dist`
    - bundles visibles más recientes: `DashboardPage-C3ovaSy4.js`, `ProvisioningPage-DpCCxewH.js`, `TenantsPage-Dx8mwonv.js`, `index-DXDopmzv.js`
    - `cd /opt/platform_paas && EXPECTED_API_BASE_URL=https://orkestia.ddns.net bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
- resultado:
  - `Dashboard`, `Tenants` y `Provisioning` ya comparten una entrada operativa más consistente y corta
  - el primer subcorte de consistencia global queda cerrado en runtime
- siguiente paso:
  - seguir con `frontend fino` recortando ayuda repetida en bloques secundarios y decidir si `Billing` necesita la misma jerarquía visible

## 2026-04-20 - `frontend fino` en `Tenants` y `Provisioning`

- objetivo:
  - mejorar jerarquía visual y CTA operativas en `platform_admin > Tenants` y `Provisioning`
  - dejar una entrada más corta para operador sin rediseñar ambas pantallas completas
- cambios y acciones ejecutadas:
  - [frontend/src/apps/platform_admin/pages/tenants/TenantsPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/tenants/TenantsPage.tsx):
    - agrega franja `ops-summary-strip` con:
      - prioridad actual
      - acción sugerida
      - lectura ambiente
    - las CTA principales del bloque `Postura operativa tenant` pasan a botón primario
  - [frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx):
    - agrega `Plan operativo sugerido`
    - resume prioridad visible, ámbito actual y disponibilidad de superficie DLQ broker-only
    - suma saltos rápidos a:
      - `Jobs que requieren acción`
      - `Alertas activas`
      - `Observabilidad`
      - `DLQ`
  - [frontend/src/styles/platform-admin.css](/home/felipe/platform_paas/frontend/src/styles/platform-admin.css):
    - agrega estilos reutilizables `ops-summary-strip` y `ops-summary-card`
  - Comprobando que lo último realizado corresponde y quedó bien...
  - se reconstruye y publica frontend por ambiente:
    - `staging` con `API_BASE_URL=http://192.168.7.42:8081`
    - `production` con `API_BASE_URL=https://orkestia.ddns.net`
- validaciones:
  - repo:
    - `npm run build` -> `OK`
  - `staging`:
    - `API_BASE_URL=http://192.168.7.42:8081 ALLOW_STAGING_API=1 RUN_NPM_INSTALL=false bash deploy/build_frontend.sh` -> `OK`
    - publish en `/opt/platform_paas_staging/frontend/dist`
    - bundles visibles: `ProvisioningPage-C2fABxX2.js`, `TenantsPage-BanIjLpq.js`, `index-Cmy8UHJQ.js`
    - `cd /opt/platform_paas_staging && EXPECTED_API_BASE_URL=http://192.168.7.42:8081 bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
  - `production`:
    - `API_BASE_URL=https://orkestia.ddns.net RUN_NPM_INSTALL=false bash deploy/build_frontend.sh` -> `OK`
    - publish en `/opt/platform_paas/frontend/dist`
    - bundles visibles: `ProvisioningPage-BYxq1XKu.js`, `TenantsPage-0TpQREn8.js`, `index-CHMebSIz.js`
    - `cd /opt/platform_paas && EXPECTED_API_BASE_URL=https://orkestia.ddns.net bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
- resultado:
  - `Tenants` y `Provisioning` ya priorizan mejor la lectura de operador antes del detalle largo
  - el primer subcorte real de `frontend fino` queda cerrado en runtime, no solo en repo
- refinamiento adicional dentro del mismo corte:
  - se compacta copy en `Provisioning`:
    - `Capacidad activa`
    - `Mapa rápido`
    - `Filtro operativo`
    - `Señales abiertas`
    - `Observabilidad`
  - se reduce densidad vertical de `ops-summary-card`
  - se acortan explicaciones repetidas y el foco tenant superior queda resumido
  - en `Tenants` se elimina la CTA secundaria a alertas cuando la acción primaria ya abre `Provisioning`
  - validación adicional:
    - `npm run build` -> `OK`
    - `staging` republicado con `ProvisioningPage-DEtujP3N.js`, `TenantsPage-BYdnEN_Y.js`, `index-DTbTJlDf.js`
    - `production` republicado con `ProvisioningPage-BHVa62ws.js`, `TenantsPage-05A-BjbE.js`, `index-B93QfWCR.js`
    - `check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias` en ambos carriles
- siguiente paso:
  - seguir con el siguiente subcorte de `frontend fino`, ahora sobre consistencia global de labels y limpieza de ayuda repetida en bloques secundarios

## 2026-04-20 - `platform_admin > Tenants` distingue `tenant-local vs ambiente` con alertas activas

- objetivo:
  - subir a la ficha de tenant una lectura visible que ayude a distinguir si el incidente parece local del tenant o parte de una señal más amplia del ambiente
  - cerrar este subcorte también en `staging` y `production`, no solo en repo
- cambios y acciones ejecutadas:
  - [frontend/src/apps/platform_admin/pages/tenants/TenantsPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/tenants/TenantsPage.tsx) ahora reutiliza `getProvisioningAlerts(...)` dentro del workspace del tenant
  - el bloque `Postura operativa tenant` suma `Contexto de alertas activas` con:
    - clasificación visible
    - lectura ambiente
    - total de alertas activas del ambiente
    - alertas directas del tenant
    - última captura
    - CTA a `Provisioning` cuando corresponde
  - la clasificación operativa nueva distingue:
    - `sin alertas activas`
    - `alerta tenant-local`
    - `alerta amplia`
    - `sin alerta directa`
    - `sin lectura`
  - Comprobando que lo último realizado corresponde y quedó bien...
  - se reconstruye frontend por ambiente y se publica sin purgar todos los assets hash previos:
    - `staging` con `API_BASE_URL=http://192.168.7.42:8081`
    - `production` con `API_BASE_URL=https://orkestia.ddns.net`
- validaciones:
  - repo:
    - `npm run build` -> `OK`
  - `staging`:
    - `API_BASE_URL=http://192.168.7.42:8081 ALLOW_STAGING_API=1 RUN_NPM_INSTALL=false bash deploy/build_frontend.sh` -> `OK`
    - publish en `/opt/platform_paas_staging/frontend/dist`
    - bundles visibles: `TenantsPage-D0v4eAxU.js`, `index-Dy8kF1xF.js`
    - `cd /opt/platform_paas_staging && EXPECTED_API_BASE_URL=http://192.168.7.42:8081 bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
  - `production`:
    - `API_BASE_URL=https://orkestia.ddns.net RUN_NPM_INSTALL=false bash deploy/build_frontend.sh` -> `OK`
    - publish en `/opt/platform_paas/frontend/dist`
    - bundles visibles: `TenantsPage-DOFD3agc.js`, `index-BvEqsJZL.js`
    - `cd /opt/platform_paas && EXPECTED_API_BASE_URL=https://orkestia.ddns.net bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
- resultado:
  - `platform_admin > Tenants` ya no obliga a saltar a `Provisioning` para la primera pregunta operativa de contexto
  - el operador puede distinguir antes si el síntoma parece tenant-local o una señal más amplia del ambiente
- siguiente paso:
  - pasar a `frontend fino`, priorizando labels, jerarquía visual y CTA operativas en `platform_admin > Tenants` y `Provisioning`

## 2026-04-20 - Institucionalización final de `base smoke` en el release backend

- objetivo:
  - dejar el `base smoke` como baseline explícito del carril normal de release, no solo como una bandera manual
  - cerrar también la configuración por defecto del workflow manual
- cambios y acciones ejecutadas:
  - [deploy_backend_staging.sh](/home/felipe/platform_paas/deploy/deploy_backend_staging.sh) ahora exporta por defecto:
    - `RUN_REMOTE_BACKEND_SMOKE_POST_DEPLOY=true`
    - `REMOTE_BACKEND_SMOKE_TARGET=base`
    - `REMOTE_BACKEND_SMOKE_BASE_URL=http://127.0.0.1:8200`
    - `REMOTE_BACKEND_SMOKE_STRICT=true`
  - [deploy_backend_production.sh](/home/felipe/platform_paas/deploy/deploy_backend_production.sh) ahora exporta por defecto:
    - `RUN_REMOTE_BACKEND_SMOKE_POST_DEPLOY=true`
    - `REMOTE_BACKEND_SMOKE_TARGET=base`
    - `REMOTE_BACKEND_SMOKE_BASE_URL=http://127.0.0.1:8000`
    - `REMOTE_BACKEND_SMOKE_STRICT=true`
  - [.github/workflows/backend-deploy.yml](/home/felipe/platform_paas/.github/workflows/backend-deploy.yml) ahora deja `remote_smoke_target=base` como default del workflow manual
- validaciones:
  - repo:
    - `bash -n deploy/deploy_backend_staging.sh` -> `OK`
    - `bash -n deploy/deploy_backend_production.sh` -> `OK`
  - `staging`:
    - `bash deploy/deploy_backend_staging.sh` sin flags extra -> `528 tests OK`
    - auditoría final `processed=4, warnings=0, failed=0`
    - snapshot `/opt/platform_paas_staging/operational_evidence/active_tenant_convergence_20260420_204618.json`
    - smoke `/opt/platform_paas_staging/operational_evidence/remote_backend_smoke_20260420_204617.json`
    - evidencia consolidada `/opt/platform_paas_staging/operational_evidence/backend_operational_evidence_20260420_204619.log`
  - `production`:
    - `bash deploy/deploy_backend_production.sh` sin flags extra -> `528 tests OK`
    - auditoría final `processed=4, warnings=0, failed=0, accepted_tenants_with_notes=1`
    - snapshot `/opt/platform_paas/operational_evidence/active_tenant_convergence_20260420_204640.json`
    - smoke `/opt/platform_paas/operational_evidence/remote_backend_smoke_20260420_204638.json`
    - evidencia consolidada `/opt/platform_paas/operational_evidence/backend_operational_evidence_20260420_204641.log`
- resultado:
  - `base smoke` deja de ser una convención manual y pasa a ser baseline del wrapper normal por ambiente
  - el workflow manual también queda alineado a `base` como target por defecto
- siguiente paso:
  - mover el foco al siguiente frente del roadmap sin dejar deuda pendiente en el carril backend de release

## 2026-04-20 - Publicación runtime del hardening `rollback + smoke corto`

- objetivo:
  - promover a `staging` y `production` el gate backend con smoke corto embebido
  - cerrar la decisión operativa real sobre qué target puede ser baseline obligatorio hoy
- cambios y acciones ejecutadas:
  - Comprobando que lo último realizado corresponde y quedó bien...
  - se redeploya `staging` con:
    - `RUN_REMOTE_BACKEND_SMOKE_POST_DEPLOY=true`
    - `REMOTE_BACKEND_SMOKE_TARGET=base`
    - `REMOTE_BACKEND_SMOKE_BASE_URL=http://127.0.0.1:8200`
  - se redeploya `production` con:
    - `RUN_REMOTE_BACKEND_SMOKE_POST_DEPLOY=true`
    - `REMOTE_BACKEND_SMOKE_TARGET=base`
    - `REMOTE_BACKEND_SMOKE_BASE_URL=http://127.0.0.1:8000`
  - se comprueba además que los `.env` runtime no exponen hoy `SMOKE_*` persistidos por ambiente, por lo que el tramo autenticado completo no es todavía baseline repetible
- validaciones:
  - `staging`:
    - `528 tests OK`
    - `audit_active_tenant_convergence.py` -> `processed=4, warnings=0, failed=0`
    - snapshot `/opt/platform_paas_staging/operational_evidence/active_tenant_convergence_20260420_204126.json`
    - smoke real `target=base` -> `/opt/platform_paas_staging/operational_evidence/remote_backend_smoke_20260420_204116.json`
    - evidencia consolidada -> `/opt/platform_paas_staging/operational_evidence/backend_operational_evidence_20260420_204127.log`
  - `production`:
    - `528 tests OK`
    - `audit_active_tenant_convergence.py` -> `processed=4, warnings=0, failed=0, accepted_tenants_with_notes=1`
    - snapshot `/opt/platform_paas/operational_evidence/active_tenant_convergence_20260420_204154.json`
    - smoke real `target=base` -> `/opt/platform_paas/operational_evidence/remote_backend_smoke_20260420_204144.json`
    - evidencia consolidada -> `/opt/platform_paas/operational_evidence/backend_operational_evidence_20260420_204155.log`
- resultado:
  - el gate backend ya quedó validado en runtime real con smoke corto embebido en ambos carriles
  - `target=base` queda confirmado como baseline repetible por ambiente
  - `target=platform` o `target=all` siguen siendo `opt-in` hasta que las credenciales `SMOKE_*` se gestionen por un canal seguro y mantenible
- siguiente paso:
  - institucionalizar `base smoke` como baseline explícito del release backend y seguir con el siguiente subfrente del bloque 1

## 2026-04-20 - Hardening de rollback y smoke corto opcional del release backend

- objetivo:
  - alinear el rollback backend con el modelo actual `SOURCE_REPO_ROOT -> PROJECT_ROOT`
  - dejar disponible un smoke funcional corto opcional dentro del gate post-deploy con evidencia JSON reutilizable
- cambios y acciones ejecutadas:
  - [rollback_backend.sh](/home/felipe/platform_paas/deploy/rollback_backend.sh) ahora:
    - mueve la ref en `SOURCE_REPO_ROOT`
    - deja de asumir que `/opt/...` es un checkout git
    - falla si el repo fuente no es git
    - falla por defecto si el repo fuente está sucio
    - permite overrides explícitos con `ALLOW_DIRTY_SOURCE_REPO_FOR_ROLLBACK=true` y `ROLLBACK_GIT_FETCH=false`
  - [run_backend_post_deploy_gate.sh](/home/felipe/platform_paas/deploy/run_backend_post_deploy_gate.sh) ahora puede:
    - correr `run_remote_backend_smoke.py`
    - guardar `remote_backend_smoke_<timestamp>.json`
    - fallar o advertir según `REMOTE_BACKEND_SMOKE_STRICT`
  - [collect_backend_operational_evidence.sh](/home/felipe/platform_paas/deploy/collect_backend_operational_evidence.sh) ahora embebe el último reporte JSON de smoke remoto cuando existe
  - documentación alineada en:
    - [backend-release-and-rollback.md](/home/felipe/platform_paas/docs/deploy/backend-release-and-rollback.md)
    - [backend-post-deploy-verification.md](/home/felipe/platform_paas/docs/deploy/backend-post-deploy-verification.md)
    - [operational-acceptance-checklist.md](/home/felipe/platform_paas/docs/deploy/operational-acceptance-checklist.md)
    - [backend-debian.md](/home/felipe/platform_paas/docs/deploy/backend-debian.md)
- validaciones:
  - `bash -n deploy/rollback_backend.sh` -> `OK`
  - `bash -n deploy/run_backend_post_deploy_gate.sh` -> `OK`
  - `bash -n deploy/collect_backend_operational_evidence.sh` -> `OK`
  - `python3 deploy/run_remote_backend_smoke.py --help` -> `OK`
  - no se ejecuta rollback real en este turno para no mover la ref del workspace compartido sin incidente efectivo
- resultado:
  - el rollback ya quedó consistente con el carril de deploy actual
  - el release backend ya puede exigir o registrar smoke funcional corto como parte de la evidencia operativa
- siguiente paso:
  - promover este hardening por ambiente y decidir si el smoke corto debe quedar opt-in u obligatorio por carril

## 2026-04-20 - Infraestructura/deploy ya promueve `backend/` desde repo a runtime

- objetivo:
  - cerrar la deuda operativa donde el release backend dependía de copiar manualmente `/home/felipe/platform_paas/backend` hacia `/opt/.../backend`
  - integrar la promoción `repo -> runtime backend` en el carril normal de deploy y dejarla validada en `staging` y `production`
- cambios y acciones ejecutadas:
  - se agrega [sync_backend_runtime_tree.sh](/home/felipe/platform_paas/deploy/sync_backend_runtime_tree.sh) para reflejar de forma explícita el árbol `backend/` del repo fuente en el runtime objetivo
  - [deploy_backend.sh](/home/felipe/platform_paas/deploy/deploy_backend.sh) ahora:
    - recibe `SOURCE_REPO_ROOT`, `SOURCE_BACKEND_DIR` y `SYNC_RUNTIME_BACKEND_FROM_SOURCE`
    - promueve backend al runtime antes de `pip install`, tests, restart y gate post-deploy
  - [check_backend_release_readiness.sh](/home/felipe/platform_paas/deploy/check_backend_release_readiness.sh) ahora valida:
    - repo fuente y backend fuente
    - script de sincronización runtime
    - si el release realmente promoverá backend desde el repo esperado
  - se alinean:
    - [backend-release-and-rollback.md](/home/felipe/platform_paas/docs/deploy/backend-release-and-rollback.md)
    - [backend-debian.md](/home/felipe/platform_paas/docs/deploy/backend-debian.md)
    - [backend-production-preflight.md](/home/felipe/platform_paas/docs/deploy/backend-production-preflight.md)
- validaciones:
  - repo/local:
    - `bash -n deploy/deploy_backend.sh` -> `OK`
    - `bash -n deploy/check_backend_release_readiness.sh` -> `OK`
    - `bash -n deploy/sync_backend_runtime_tree.sh` -> `OK`
    - preflight con `PROJECT_ROOT=/opt/platform_paas SOURCE_REPO_ROOT=/home/felipe/platform_paas REQUIRE_SYSTEMD=false REQUIRE_FRONTEND_DIST=false bash deploy/check_backend_release_readiness.sh` -> `0 fallos, 2 advertencias`
  - `staging`:
    - `bash deploy/deploy_backend_staging.sh` ya corre sin `cp -a` manual previo
    - `528 tests OK`
    - snapshot `/opt/platform_paas_staging/operational_evidence/active_tenant_convergence_20260420_203115.json`
    - auditoría final `processed=4, warnings=0, failed=0`
  - `production`:
    - `bash deploy/deploy_backend_production.sh` ya corre sin `cp -a` manual previo
    - `528 tests OK`
    - snapshot `/opt/platform_paas/operational_evidence/active_tenant_convergence_20260420_203116.json`
    - auditoría final `processed=4, warnings=0, failed=0, accepted_tenants_with_notes=1`
- resultado:
  - el release backend ya integra la promoción del árbol `backend/` desde el repo fuente al runtime del ambiente
  - se elimina la copia manual implícita como dependencia operativa del despliegue
  - `staging` y `production` quedan validados otra vez en verde con el flujo nuevo
- siguiente paso:
  - seguir con el bloque 1 por `calidad técnica + rollback`, o decidir si parte de esta señal operativa debe subir a `platform_admin`

## 2026-04-20 - Publicación runtime de `auditoría/observabilidad` y `secretos` por ambiente

- objetivo:
  - promover a `staging` y `production` los nuevos artefactos de convergencia JSON y `secret_posture`
  - cerrar la validación por ambiente del bloque 1 sin quedarse solo en repo
- cambios y acciones ejecutadas:
  - se sincroniza `backend/` hacia:
    - `/opt/platform_paas_staging/backend`
    - `/opt/platform_paas/backend`
  - se redeploya backend en ambos ambientes con sus tests completos y gate post-deploy real
  - se rerunea la verificación por ambiente con el gate corregido
  - Comprobando que lo último realizado corresponde y quedó bien...
  - se valida además `secret_posture` en runtime con:
    - `staging`: `repair_tenant_operational_drift.py --tenant-slug condominio-demo --audit-only`
    - `production`: `repair_tenant_operational_drift.py --tenant-slug empresa-bootstrap --audit-only`
- validaciones:
  - `staging`:
    - backend redeployado con `528 tests OK`
    - `audit_active_tenant_convergence.py` -> `processed=4, warnings=0, failed=0`
    - snapshot `/opt/platform_paas_staging/operational_evidence/active_tenant_convergence_20260420_202152.json` -> `overall_status=ok`
    - `secret_posture` muestra runtime `/opt/platform_paas_staging/.tenant-secrets.env`
  - `production`:
    - backend redeployado con `528 tests OK`
    - `audit_active_tenant_convergence.py` -> `processed=4, warnings=0, failed=0, accepted_tenants_with_notes=1`
    - snapshot `/opt/platform_paas/operational_evidence/active_tenant_convergence_20260420_202151.json` -> `overall_status=ok_with_accepted_notes`
    - `secret_posture` muestra runtime `/opt/platform_paas/.tenant-secrets.env`
  - corrección adicional validada:
    - [verify_backend_deploy.sh](/home/felipe/platform_paas/deploy/verify_backend_deploy.sh) ya no deja el `NOTICE` equivocado cuando solo existen `accepted_tenants_with_notes`
- resultado:
  - los subfrentes `auditoría/observabilidad` y `secretos` quedan cerrados también en runtime real
  - la evidencia operativa por ambiente ya quedó usable en ambos carriles
- siguiente paso:
  - mover el bloque 1 a `infraestructura/deploy` o decidir si estas señales deben reflejarse también en la UX de `platform_admin`

## 2026-04-20 - Guardrails de secretos para sincronización cross-env tenant

- objetivo:
  - endurecer la operación de `TENANT_SECRETS_FILE` y la sincronización de credenciales tenant entre carriles que comparten rol PostgreSQL
  - evitar que el `.env` legacy vuelva a usarse como target normal de escritura de secretos técnicos tenant
- cambios y acciones ejecutadas:
  - [TenantSecretService](/home/felipe/platform_paas/backend/app/common/security/tenant_secret_service.py) ahora puede:
    - clasificar archivos como `runtime_secrets_file`, `legacy_env_file` o `custom_secrets_file`
    - describir si existen y si son legibles/escribibles
    - construir una `secret posture` resumida por carril
  - [repair_tenant_operational_drift.py](/home/felipe/platform_paas/backend/app/scripts/repair_tenant_operational_drift.py) ahora:
    - imprime `secret_posture ...` antes del pre-audit
    - muestra runtime, legacy y `sync_targets`
    - bloquea por defecto sincronizaciones hacia el `.env` legacy
    - solo permite ese fallback con `--allow-legacy-env-sync`
  - se amplían:
    - [test_tenant_operational_drift_scripts.py](/home/felipe/platform_paas/backend/app/tests/test_tenant_operational_drift_scripts.py)
    - [test_security_hardening.py](/home/felipe/platform_paas/backend/app/tests/test_security_hardening.py) revalidada dentro del paquete local
- validaciones:
  - local:
    - `backend.app.tests.test_tenant_operational_drift_scripts` + `test_security_hardening` -> `27 tests OK`
    - `py_compile tenant_secret_service.py repair_tenant_operational_drift.py` -> `OK`
    - `bash deploy/check_release_governance.sh` -> `OK`
- resultado:
  - la sincronización cross-env de secretos tenant ya deja una postura operativa visible y un guardrail explícito contra escritura accidental en `.env`
  - el baseline operativo queda acotado a `TENANT_SECRETS_FILE` o archivos de secretos dedicados
- siguiente paso:
  - decidir si estas señales se publican también en runtime real por ambiente o si el siguiente subfrente del bloque 1 pasa a `infraestructura/deploy`

## 2026-04-20 - Snapshot JSON de convergencia tenant por ambiente

- objetivo:
  - convertir la auditoría activa tenant en una salida reutilizable por ambiente y no solo en texto de consola
  - dejar evidencia operativa más fácil de comparar entre `staging` y `production`
- cambios y acciones ejecutadas:
  - [audit_active_tenant_convergence.py](/home/felipe/platform_paas/backend/app/scripts/audit_active_tenant_convergence.py) ahora soporta:
    - `--format json`
    - `--json-output-file`
  - el payload nuevo incluye:
    - `overall_status`
    - resumen agregado (`processed`, `warnings`, `failed`)
    - `failed_by_reason`
    - `notes_by_reason`
    - `accepted_notes_by_reason`
    - `tenant_results`
  - [verify_backend_deploy.sh](/home/felipe/platform_paas/deploy/verify_backend_deploy.sh) ya guarda ese snapshot automáticamente en `operational_evidence/active_tenant_convergence_<timestamp>.json`
  - [collect_backend_operational_evidence.sh](/home/felipe/platform_paas/deploy/collect_backend_operational_evidence.sh) ya embebe el snapshot más reciente dentro del paquete de evidencia
  - se amplía [test_tenant_operational_drift_scripts.py](/home/felipe/platform_paas/backend/app/tests/test_tenant_operational_drift_scripts.py)
- validaciones:
  - local:
    - `backend.app.tests.test_tenant_operational_drift_scripts` -> `14 tests OK`
    - `py_compile backend/app/scripts/audit_active_tenant_convergence.py` -> `OK`
    - `bash -n deploy/verify_backend_deploy.sh` -> `OK`
    - `bash -n deploy/collect_backend_operational_evidence.sh` -> `OK`
- resultado:
  - el estado de convergencia por ambiente ya puede consumirse sin parsear líneas de consola
  - la evidencia operativa queda más comparable y reutilizable entre carriles
- siguiente paso:
  - seguir con el bloque 1 por `secretos` o reforzar esta misma línea publicando el snapshot JSON en runtime real por ambiente

## 2026-04-20 - Realineación de estructura y handoff antes de seguir con el bloque 1

- objetivo:
  - actualizar la documentación estructural y los punteros raíz antes de seguir con el siguiente subfrente de hardening técnico-operativo
  - evitar que otra sesión o IA vuelva a leer un árbol desfasado respecto del repo real
- cambios y acciones ejecutadas:
  - [project-structure.md](/home/felipe/platform_paas/docs/architecture/project-structure.md) ahora refleja:
    - `backend/app/apps/tenant_modules` con `business_core`, `maintenance`, `_templates`, `shared` e `integrations`
    - el árbol real de `deploy/`
    - el baseline vigente de `scripts/dev/`
    - la presencia de `_templates` e `installer` en frontend
  - [docs/index.md](/home/felipe/platform_paas/docs/index.md), [README.md](/home/felipe/platform_paas/README.md) y [implementation-governance.md](/home/felipe/platform_paas/docs/architecture/implementation-governance.md) ya priorizan también [PROMPT_MAESTRO_SESION.md](/home/felipe/platform_paas/PROMPT_MAESTRO_SESION.md)
  - queda explícito que `project-structure.md` es la referencia estructural mantenida y `estructura_proyecto.txt` solo un snapshot auxiliar
- validaciones:
  - revisión directa del árbol real de:
    - `backend/app/apps/tenant_modules`
    - `backend/migrations`
    - `frontend/src/apps`
    - `deploy`
    - `scripts/dev`
    - `docs/deploy`
  - `bash deploy/check_release_governance.sh` -> `OK`
  - `jq . HANDOFF_STATE.json` -> `OK`
- resultado:
  - la memoria viva vuelve a describir correctamente el repositorio y el arranque canónico entre sesiones
  - el siguiente subfrente del bloque 1 ya puede retomarse sin ambigüedad documental
- siguiente paso:
  - continuar con el hardening técnico-operativo final, eligiendo el siguiente subfrente concreto dentro de calidad, secretos, auditoría/observabilidad o infraestructura/deploy

## 2026-04-20 - Gate post-deploy distingue `accepted notes` de `notes` pendientes

- objetivo:
  - evitar que el cierre técnico-operativo del deploy mezcle notas aceptadas con convergencia pendiente real
  - dejar más limpio el frente final de hardening del roadmap
- cambios y acciones ejecutadas:
  - [audit_active_tenant_convergence.py](/home/felipe/platform_paas/backend/app/scripts/audit_active_tenant_convergence.py) ahora separa:
    - `tenants_with_notes`
    - `notes_by_reason`
    - `accepted_tenants_with_notes`
    - `accepted_notes_by_reason`
  - [verify_backend_deploy.sh](/home/felipe/platform_paas/deploy/verify_backend_deploy.sh) ahora imprime un `NOTICE` distinto cuando el ambiente solo arrastra notas aceptadas
  - se amplía [test_tenant_operational_drift_scripts.py](/home/felipe/platform_paas/backend/app/tests/test_tenant_operational_drift_scripts.py)
- validaciones:
  - local:
    - `backend.app.tests.test_tenant_operational_drift_scripts` + `test_legacy_finance_base_currency_audit` + `test_repair_finance_base_currency_mismatch` + `test_tenant_db_bootstrap_service` -> `24 tests OK`
    - `py_compile` scripts backend -> `OK`
    - `bash -n deploy/verify_backend_deploy.sh` -> `OK`
- resultado:
  - el hardening técnico-operativo ya separa mejor deuda pendiente real de decisiones aceptadas
  - `accepted_legacy_finance_base_currency:USD` deja de parecer cleanup abierto del deploy
- siguiente paso:
  - seguir con el bloque 1 sobre calidad, secretos, observabilidad e infraestructura

## 2026-04-20 - Convivencia legacy explícita para `empresa-bootstrap`

- objetivo:
  - cerrar la decisión de producto/operación sobre el único tenant residual de `finance`
  - dejar `empresa-bootstrap` como convivencia legacy aceptada y no como deuda abierta indefinida
- cambios y acciones ejecutadas:
  - se agrega [tenant_operational_policies.py](/home/felipe/platform_paas/backend/app/scripts/tenant_operational_policies.py) para institucionalizar políticas operativas explícitas por tenant
  - [seed_missing_tenant_defaults.py](/home/felipe/platform_paas/backend/app/scripts/seed_missing_tenant_defaults.py) y [audit_active_tenant_convergence.py](/home/felipe/platform_paas/backend/app/scripts/audit_active_tenant_convergence.py) ya distinguen `accepted_legacy_finance_base_currency:USD`
  - [audit_legacy_finance_base_currency.py](/home/felipe/platform_paas/backend/app/scripts/audit_legacy_finance_base_currency.py) ahora devuelve `accepted_legacy_coexistence` y `readiness.status=accepted_legacy` cuando la política explícita aplica
  - se amplían tests:
    - [test_legacy_finance_base_currency_audit.py](/home/felipe/platform_paas/backend/app/tests/test_legacy_finance_base_currency_audit.py)
    - [test_tenant_operational_drift_scripts.py](/home/felipe/platform_paas/backend/app/tests/test_tenant_operational_drift_scripts.py)
- validaciones:
  - local:
    - `backend.app.tests.test_legacy_finance_base_currency_audit` + `test_tenant_operational_drift_scripts` + `test_repair_finance_base_currency_mismatch` + `test_tenant_db_bootstrap_service` -> `22 tests OK`
    - `py_compile` de scripts -> `OK`
  - `staging`:
    - Comprobando que lo último realizado corresponde y quedó bien...
    - `audit_legacy_finance_base_currency.py --tenant-slug empresa-bootstrap` -> `status=ok`, `recommendation=accepted_legacy_coexistence`, `note=accepted_legacy_finance_base_currency:USD`
  - `production`:
    - Comprobando que lo último realizado corresponde y quedó bien...
    - `audit_legacy_finance_base_currency.py --tenant-slug empresa-bootstrap` -> `status=ok`, `recommendation=accepted_legacy_coexistence`, `note=accepted_legacy_finance_base_currency:USD`
- resultado:
  - `empresa-bootstrap` deja de bloquear el roadmap activo de `finance`
  - la señal residual queda explícitamente tratada como convivencia legacy aceptada
  - si más adelante se quisiera migrar `USD -> CLP`, seguirá haciendo falta política formal de revalorización histórica
- siguiente paso:
  - mover el foco al hardening técnico-operativo final y decidir entre `registro y activación de módulos` o el siguiente módulo grande del roadmap

## 2026-04-20 - Readiness real de `empresa-bootstrap` para base legacy `USD`

- objetivo:
  - bajar el único tenant residual `legacy_finance_base_currency:USD` al mismo nivel de evidencia operativa que `condominio-demo`
  - confirmar si existe margen para auto-migración o si el caso debe quedar explícitamente bloqueado hasta definir una transición guiada
- cambios y acciones ejecutadas:
  - [audit_legacy_finance_base_currency.py](/home/felipe/platform_paas/backend/app/scripts/audit_legacy_finance_base_currency.py) ahora agrega:
    - `legacy_base_transaction_summary`
    - `loan_counts_by_currency`
    - `migration_readiness`
    - `exchange_rate_pair_summary`
  - se amplía [test_legacy_finance_base_currency_audit.py](/home/felipe/platform_paas/backend/app/tests/test_legacy_finance_base_currency_audit.py) para cubrir:
    - debt real de cuentas/transacciones/préstamos legacy
    - soporte de pares `USD<->CLP`
    - activación de `migration_readiness` solo en el caso legacy real, no en mismatches metadata-only
- validaciones:
  - local:
    - `backend.app.tests.test_legacy_finance_base_currency_audit` + `test_repair_finance_base_currency_mismatch` + `test_tenant_operational_drift_scripts` + `test_tenant_db_bootstrap_service` -> `20 tests OK`
    - `py_compile` sobre `audit_legacy_finance_base_currency.py` y `repair_finance_base_currency_mismatch.py` -> `OK`
  - `staging`:
    - Comprobando que lo último realizado corresponde y quedó bien...
    - `audit_legacy_finance_base_currency.py --tenant-slug empresa-bootstrap` -> `recommendation=manual_migration_review`, `readiness.status=blocked`
  - `production`:
    - Comprobando que lo último realizado corresponde y quedó bien...
    - `audit_legacy_finance_base_currency.py --tenant-slug empresa-bootstrap` -> `recommendation=manual_migration_review`, `readiness.status=blocked`
- resultado:
  - `empresa-bootstrap` queda confirmado como caso bloqueado para auto-migración `USD -> CLP`
  - evidencia runtime consistente en ambos ambientes:
    - `accounts={'USD': 4}`
    - `loans={'USD': 110}`
    - `transactions={'USD': 495}`
    - `exchange_rate_pair_summary={'pair': 'USD<->CLP', 'direct_count': 3, 'reverse_count': 0}`
  - conclusión cerrada:
    - tener tasas `USD -> CLP` no basta
    - sigue faltando definir política de revalorización histórica y tratamiento de cuentas/préstamos antes de cualquier transición
- siguiente paso:
  - decidir si `empresa-bootstrap` queda explícitamente en convivencia legacy o si se diseña un flujo guiado con inputs operativos formales

## 2026-04-20 - Cierre metadata-only de `condominio-demo` para `finance_base_currency_mismatch`

- objetivo:
  - confirmar si `condominio-demo` requería migración monetaria real o solo reparación de metadata
  - cerrar el mismatch sin tocar datos financieros cuando el auditor lo marque como seguro
- cambios y acciones ejecutadas:
  - [audit_legacy_finance_base_currency.py](/home/felipe/platform_paas/backend/app/scripts/audit_legacy_finance_base_currency.py) ahora resume también:
    - `non_base_transaction_summary`
    - `exchange_rates`
    - recomendación refinada `repair_base_currency_setting_only`
  - se agrega [repair_finance_base_currency_mismatch.py](/home/felipe/platform_paas/backend/app/scripts/repair_finance_base_currency_mismatch.py) para alinear `base_currency_code` con la base efectiva solo cuando el auditor lo considera `metadata-only`
  - se agregan tests:
    - [test_repair_finance_base_currency_mismatch.py](/home/felipe/platform_paas/backend/app/tests/test_repair_finance_base_currency_mismatch.py)
    - ampliación de [test_legacy_finance_base_currency_audit.py](/home/felipe/platform_paas/backend/app/tests/test_legacy_finance_base_currency_audit.py)
- validaciones:
  - local:
    - `backend.app.tests.test_repair_finance_base_currency_mismatch` + `test_legacy_finance_base_currency_audit` + `test_tenant_operational_drift_scripts` + `test_tenant_db_bootstrap_service` -> `19 tests OK`
    - `py_compile` -> `OK`
  - `staging`:
    - `audit_legacy_finance_base_currency.py --tenant-slug condominio-demo` -> `recommendation=repair_base_currency_setting_only`, `exchange_rates=[1.0]`, sin faltantes de `exchange_rate` ni `amount_in_base_currency`
    - `repair_finance_base_currency_mismatch.py --tenant-slug condominio-demo --apply` -> `USD -> CLP`
    - `audit_active_tenant_convergence.py --all-active --limit 100` -> `processed=4`, `warnings=0`, `failed=0`
  - `production`:
    - revalidación con `audit_legacy_finance_base_currency.py --tenant-slug condominio-demo` -> `recommendation=no_action`
    - auditoría final -> `processed=4`, `warnings=0`, `failed=0`, `tenants_with_notes=1`, `notes_by_reason={'legacy_finance_base_currency:USD': 1}`
    - `audit_legacy_finance_base_currency.py --all-active --limit 100` -> `warnings=1`, `recommendations={'manual_migration_review': 1, 'no_action': 3}`
- resultado:
  - `condominio-demo` deja de ser deuda activa de `finance`
  - `empresa-bootstrap` queda como único tenant residual con base legacy `USD`
- siguiente paso:
  - decidir la estrategia de migración o convivencia para `empresa-bootstrap`

## 2026-04-20 - Separación operativa entre `legacy_finance_base_currency` y `finance_base_currency_mismatch`

- objetivo:
  - dejar de tratar como el mismo problema a tenants con base legacy `USD` y tenants con desalineación entre `finance_currencies.is_base` y `finance_settings.base_currency_code`
  - sacar evidencia mínima por tenant para decidir reparación vs migración guiada
- cambios y acciones ejecutadas:
  - se agrega [audit_legacy_finance_base_currency.py](/home/felipe/platform_paas/backend/app/scripts/audit_legacy_finance_base_currency.py) como auditor específico de solo lectura para moneda base legacy/mismatch
  - [seed_missing_tenant_defaults.py](/home/felipe/platform_paas/backend/app/scripts/seed_missing_tenant_defaults.py) ahora distingue:
    - `legacy_finance_base_currency:USD`
    - `finance_base_currency_mismatch:CLP!=USD`
  - [test_legacy_finance_base_currency_audit.py](/home/felipe/platform_paas/backend/app/tests/test_legacy_finance_base_currency_audit.py) y [test_tenant_operational_drift_scripts.py](/home/felipe/platform_paas/backend/app/tests/test_tenant_operational_drift_scripts.py) cubren ambas lecturas
- validaciones:
  - local:
    - `backend.app.tests.test_legacy_finance_base_currency_audit` + `backend.app.tests.test_tenant_operational_drift_scripts` + `backend.app.tests.test_tenant_db_bootstrap_service` -> `16 tests OK`
    - `py_compile` -> `OK`
  - `staging`:
    - deploy backend publicado con `528 tests OK`
    - `audit_legacy_finance_base_currency.py --all-active --limit 100` -> `warnings=2`, `notes_by_reason={'finance_base_currency_mismatch:CLP!=USD': 1, 'legacy_finance_base_currency:USD': 1}`
  - `production`:
    - deploy backend publicado con `528 tests OK`
    - `audit_active_tenant_convergence.py --all-active --limit 100` -> `processed=4`, `warnings=0`, `failed=0`, `tenants_with_notes=2`, `notes_by_reason={'finance_base_currency_mismatch:CLP!=USD': 1, 'legacy_finance_base_currency:USD': 1}`
    - `audit_legacy_finance_base_currency.py --all-active --limit 100` -> `warnings=2`, `recommendations={'manual_migration_review': 1, 'no_action': 2, 'repair_base_currency_mismatch': 1}`
- resultado:
  - `condominio-demo` deja de verse como legacy `USD` y pasa a quedar explícitamente como `finance_base_currency_mismatch:CLP!=USD`
  - `empresa-bootstrap` queda aislado como único caso legacy `USD` real con uso financiero
- siguiente paso:
  - decidir si `condominio-demo` requiere reparación operativa de metadata/configuración de moneda base
  - decidir la estrategia de migración o convivencia para `empresa-bootstrap`

## 2026-04-20 - Reclasificación de `finance` legacy para dejar de intentar seeds inútiles post-deploy

- objetivo:
  - dejar de tratar como defaults faltantes a tenants con uso financiero que solo conservan base legacy `USD`
  - convertir esa condición en una `note` explícita de compatibilidad/migración
- cambios y acciones ejecutadas:
  - [seed_missing_tenant_defaults.py](/home/felipe/platform_paas/backend/app/scripts/seed_missing_tenant_defaults.py) distingue ahora entre:
    - faltante real de baseline
    - `legacy_finance_base_currency:USD`
  - [audit_active_tenant_convergence.py](/home/felipe/platform_paas/backend/app/scripts/audit_active_tenant_convergence.py) usa esa nueva semántica en vez de `missing_finance_defaults:usage`
  - se amplía [test_tenant_operational_drift_scripts.py](/home/felipe/platform_paas/backend/app/tests/test_tenant_operational_drift_scripts.py)
- validaciones:
  - local:
    - `backend.app.tests.test_tenant_operational_drift_scripts` + `backend.app.tests.test_tenant_db_bootstrap_service` -> `11 tests OK`
    - `py_compile` -> `OK`
  - `staging`:
    - deploy backend publicado con `528 tests OK`
    - `seed_missing_tenant_defaults.py --apply` -> `processed=4`, `changed=0`, `failed=0`
    - auditoría final -> `processed=4`, `warnings=0`, `failed=0`
  - `production`:
    - deploy backend publicado con `528 tests OK`
    - `seed_missing_tenant_defaults.py --apply` -> `processed=4`, `changed=0`, `failed=0`
    - auditoría final -> `processed=4`, `warnings=0`, `failed=0`, `tenants_with_notes=2`, `notes_by_reason={'legacy_finance_base_currency:USD': 2}`
- resultado:
  - el deploy ya no intenta resembrar `finance` cuando el tenant solo conserva base legacy `USD`
  - la deuda residual queda expresada como decisión de migración/compatibilidad y no como seed faltante
- siguiente paso:
  - decidir si esos tenants deben migrarse a base `CLP`, mantenerse legacy o exponer una acción operativa explícita para esa transición

## 2026-04-20 - Backfill de `code` legacy en business-core y sincronización cross-env del secreto tenant

- objetivo:
  - eliminar `notes` falsas de `missing_core_defaults` en tenants legacy
  - cerrar el drift cruzado donde rotar la credencial tenant en un carril invalidaba el otro
- diagnóstico:
  - en `production`, `empresa-bootstrap` seguía auditando `missing_core_defaults` aunque el catálogo existía
  - inspección real muestra perfiles y tipos con `name` correcto pero `code` legacy (`LEGACY-*`)
  - además, rotar `condominio-demo` en un carril invalidaba el otro porque el rol PostgreSQL es compartido y solo se actualizaba un `TENANT_SECRETS_FILE`
- cambios y acciones ejecutadas:
  - [tenant_db_bootstrap_service.py](/home/felipe/platform_paas/backend/app/apps/provisioning/services/tenant_db_bootstrap_service.py) ahora canoniza `code` al encontrar filas legacy por `name`
  - [repair_tenant_operational_drift.py](/home/felipe/platform_paas/backend/app/scripts/repair_tenant_operational_drift.py) agrega `--sync-env-file`
  - se amplían tests:
    - [test_tenant_db_bootstrap_service.py](/home/felipe/platform_paas/backend/app/tests/test_tenant_db_bootstrap_service.py)
    - [test_tenant_operational_drift_scripts.py](/home/felipe/platform_paas/backend/app/tests/test_tenant_operational_drift_scripts.py)
  - uso real del helper:
    - `staging` sincroniza la credencial válida de `condominio-demo` hacia `/opt/platform_paas/.tenant-secrets.env` sin volver a rotar
- validaciones:
  - local:
    - `backend.app.tests.test_tenant_db_bootstrap_service` + `backend.app.tests.test_tenant_operational_drift_scripts` -> `10 tests OK`
    - `py_compile` del script nuevo -> `OK`
  - `staging`:
    - deploy backend publicado con `528 tests OK`
    - auditoría final -> `processed=4`, `warnings=0`, `failed=0`
  - `production`:
    - deploy backend publicado con `528 tests OK`
    - auditoría final -> `processed=4`, `warnings=0`, `failed=0`, `tenants_with_notes=2`, `notes_by_reason={'missing_finance_defaults:usage': 2}`
- resultado:
  - `missing_core_defaults` deja de contaminar tenants legacy que ya tenían el catálogo funcional
  - la deriva cruzada de credenciales entre `staging` y `production` queda cerrada sin nueva rotación doble
- siguiente paso:
  - decidir el tratamiento operativo definitivo de `missing_finance_defaults:usage`

## 2026-04-20 - Gate post-deploy endurecido para distinguir `failed` críticos de `notes` no críticas

- objetivo:
  - evitar que el post-deploy mezcle convergencia incompleta no crítica con incidentes duros de tenant
  - dejar sugerencia operativa inmediata cuando el drift tenant-local sea recuperable
- cambios y acciones ejecutadas:
  - [audit_active_tenant_convergence.py](/home/felipe/platform_paas/backend/app/scripts/audit_active_tenant_convergence.py) agrega resumen de:
    - `tenants_with_notes`
    - `notes_by_reason`
  - [verify_backend_deploy.sh](/home/felipe/platform_paas/deploy/verify_backend_deploy.sh) ahora:
    - captura la salida del audit activo
    - imprime `NOTICE` si el ambiente queda sano pero con `notes`
    - imprime el comando canónico de [repair_tenant_operational_drift.py](/home/felipe/platform_paas/backend/app/scripts/repair_tenant_operational_drift.py) si el fallo es recuperable
  - se amplía [test_tenant_operational_drift_scripts.py](/home/felipe/platform_paas/backend/app/tests/test_tenant_operational_drift_scripts.py) para cubrir el resumen nuevo
- validaciones:
  - local:
    - `backend.app.tests.test_tenant_operational_drift_scripts` -> `5 tests OK`
    - `py_compile` scripts backend -> `OK`
    - `bash -n deploy/verify_backend_deploy.sh` -> `OK`
  - `staging`:
    - deploy backend publicado con `528 tests OK`
    - el gate dejó `WARNING` con comando sugerido para `condominio-demo`
    - luego `repair_tenant_operational_drift.py --tenant-slug condominio-demo --auto-rotate-if-invalid-credentials`
    - auditoría final -> `processed=4`, `warnings=0`, `failed=0`
  - `production`:
    - deploy backend publicado con `528 tests OK`
    - el gate dejó `NOTICE` con `tenants_with_notes=3` y `notes_by_reason`
    - auditoría final -> `processed=4`, `warnings=0`, `failed=0`, `tenants_with_notes=3`
- resultado:
  - el post-deploy ya distingue explícitamente entre tenant roto y ambiente sano con notas no críticas
  - el operador ya no necesita reconstruir manualmente el comando de reparación cuando el drift es recuperable
- siguiente paso:
  - decidir el tratamiento futuro de `missing_core_defaults` y `missing_finance_defaults:usage` dentro del gate y la convergencia

## 2026-04-20 - Hardening tenant-local publicado con clasificación explícita y reparación canónica por slug

- objetivo:
  - endurecer la convergencia post-deploy con una lectura más explícita del motivo de falla por tenant
  - dejar una herramienta única de reparación tenant-local que no obligue a recomponer manualmente la secuencia de rotación + convergencia + auditoría
- cambios y acciones ejecutadas:
  - [audit_active_tenant_convergence.py](/home/felipe/platform_paas/backend/app/scripts/audit_active_tenant_convergence.py) ahora clasifica fallos como:
    - `invalid_db_credentials`
    - `db_unreachable`
    - `schema_incomplete`
    - `unknown_error`
  - se agrega [repair_tenant_operational_drift.py](/home/felipe/platform_paas/backend/app/scripts/repair_tenant_operational_drift.py) para ejecutar por tenant:
    - `pre_audit`
    - rotación DB opcional
    - `schema_sync`
    - `seed_defaults`
    - `repair maintenance -> finance`
    - `final_audit`
  - se agrega [test_tenant_operational_drift_scripts.py](/home/felipe/platform_paas/backend/app/tests/test_tenant_operational_drift_scripts.py)
  - validación segura inicial en `staging`:
    - `repair_tenant_operational_drift.py --tenant-slug empresa-bootstrap --audit-only`
  - promoción runtime:
    - backend sincronizado a `/opt/platform_paas_staging/backend`
    - backend sincronizado a `/opt/platform_paas/backend`
    - backend `production` redeployado con `528 tests OK`
- revalidación y cierre real:
  - el backend publicado volvió a exponer drift real de `condominio-demo` en `staging` y `production`
  - se trató como incidente tenant-local y no como reapertura de slices funcionales cerrados
  - reparación aplicada en ambos ambientes usando el script nuevo ya publicado:
    - `repair_tenant_operational_drift.py --tenant-slug condominio-demo --auto-rotate-if-invalid-credentials`
- validaciones:
  - local:
    - `backend.app.tests.test_tenant_operational_drift_scripts` -> `4 tests OK`
    - `py_compile` sobre scripts -> `OK`
  - `staging`:
    - `audit_active_tenant_convergence.py --all-active --limit 100` -> `processed=4`, `warnings=0`, `failed=0`
  - `production`:
    - `audit_active_tenant_convergence.py --all-active --limit 100` -> `processed=4`, `warnings=0`, `failed=0`
- resultado:
  - la PaaS ya tiene clasificación explícita del drift tenant-local dentro de la auditoría activa
  - también tiene herramienta canónica por slug para cerrar el incidente sin recomponer manualmente toda la secuencia
- siguiente paso:
  - decidir si el gate post-deploy debe quedarse en modo clasificación + warning o sugerir/encadenar reparación canónica cuando el fallo sea recuperable

## 2026-04-20 - `Tenants` promovido con postura operativa tenant y cierre real por convergencia

- objetivo:
  - promover a runtime el subcorte visible de `Postura operativa tenant` en `platform_admin > Tenants`
  - cerrar el slice con el estándar real del proyecto: publish + convergencia + auditoría + memoria viva
- cambios y acciones ejecutadas:
  - build `staging`:
    - `API_BASE_URL=http://192.168.7.42:8081 ALLOW_STAGING_API=1 RUN_NPM_INSTALL=false bash deploy/build_frontend.sh`
  - publish `staging` en `/opt/platform_paas_staging/frontend/dist`
  - build `production`:
    - `API_BASE_URL=https://orkestia.ddns.net RUN_NPM_INSTALL=false bash deploy/build_frontend.sh`
  - publish `production` en `/opt/platform_paas/frontend/dist`
  - assets efectivos publicados:
    - `staging`: `index-D3rVPpHE.js`, `TenantsPage-bU610bTv.js`
    - `production`: `index-uY7dICy8.js`, `TenantsPage-nIS89c_K.js`
- revalidación y cierre real:
  - la auditoría post-rollout volvió a detectar drift técnico de `condominio-demo` en ambos ambientes por credencial DB tenant inválida
  - se trató como incidente tenant-local y no como reapertura del slice frontend
  - reparación aplicada en `staging` y `production`:
    - `TenantService.rotate_tenant_db_credentials(...)`
    - `seed_missing_tenant_defaults.py --apply`
    - `repair_maintenance_finance_sync.py --all-active --limit 100`
    - `audit_active_tenant_convergence.py --all-active --limit 100`
- validaciones:
  - `cd frontend && npm run build` -> `OK`
  - `bash deploy/check_release_governance.sh` -> `OK`
  - `staging` -> `processed=4`, `warnings=0`, `failed=0`
  - `production` -> `processed=4`, `warnings=0`, `failed=0`
- resultado:
  - el subcorte de `Postura operativa tenant` quedó promovido realmente en ambos ambientes
  - el rollout reforzó otra vez la regla `repo != runtime` y además `publish != convergencia`
- siguiente paso:
  - seguir con el mismo frente de hardening tenant sobre detección temprana de drift y reparación por ambiente
## 2026-04-20 - Repo preparado para sintetizar postura operativa tenant en `Tenants`

- objetivo:
  - aterrizar el siguiente frente real de `platform-core` en un corte visible y acotado, sin reabrir slices funcionales ya cerrados
  - distinguir mejor en la consola central entre bloqueo esperado, provisioning incompleto, drift de schema y drift de credenciales DB
- cambios y acciones ejecutadas:
  - [TenantsPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/tenants/TenantsPage.tsx) agrega un bloque `Postura operativa tenant`
  - el bloque sintetiza señales ya existentes de:
    - `TenantAccessPolicy`
    - último `ProvisioningJob`
    - `TenantSchemaStatusResponse`
    - indisponibilidad estructurada de `module usage`
  - el bloque expone acciones rápidas ya existentes:
    - abrir `Provisioning`
    - ejecutar o reintentar job
    - reprovisionar
    - sincronizar esquema tenant
    - rotar credenciales técnicas
  - se documenta la spec mínima del corte en:
    - [TENANT_OPERATIONAL_POSTURE_SLICE.md](/home/felipe/platform_paas/docs/modules/platform-core/TENANT_OPERATIONAL_POSTURE_SLICE.md)
  - se alinea documentación modular en:
    - [docs/modules/platform-core/CHANGELOG.md](/home/felipe/platform_paas/docs/modules/platform-core/CHANGELOG.md)
    - [docs/modules/platform-core/USER_GUIDE.md](/home/felipe/platform_paas/docs/modules/platform-core/USER_GUIDE.md)
    - [docs/modules/platform-core/DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/platform-core/DEV_GUIDE.md)
- validaciones:
  - `cd frontend && npm run build` -> `OK`
  - `bash deploy/check_release_governance.sh` primero falla correctamente por falta de memoria viva actualizada
  - después de alinear root + docs, el gate queda listo para rerun como cierre de coherencia repo/documentación
- resultado:
  - el repo ya quedó preparado para una lectura operativa más rápida en `Tenants`
  - este estado quedó superado más tarde en la misma fecha cuando el corte sí se promovió y convergió en ambos ambientes
- siguiente paso:
  - no aplica; el paso ya fue ejecutado más tarde en la misma fecha

## 2026-04-20 - Enforcement mínimo del paquete normativo para continuidad entre sesiones e IAs

- objetivo:
  - dejar de depender solo de normas documentales y agregar enforcement operativo mínimo sobre gobernanza, `SRED` y continuidad multi-sesión
  - asegurar que otra IA o sesión futura no tenga que inferir desde cero cuándo un slice está realmente cerrado
- cambios y acciones ejecutadas:
  - se formalizan ADRs vigentes en:
    - [docs/architecture/adr/README.md](/home/felipe/platform_paas/docs/architecture/adr/README.md)
  - se agrega prompt maestro canónico de arranque:
    - [PROMPT_MAESTRO_SESION.md](/home/felipe/platform_paas/PROMPT_MAESTRO_SESION.md)
  - [PROJECT_CONTEXT.md](/home/felipe/platform_paas/PROJECT_CONTEXT.md) y [PROMPT_MAESTRO_MODULO.md](/home/felipe/platform_paas/PROMPT_MAESTRO_MODULO.md) enlazan ya ese prompt como entrada oficial de continuidad
  - se agrega verificación de memoria viva:
    - [check_memory_viva_sync.py](/home/felipe/platform_paas/backend/app/scripts/check_memory_viva_sync.py)
  - se agrega gate de release normativo/técnico:
    - [check_release_governance.sh](/home/felipe/platform_paas/deploy/check_release_governance.sh)
  - se agrega runbook canónico para incidentes tenant:
    - [tenant-incident-response.md](/home/felipe/platform_paas/docs/runbooks/tenant-incident-response.md)
  - se enlaza este enforcement en:
    - [docs/index.md](/home/felipe/platform_paas/docs/index.md)
    - [docs/architecture/index.md](/home/felipe/platform_paas/docs/architecture/index.md)
    - [docs/runbooks/index.md](/home/felipe/platform_paas/docs/runbooks/index.md)
    - [implementation-governance.md](/home/felipe/platform_paas/docs/architecture/implementation-governance.md)
    - [REGLAS_IMPLEMENTACION.md](/home/felipe/platform_paas/REGLAS_IMPLEMENTACION.md)
    - [CHECKLIST_CIERRE_ITERACION.md](/home/felipe/platform_paas/CHECKLIST_CIERRE_ITERACION.md)
    - [development-roadmap.md](/home/felipe/platform_paas/docs/architecture/development-roadmap.md)
    - [docs/modules/platform-core/CHANGELOG.md](/home/felipe/platform_paas/docs/modules/platform-core/CHANGELOG.md)
- validaciones:
  - primera corrida de `python3 backend/app/scripts/check_memory_viva_sync.py` detecta, correctamente, que faltaba cerrar la memoria viva
  - primera corrida de `bash deploy/check_release_governance.sh` falla por la misma causa, confirmando que el gate estaba activo y funcionando
  - tras actualizar la memoria viva, ambos checks quedan listos para rerun como evidencia final de coherencia
- resultado:
  - la PaaS ya no solo tiene normas de arquitectura/construcción; ahora también tiene un enforcement mínimo explícito para continuidad entre sesiones e IAs
  - un slice relevante ya no debería considerarse cerrado si el repo, la memoria viva y el gate de release no cuentan la misma historia
- siguiente paso:
  - usar este paquete de enforcement como base del siguiente frente del roadmap: hardening post-deploy y observabilidad tenant

## 2026-04-20 - Revalidación adicional de tenants activos y corrección final del drift real en production

- objetivo:
  - comprobar que el estado tenant seguía realmente sano antes de seguir con el hardening del roadmap
  - corregir cualquier drift real detectado sin reabrir trabajo ya cerrado de forma ficticia
- diagnóstico:
  - `staging` ya estaba sano `4/4`
  - en `production`, `ieris-ltda` no estaba roto; el único fallo real era `condominio-demo` por drift de credenciales DB técnicas
- cambios y acciones ejecutadas:
  - rotación canónica de credenciales DB tenant para `condominio-demo` en `production`
  - rerun en `production` de:
    - `sync_active_tenant_schemas.py --limit 100`
    - `seed_missing_tenant_defaults.py --apply`
    - `repair_maintenance_finance_sync.py --all-active --limit 100`
    - `audit_active_tenant_convergence.py --all-active --limit 100`
- validaciones:
  - `staging`:
    - `audit_active_tenant_convergence.py --all-active --limit 100` -> `processed=4`, `warnings=0`, `failed=0`
  - `production`:
    - `sync_active_tenant_schemas.py --limit 100` -> `processed=4`, `synced=4`, `failed=0`
    - `seed_missing_tenant_defaults.py --apply` -> `processed=4`, `changed=3`, `failed=0`
    - `repair_maintenance_finance_sync.py --all-active --limit 100` -> `processed=4`, `failed=0`
    - `audit_active_tenant_convergence.py --all-active --limit 100` -> `processed=4`, `warnings=0`, `failed=0`
- resultado:
  - todos los tenants activos quedan operativos y funcionales en ambos ambientes
  - se confirma con evidencia que el incidente no era `ieris-ltda`; era drift tenant-local en `condominio-demo` de `production`
- siguiente paso:
  - seguir el roadmap central con hardening post-deploy y observabilidad tenant

## 2026-04-20 - Paquete normativo adicional para continuidad entre sesiones e IAs

- objetivo:
  - complementar la institucionalización previa de `Gobernanza de datos + SRED` con normas concretas de construcción, arquitectura, contratos, entornos y pruebas
  - dejar un marco reutilizable para que otra IA o sesión futura pueda continuar sin depender solo de memoria viva
- cambios y acciones ejecutadas:
  - se agrega el estándar de ADRs:
    - [docs/architecture/adr/README.md](/home/felipe/platform_paas/docs/architecture/adr/README.md)
    - [docs/architecture/adr/TEMPLATE.md](/home/felipe/platform_paas/docs/architecture/adr/TEMPLATE.md)
  - se agrega [api-contract-standard.md](/home/felipe/platform_paas/docs/architecture/api-contract-standard.md) como política formal de contratos API
  - se agrega [schema-and-migration-policy.md](/home/felipe/platform_paas/docs/architecture/schema-and-migration-policy.md) como política de cambios estructurales, migraciones y backfills
  - se agrega [environment-policy.md](/home/felipe/platform_paas/docs/architecture/environment-policy.md) como política explícita para `development`, `staging` y `production`
  - se agrega [e2e-test-data-policy.md](/home/felipe/platform_paas/docs/architecture/e2e-test-data-policy.md) como norma de tenants permitidos/prohibidos, naming y cleanup de pruebas
  - se enlaza el paquete desde:
    - [docs/architecture/index.md](/home/felipe/platform_paas/docs/architecture/index.md)
    - [implementation-governance.md](/home/felipe/platform_paas/docs/architecture/implementation-governance.md)
    - [development-roadmap.md](/home/felipe/platform_paas/docs/architecture/development-roadmap.md)
    - [PROJECT_CONTEXT.md](/home/felipe/platform_paas/PROJECT_CONTEXT.md)
    - [PROMPT_MAESTRO_MODULO.md](/home/felipe/platform_paas/PROMPT_MAESTRO_MODULO.md)
    - [CHECKLIST_CIERRE_ITERACION.md](/home/felipe/platform_paas/CHECKLIST_CIERRE_ITERACION.md)
    - [REGLAS_IMPLEMENTACION.md](/home/felipe/platform_paas/REGLAS_IMPLEMENTACION.md)
- validaciones:
  - revisión de referencias cruzadas entre reglas, contexto, roadmap y arquitectura
  - limpieza de numeración duplicada en `REGLAS_IMPLEMENTACION.md`
- resultado:
  - la PaaS ya tiene un paquete normativo completo para continuidad:
    - ownership
    - spec mínima
    - ADRs
    - contratos API
    - política de migraciones
    - política de entornos
    - política E2E/datos de prueba
  - otra sesión o IA ya puede retomar con menos ambigüedad sobre cómo construir, cerrar y promover cambios
- siguiente paso:
  - usar este paquete normativo como base del frente siguiente del roadmap: hardening post-deploy, convergencia tenant y observabilidad

## 2026-04-20 - Institucionalización transversal de gobernanza de datos + SRED para toda la PaaS

- objetivo:
  - dejar explícito y operativo que `Gobernanza de datos` y `SRED` aplican a toda la PaaS, no solo a módulos nuevos o a slices puntuales
  - convertir ownership de datos y spec mínima por slice en parte obligatoria del estándar de implementación
  - facilitar que cualquier otra IA o sesión futura continúe trabajo transversal sin ambigüedad sobre ownership, scope ni criterios de cierre
- cambios y acciones ejecutadas:
  - se agrega [data-ownership-matrix.md](/home/felipe/platform_paas/docs/architecture/data-ownership-matrix.md) como matriz operativa por dominio:
    - dueño del dato
    - escritura permitida
    - consumo permitido
    - defaults/seeds relevantes
    - política de baja
  - se agrega [slice-spec-template.md](/home/felipe/platform_paas/docs/architecture/slice-spec-template.md) como plantilla oficial mínima de spec por slice relevante
  - se actualiza el marco transversal en:
    - [implementation-governance.md](/home/felipe/platform_paas/docs/architecture/implementation-governance.md)
    - [data-governance.md](/home/felipe/platform_paas/docs/architecture/data-governance.md)
    - [sred-development.md](/home/felipe/platform_paas/docs/architecture/sred-development.md)
    - [module-build-standard.md](/home/felipe/platform_paas/docs/architecture/module-build-standard.md)
    - [development-roadmap.md](/home/felipe/platform_paas/docs/architecture/development-roadmap.md)
    - [index.md](/home/felipe/platform_paas/docs/architecture/index.md)
  - se integran estas reglas en la capa operativa viva del proyecto:
    - [PROJECT_CONTEXT.md](/home/felipe/platform_paas/PROJECT_CONTEXT.md)
    - [PROMPT_MAESTRO_MODULO.md](/home/felipe/platform_paas/PROMPT_MAESTRO_MODULO.md)
    - [REGLAS_IMPLEMENTACION.md](/home/felipe/platform_paas/REGLAS_IMPLEMENTACION.md)
    - [CHECKLIST_CIERRE_ITERACION.md](/home/felipe/platform_paas/CHECKLIST_CIERRE_ITERACION.md)
- validaciones:
  - revisión de consistencia de enlaces y referencias cruzadas entre arquitectura, contexto y reglas operativas
  - validación posterior de memoria viva y `HANDOFF_STATE.json`
- resultado:
  - la PaaS deja de depender solo de memoria narrativa y pasa a tener:
    - ownership explícito por dominio
    - spec mínima oficial por slice relevante
    - criterio `SRED` aplicado como estándar transversal
  - esto queda aplicable a:
    - `platform-core`
    - `business-core`
    - `maintenance`
    - `finance`
    - `agenda`
    - defaults, seeds, imports, exports, portabilidad, convergencia multi-tenant y promoción por ambiente
- siguiente paso:
  - ejecutar el próximo frente del roadmap (`hardening` transversal de convergencia post-deploy y observabilidad tenant) ya bajo este estándar formal

## 2026-04-20 - Revalidación tenant real por ambiente y cierre del falso negativo sobre ieris-ltda

- objetivo:
  - revisar todos los tenants activos después del reporte visual en `Platform Admin -> Tenants`
  - dejar `production` y `staging` operativos y funcionales para todos los tenants activos
  - corregir la memoria viva para no seguir atribuyendo a `ieris-ltda` una caída que en runtime no existía
- diagnóstico:
  - la primera alarma sobre `ieris-ltda` resultó ser un falso negativo de tooling local
  - al ejecutar scripts del repo contra `.env` runtime sin `set -a`, `TENANT_SECRETS_FILE` no quedó exportado y el proceso terminó leyendo `/home/felipe/platform_paas/.tenant-secrets.env` en vez del archivo runtime real
  - con el entorno correctamente exportado, la auditoría real mostró:
    - `production`:
      - `condominio-demo`: roto por `password authentication failed`
      - `empresa-bootstrap`: OK
      - `empresa-demo`: OK
      - `ieris-ltda`: OK
    - `staging`:
      - `condominio-demo`: roto por `password authentication failed`
      - resto de tenants activos: OK
- cambios y acciones ejecutadas:
  - rotación DB tenant canónica de `condominio-demo` en `production`
  - rerun de convergencia completa en `production`:
    - `sync_active_tenant_schemas.py --limit 100`
    - `seed_missing_tenant_defaults.py --apply`
    - `repair_maintenance_finance_sync.py --all-active --limit 100`
    - `audit_active_tenant_convergence.py --all-active --limit 100`
  - rotación DB tenant canónica de `condominio-demo` en `staging`
  - rerun equivalente de convergencia completa en `staging`
  - limpieza posterior de scripts temporales de diagnóstico/rotación usados solo para esta iteración
- validaciones:
  - `production` final:
    - `sync_active_tenant_schemas.py` -> `processed=4`, `synced=4`, `failed=0`
    - `seed_missing_tenant_defaults.py --apply` -> `processed=4`, `changed=4`, `failed=0`
    - `repair_maintenance_finance_sync.py --all-active --limit 100` -> `processed=4`, `failed=0`
    - `audit_active_tenant_convergence.py --all-active --limit 100` -> `processed=4`, `warnings=0`, `failed=0`
  - `staging` final:
    - `sync_active_tenant_schemas.py` -> `processed=4`, `synced=4`, `failed=0`
    - `seed_missing_tenant_defaults.py --apply` -> `processed=4`, `changed=2`, `failed=0`
    - `repair_maintenance_finance_sync.py --all-active --limit 100` -> `processed=4`, `failed=0`
    - `audit_active_tenant_convergence.py --all-active --limit 100` -> `processed=4`, `warnings=0`, `failed=0`
- resultado:
  - todos los tenants activos vuelven a quedar operativos y funcionales en ambos ambientes
  - `ieris-ltda` queda explícitamente marcado como tenant sano en runtime; el problema real del incidente era `condominio-demo`
  - se institucionaliza la regla operativa:
    - al ejecutar scripts del repo con `.env` runtime, usar siempre `set -a` antes de `source`
    - un diagnóstico tenant no se considera fiable si `TENANT_SECRETS_FILE` no quedó exportado
- siguiente paso:
  - seguir el roadmap central sobre hardening transversal, ahora con la lección operativa de exportación de entorno incorporada como regla

## 2026-04-19 - Agenda tenant-side separada de Mantenciones y promovida como módulo lateral propio

- objetivo:
  - sacar `Agenda` del subnav interno de `Mantenciones`
  - dejar `Agenda` como módulo más dentro de la barra lateral tenant
  - mantener la agenda actual operativa usando como primera fuente el calendario de `maintenance`, sin duplicar lógica
- cambios y acciones ejecutadas:
  - [TenantSidebarNav.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/layout/TenantSidebarNav.tsx) agrega la entrada lateral `Agenda`
  - [module-visibility.ts](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/utils/module-visibility.ts) incorpora la sección `agenda`, visible hoy cuando `maintenance` está habilitado
  - [AppRouter.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/routes/AppRouter.tsx) agrega la ruta tenant-side `tenant-portal/agenda`
  - [TenantAgendaPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/pages/agenda/TenantAgendaPage.tsx) crea la página wrapper de agenda general
  - [MaintenanceCalendarPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceCalendarPage.tsx) soporta `renderAsGlobalAgenda` para reutilizar el calendario de mantenciones en modo transversal
  - [MaintenanceModuleNav.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceModuleNav.tsx) elimina `Agenda` del submódulo `maintenance`
- validaciones:
  - `cd frontend && npm run build` -> `OK`
  - build production:
    - `API_BASE_URL=https://orkestia.ddns.net RUN_NPM_INSTALL=false bash deploy/build_frontend.sh` -> `OK`
  - build staging:
    - `API_BASE_URL=http://192.168.7.42:8081 ALLOW_STAGING_API=1 RUN_NPM_INSTALL=false bash deploy/build_frontend.sh` -> `OK`
  - publicación real en runtimes:
    - `production`: `/opt/platform_paas/frontend/dist`
    - `staging`: `/opt/platform_paas_staging/frontend/dist`
  - assets publicados verificados:
    - `TenantAgendaPage-*.js`
    - `MaintenanceCalendarPage-*.js`
- resultado:
  - `Agenda` ya aparece como módulo lateral propio del portal tenant
  - `Mantenciones` ya no expone `Agenda` dentro de su navegación interna
  - la agenda general queda lista para sumar eventos de otros módulos más adelante sin volver a mover la navegación principal
- siguiente paso:
  - seguir el roadmap central sobre hardening transversal y observabilidad tenant

## 2026-04-19 - Saneamiento multi-tenant por ambiente para dejar todos los tenants activos operativos

- objetivo:
  - corregir el incidente visible en `Platform Admin -> Tenants` y `tenant-portal/login` donde `ieris-ltda` aparecía como no disponible por problema operativo
  - revisar todos los tenants activos reales y no solo el tenant reportado
  - dejar `production` y `staging` otra vez en `4/4` tenants activos auditados en verde
- diagnóstico:
  - `production` auditado inicialmente con:
    - `condominio-demo`: `password authentication failed`
    - `ieris-ltda`: `password authentication failed`
    - resumen: `processed=4`, `warnings=0`, `failed=2`
  - `staging` auditado inicialmente con el mismo patrón:
    - `condominio-demo`: `password authentication failed`
    - `ieris-ltda`: `password authentication failed`
    - resumen: `processed=4`, `warnings=0`, `failed=2`
  - la causa real no era un bug funcional de `maintenance` o `finance`, sino drift tenant-local de credenciales DB técnicas
- cambios y acciones ejecutadas:
  - rotación de credenciales DB tenant desde el servicio canónico [tenant_service.py](/home/felipe/platform_paas/backend/app/apps/platform_control/services/tenant_service.py) en `production` para:
    - `condominio-demo`
    - `ieris-ltda`
  - rerun completo en `production`:
    - `sync_active_tenant_schemas.py --limit 100`
    - `seed_missing_tenant_defaults.py --apply`
    - `repair_maintenance_finance_sync.py --all-active --limit 100`
    - `audit_active_tenant_convergence.py --all-active --limit 100`
  - rotación equivalente en `staging` para:
    - `condominio-demo`
    - `ieris-ltda`
  - rerun completo en `staging` con el mismo set de scripts
- validaciones:
  - `production` final:
    - `sync_active_tenant_schemas.py` -> `processed=4`, `synced=4`, `failed=0`
    - `seed_missing_tenant_defaults.py --apply` -> `processed=4`, `changed=3`, `failed=0`
    - `repair_maintenance_finance_sync.py --all-active --limit 100` -> `processed=4`, `failed=0`
    - `audit_active_tenant_convergence.py --all-active --limit 100` -> `processed=4`, `warnings=0`, `failed=0`
  - `staging` final:
    - `sync_active_tenant_schemas.py` -> `processed=4`, `synced=4`, `failed=0`
    - `seed_missing_tenant_defaults.py --apply` -> `processed=4`, `changed=3`, `failed=0`
    - `repair_maintenance_finance_sync.py --all-active --limit 100` -> `processed=4`, `failed=0`
    - `audit_active_tenant_convergence.py --all-active --limit 100` -> `processed=4`, `warnings=0`, `failed=0`
- resultado:
  - `condominio-demo`, `empresa-bootstrap`, `empresa-demo` e `ieris-ltda` vuelven a quedar operativos en ambos ambientes
  - el incidente reportado por el usuario en `ieris-ltda` queda cerrado
  - el siguiente frente del roadmap ya no es corregir tenants caídos, sino endurecer el hardening transversal de convergencia post-deploy
- siguiente paso:
  - abrir el siguiente corte del roadmap en `platform-core` para automatizar mejor la detección y recuperación de drift tenant-local

## 2026-04-19 - Cierre del slice atómico maintenance -> finance con close-with-costs

- objetivo:
  - eliminar el drift residual entre guardar costo real, cerrar la OT y sincronizar Finanzas
  - dejar un flujo único para `Cerrar con costos` dentro del módulo de `maintenance`
- cambios principales:
  - [transaction_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/services/transaction_service.py) ahora soporta `commit=False` en `create_transaction(...)` y `update_transaction(...)`
  - [costing_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/services/costing_service.py) agrega `close_with_costs(...)` y propaga `commit=False` / `trigger_auto_sync=False` en pasos intermedios
  - [costing.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/schemas/costing.py) agrega `MaintenanceCloseWithCostsRequest`
  - [costing.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/api/costing.py) expone `POST /tenant/maintenance/work-orders/{id}/close-with-costs`
  - [costingService.ts](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/services/costingService.ts) agrega `closeTenantMaintenanceWorkOrderWithCosts(...)`
  - [MaintenanceCostingModal.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceCostingModal.tsx) pasa a usar una sola llamada atómica al confirmar `Cerrar con costos`
- validaciones:
  - `PYTHONPATH=/home/felipe/platform_paas/backend ./platform_paas_venv/bin/python -m unittest backend.app.tests.test_maintenance_costing_service` -> `15 tests OK`
  - `cd frontend && npm run build` -> `OK`
  - backend `staging`: `deploy_backend_staging.sh` -> `527 tests OK` con warning de convergencia por `condominio-demo`
  - backend `production`: `deploy_backend_production.sh` -> `527 tests OK`
  - frontend publicado en:
    - `/opt/platform_paas_staging/frontend/dist`
    - `/opt/platform_paas/frontend/dist`
- resultado:
  - `Cerrar con costos` ya no depende de defaults ciegos ni de requests separados para guardar costo, cerrar OT y sincronizar Finanzas
  - `production` queda sano y promovido para este slice
  - `staging` queda con código/UI correctos, pero pendiente de rerun de convergencia tenant-local antes de dar el ambiente por cerrado otra vez
- siguiente paso:
  - reparar `condominio-demo` en `staging` y rerun de convergencia
  - luego endurecer el preview financiero previo al cierre

## 2026-04-17 - Cierre del subcorte maintenance -> finance: salud visible del vínculo financiero y UX más clara de egreso

- objetivo:
  - cerrar el siguiente ajuste fino real entre `maintenance` y `finance` sin abrir un módulo nuevo
  - dejar visible desde `Historial técnico` si el ingreso/egreso vinculado quedó conciliado, anulado o incompleto
  - reforzar en la UX del costeo qué líneas sí salen a egreso y cuáles no
- cambios principales:
  - [history.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/schemas/history.py) extiende `MaintenanceHistoryFinanceSummaryResponse` con estado financiero detallado:
    - `income_is_reconciled`
    - `expense_is_reconciled`
    - `income_is_voided`
    - `expense_is_voided`
    - `income_has_account`
    - `expense_has_account`
    - `income_has_category`
    - `expense_has_category`
  - [history_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/maintenance/services/history_service.py) cruza OT cerradas con `finance_transactions` reales para enriquecer `finance_summary`
  - [MaintenanceHistoryPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceHistoryPage.tsx) ahora muestra en historial:
    - `Finance conciliada`
    - `Finance anulada`
    - `Finance incompleta`
    - `Finance pendiente`
    - además del detalle por ingreso/egreso cuando existe el vínculo
  - [MaintenanceCostingModal.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceCostingModal.tsx) refuerza la lectura de líneas que sí/no salen a egreso
- validaciones:
  - `python3 -m py_compile backend/app/apps/tenant_modules/maintenance/services/history_service.py backend/app/apps/tenant_modules/maintenance/api/history.py backend/app/apps/tenant_modules/maintenance/schemas/history.py` -> `OK`
  - `cd frontend && npm run build` -> `OK`
  - frontend publicado en:
    - `/opt/platform_paas_staging/frontend/dist`
    - `/opt/platform_paas/frontend/dist`
- resultado:
  - `Historial técnico` ya no solo dice si hubo sync financiero; también deja visible la salud operativa del vínculo con Finanzas
  - el operador puede distinguir si una mantención quedó conciliada, anulada o incompleta sin salir del flujo de mantenimiento
  - el subcorte queda promovido a `staging` y `production`
- siguiente paso:
  - evaluar si conviene un endpoint atómico `close-with-costs`
  - seguir endureciendo la UX del cierre financiero por línea y el preview de impacto antes del cierre

## 2026-04-17 - Cierre del subcorte finance summary: Resultado neto + Saldo total en cuentas desde backend

- objetivo:
  - corregir la semántica de la cabecera de `Finanzas` para que el operador distinga claramente entre neto operativo y caja disponible
  - dejar de depender solo de composición frontend para el total de saldos por cuenta
  - promover el cambio completo a `staging` y `production`
- cambios principales:
  - [transaction_service.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/services/transaction_service.py) extiende `get_summary()` y pasa a entregar:
    - `net_result`
    - `total_account_balance`
    - `balance` solo como alias backward-compatible del neto
  - [transaction.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/schemas/transaction.py) extiende `FinanceSummaryData` con ambos campos nuevos
  - [FinanceTransactionsPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/finance/pages/FinanceTransactionsPage.tsx) deja la cabecera así:
    - `Resultado neto`
    - `Saldo total en cuentas`
  - [TenantFinancePageLegacy.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/pages/finance/TenantFinancePageLegacy.tsx) renombra la lectura legacy a `Resultado neto`
  - `Saldo total en cuentas` se calcula en backend con la misma semántica de balances por cuenta:
    - respeta `opening_balance`
    - suma ingresos
    - resta egresos
    - contempla transferencias
    - excluye cuentas con `is_balance_hidden`
    - si hay monedas visibles mixtas, suma solo las cuentas en moneda base
- validaciones:
  - `PYTHONPATH=backend ./platform_paas_venv/bin/python -m unittest backend.app.tests.test_tenant_finance_flow backend.app.tests.test_finance_transaction_core` -> `80 tests OK`
  - `bash deploy/deploy_backend_staging.sh` -> `527 tests OK`
  - `bash deploy/deploy_backend_production.sh` -> `527 tests OK`
  - `bash deploy/build_frontend.sh` -> `OK`
  - publicación frontend en:
    - `/opt/platform_paas_staging/frontend/dist`
    - `/opt/platform_paas/frontend/dist`
  - readiness local del build:
    - `EXPECTED_API_BASE_URL=https://orkestia.ddns.net bash deploy/check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias`
- resultado:
  - `Finanzas` ya no mezcla bajo una misma etiqueta dos lecturas diferentes
  - la caja disponible queda representada por `Saldo total en cuentas`
  - el neto operativo queda representado por `Resultado neto`
  - el cálculo de saldo total ya vive en backend y no depende solo del estado frontend
- siguiente paso:
  - seguir con el siguiente ajuste fino de `maintenance -> finance`, especialmente la UX de líneas que sí/no salen a egreso y la evaluación de un cierre atómico `close-with-costs`

## 2026-04-16 - Cierre del incidente finance attachments en ieris-ltda por drift repo/runtime

- objetivo:
  - corregir el error `Internal server error` al subir adjuntos en `Finanzas -> Transacciones` dentro de `ieris-ltda`
  - validar si el fallo era tenant-local, de permisos o de runtime backend desalineado
- cambios principales:
  - se confirmó con repro HTTP real que `POST /tenant/finance/transactions/{id}/attachments` fallaba en `production` con `500`
  - se confirmó en el journal productivo que la excepción real era `PermissionError`
  - la causa fue drift runtime:
    - el repo ya tenía [settings.py](/home/felipe/platform_paas/backend/app/common/config/settings.py) apuntando a `BASE_DIR / "storage" / "finance_attachments"`
    - `production` seguía ejecutando un `settings.py` viejo en `/opt/platform_paas/backend/app/common/config/settings.py` que usaba la ruta legacy bajo `apps/tenant_modules/finance/storage/attachments`
  - se promovió el backend real desde repo hacia:
    - `/opt/platform_paas/backend`
    - `/opt/platform_paas_staging/backend`
  - luego se redeployó backend en ambos ambientes
- validaciones:
  - `bash deploy/deploy_backend_production.sh` -> `527 tests OK`
  - `bash deploy/deploy_backend_staging.sh` -> `527 tests OK`
  - verificación runtime en `production`:
    - `FINANCE_ATTACHMENTS_DIR=/opt/platform_paas/storage/finance_attachments`
    - `MAINTENANCE_EVIDENCE_DIR=/opt/platform_paas/storage/maintenance_evidence`
  - repro HTTP real posterior en `production`:
    - `POST /tenant/finance/transactions/19/attachments` -> `200 OK`
    - `GET /tenant/finance/transactions/19` -> `attachment_count=1`
  - limpieza posterior:
    - `DELETE /tenant/finance/transactions/19/attachments/2` -> `Adjunto de transaccion eliminado correctamente`
- resultado:
  - `ieris-ltda` volvió a permitir upload de archivos en transacciones financieras
  - el incidente no era de datos tenant ni de frontend; era backend runtime desactualizado
  - queda reforzada la regla operativa:
    - corregir en repo no basta
    - hay que promover a runtime y redeployar antes de dar un fix backend por cerrado
- siguiente paso:
  - mantener la promoción repo -> runtime como parte explícita de los incidentes backend hasta automatizar completamente ese tramo del deploy

## 2026-04-15 - Saneamiento del historial técnico en ieris-ltda con tipo, grupo y responsable

- objetivo:
  - dejar de mostrar campos vacíos en `Historial técnico` cuando el tenant ya tiene un responsable operativo y un grupo definidos
  - permitir que esos campos puedan editarse desde la UI y no solo por script
  - completar el histórico cerrado de `ieris-ltda` con:
    - usuario `Felipe Hormazabal`
    - grupo `Instalación/Mantención SST`
    - tipo de tarea `mantencion`
- cambios principales:
  - `crear/editar mantención` ya expone en frontend:
    - `Tipo de tarea`
    - `Grupo/líder`
    - `Líder responsable`
  - `Historial técnico -> Editar cierre` ahora expone:
    - `Tipo de tarea`
    - `Grupo responsable`
    - `Responsable`
  - se aplica la migración tenant [v0038_maintenance_work_order_task_type.py](/home/felipe/platform_paas/backend/migrations/tenant/v0038_maintenance_work_order_task_type.py) sobre `ieris-ltda`
  - se ejecuta [backfill_historical_maintenance_assignments.py](/home/felipe/platform_paas/backend/app/scripts/backfill_historical_maintenance_assignments.py) sobre `production / ieris-ltda`
- validaciones:
  - `cd backend && PYTHONPATH=/home/felipe/platform_paas/backend /home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest app.tests.test_migration_flow app.tests.test_maintenance_work_order_service app.tests.test_maintenance_due_item_service` -> `42 tests OK`
  - `cd frontend && npm run build` -> `OK`
  - `production / ieris-ltda`:
    - `sync_active_tenant_schemas.py --slug ieris-ltda --limit 1` -> `synced -> 0038_maintenance_work_order_task_type`
    - `backfill_historical_maintenance_assignments.py ... --apply` -> `completed_rows=114`, `updated_group_user_rows=114`, `updated_task_type_rows=114`
    - verificación final:
      - `completed=114`
      - `group_5=114`
      - `user_1=114`
      - `task_1=114`
  - frontend republicado en:
    - `staging`
    - `production`
- resultado:
  - `ieris-ltda` ya no queda con históricos cerrados mostrando `Sin grupo`, `Sin responsable` y `Sin tipo` cuando la operación ya definió un estándar concreto
  - el operador puede mantener estos campos desde la UI en nuevas OT y al corregir cierres históricos
- extensión posterior del mismo corte:
  - [backfill_historical_maintenance_assignments.py](/home/felipe/platform_paas/backend/app/scripts/backfill_historical_maintenance_assignments.py) ahora soporta barrido seguro multi-tenant con:
    - `--all-active`
    - `--skip-missing`
    - `--limit`
  - `dry_run` real en `production` sobre tenants activos:
    - `processed=4`
    - `skipped=3`
    - `failed=0`
    - solo `ieris-ltda` era compatible con ese usuario/grupo y ya estaba convergido
    - `empresa-demo`, `condominio-demo` y `empresa-bootstrap` quedaron omitidos porque no contienen al usuario `Felipe Hormazabal`
- siguiente paso:
  - revisar si hace falta un backfill equivalente sobre otros tenants activos o dejarlo solo como herramienta operativa por tenant
- extensión posterior del mismo corte:
  - se investiga el bug visible en `Mantenciones abiertas` donde `Tipo de tarea` parecía no persistir en `ieris-ltda`
  - validación dura sobre `production`:
    - `maintenance_work_orders` abiertas reales: `#345` y `#1`
    - ambas con `task_type_id=1`
    - inspección del mismo servicio backend que usa la API confirma:
      - `row 345 ... task_type_id=1`
      - `row 1 ... task_type_id=1`
  - conclusión:
    - persistencia tenant correcta
    - serialización backend correcta
    - drift acotado a frontend/runtime/caché
  - corrección operativa aplicada:
    - se endurece [api.ts](/home/felipe/platform_paas/frontend/src/services/api.ts) con `cache: "no-store"` para requests JSON y descargas
    - republicación limpia de `frontend/dist` en `production`
    - republicación limpia de `frontend/dist` en `staging`
    - verificación posterior de que ambos ambientes sólo sirven bundles nuevos del slice:
      - `MaintenanceWorkOrdersPage-Bq-bFLV_.js`
      - `workOrdersService-4F4QAAFP.js`
      - `index-DzUPjfrU.js`
      - `index-Ci9PWeRu.css`
  - cierre confirmado:
    - el usuario valida en runtime real que:
      - `Tipo de tarea` ya cambia correctamente
      - `mantencion` viene por defecto en `Mantenciones abiertas`
      - ese comportamiento es correcto y se da por cerrado

## 2026-04-14 - Corrección de alta masiva anual desde instalaciones activas sin plan preventivo

- objetivo:
  - evitar crear una a una las programaciones para instalaciones activas sin cobertura preventiva
  - dejar una acción masiva coherente con la regla corregida: solo crear plan si la instalación ya tiene una mantención cerrada en 2026
- cambios principales:
  - [MaintenanceDueItemsPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceDueItemsPage.tsx) cambia la acción masiva a `Crear planes desde historial anual`
  - el frontend ya no usa fallback a “un año desde hoy”; si la sugerencia backend no viene desde `history_completed_this_year`, no crea la programación
  - [create_annual_schedules_for_uncovered_installations.py](/home/felipe/platform_paas/backend/app/scripts/create_annual_schedules_for_uncovered_installations.py) replica la misma regla en backend:
    - solo crea si `suggest_schedule_seed(...).source == history_completed_this_year`
    - si no hay historial útil del año, deja la instalación como `skipped`
  - se agrega [remove_auto_schedules_without_2026_history.py](/home/felipe/platform_paas/backend/app/scripts/remove_auto_schedules_without_2026_history.py) para deshacer la siembra incorrecta ya aplicada en `ieris-ltda`
- validaciones:
  - `python3 -m py_compile backend/app/scripts/create_annual_schedules_for_uncovered_installations.py backend/app/scripts/remove_auto_schedules_without_2026_history.py` -> `OK`
  - `cd frontend && npm run build` -> `OK`
  - cleanup real sobre `production / ieris-ltda`:
    - `dry_run`: `schedules_detected=126`, `due_items_detected=0`
    - `apply`: `schedules_detected=126`, `due_items_detected=0`
  - verificación posterior con la regla corregida:
    - `dry_run` real en `production / ieris-ltda`: `uncovered_detected=126`, `created=0`, `skipped=126`, `failed=0`
- resultado:
  - la capacidad masiva queda permanente para todos los tenants, pero solo para instalaciones con mantención cerrada en 2026
  - se deshizo el comportamiento incorrecto que creaba planes sin historial útil del año
  - en `ieris-ltda` se eliminaron `126` programaciones automáticas inválidas creadas por la regla anterior
- siguiente paso:
  - si hace falta, agregar un resumen previo tipo `N elegibles -> N planes` o confirmación modal antes del alta masiva

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

# 2026-04-14 - Planes preventivos anuales masivos por instalación

- registro histórico de la primera aplicación operativa:
  - `dry_run` real en `production` para `ieris-ltda`: `uncovered_detected=198`
  - `apply` real en `production` para `ieris-ltda`: `created=198`, `failed=0`
- este corte quedó posteriormente corregido por la iteración superior `Corrección de alta masiva anual...`:
  - la regla “si no existe historial útil, fija próxima mantención a un año desde hoy” se declaró inválida
  - las programaciones creadas sin mantención cerrada en 2026 fueron removidas con cleanup explícito
  - la regla vigente ya no debe leerse desde esta entrada histórica, sino desde la corrección posterior

# 2026-04-15 - Default task_type en OT abiertas

- objetivo:
  - corregir la creación/edición de `Mantenciones abiertas` y `Agenda` para que el tipo de tarea no nazca vacío dentro del módulo
- diagnóstico:
  - backend ya soportaba y persistía `task_type_id`, `assigned_work_group_id` y `assigned_tenant_user_id`
  - el problema principal estaba en frontend:
    - `MaintenanceWorkOrdersPage` creaba nuevas OT con `task_type_id = null`
    - `MaintenanceCalendarPage` creaba nuevas OT con `task_type_id = null`
  - por eso en edición parecía que el dato “no se traía”, cuando en realidad se había guardado vacío
- cambios principales:
  - [MaintenanceWorkOrdersPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceWorkOrdersPage.tsx) ahora resuelve `mantencion` como task type default si existe en el catálogo tenant
  - [MaintenanceCalendarPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceCalendarPage.tsx) aplica el mismo default
  - al editar OT abiertas sin tipo guardado, ambos formularios precargan `mantencion` como fallback operativo
  - [backfill_open_maintenance_task_type.py](/home/felipe/platform_paas/backend/app/scripts/backfill_open_maintenance_task_type.py) agregado para sanear OT abiertas existentes con `task_type_id = null`
- validaciones:
  - `npm run build`: `OK`
  - publish frontend `staging`: `OK`
  - publish frontend `production`: `OK`
  - `production/ieris-ltda` backfill correctivo aplicado sobre OT abiertas `#1` y `#345`
  - verificación final: `open_rows_without_task_type = 0`
- corrección adicional del mismo corte:
  - `Fecha y hora programada` en editar OT quedaba visualmente vacía aunque la orden sí tenía `scheduled_for`
  - causa real: el input `datetime-local` no aceptaba el formato backend sin normalización previa
  - se normaliza el valor a `YYYY-MM-DDTHH:MM` en:
    - [MaintenanceWorkOrdersPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceWorkOrdersPage.tsx)
    - [MaintenanceCalendarPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceCalendarPage.tsx)
- corrección adicional del mismo corte:
  - la base en `production/ieris-ltda` ya persistía `task_type_id=1` para las OT abiertas corregidas, pero la fila seguía mostrando `Sin tipo` justo después del save
  - causa real: la grilla esperaba al `loadData()` posterior para repintar y no hacía `upsert` inmediato con la respuesta del `PUT/POST`
  - se agrega `upsertWorkOrderRow(...)` en:
    - [MaintenanceWorkOrdersPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceWorkOrdersPage.tsx)
    - [MaintenanceCalendarPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceCalendarPage.tsx)
  - resultado esperado: tras guardar, la fila debe reflejar de inmediato `mantencion` sin depender de un segundo refresco manual
- corrección adicional del mismo corte:
  - el default `mantencion` quedó demasiado agresivo y pasó a usarse también para leer/normalizar órdenes existentes
  - eso podía enmascarar un cambio manual a otro `task_type_id`, porque la fila y la edición se rehidrataban con el fallback del módulo
  - se restringe el default `mantencion` exclusivamente al alta nueva
  - la lectura/edición de OT existentes vuelve a usar solo el `task_type_id` persistido real
  - se agrega cobertura backend en [test_maintenance_work_order_service.py](/home/felipe/platform_paas/backend/app/tests/test_maintenance_work_order_service.py) para asegurar que `update_work_order(...)` persiste un cambio directo de tipo de tarea
