# Maintenance Roadmap

Estado actual:

- `Descubrimiento completado, business-core operativo y maintenance en slice_base_live`

Prioridad:

- alta

Motivo:

- es un frente de trabajo diario
- tiene dependencia operativa real para la evolucion del PaaS
- es mejor candidato que `egresos`, porque ese frente ya fue reemplazado por `finance`

## Fase 0. Descubrimiento y congelamiento

Estado:

- `Completado`

Entregables:

- auditoria de backend fuente
- auditoria de frontend fuente
- inventario de endpoints y tablas
- definicion de alcance del primer corte

## Fase 1. Diseno canonico del modulo

Estado:

- `Completado`

Entregables:

- carpeta canonica en `docs/modules/maintenance/`
- decision de naming (`maintenance`)
- definicion de fronteras del modulo
- backlog inicial de mejoras

## Fase 2. Dominio previo requerido

Estado:

- `Completado`

Objetivo:

- abrir `business-core` antes de cerrar `maintenance` como modulo productivo

Alcance:

- clientes
- empresas
- contactos
- sitios
- perfiles funcionales
- grupos de trabajo
- tipos de tarea

Criterio de salida:

- `maintenance` deja de depender de entidades embebidas propias
- existen ids y contratos estables para relacionar work orders, agenda e instalaciones
- hoy ese prerequisito ya quedo cubierto por `business-core`

## Fase 3. Slice base tenant

Estado:

- `En progreso`

Objetivo:

- abrir el modulo dentro del PaaS como slice real

Alcance:

- work orders
- instalaciones
- mantenciones activas
- cierre/anulacion
- historial
- tipos de equipo o activos enlazados al dominio base

Criterio de salida:

- backend tenant operativo
- frontend tenant visible
- migraciones tenant creadas
- pruebas backend minimas
- sin dependencia runtime contra la BD de `ieris_app`

Avance actual:

- modulo frontend/backend ya operativo en primer corte
- migracion tenant `0016_maintenance_base` creada
- tablas iniciales ya definidas:
  - `maintenance_equipment_types`
  - `maintenance_installations`
  - `maintenance_work_orders`
  - `maintenance_visits`
  - `maintenance_status_logs`
- prueba de migraciones validada
- `business-core` ya cubre el prerequisito de taxonomias compartidas
- APIs reales ya disponibles para:
  - `equipment_types`
  - `installations`
  - `work_orders`
- frontend tenant ya conectado a esas tres APIs
- historial tecnico ya visible con `status_logs` y `visits`
- `Mantenciones` ya muestra solo trabajo abierto (`scheduled` / `in_progress`)
- `Historial` ya agrupa trabajo realizado o anulado
- `Resumen` ya muestra ultimas 5 mantenciones realizadas
- `Agenda` ya es una vista mensual de mantenciones abiertas con alta desde calendario

Pendiente inmediato de esta fase:

- usar `function_profiles` y `task_types` de forma más profunda
- mejorar cierre operacional desde historial/ficha
- endurecer y ejecutar importadores desde `ieris_app`
- agenda visual con conflictos, filtros y reprogramación más rica
- abrir programaciones automáticas y bandeja preventiva de vencimientos
- abrir costeo y cobro por orden de trabajo
- primer corte de costeo/cobro por orden de trabajo ya operativo en `Mantenciones`

## Fase 4. Endurecimiento operativo

Estado:

- `Pendiente`

Objetivo:

- que el modulo sirva mejor que la fuente para operacion diaria

Alcance:

- lectura por ficha/orden de trabajo
- mejores estados de ciclo de vida
- agenda integrada
- conflictos visibles de programacion
- snapshot historico mas rico de grupo y tecnico con filtros operativos reales
- trazabilidad de cambios
- alinear todo el modulo con el [Estandar de construccion de modulos](/home/felipe/platform_paas/docs/architecture/module-build-standard.md) hasta cerrar checklist completa
- controles de cierre donde fecha/hora queden congeladas al pasar a historial

## Fase 5. Evidencias y checklist

Estado:

- `Pendiente`

Alcance:

- adjuntos
- checklist tecnico
- observacion de cierre estandarizada
- storage real del modulo

## Fase 6. Extension tecnica

Estado:

- `Pendiente`

Alcance:

- puente con expediente tecnico
- reportes tecnicos
- mejoras moviles para terreno

## Fase 6.5. Programacion preventiva y costeo

Estado:

- `En progreso`

Objetivo:

- pasar de operacion reactiva a preventiva sin romper el slice ya operativo

Alcance:

- `maintenance_schedules`
- `maintenance_due_items`
- bandeja automatica `Pendientes`
- agendamiento desde bandeja hacia `work_orders`
- costeo estimado y real por OT
- sincronizacion controlada hacia `finance`

Documento de referencia:

- [PREVENTIVE_SCHEDULING_AND_COSTING_MODEL.md](/home/felipe/platform_paas/docs/modules/maintenance/PREVENTIVE_SCHEDULING_AND_COSTING_MODEL.md)

Criterio de salida:

- el sistema ya no depende de recordar clientes u organizaciones manualmente para gestionar mantenciones recurrentes
- existe bandeja automatica por vencer / vencidas / gestionadas
- cada OT puede registrar costo estimado, costo real y monto cobrado
- `finance` puede recibir el resultado economico con enlace al origen operativo

Avance actual:

- migracion tenant `0021_maintenance_schedules_and_due_items` creada
- tablas ya versionadas:
  - `maintenance_schedules`
  - `maintenance_due_items`
- `maintenance_work_orders` ya guarda:
  - `schedule_id`
  - `due_item_id`
  - `billing_mode`
- API real ya disponible para:
  - `schedules`
  - `due-items`
- frontend tenant ya muestra la vista `Pendientes`
- desde `Pendientes` ya se puede:
  - crear una programación
  - ver mantenciones preventivas visibles
  - leer la carga agrupada por organización sin perder la acción por cliente/dirección
  - detectar instalaciones activas sin plan preventivo y abrir la creación de programación ya precargada
  - agendar una OT desde el pendiente
- se agrega migración tenant `0022_maintenance_costing_and_finance_sync`
- tablas ya versionadas:
  - `maintenance_cost_estimates`
  - `maintenance_cost_actuals`
- backend ya expone APIs reales para:
  - `GET /tenant/maintenance/work-orders/{id}/costing`
  - `PUT /tenant/maintenance/work-orders/{id}/cost-estimate`
  - `PUT /tenant/maintenance/work-orders/{id}/cost-actual`
  - `POST /tenant/maintenance/work-orders/{id}/finance-sync`
- frontend tenant ya permite desde `Mantenciones`:
  - guardar costo estimado
  - guardar costo real
  - registrar monto cobrado
  - sincronizar manualmente ingreso/egreso hacia `finance`

Pendiente inmediato de esta fase:

- detalle granular por líneas de costo
- decidir si `Costos y cobro` se replica también en `Historial`
- cerrar la sincronización automática opcional por política tenant

## Mejoras de producto recomendadas

- asociar mantencion a instalacion especifica
- timeline tecnico por cliente
- estados mas expresivos que `pendiente` y `realizada`
- ficha lateral con contexto completo del cliente y del equipo
- cierre con evidencia y checklist
- reprogramacion clara sin perder historial
- agrupacion visual por organizacion, pero gestion operativa por cliente/sitio/instalacion
- reporte de clientes con instalacion activa y sin plan de mantencion

## Mejoras futuras no bloqueantes

- contratos de mantencion
- alertas por WhatsApp o email
- asignacion automatica de tecnicos
- IA para estimar costos
- optimizacion de rutas
- scoring de clientes

## Riesgos

- mezclar demasiado pronto expediente tecnico dentro del modulo base
- arrastrar el patron fuente de “mover a historico” en vez de usar lifecycle
- depender de clientes/tareas/calendario sin definir contratos estables
- traer deuda UX del sistema fuente al tenant portal nuevo

## Siguiente paso recomendado

- aplicar migraciones tenant faltantes de `0022` en tenants activos
- decidir el segundo corte del roadmap:
  - líneas de costo
  - sync automática opcional
  - exposición de costeo también en historial

## Backlog pendiente visible

- `equipment_types`: backend/frontend base listo
- `installations`: backend/frontend base listo
- `work_orders`: backend/frontend base listo
- `history`: backend/frontend base listo
- `visits`: backend/frontend base listo
- `status_logs` operativos: backend/frontend lectura lista
- integración con agenda visual: pendiente
- agenda visual mensual base: lista
- modelo canónico de asignacion grupo/usuario: documentado e implementado en primer corte
- modelo canónico de programacion preventiva y costeo: documentado
- evidencias y checklist: pendiente
- importadores legacy: primer corte listo, falta validacion aplicada y endurecimiento

## Checklist de salida del modulo

Antes de considerar `maintenance` como primer corte realmente cerrado, deberia quedar:

- CRUD principal con lectura primero en todas las vistas operativas
- alta y edicion bajo demanda en modal o vista secundaria
- resumen operativo real del modulo
- agenda visual con conflictos
- evidencias y checklist tecnico
- smoke E2E propio del modulo
- documentacion canonica al dia con cambios visibles

Validacion reciente:

- `dry-run` del importador legacy ya validado contra `kanban_db` -> `empresa-bootstrap`
- el tenant `empresa-bootstrap` ya quedo migrado con:
  - `0015_business_core_base`
  - `0016_maintenance_base`
  - `0017_business_core_taxonomy`
- `--apply` ya ejecutado con exito sobre `empresa-bootstrap`
- segunda corrida `dry-run` ya valida idempotencia
- pendiente inmediato: decidir si `empresa-bootstrap` queda como tenant definitivo de operacion o repetir el proceso en otro tenant destino
