# ESTADO_ACTUAL

## Última actualización

- fecha: 2026-04-10
- foco de iteración: hotfix real de `tenant data portability` y traspaso de datos funcionales `empresa-demo -> ieris-ltda`
- estado general: el traspaso funcional ya quedó aplicado en producción, y el contrato portable quedó corregido para respetar FKs y constraints únicos del destino

## Resumen ejecutivo en 30 segundos

- `ieris-ltda` ya recibió los datos funcionales de `empresa-demo` usando el flujo portable oficial `functional_data_only`
- el servicio portable tenía dos fallos reales detectados en operación: faltaban tablas soporte por FK y `skip_existing` no cubría constraints únicos de negocio
- ambos fallos ya quedaron corregidos en repo y en `/opt/platform_paas`, con validación backend y servicio productivo reiniciado sano

## Qué ya quedó hecho

- se confirmó el estado real de los tenants productivos:
  - `empresa-demo` id `1`
  - `ieris-ltda` id `212`
- se ejecutó export portable `functional_data_only` desde `empresa-demo`
- se ejecutó `dry_run` y luego `apply` sobre `ieris-ltda`
- el primer `apply` real reveló que faltaba `maintenance_equipment_types` dentro del scope funcional
- el análisis de FKs detectó además dependencias hacia:
  - `finance_beneficiaries`
  - `finance_people`
  - `finance_projects`
- se corrigió el contrato portable para incluir esas tablas soporte
- el segundo `apply` real reveló que `skip_existing` debía considerar constraints únicos además de PK
- se endureció el import para saltar también filas ya existentes por constraints únicos simples o compuestos
- se reintentó el import real y quedó completado
- `ieris-ltda` terminó con estos conteos funcionales principales:
  - `business_organizations`: `204`
  - `business_contacts`: `217`
  - `business_clients`: `191`
  - `business_sites`: `194`
  - `maintenance_equipment_types`: `4`
  - `maintenance_installations`: `192`
  - `maintenance_schedules`: `50`
  - `maintenance_due_items`: `20`
  - `maintenance_work_orders`: `105`
  - `finance_accounts`: `4`
  - `finance_categories`: `40`
  - `finance_currencies`: `2`
  - `finance_transactions`: `191`

## Qué archivos se tocaron

- código backend:
  - `backend/app/apps/platform_control/services/tenant_data_portability_service.py`
  - `backend/app/tests/test_tenant_data_portability_service.py`
- documentación funcional/canónica:
  - `docs/runbooks/tenant-data-portability.md`
  - `docs/modules/platform-core/TENANT_DATA_PORTABILITY_MODEL.md`
  - `docs/modules/platform-core/CHANGELOG.md`
- estado y handoff:
  - `ESTADO_ACTUAL.md`
  - `SIGUIENTE_PASO.md`
  - `SESION_ACTIVA.md`
  - `HANDOFF_STATE.json`
  - `HISTORIAL_ITERACIONES.md`

## Qué decisiones quedaron cerradas

- el flujo correcto para mover datos tenant reales sigue siendo el portable oficial, no copia manual directa entre bases
- `functional_data_only` debe incluir también tablas soporte referenciadas por FK desde tablas funcionales
- `skip_existing` no puede depender solo de PK; también debe respetar constraints únicos de negocio ya presentes en el tenant destino
- `ieris-ltda` ya no requiere una nueva clonación de `empresa-demo` para este corte; el traspaso funcional quedó aplicado

## Qué falta exactamente

- si se quiere seguir con producto, el siguiente frente correcto vuelve a ser `platform-core hardening + E2E` sobre `Provisioning/DLQ`
- si se quiere endurecer aún más portabilidad, el backlog razonable sería:
  - ampliar `dry_run` para detectar colisiones por FK/constraints antes del `apply`
  - agregar smoke o evidencia operativa específica de import tenant realista
- mantener sincronizados repo, `/opt/platform_paas` y `/opt/platform_paas_staging`

## Qué no debe tocarse

- no volver a copiar datos tenant por SQL manual salvo incidente extremo y explícito
- no reabrir el contrato portable para reducir tablas soporte recién corregidas
- no tratar CSV portable como reemplazo del backup técnico `pg_dump`
- no tocar auth, lifecycle tenant o billing por este hotfix

## Validaciones ya ejecutadas

- repo:
  - `python -m unittest app.tests.test_tenant_data_portability_service -v`: `OK (9 tests)`
- producción:
  - mismo `unittest` ejecutado sobre `/opt/platform_paas/backend`: `OK (9 tests)`
  - `systemctl restart platform-paas-backend`: ejecutado
  - `https://orkestia.ddns.net/health`: `OK`
- operación real:
  - verificación de tenants productivos y schema versions: `OK`
  - export real `functional_data_only` desde `empresa-demo`: `OK`
  - `dry_run` real hacia `ieris-ltda`: `OK`
  - `apply` real final hacia `ieris-ltda`: `OK`

## Bloqueos reales detectados

- no queda bloqueo activo en este corte
- el `dry_run` portable todavía no modela todos los fallos que recién aparecen en `apply`; ya se redujo una parte importante, pero aún hay espacio de endurecimiento futuro
- `finance_categories` del destino no quedó con el mismo conteo bruto que el origen porque `skip_existing` consolidó categorías ya existentes por constraint único; esto es esperado y no bloqueó la importación de transacciones

## Mi conclusión

- el objetivo pedido por el usuario ya quedó resuelto: `ieris-ltda` recibió los datos funcionales de `empresa-demo`
- además del movimiento operativo, quedó corregido un bug real del producto en portabilidad tenant
- el siguiente paso correcto vuelve a ser el roadmap central sobre `Provisioning/DLQ`, no seguir abriendo este frente salvo endurecimiento explícito
