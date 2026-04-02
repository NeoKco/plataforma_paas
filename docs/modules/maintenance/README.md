# Maintenance Module

Documentacion canonica del modulo `maintenance`.

Nombre funcional visible:

- `Mantenciones`

Estado actual:

- modulo identificado como siguiente prioridad de negocio para el PaaS
- auditoria inicial completada sobre la app fuente `ieris_app`
- alcance base ya definido para iniciar migracion por slice
- slice inicial ya scaffolded dentro de `platform_paas`
- queda redefinido como modulo dependiente de `business-core`
- `business-core` ya existe como dominio real en backend, frontend y migraciones tenant
- `maintenance` ya tiene esquema tenant base versionado con work orders, visits, installations y equipment types
- el primer corte backend ya expone APIs reales para `equipment_types`, `installations` y `work_orders`
- el frontend tenant ya opera sobre esas APIs en sus tres vistas principales
- `history` ya muestra órdenes cerradas con `status_logs` y `visits`
- `agenda técnica` ya permite crear, editar y eliminar `visits`

Objetivo del modulo:

- cubrir la operacion diaria de mantenciones tecnicas e instalaciones asociadas
- mejorar la version actual antes de migrar funcionalidades mas avanzadas
- servir como segundo modulo tenant grande despues de `finance`

Dependencia arquitectonica:

- `maintenance` no debe convertirse en dueño de clientes, empresas, contactos, perfiles funcionales, grupos ni tipos de tarea compartidos
- esas piezas pasan a declararse como parte de [business-core](/home/felipe/platform_paas/docs/modules/business-core/README.md)
- la relacion runtime correcta es: `maintenance` usa ids y contratos del PaaS, no consultas vivas contra la BD de `ieris_app`

## Alcance base decidido

Primer corte del modulo en PaaS:

- mantenciones programadas
- edicion, cierre y anulacion controlada de mantenciones
- historial de mantenciones por cliente
- instalaciones por cliente usando `sites` de `business-core`
- tipos de equipo o activos tecnicos enlazados a `business-core`
- integracion con agenda/calendario

Estado del corte hoy:

- esquema tenant base ya creado en `0016_maintenance_base`
- modelos ORM iniciales ya versionados
- APIs operativas ya disponibles para `equipment_types`, `installations` y `work_orders`
- frontend operativo ya disponible para esas tres vistas
- historial tecnico visible ya disponible
- `business-core` ya entrega clientes, sitios, perfiles funcionales, grupos y tipos de tarea para conectarlo correctamente

Pendientes visibles inmediatos:

- uso mas profundo de `work_groups`, `function_profiles` y `task_types`
- agenda integrada
- timeline más rica por cliente e instalación
- agenda visual con conflictos y reprogramación más rica
- importadores desde `ieris_app`

Estado del importador legacy:

- ya existe el primer script combinado para `business-core` + `maintenance`
- corre en `dry-run` por defecto y `--apply` explicito
- exige que el tenant destino ya tenga migraciones de `business-core` y `maintenance`
- documentacion de uso en [imports/README.md](/home/felipe/platform_paas/docs/modules/maintenance/imports/README.md)

Se deja fuera del primer corte:

- `egresos`
- `CRM`
- `cotizaciones`
- `expediente tecnico` completo

Nota importante:

- `egresos` no se migra porque su reemplazo en el PaaS es `finance`

## Mapa de documentos

- [USER_GUIDE.md](/home/felipe/platform_paas/docs/modules/maintenance/USER_GUIDE.md)
  Guia operativa para usuarios y soporte funcional.
- [DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/maintenance/DEV_GUIDE.md)
  Estructura esperada, entidades, fronteras, migracion y mejoras.
- [API_REFERENCE.md](/home/felipe/platform_paas/docs/modules/maintenance/API_REFERENCE.md)
  Referencia de endpoints fuente y propuesta de API objetivo en PaaS.
- [ROADMAP.md](/home/felipe/platform_paas/docs/modules/maintenance/ROADMAP.md)
  Estado actual, fases y backlog de migracion.
- [CHANGELOG.md](/home/felipe/platform_paas/docs/modules/maintenance/CHANGELOG.md)
  Hitos documentales y tecnicos del modulo.
- [MIGRATION_MATRIX.md](/home/felipe/platform_paas/docs/modules/maintenance/MIGRATION_MATRIX.md)
  Mapa fuente -> destino desde `ieris_app` hacia `maintenance` y su dependencia con `business-core`.
- [imports/README.md](/home/felipe/platform_paas/docs/modules/maintenance/imports/README.md)
  Guia de uso del importador inicial desde la BD legacy de `ieris_app`.

## Regla operativa de migracion

- `ieris_app` y su BD no seran la dependencia viva del modulo nuevo
- el PaaS operara sobre su propia BD tenant
- la BD vieja solo se usara para importar, contrastar y validar paridad durante la migracion

## Fuentes auditadas

Documentacion fuente:

- [README.md](/home/felipe/ieris_app/docs/paas/README.md)
- [catalogo_modulos_y_paridad.md](/home/felipe/ieris_app/docs/paas/catalogo_modulos_y_paridad.md)
- [roadmap_migracion_paas.md](/home/felipe/ieris_app/docs/paas/roadmap_migracion_paas.md)

Backend fuente:

- [mantenciones_routes.py](/home/felipe/ieris_app/app/routes/mantenciones_routes.py)
- [historico_mantenciones_routes.py](/home/felipe/ieris_app/app/routes/historico_mantenciones_routes.py)
- [instalaciones_por_cliente_routes.py](/home/felipe/ieris_app/app/routes/instalaciones_por_cliente_routes.py)
- [tipo_equipo_routes.py](/home/felipe/ieris_app/app/routes/tipo_equipo_routes.py)
- [mantenciones_service.py](/home/felipe/ieris_app/app/services/mantenciones_service.py)
- [historico_mantenciones_service.py](/home/felipe/ieris_app/app/services/historico_mantenciones_service.py)
- [instalaciones_por_cliente_service.py](/home/felipe/ieris_app/app/services/instalaciones_por_cliente_service.py)
- [calendar_service.py](/home/felipe/ieris_app/app/services/calendar_service.py)
- [maintenances_tables.py](/home/felipe/ieris_app/app/models/maintenances_tables.py)
- [instalacion_sst_tables.py](/home/felipe/ieris_app/app/models/instalacion_sst_tables.py)
- [tipo_equipo_tables.py](/home/felipe/ieris_app/app/models/tipo_equipo_tables.py)

Frontend fuente:

- [App.js](/home/felipe/ieris_app/frontend_app/src/App.js)
- [GestionarMantenciones.jsx](/home/felipe/ieris_app/frontend_app/src/components/mantenciones/gestionar_mantenciones/GestionarMantenciones.jsx)
- [CrearMantencionModal.jsx](/home/felipe/ieris_app/frontend_app/src/components/mantenciones/crear_mantencion/CrearMantencionModal.jsx)
- [EditarMantencionModal.jsx](/home/felipe/ieris_app/frontend_app/src/components/mantenciones/editar_mantencion/EditarMantencionModal.jsx)
- [HistoricoMantenciones.js](/home/felipe/ieris_app/frontend_app/src/components/historicos/historico_mantenciones/HistoricoMantenciones.js)
- [GestionarInstalaciones.jsx](/home/felipe/ieris_app/frontend_app/src/components/instalaciones_por_cliente/gestion_de_instalacion/GestionarInstalaciones.jsx)
- [DetalleCliente.js](/home/felipe/ieris_app/frontend_app/src/components/clientes/detalle_cliente/DetalleCliente.js)

## Criterio de uso

Si necesitas entender como se operara el modulo:

- parte por [USER_GUIDE.md](/home/felipe/platform_paas/docs/modules/maintenance/USER_GUIDE.md)

Si necesitas migrarlo o implementarlo:

- parte por [DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/maintenance/DEV_GUIDE.md)

Si necesitas revisar el plan:

- parte por [ROADMAP.md](/home/felipe/platform_paas/docs/modules/maintenance/ROADMAP.md)
