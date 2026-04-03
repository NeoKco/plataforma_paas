# Maintenance Developer Guide

Guia de desarrollo para el modulo `maintenance`.

Referencia transversal obligatoria:

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
- evidencias y checklist basico de mantencion en fases posteriores

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
- una mantencion se asocia a `cliente`, pero no necesariamente a una `instalacion`
- se crean tareas y eventos de agenda desde el servicio de mantenciones, lo que aumenta acoplamiento
- no existe una frontera clara entre mantencion operativa y expediente tecnico
- el frontend trabaja con tablas compactas y modales, pero no con una lectura por ficha/orden de trabajo

## Regla UX aplicada en PaaS

- los CRUD de `maintenance` deben priorizar lectura primero
- los formularios de alta o edición no deberían quedar desplegados por defecto
- `equipment_types`, `installations`, `visits` y `work_orders` ya abren captura en modal bajo demanda
- cualquier nueva pantalla CRUD del modulo debe seguir el mismo patron y no volver a formularios fijos incrustados salvo que exista una razon operativa fuerte

## Checklist de cumplimiento del modulo

`maintenance` ya cumple hoy:

- slice backend/frontend real
- migraciones tenant
- CRUD base operativo
- lectura principal sin formularios abiertos por defecto
- modales bajo demanda para alta y edición
- documentacion canonica del dominio

`maintenance` sigue debiendo:

- agenda visual mas rica
- evidencias y checklist
- cierre UX por ficha/orden de trabajo
- smoke E2E especifico del modulo con sus flujos principales
- validaciones mas profundas de duplicados y conflictos de programacion

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

- `maintenance_evidence`
- `maintenance_checklists`
- `maintenance_visit_reports`
- `maintenance_assignment_targets` si se formaliza asignacion a usuario/grupo

## Estados recomendados

Lifecycle base ya operativo:

- `scheduled`
- `in_progress`
- `completed`
- `cancelled`

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
  - `work-orders`
  - `installations`
  - `equipment-types`
  - `history`
  - `calendar` como agenda ligera de visitas

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

Etapa 2:

- integracion real con sitios y activos
- agenda integrada
- checklist operativo
- evidencias adjuntas
- mejor lectura de ficha por cliente

Etapa 3:

- expedientes tecnicos relacionados
- SLA, alertas y automatizaciones
- tablero tecnico y vista movil de terreno

## Pruebas que deberia tener el modulo

Backend:

- CRUD seguro de tipos de equipo
- CRUD seguro de instalaciones
- creacion de orden con validacion de cliente, sitio e instalacion
- cierre y anulacion de orden sin perdida de trazabilidad
- filtros de historial por cliente y periodo

Frontend:

- smoke de crear orden
- smoke de cambio de estado
- smoke de crear instalacion
- smoke de lectura de historial
- smoke de crear visita

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
- reemplazar la tabla compacta por una lista operativa con ficha lateral
- separar claramente acciones `cerrar`, `anular`, `reprogramar`
- usar adjuntos/evidencias del modulo, no filesystem ad hoc
- preparar el modulo para crecer luego hacia expediente tecnico sin acoplarlo desde el inicio
- exponer `status_logs` y `visits` en el frontend antes de sumar agenda completa
- agregar agenda visual con conflictos y reprogramación sin romper el slice ya operativo

## Decisiones ya tomadas

- `egresos` no se migra
- `finance` sigue siendo el reemplazo del frente economico del sistema fuente
- `maintenance` se abre como modulo propio y de alta prioridad operativa
- `business-core` pasa a ser requisito previo para que `maintenance`, `projects` e `iot` no dupliquen dominio
