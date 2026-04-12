# Maintenance Roadmap

Estado actual:

- `Primer corte funcional cerrado, business-core operativo y maintenance ya estabilizado en slice_base_live`

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
- backend tenant operativo
- frontend tenant visible
- migraciones tenant creadas

- modulo frontend/backend ya operativo en primer corte
- migracion tenant `0016_maintenance_base` creada
  - `maintenance_equipment_types`
  - `maintenance_installations`
  - `maintenance_work_orders`
- agenda visual con conflictos, filtros y reprogramación auditada ya lista; faltan ventanas de visita más finas
- abrir programaciones automáticas y bandeja preventiva de vencimientos
- abrir costeo y cobro por orden de trabajo
- primer corte de costeo/cobro por orden de trabajo ya operativo en `Mantenciones`


- que el modulo sirva mejor que la fuente para operacion diaria

- lectura por ficha/orden de trabajo
- mejores estados de ciclo de vida
- agenda integrada
- trazabilidad de cambios
- alinear todo el modulo con el [Estandar de construccion de modulos](/home/felipe/platform_paas/docs/architecture/module-build-standard.md) hasta cerrar checklist completa
- controles de cierre donde fecha/hora queden congeladas al pasar a historial

- `Mantenciones` y `Historial` ya exponen `Ver ficha` como lectura secundaria compartida por OT
- la `Ficha de mantención` ya reúne contexto operativo, snapshots más ricos por cliente/instalación/responsables, fechas clave, cierre técnico, `status_logs` y `visits`
- `Mantenciones` ya expone `Plantillas` como slice visible para crear, editar y archivar plantillas de costeo sin depender de `Pendientes` o de una OT puntual
- `Mantenciones`, `Historial` y la ficha ya leen `Tipo de tarea` desde `maintenance_schedules.task_type_id` y `Perfil funcional` desde membresías reales de `business_work_groups`
- `Mantenciones` y `Visitas` ya validan que técnico y grupo correspondan a una membresía activa y vigente antes de guardar
- `Agenda técnica` ya replica el filtro visual de técnicos por membresía activa dentro del grupo responsable
- `Pendientes`, `Mantenciones`, `Agenda` y `Visitas` ya exigen además `Perfil funcional` declarado cuando la OT preventiva trae `Tipo de tarea`
- el módulo ya formalizó el mapa `task_type -> function_profiles` en una estructura dedicada, con migración desde la metadata legacy `profiles:`
- `Business Core -> Tipos de tarea` ya expone UI para editar esa compatibilidad fina sin obligar al usuario a escribir metadata manual ni tocar descripciones técnicas
- `Business Core -> Taxonomías` ya muestra una matriz transversal para revisar la cobertura de compatibilidad entre tipos y perfiles
- `Business Core -> Taxonomías` ya cruza además membresías activas/vigentes de grupos para mostrar cobertura operativa real y alertar sobre tipos/perfiles huérfanos
- conflictos visibles, bloqueo backend `409`, filtros de agenda y reprogramación auditada ya quedaron operativos en el mismo frente de endurecimiento
- la reprogramación desde `Mantenciones` y `Agenda` ya puede arrastrar la primera visita abierta para mantener alineada la ventana principal de terreno
- ese flujo ahora también previsualiza la ventana actual/propuesta de la primera visita sincronizable y enumera las demás visitas abiertas que quedan para coordinación fina
- `Visitas` ahora agrega un primer bloque explícito de coordinación operativa:
  - resume abiertas/en curso/completadas y responsables pendientes
  - expone atajos para copiar ventana/responsables de la OT y marcar salida/cierre rápido en terreno
- `Visitas` ahora agrega además un primer corte multi-ventana:
  - ordena la secuencia de visitas por ventana
  - marca solapes contra la visita anterior
  - permite crear una visita de seguimiento reutilizando duración y responsables base
- al editar una visita programada, `Visitas` ya puede reencadenar automáticamente las siguientes visitas programadas preservando duración y separaciones

Pendiente fino de este frente:

- seguir limpiando metadata legacy `profiles:` a medida que los tenants migren sus descripciones históricas

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

- `En progreso inicial`

Alcance:

- puente con expediente tecnico
- reportes tecnicos
- mejoras moviles para terreno

Avance actual:

- `Instalaciones` ya expone un primer `Expediente` liviano por activo:
  - resume snapshot técnico del equipo instalado
  - lista mantenciones abiertas/cerradas asociadas a esa instalación
  - muestra próxima atención y último cierre
  - reutiliza el `field report` de la última OT cerrada como base documental del activo
- `Reportes` ya expone un primer corte de reportes técnicos:
  - lectura mensual de cierres completados/anulados
  - cobertura de observación de cierre útil
  - trazabilidad de visitas ejecutadas
  - cobertura de flujo preventivo
  - instalaciones activas sin servicio reciente ni OT abierta
- `Checklist y evidencias` ya agrega un primer slice móvil de captura en terreno:
  - atajos rápidos para saltar entre cierre, checklist y evidencias dentro de la modal
  - resumen compacto de avance checklist y cantidad de adjuntos
  - carga de evidencia preparada para abrir cámara/galería desde dispositivos móviles compatibles
- el módulo todavía no abre un expediente técnico documental completo ni reportes especializados; ese frente sigue desacoplado para no mezclar demasiado pronto operación y archivo técnico

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
- el puente `maintenance -> finance` ya existía y quedó endurecido con un primer contrato de defaults efectivos resueltos por backend:
  - `GET /tenant/maintenance/finance-sync-defaults`
  - `Resumen técnico` y `Costos y cobro` ahora precargan desde la misma fuente
  - el backend ya prioriza política tenant, moneda base/`CLP`, categorías de mantención y cuentas compatibles por moneda
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
- el puente `maintenance -> finance` ya existe en primer corte:
  - sync manual por OT
  - sync automático opcional `auto_on_close`
  - enlace persistente a `income_transaction_id` y `expense_transaction_id`
- frontend tenant ya permite desde `Mantenciones`:
  - guardar costo estimado
  - guardar costo real
  - registrar monto cobrado
  - detallar costo por líneas y derivar resumen automático desde ellas
  - sincronizar manualmente ingreso/egreso hacia `finance`
  - crear y reaplicar plantillas de costeo también desde el modal `Costos` de cada OT, no solo desde `Nueva programación`
- se agrega migración tenant `0025_maintenance_schedule_estimate_defaults`
- se agrega migración tenant `0026_maintenance_cost_templates`

Pendiente fino inmediato de esta fase:

- autollenado más preciso de categorías, cuentas y moneda al cerrar costeo
- ergonomía de defaults para que el operador no duplique digitación entre `maintenance` y `finance`
- aprovechamiento explícito del nuevo baseline financiero `CLP + Casa/Empresa`
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
- el backend ya endurece además la validación concurrente de conflictos de agenda con locks transaccionales por recurso y minuto, para reducir carreras entre operaciones simultáneas

Pendiente inmediato de esta fase:

- profundizar `Visitas` con edición masiva más explícita o coordinación encadenada sobre varias ventanas abiertas y responsables

## Mejoras de producto recomendadas

- asociar mantencion a instalacion especifica
- timeline tecnico por cliente
- estados mas expresivos que `pendiente` y `realizada`
- ficha lateral con contexto completo del cliente y del equipo
- cierre con evidencia y checklist
- reprogramacion clara sin perder historial
- agrupacion visual por organizacion, pero gestion operativa por cliente/sitio/instalacion
- reporte de clientes con instalacion activa y sin plan de mantencion
- profundizar `Visitas` con automatizaciones más finas sobre responsables múltiples, salidas encadenadas y coordinación masiva

## Mejoras futuras no bloqueantes

- detalle consolidado en [improvements/README.md](/home/felipe/platform_paas/docs/modules/maintenance/improvements/README.md)

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

- endurecimiento del importador legacy ya cubierto con verificación aplicada y cierre operativo del tenant destino

## Backlog pendiente visible

- `equipment_types`: backend/frontend base listo
- `installations`: backend/frontend base listo
- `work_orders`: backend/frontend base listo
- `history`: backend/frontend base listo
- `visits`: backend/frontend base listo
- `status_logs` operativos: backend/frontend lectura lista
- integración con agenda visual: lista en primer corte operativo
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
- importadores legacy: primer corte listo y flujo aplicado ya endurecido con verificación post-import

## Checklist de salida del modulo

Antes de considerar `maintenance` como primer corte realmente cerrado, deberia quedar:

- CRUD principal con lectura primero en todas las vistas operativas
- alta y edicion bajo demanda en modal o vista secundaria
- resumen operativo real del modulo
- agenda visual con conflictos
- evidencias y checklist tecnico
- smoke E2E propio del modulo
- documentacion canonica al dia con cambios visibles

Estado actual del checklist:

- checklist funcional del primer corte: cumplido
- quedan pendientes solo mejoras futuras no bloqueantes

Conclusión de roadmap del primer corte:

- roadmap funcional del módulo `maintenance`: cerrado
- pendientes restantes: mejoras futuras no bloqueantes

Validacion reciente:

- `dry-run` del importador legacy ya validado contra `kanban_db` -> `empresa-bootstrap`
- el tenant `empresa-bootstrap` ya quedo migrado con:
  - `0015_business_core_base`
  - `0016_maintenance_base`
  - `0017_business_core_taxonomy`
- `--apply` ya ejecutado con exito sobre `empresa-bootstrap`
- segunda corrida `dry-run` ya valida idempotencia
- pendiente inmediato: decidir si `empresa-bootstrap` queda como tenant definitivo de operacion o repetir el proceso en otro tenant destino
