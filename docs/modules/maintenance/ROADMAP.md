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
- `visits` ya son editables desde agenda técnica base

Pendiente inmediato de esta fase:

- usar `work_groups`, `function_profiles` y `task_types` de forma más profunda
- mejorar lectura operacional de historial
- endurecer y ejecutar importadores desde `ieris_app`
- agenda visual con conflictos y reprogramación más rica

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
- trazabilidad de cambios

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

## Mejoras de producto recomendadas

- asociar mantencion a instalacion especifica
- timeline tecnico por cliente
- estados mas expresivos que `pendiente` y `realizada`
- ficha lateral con contexto completo del cliente y del equipo
- cierre con evidencia y checklist
- reprogramacion clara sin perder historial

## Riesgos

- mezclar demasiado pronto expediente tecnico dentro del modulo base
- arrastrar el patron fuente de “mover a historico” en vez de usar lifecycle
- depender de clientes/tareas/calendario sin definir contratos estables
- traer deuda UX del sistema fuente al tenant portal nuevo

## Siguiente paso recomendado

- aplicar migraciones tenant faltantes en el tenant destino del importador
- validar el importador inicial con `dry-run` y luego `--apply`
- despues integrar agenda visual/reprogramacion con conflictos

## Backlog pendiente visible

- `equipment_types`: backend/frontend base listo
- `installations`: backend/frontend base listo
- `work_orders`: backend/frontend base listo
- `history`: backend/frontend base listo
- `visits`: backend/frontend base listo
- `status_logs` operativos: backend/frontend lectura lista
- integración con agenda visual: pendiente
- evidencias y checklist: pendiente
- importadores legacy: primer corte listo, falta validacion aplicada y endurecimiento

Validacion reciente:

- `dry-run` del importador legacy ya validado contra `kanban_db` -> `empresa-bootstrap`
- el tenant `empresa-bootstrap` ya quedo migrado con:
  - `0015_business_core_base`
  - `0016_maintenance_base`
  - `0017_business_core_taxonomy`
- pendiente inmediato: ejecutar `--apply` sobre el tenant destino final de la migracion
