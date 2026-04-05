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

- `Completado en primer corte`

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

- endurecer reglas operativas más finas entre `function_profiles`, `task_types` y capacidad del equipo
- endurecer y ejecutar importadores desde `ieris_app`
- agenda visual con conflictos, filtros y reprogramación auditada ya lista; faltan ventanas de visita más finas
- abrir programaciones automáticas y bandeja preventiva de vencimientos
- abrir costeo y cobro por orden de trabajo
- primer corte de costeo/cobro por orden de trabajo ya operativo en `Mantenciones`

## Fase 4. Endurecimiento operativo

Estado:

- `En progreso avanzado`

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

Avance actual:

- `Mantenciones` y `Historial` ya exponen `Ver ficha` como lectura secundaria compartida por OT
- la `Ficha de mantención` ya reúne contexto operativo, fechas clave, cierre técnico, `status_logs` y `visits`
- la trazabilidad detallada se carga bajo demanda, manteniendo el patrón de lectura primero en las bandejas principales
- `Historial` ya puede abrir `Editar cierre` desde esa ficha sin volver editable la programación histórica
- `Mantenciones` ya puede gestionar `Visitas` por OT con ventanas programadas, ejecución real y responsables desde una modal operativa
- `Mantenciones`, `Historial` y la ficha ya leen `Tipo de tarea` desde `maintenance_schedules.task_type_id` y `Perfil funcional` desde membresías reales de `business_work_groups`
- `Mantenciones` y `Visitas` ya validan que técnico y grupo correspondan a una membresía activa y vigente antes de guardar
- `Agenda técnica` ya replica el filtro visual de técnicos por membresía activa dentro del grupo responsable
- `Pendientes`, `Mantenciones`, `Agenda` y `Visitas` ya exigen además `Perfil funcional` declarado cuando la OT preventiva trae `Tipo de tarea`
- el módulo ya soporta un mapa explícito liviano `task_type -> function_profiles` usando la línea `profiles:` dentro de la descripción del `Tipo de tarea`, sin exigir migración nueva
- `Business Core -> Tipos de tarea` ya expone UI para editar esa compatibilidad fina sin obligar al usuario a escribir metadata manual
- `Business Core -> Taxonomías` ya muestra una matriz transversal para revisar la cobertura de compatibilidad entre tipos y perfiles
- conflictos visibles, bloqueo backend `409`, filtros de agenda y reprogramación auditada ya quedaron operativos en el mismo frente de endurecimiento

Pendiente fino de este frente:

- endurecer y formalizar ese mapa explícito en una estructura dedicada cuando el módulo salga de la etapa liviana hoy editada desde UI pero persistida como metadato `profiles:`

## Fase 5. Evidencias y checklist

Estado:

- `Cumplido en primer corte`

Alcance:

- adjuntos
- checklist tecnico
- observacion de cierre estandarizada
- storage real del modulo

Salida ya cubierta:

- `maintenance_work_order_checklist_items` y `maintenance_work_order_evidences`
- modal `Checklist y evidencias` reutilizable en `Mantenciones` y `Historial`
- observacion de cierre estandarizada vía `closure_notes`
- upload, descarga y borrado controlado de evidencias
- storage fisico dedicado configurado con `MAINTENANCE_EVIDENCE_DIR`

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
- el tenant puede optar entre sync `manual` o `auto_on_close` sin bloquear el cierre operativo

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
  - `maintenance_cost_lines`
- backend ya expone APIs reales para:
  - `GET /tenant/maintenance/work-orders/{id}/costing`
  - `PUT /tenant/maintenance/work-orders/{id}/cost-estimate`
  - `PUT /tenant/maintenance/work-orders/{id}/cost-actual`
  - `POST /tenant/maintenance/work-orders/{id}/finance-sync`
- `tenant_info` ya guarda la política de puente `maintenance -> finance`:
  - `maintenance_finance_sync_mode`
  - flags de auto-sync ingreso/egreso
  - cuentas/categorías/moneda por defecto
- frontend tenant ya permite desde `Mantenciones`:
  - guardar costo estimado
  - guardar costo real
  - registrar monto cobrado
  - detallar costo por líneas y derivar resumen automático desde ellas
  - sincronizar manualmente ingreso/egreso hacia `finance`
- se agrega migración tenant `0025_maintenance_schedule_estimate_defaults`
- se agrega migración tenant `0026_maintenance_cost_templates`
- tablas y columnas ya versionadas para el seed preventivo del costeo:
  - `maintenance_schedule_cost_lines`
  - `maintenance_schedules.estimate_target_margin_percent`
  - `maintenance_schedules.estimate_notes`
- nuevas tablas tenant para reutilización interna de costos en `maintenance`:
  - `maintenance_cost_templates`
  - `maintenance_cost_template_lines`
- `Nueva programación` ya permite definir costeo estimado por defecto con múltiples líneas de material, servicio, mano de obra, traslado e indirectos
- `Nueva programación` ahora también permite guardar ese costeo como `Plantilla de costeo de mantención` y volver a aplicarlo en otras programaciones del mismo módulo
- cuando una OT se agenda desde `Pendientes`, el backend ya copia automáticamente esas líneas al `Costeo estimado` inicial de la orden
- `Resumen técnico` ya permite editar la política tenant para:
  - mantener sync manual
  - activar `auto_on_close`
  - fijar defaults de cuentas/categorías/moneda
- al completar una OT, el backend ya intenta el auto-sync cuando la política tenant está activa y configurada
- el auto-sync no bloquea el cierre operativo si la configuración financiera está incompleta
- `Historial` ya reutiliza la misma base de lectura de `Costos y cobro`, pero congelada en modo solo lectura

Pendiente inmediato de esta fase:

- endurecer validaciones concurrentes de conflicto de agenda en backend

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

- enriquecer la reprogramación operativa con visitas y ventanas más finas por terreno
- profundizar la `Ficha de mantención` con snapshots más ricos por cliente, instalación y responsables

## Backlog pendiente visible

- `equipment_types`: backend/frontend base listo
- `installations`: backend/frontend base listo
- `work_orders`: backend/frontend base listo
- `history`: backend/frontend base listo
- `visits`: backend/frontend base listo
- `status_logs` operativos: backend/frontend lectura lista
- integración con agenda visual: en progreso
- agenda visual mensual base: lista
- conflictos visibles en agenda y bandeja abierta: listos en frontend
- bloqueo backend de cruces por instalación/grupo/técnico: listo en primer corte
- filtros operativos por grupo y técnico en agenda mensual: listos
- reprogramación auditada sin perder historial: lista en primer corte
- lectura por ficha/orden de trabajo: lista en primer corte
- gestión base de visitas por OT y ventana operativa: lista en primer corte
- modelo canónico de asignacion grupo/usuario: documentado e implementado en primer corte
- modelo canónico de programacion preventiva y costeo: documentado
- costeo estimado default por programación: listo en primer corte
- evidencias y checklist: listos en primer corte
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
