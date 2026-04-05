# Maintenance Developer Guide

Guia de desarrollo para el modulo `maintenance`.

Referencia transversal obligatoria:

- [Gobernanza de implementacion](/home/felipe/platform_paas/docs/architecture/implementation-governance.md)
- [Estandar de construccion de modulos](/home/felipe/platform_paas/docs/architecture/module-build-standard.md)

## Decision de naming

Slug tecnico recomendado:

- `maintenance`

Etiqueta funcional:

- `Mantenciones`

Se toma `maintenance` como nombre tecnico para mantener consistencia con `finance` y `platform-core`, pero el lenguaje de producto puede seguir usando `Mantenciones`.

## Frontera del modulo

Entra en `maintenance`:

- ordenes de mantencion
- historial de mantenciones
- instalaciones y visitas tecnicas apoyadas sobre `business-core`
- activos tecnicos o tipos de equipo enlazados al dominio base
- sincronizacion con agenda
- evidencias y checklist basico de mantencion

No entra en el primer corte:

- `finance`
- `CRM`
- `cotizaciones`
- expediente tecnico completo
- clientes, empresas, contactos, perfiles funcionales, grupos y tipos de tarea compartidos

## Dependencia previa requerida

Ese prerequisito ya quedo cubierto por [business-core](/home/felipe/platform_paas/docs/modules/business-core/README.md).

Esa base deberia absorber:

- clientes
- empresas
- contactos
- sitios
- perfiles funcionales
- grupos de trabajo
- tipos de tarea

Con eso, `maintenance` ya puede correr sobre clientes, sitios y taxonomias compartidas del PaaS.

## Regla sobre la BD de `ieris_app`

La BD de `ieris_app` es:

- fuente de referencia funcional
- fuente de migracion de datos
- fuente de contraste durante la transicion

La BD de `ieris_app` no es:

- la base operativa en runtime del modulo nuevo
- el contrato publico del PaaS
- la estructura final que deba heredarse tal cual

Decision:

- `maintenance` en el PaaS debe operar sobre la BD tenant del PaaS
- los datos antiguos se importan desde `ieris_app`, pero el modulo nuevo no depende de consultas vivas contra esa BD

## Auditoria de la app fuente

La auditoria de `ieris_app` muestra este slice real:

- mantenciones activas y programadas
- cierre de mantencion con movimiento a historico
- instalaciones por cliente
- catalogo de tipos de equipo
- integracion fuerte con `calendar_events`
- integracion secundaria con `tasks`

Fuente backend principal:

- [mantenciones_routes.py](/home/felipe/ieris_app/app/routes/mantenciones_routes.py)
- [mantenciones_service.py](/home/felipe/ieris_app/app/services/mantenciones_service.py)
- [historico_mantenciones_routes.py](/home/felipe/ieris_app/app/routes/historico_mantenciones_routes.py)
- [historico_mantenciones_service.py](/home/felipe/ieris_app/app/services/historico_mantenciones_service.py)
- [instalaciones_por_cliente_routes.py](/home/felipe/ieris_app/app/routes/instalaciones_por_cliente_routes.py)
- [instalaciones_por_cliente_service.py](/home/felipe/ieris_app/app/services/instalaciones_por_cliente_service.py)
- [tipo_equipo_routes.py](/home/felipe/ieris_app/app/routes/tipo_equipo_routes.py)
- [calendar_service.py](/home/felipe/ieris_app/app/services/calendar_service.py)

Fuente frontend principal:

- [GestionarMantenciones.jsx](/home/felipe/ieris_app/frontend_app/src/components/mantenciones/gestionar_mantenciones/GestionarMantenciones.jsx)
- [CrearMantencionModal.jsx](/home/felipe/ieris_app/frontend_app/src/components/mantenciones/crear_mantencion/CrearMantencionModal.jsx)
- [EditarMantencionModal.jsx](/home/felipe/ieris_app/frontend_app/src/components/mantenciones/editar_mantencion/EditarMantencionModal.jsx)
- [HistoricoMantenciones.js](/home/felipe/ieris_app/frontend_app/src/components/historicos/historico_mantenciones/HistoricoMantenciones.js)
- [GestionarInstalaciones.jsx](/home/felipe/ieris_app/frontend_app/src/components/instalaciones_por_cliente/gestion_de_instalacion/GestionarInstalaciones.jsx)

## Problemas de diseño detectados en la fuente

- el cierre mueve registros desde `mantenciones` a `historico_mantenciones`, en vez de mantener una sola entidad con lifecycle auditable
- la asignacion es flexible (`usuario` o `grupo`), pero no existe un modelo de responsables ni una agenda de terreno suficientemente formal
- en la fuente una mantencion puede quedar sin instalacion y apoyarse demasiado en referencias legacy visibles
- se crean tareas y eventos de agenda desde el servicio de mantenciones, lo que aumenta acoplamiento
- no existe una frontera clara entre mantencion operativa y expediente tecnico
- el frontend trabaja con tablas compactas y modales, pero no con una lectura por ficha/orden de trabajo

## Regla UX aplicada en PaaS

- los CRUD de `maintenance` deben priorizar lectura primero
- los formularios de alta o edición no deberían quedar desplegados por defecto
- `equipment_types`, `installations`, `visits` y `work_orders` ya abren captura en modal bajo demanda
- `installations` ahora también abre `Expediente` como modal de lectura secundaria del activo, siguiendo el mismo patrón de lectura primero sin abrir aún un módulo documental separado
- cualquier nueva pantalla CRUD del modulo debe seguir el mismo patron y no volver a formularios fijos incrustados salvo que exista una razon operativa fuerte
- en `work_orders`, cliente y direccion deben leerse con nombre humano desde `business-core`, nunca por `client_code` o marcas `legacy_*`
- `external_reference` queda como dato interno para migracion e integraciones; no debe exponerse como campo editable en la UX normal
- para crear o editar una orden operativa se exige `client_id`, `site_id` e `installation_id` validos
- `Mantenciones` es una bandeja de trabajo abierto, no un mezclador de abiertas y cerradas
- `Historial` debe derivarse de `completed` y `cancelled`
- la lectura operativa no deberia mezclar ambas bandejas en una sola lista larga; conviene separar `realizadas` y `anuladas` tanto en resumenes como en vistas de historial.
- una orden cerrada no debe volver a editarse desde la bandeja operativa
- desde `Historial` solo deberian exponerse correcciones de descripcion/cierre, congelando fecha, hora, cliente, direccion e instalacion
- `Mantenciones` e `Historial` ya comparten una `Ficha de mantención` como lectura secundaria de la OT:
  - se abre bajo demanda con `Ver ficha`
  - concentra contexto operativo, fechas, cierre técnico, `status_logs` y `visits`
  - desde una ficha histórica puede abrirse `Editar cierre`, pero no reprogramación ni edición completa de scheduling
- `Agenda` debe pintar mantenciones abiertas sobre calendario visual, no visitas como lista catalogada
- la asignacion ya se formalizo con FKs reales a `work_groups` y `tenant_users`, dejando `assigned_group_label` solo como compatibilidad temporal en datos o lecturas legacy
- `Pendientes` ya existe como bandeja preventiva separada de `Mantenciones`, para no mezclar trabajo abierto con vencimientos por gestionar
- `Nueva programación` debe respetar exactamente el mismo patrón modal/visual de `Nueva mantención`; no se aceptan formularios incrustados ni maquetaciones divergentes dentro del mismo módulo
- `Nueva programación` no debe depender de memoria manual para `Próxima mantención`; debe consultar sugerencia backend
- la sugerencia oficial vive en `/tenant/maintenance/schedules/suggestion`
- regla vigente:
  - buscar primero `maintenance_work_orders.completed` de la misma instalación
  - si no existe, caer a la misma dirección
  - si el cierre útil ocurrió en el año calendario actual, proponer el mismo día/mes para el año siguiente
  - en ese mismo caso, proponer también `1 year` como frecuencia inicial
  - si no hay historial útil de este año, mantener fallback base por instalación
- `Pendientes` ya debe exponer acciones operativas directas por fila: `Ver cliente`, `Contactar`, `Posponer`, `Agendar`
- la agrupación por organización en `Pendientes` es una lectura complementaria; nunca debe reemplazar la unidad operativa real de cliente/dirección/instalación
- el reporte `instalaciones activas sin plan preventivo` debe cruzar instalaciones activas contra schedules activos y permitir abrir `Nueva programación` ya precargada
- el primer corte de costeo/cobro ya vive en `work_orders` como acción modal `Costos`, no como pantalla separada ni como formulario incrustado
- el mismo dominio de `Costos` ya puede abrirse también desde `Historial`, pero en modo solo lectura para congelar el cierre económico y no mutar una OT pasada desde la UX normal
- el segundo corte de costeo ya agrega `maintenance_cost_lines`:
  - por ahora sirve para detallar costo técnico granular por etapa `estimate` y `actual`
  - si existen líneas, el resumen por rubro se deriva automáticamente desde ellas
- `Nueva programación` ya puede llevar líneas de `Costeo estimado por defecto`:
  - se guardan sobre `maintenance_schedule_cost_lines`
  - aceptan múltiples materiales y servicios, además de mano de obra, traslado e indirectos
  - al agendar una OT desde `Pendientes`, esas líneas se copian al `estimate` inicial del work order
- `maintenance` ya tiene además `Plantillas de costeo de mantención` como feature propia del módulo:
  - viven en `maintenance_cost_templates` y `maintenance_cost_template_lines`
  - se crean y aplican desde `Nueva programación`
  - ahora también se editan, archivan/reactivan y exponen `usage_count`
  - `maintenance_schedules.cost_template_id` deja trazado qué plantilla originó la programación preventiva
  - no deben modelarse ni nombrarse como catálogo transversal, porque su alcance funcional es exclusivo de Mantenciones
- la sincronización `maintenance -> finance` ya soporta dos políticas tenant:
  - `manual`
  - `auto_on_close`
- aun en `auto_on_close`, `maintenance` sigue siendo dueño del costeo y `finance` sigue siendo dueño del hecho económico
- la política vive en `tenant_info` y viaja en `/tenant/info`, porque afecta el workflow operativo del módulo técnico y no solo parámetros internos de `finance`
- `auto_on_close` es best-effort:
  - no bloquea el cierre de la OT si faltan defaults financieros
  - si la configuración está incompleta, el operador sigue pudiendo usar sync manual

## Checklist de cumplimiento del modulo

`maintenance` ya cumple hoy:

- slice backend/frontend real
- migraciones tenant
- CRUD base operativo
- lectura principal sin formularios abiertos por defecto
- modales bajo demanda para alta y edición
- documentacion canonica del dominio

`maintenance` sigue debiendo:
- smoke E2E especifico del modulo con sus flujos principales
- mejoras móviles de captura en terreno
- snapshots y timeline más ricos dentro de la ficha/orden de trabajo
- reprogramación operativa con visitas/ventanas más finas y con mejor trazabilidad

## Modelo objetivo recomendado en PaaS

Entidades del primer corte ya modeladas en `maintenance`:

- `maintenance_work_orders`
  orden principal de mantencion
- `maintenance_visits`
  agenda y ejecucion de visitas por orden
- `maintenance_status_logs`
  historial de cambios de estado
- `maintenance_equipment_types`
- `maintenance_installations`

Entidades que viven o deberian vivir en `business-core`:

- `business_sites`
- `business_work_groups`
- `business_task_types`
- `business_function_profiles`

Entidades de segundo corte:

- `maintenance_schedules`
- `maintenance_due_items`
- `maintenance_cost_estimates`
- `maintenance_cost_actuals`
- `maintenance_work_order_evidences`
- `maintenance_work_order_checklist_items`
- `maintenance_visit_reports`
- ya no hace falta `maintenance_assignment_targets` como tabla separada en el primer corte, porque la asignacion real vive en FKs directas sobre `work_orders` y `visits`

Regla vigente para puente con expediente tecnico:

- el primer corte no crea nuevas tablas tenant
- `Instalaciones -> Expediente` reutiliza:
  - `maintenance_installations` como snapshot del activo
  - `maintenance_work_orders` filtradas por `installation_id`
  - `field_report` de la última OT cerrada como base documental liviana
- esto permite avanzar la extensión técnica sin acoplar todavía un expediente documental completo ni abrir storage paralelo por activo

Regla vigente para cierre tecnico y evidencias:

- el corte actual usa un `field report` ligado directo a `work_orders`
- el backend concentra ese slice en `/tenant/maintenance/work-orders/{id}/field-report`
- los adjuntos se almacenan en filesystem dedicado del módulo, configurado por `MAINTENANCE_EVIDENCE_DIR`
- `Mantenciones` abre este contrato en modo editable y `Historial` en modo solo lectura

Modelo canónico de asignacion:

- [ASSIGNMENT_MODEL.md](/home/felipe/platform_paas/docs/modules/maintenance/ASSIGNMENT_MODEL.md)

Regla recomendada:

- la `work_order` ya planifica sobre grupo o usuario
- la `visit` ya puede congelar quien ejecuta realmente
- `function_profile` clasifica pero no reemplaza ni permiso ni grupo

## Estados recomendados

Lifecycle base ya operativo:

- `scheduled`
- `in_progress`
- `completed`
- `cancelled`

Regla UX/operativa aplicada:

- `scheduled` y `in_progress` viven en `Mantenciones`
- `completed` y `cancelled` viven en `Historial`
- el cierre mueve de vista, no de tabla
- una vez cerrada, no deberia poder reabrirse desde el CRUD normal sin una accion explicita futura

El historico deberia ser una vista derivada de las ordenes cerradas, no otra tabla obligatoria para operar.

## Integraciones recomendadas

Con `platform-core`:

- permisos tenant
- auditoria
- limites si mas adelante aplica

Con modulos tenant:

- `calendar`: la orden crea o actualiza eventos visibles
- `business-core`: cliente, sitio, activo, grupo y tipo de tarea
- `finance`: no mezclar gasto tecnico dentro del modulo base
- `finance`: el costeo técnico ya puede sincronizar manualmente ingreso/egreso usando `finance_transactions.source_type/source_id`
- `Resumen técnico` ya expone además la política tenant para auto-sync `maintenance -> finance`, consumiendo `/tenant/info` y persistiendo vía `/tenant/info/maintenance-finance-sync`
- `Agenda técnica` y `Mantenciones abiertas` ya calculan conflictos visibles en frontend cuando dos OT abiertas comparten slot horario e instalación/grupo/técnico
- `work_orders` ahora también bloquea en backend esos cruces de slot con respuesta `409`, para cubrir concurrencia operativa básica fuera del navegador actual
- `Agenda técnica` ya permite además filtrar la lectura mensual por grupo responsable y técnico responsable
- `work_orders` ahora acepta `reschedule_note` en actualización para auditar reprogramaciones sin cambiar de tabla ni perder lifecycle
- esa reprogramación se registra reutilizando `maintenance_status_logs` con `from_status == to_status`, y `Historial` la presenta como evento de `Reprogramación`
- `projects`: podra reutilizar el mismo sitio, cliente y responsable
- `iot`: deberia colgarse del mismo sitio o activo instalado

## Estructura esperada en el PaaS

Backend actual:

- `backend/app/apps/tenant_modules/maintenance/models/`
- `backend/app/apps/tenant_modules/maintenance/repositories/`
- `backend/app/apps/tenant_modules/maintenance/services/`
- `backend/app/apps/tenant_modules/maintenance/api/`
- `backend/app/apps/tenant_modules/maintenance/schemas/`
- `backend/app/apps/tenant_modules/maintenance/permissions.py`

Frontend actual:

- `frontend/src/apps/tenant_portal/modules/maintenance/`
- primer corte operativo ya visible en:
  - `due-items`
  - `work-orders`
  - `installations`
  - `equipment-types`
  - `history`
  - `calendar` como agenda visual mensual de mantenciones abiertas
  - `reports` como primer corte de reportes técnicos operativos

Documentacion:

- `docs/modules/maintenance/`

## Implementacion sugerida por etapas

Etapa 1:

- `business-core` base
- mantenciones activas
- cierre/anulacion con lifecycle formal
- tipos de equipo
- instalaciones
- frontend base operativo
- historial tecnico visible con logs y visitas
- visitas editables

Etapa 1.5:

- importador desde la BD de `ieris_app`
- tabla o registro de mapeo `legacy_id -> new_id`
- validacion de paridad por cliente, sitio e historico

Estado real:

- el primer importador combinado ya existe en [import_ieris_business_core_maintenance.py](/home/felipe/platform_paas/backend/app/scripts/import_ieris_business_core_maintenance.py)
- cubre importacion inicial de `business-core` y `maintenance`
- sigue faltando una capa formal de mapeo persistente `legacy_id -> new_id`
- el importador hoy es idempotente por codigos, referencias externas y marcadores legacy en notas

Etapa 1.6:

- `maintenance_schedules` y `maintenance_due_items` ya implementados como primer corte base
- endpoints reales ya expuestos para:
  - `GET/POST/PUT /tenant/maintenance/schedules`
  - `PATCH /tenant/maintenance/schedules/{id}/status`
  - `GET /tenant/maintenance/due-items`
  - `POST /tenant/maintenance/due-items/{id}/contact`
  - `POST /tenant/maintenance/due-items/{id}/postpone`
  - `POST /tenant/maintenance/due-items/{id}/schedule`
- `schedule_due_item` crea una `work_order` real y deja enlazados:
  - `maintenance_work_orders.schedule_id`
  - `maintenance_work_orders.due_item_id`
  - `maintenance_work_orders.billing_mode`
- al completar una OT asociada, la programación recalcula `next_due_at`
- existe el script inicial [run_maintenance_due_generation.py](/home/felipe/platform_paas/backend/app/scripts/run_maintenance_due_generation.py) para generar vencimientos por tenant

Etapa 2:

- integracion real con sitios y activos
- agenda con filtros por tecnico/grupo y conflictos
- checklist operativo
- evidencias adjuntas
- lectura base por ficha/orden ya lista; falta enriquecerla por cliente/instalación
- filtros y gestión comercial más ricos en `Pendientes`

Etapa 3:

- costeo operativo y cobro
- sincronizacion controlada hacia `finance`
- reportes de rentabilidad

## Pruebas que deberia tener el modulo

Backend:

- CRUD seguro de tipos de equipo
- CRUD seguro de instalaciones
- creacion de orden con validacion de cliente, sitio e instalacion
- cierre y anulacion de orden sin perdida de trazabilidad
- preservacion segura de referencias externas legacy sin exponerlas a edicion manual
- filtros de historial por cliente y periodo

Frontend:

- smoke de `Pendientes`
- smoke de crear orden
- smoke de cambio de estado
- smoke de crear instalacion
- smoke de abrir `Expediente` desde `Instalaciones`
- smoke de lectura de historial
- smoke de crear visita
- smoke de `Reportes` técnicos con lectura mensual base

## Importacion legacy

Script actual:

- [import_ieris_business_core_maintenance.py](/home/felipe/platform_paas/backend/app/scripts/import_ieris_business_core_maintenance.py)

Cobertura del script:

- organizaciones, clientes, contactos y sitios
- perfiles funcionales, grupos de trabajo y tipos de tarea
- tipos de equipo
- instalaciones
- mantenciones activas
- historico de mantenciones
- `status_logs` y `visits` base

Limitaciones actuales:

- no importa `user_groups` porque `business_work_group_members` aun no existe
- no mapea usuarios legacy a `tenant_users` del PaaS
- no importa expediente tecnico ni checklist/evidencias
- requiere schema tenant ya migrado antes de ejecutarse

## Mejoras concretas recomendadas

- asociar cada mantencion a una instalacion cuando corresponda
- profundizar la nueva ficha/orden de trabajo con snapshots más ricos por cliente, instalación y responsables
- profundizar el flujo `reprogramar` con ventanas de visita y coordinación de terreno
- usar adjuntos/evidencias del modulo, no filesystem ad hoc
- preparar el modulo para crecer luego hacia expediente tecnico sin acoplarlo desde el inicio
- mantener `Reportes` como lectura agregada sobre datos reales del módulo y no como exportador aislado sin contexto operativo
- exponer `status_logs` y `visits` en el frontend antes de sumar agenda completa
- agregar agenda visual con visitas más finas sin romper el slice ya operativo

## Decisiones ya tomadas

- `egresos` no se migra
- `finance` sigue siendo el reemplazo del frente economico del sistema fuente
- `maintenance` se abre como modulo propio y de alta prioridad operativa
- `business-core` pasa a ser requisito previo para que `maintenance`, `projects` e `iot` no dupliquen dominio

## Proxima extension canonica

La siguiente expansion recomendada del modulo no debe modelarse como una lista manual de mantenciones.

Debe abrirse como:

- programaciones permanentes
- bandeja automatica de vencimientos
- costeo y cobro por orden de trabajo
- integracion formal con `finance`

Documento canónico:

- [PREVENTIVE_SCHEDULING_AND_COSTING_MODEL.md](/home/felipe/platform_paas/docs/modules/maintenance/PREVENTIVE_SCHEDULING_AND_COSTING_MODEL.md)

Decision de encaje con el slice actual:

- `Pendientes` alimenta `work_orders`; no las reemplaza
- `Agenda` sigue siendo calendario de trabajo abierto, no fuente primaria de vencimientos
- `Costos` no deberia invadir `Nueva orden`; conviene abrirlo como accion especializada sobre la OT
- `finance` registra ingresos y egresos enlazados con `source_type/source_id`, sin duplicar su logica dentro de `maintenance`
