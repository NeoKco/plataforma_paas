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
- las mejoras sugeridas posteriores al cierre funcional quedaron reunidas en [improvements/README.md](/home/felipe/platform_paas/docs/modules/maintenance/improvements/README.md)
- `Mantenciones` y `Historial` ya comparten `Ver ficha` para abrir una lectura consolidada de cada OT
- la `Ficha de mantención` ya muestra contexto operativo, snapshots de cliente/instalación/responsables, `Contacto principal`, fechas, trazabilidad, visitas, cierre técnico y accesos contextuales a `Costos`, `Checklist` o `Editar cierre`
- `Mantenciones` ya permite gestionar `Visitas` por OT para modelar ventanas programadas, ejecución real y responsables de terreno
- `agenda técnica` ya muestra una agenda visual mensual de mantenciones abiertas
- ya permite crear mantenciones desde la propia agenda visual
- ya acepta navegación contextual desde la ficha del cliente en `business-core`
- el modulo ya sigue el patron oficial de CRUD con lectura primero y captura bajo demanda en modal
- `mantenciones` ya separa abiertas vs realizadas:
  - `Mantenciones`: solo `scheduled` y `in_progress`
  - `Historial`: `completed` y `cancelled`
- `Resumen` ya muestra las 5 ultimas mantenciones realizadas con cliente, direccion y fecha de cierre
- `Instalaciones` ya muestra instalacion, cliente y direccion visible
- regla vigente de lectura:
  - `Cliente` consume `organization.name`
  - `Organización / Razón social` consume `organization.legal_name`
  - la homologación manual de nombre común en `business-core` no debe cambiar la lectura principal de cliente
- las ordenes y visitas ya soportan `grupo responsable` y `tecnico responsable` apoyados sobre `business-core`
- ya existe el primer corte de `Pendientes` preventivos con:
  - `maintenance_schedules`
  - `maintenance_due_items`
  - bandeja automatica visible en `Pendientes`
  - alta manual de programaciones
  - agendamiento desde pendiente hacia `work_orders`
- ya existe el primer corte de `Costos y cobro` por OT con:
  - `maintenance_cost_estimates`
  - `maintenance_cost_actuals`
  - `maintenance_cost_lines`
  - modal de costeo sobre `Mantenciones`
  - el mismo modal reutilizado también desde `Historial`
  - nuevo slice visible `Plantillas` para crear, editar y archivar plantillas de costeo desde una vista propia del módulo
  - sincronización manual controlada hacia `finance`
  - política tenant visible para decidir si ese puente sigue manual o pasa a `auto_on_close`
- ya existe el primer corte de `Checklist y evidencias` por OT con:
  - `maintenance_work_order_checklist_items`
  - `maintenance_work_order_evidences`
  - modal técnico reutilizado desde `Mantenciones` e `Historial`
  - observación de cierre estandarizada y adjuntos PDF/imagen
  - storage real del módulo vía `MAINTENANCE_EVIDENCE_DIR`

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
- agenda visual mensual de trabajo abierto
- alta de mantencion desde agenda y desde ficha del cliente
- programaciones preventivas base y bandeja `Pendientes`

Estado del corte hoy:

- esquema tenant base ya creado en `0016_maintenance_base`
- modelos ORM iniciales ya versionados
- APIs operativas ya disponibles para `equipment_types`, `installations` y `work_orders`
- frontend operativo ya disponible para esas tres vistas
- historial tecnico visible ya disponible
- `business-core` ya entrega clientes, sitios, perfiles funcionales, grupos y tipos de tarea para conectarlo correctamente
- la bandeja `Mantenciones` ya queda reservada para trabajo abierto
- el cierre/anulacion ya saca la orden de la bandeja activa y la deja en `Historial`
- `Pendientes` ya genera y muestra vencimientos preventivos por cliente/direccion/instalacion sin mezclar ese flujo con `Mantenciones`
- `Nueva programación` ya respeta el mismo patrón modal y visual de `Nueva mantención`
- `Nueva programación` ya intenta sugerir `Próxima mantención` desde historial cerrado del año actual:
  - misma instalación primero
  - misma dirección como fallback
  - si encuentra una mantención `completed` de este año, propone el mismo día/mes para el próximo año
- cuando esa sugerencia viene de historial del año actual, también propone `1 año` como frecuencia inicial del plan
- `Pendientes` ya permite `Ver cliente`, `Contactar`, `Posponer` y `Agendar` desde la misma fila
- `Pendientes` ya agrega una lectura agrupada por organización para coordinar carga sin perder la operación por cliente/dirección
- `Pendientes` ya muestra instalaciones activas sin plan preventivo y permite abrir `Crear plan` con cliente/dirección/instalación precargados
- `Mantenciones` ya permite abrir `Costos` por OT para guardar estimado, costo real, monto cobrado y sincronizar manualmente a `finance`
- el mismo modal `Costos` ahora permite elegir y reaplicar cualquier `Plantilla de costeo de mantención` activa sobre el estimado o el costo real; en `Costo real y cobro` la plantilla copia valores al resumen editable, sin dejar bloqueado el ajuste posterior del cierre
- cuando se aplica una plantilla al `Costo real y cobro`, el cierre económico ya deja trazado explícito de qué plantilla quedó aplicada al costo real final de la OT
- la UX de `Plantillas` dentro del modal `Costos` ahora también muestra un preview operativo de la plantilla seleccionada (costo base, líneas, margen y uso) y permite quitar la traza del cierre real sin borrar los valores ya ajustados
- `Historial` ya permite abrir el mismo modal `Costos` sobre órdenes cerradas, sin volver editable la programación operativa
- `Costos y cobro` ya permite detalle granular por líneas:
  - mano de obra
  - traslado
  - materiales
  - servicios externos
  - indirectos
- al reaplicar una plantilla en `Costos`, se rellenan líneas y notas de costo; el `monto cobrado` sigue siendo manual porque representa el cierre comercial real de cada OT
- `Resumen técnico` ya expone la política tenant `maintenance -> finance`:
  - modo `manual`
  - modo `auto_on_close`
  - cuentas/categorías/moneda por defecto
- el modal `Costos` ahora reutiliza esos defaults de `Resumen` para precargar la sincronización financiera y advertir cuando el `auto_on_close` no podría completar el puente esperado al cerrar
- la fecha contable de esa sincronización ya se resuelve con el timestamp real de cierre de la OT; si se usa el botón manual antes del cierre, se toma el momento real de esa sync como fallback
- cuando el tenant está en `auto_on_close`, el botón de sync queda como camino de respaldo para reintento o ajuste manual, no como flujo principal de cierre
- `Mantenciones` ya permite abrir `Checklist` por OT para registrar observación de cierre, checklist técnico y evidencias de terreno
- `Historial` ya permite abrir `Ver checklist` en modo solo lectura para revisar ese cierre técnico sin reabrir la orden
- el backend ya endurece la agenda y rechaza cruces de slot activo por instalación, grupo o técnico, incluso si el intento no viene desde la misma pantalla web
- `Mantenciones` y `Agenda` ya permiten `Reprogramar` con una nota opcional para dejar trazabilidad del cambio de slot y responsables en historial técnico
- `Historial` ya permite abrir `Editar cierre` también desde la nueva `Ficha de mantención`, sin exponer reprogramación ni edición operativa de una OT cerrada
- en OT `completed`, `Editar cierre` ahora también permite a `admin` y `manager` corregir la fecha efectiva de cierre cuando el registro administrativo ocurrió más tarde; ese cambio deja traza explícita en `maintenance_status_logs`
- si esa OT ya estaba con política `auto_on_close`, corregir la fecha efectiva de cierre vuelve a intentar la sincronización con `finance` para alinear la fecha contable real
- `Historial` ya permite `Reabrir` una OT cerrada para devolverla rápidamente a la bandeja activa cuando el error es solo operativo; si hubo impacto en `finance`, se mantiene el runbook/script de reversa como camino formal
- ya existe un runbook operativo para revertir cierres erróneos y devolver una OT desde `Historial` a un estado activo mediante [docs/runbooks/maintenance-status-recovery.md](/home/felipe/platform_paas/docs/runbooks/maintenance-status-recovery.md)
- `Mantenciones` ya permite abrir `Visitas` desde la fila o desde la `Ficha de mantención`, para bajar a una coordinación más fina por ventana de terreno
- la modal `Visitas` ahora agrega un resumen de coordinación operativa:
  - cuenta visitas abiertas, en curso, completadas y abiertas sin responsable
  - muestra la próxima ventana abierta visible para coordinación rápida
  - incorpora atajos para copiar ventana/responsables de la OT y registrar inicio/cierre de salida en terreno
- `Visitas` ahora agrega también una primera lectura multi-ventana:
  - ordena la secuencia de terreno por ventana programada
  - alerta cuando una visita se solapa con la anterior
  - permite crear una visita de seguimiento reutilizando duración y responsables de la visita base
- cada visita ahora también puede tipificarse como `diagnóstico`, `ejecución`, `seguimiento` o `cierre`, para distinguir mejor el objetivo operativo de cada salida a terreno
- además cada visita cerrada puede registrar un `resultado operativo` como `ejecutada`, `cliente ausente`, `sin acceso`, `pendiente repuestos`, `reprogramada en terreno` o `cancelada en terreno`
- al editar una visita programada, la modal ahora también puede `reencadenar` las siguientes visitas programadas:
  - preserva duración y separaciones entre ventanas posteriores
  - muestra una previsualización corta de las visitas que se moverán en cadena
- `Mantenciones` y `Agenda` ya pueden, al reprogramar una OT, alinear también la primera visita abierta con el nuevo horario y responsables para no dejar desfasada la ventana principal de terreno
- esa reprogramación ahora también muestra una lectura más fina de ventanas de terreno:
  - previsualiza la ventana actual y la propuesta para la primera visita abierta que se sincronizará
  - lista las demás visitas abiertas que quedan para coordinación fina en `Visitas`
- `Mantenciones`, `Historial` y la `Ficha de mantención` ya muestran `Tipo de tarea` y `Perfil funcional` cuando la OT viene enlazada a una programación preventiva y el técnico pertenece formalmente al grupo responsable
- `Mantenciones` y `Visitas` ya restringen la asignación para que un técnico solo pueda guardarse si tiene membresía activa y vigente en el `grupo responsable` seleccionado
- `Agenda técnica` ya replica ese mismo filtro visual para que la asignación desde calendario no ofrezca técnicos fuera del grupo responsable
- cuando la OT viene de una programación preventiva con `Tipo de tarea`, `Pendientes`, `Mantenciones`, `Agenda` y `Visitas` solo permiten técnicos cuyo miembro de grupo tenga `Perfil funcional` declarado; el backend también lo exige al guardar
- `Business Core -> Tipos de tarea` ya permite marcar `Perfiles compatibles`; ahora esa compatibilidad se persiste en una estructura dedicada `task_type -> function_profile`, manteniendo fallback de lectura para metadata legacy `profiles:` mientras exista historial previo
- `Business Core -> Taxonomías` ya expone una matriz visual `Tipo de tarea x Perfil funcional` para auditar compatibilidad fina sin abrir cada catálogo por separado
- esa misma matriz ya muestra cobertura operativa real usando membresías activas/vigentes de grupos, para detectar tipos sin técnicos compatibles y perfiles funcionales huérfanos
- `Instalaciones` ya puede abrir `Expediente` como puente liviano con expediente técnico: resume snapshot del activo, próximas/últimas mantenciones y reutiliza el checklist/evidencias del último cierre como base documental sin abrir aún un módulo separado
- `Reportes` ya abre un primer corte de reportes técnicos operativos: cierres del período, cobertura de observación útil, trazabilidad de visitas, cobertura preventiva, activos sin servicio reciente y un listado histórico de mantenciones realizadas filtrable por `Organización / razón social` con `cliente`, `contacto principal`, `dirección`, `instalación` y `fecha realizada`
- `Checklist` ya incorpora un primer corte móvil para terreno:
  - atajos rápidos dentro de la modal para saltar a cierre, checklist y evidencias
  - resumen visible de avance checklist y cantidad de adjuntos
  - selector de archivo preparado para ofrecer cámara/galería en dispositivos compatibles

Pendientes visibles inmediatos:

- timeline más rica por cliente e instalación
- agenda visual con responsables y ventanas de visita más ricas
- programaciones automáticas de mantención y bandeja de vencimientos por gestionar
- costeo y cobro de mantenciones con puente formal hacia `finance`
- automatización opcional tenant-side del puente `maintenance -> finance`
- importadores desde `ieris_app`
- reprogramación operativa aún más rica con edición multi-visita y reglas más finas de coordinación

## Checklist contra el estandar de modulos

Referencia transversal:

- [Estandar de construccion de modulos](/home/felipe/platform_paas/docs/architecture/module-build-standard.md)

Estado resumido del modulo:

- documentacion canonica base: cumplido
- modelo de datos tenant: cumplido
- API operativa del primer corte: cumplido
- frontend usable del primer corte: cumplido
- CRUD con lectura primero y alta bajo demanda: cumplido
- validaciones de negocio base: cumplido en primer corte
- smoke/frontend de regresion especifico del modulo: parcial
- agenda visual rica: pendiente
- asignacion real por grupo/usuario en ordenes y agenda: cumplido en primer corte
- programacion preventiva y bandeja automatica: cumplido en primer corte base
- costeo/cobro por OT y puente controlado a `finance`: cumplido en primer corte base
- evidencias y checklist tecnico: cumplido en primer corte base
- cierre completo de la UX operativa del modulo: en progreso avanzado con `Ficha de mantención` ya operativa

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
- [ASSIGNMENT_MODEL.md](/home/felipe/platform_paas/docs/modules/maintenance/ASSIGNMENT_MODEL.md)
  Modelo canónico para asignar mantenciones a grupos y usuarios sin mezclar permisos del sistema con roles funcionales.
- [../../runbooks/maintenance-status-recovery.md](/home/felipe/platform_paas/docs/runbooks/maintenance-status-recovery.md)
  Procedimiento operativo para revertir cierres o cancelaciones erróneas y reabrir una OT.
- [PREVENTIVE_SCHEDULING_AND_COSTING_MODEL.md](/home/felipe/platform_paas/docs/modules/maintenance/PREVENTIVE_SCHEDULING_AND_COSTING_MODEL.md)
  Modelo canónico para programaciones automáticas, bandeja de vencimientos, costeo operativo y puente hacia `finance`.
- [imports/README.md](/home/felipe/platform_paas/docs/modules/maintenance/imports/README.md)
  Guia de uso del importador inicial desde la BD legacy de `ieris_app`.
- [improvements/README.md](/home/felipe/platform_paas/docs/modules/maintenance/improvements/README.md)
  Backlog de mejoras sugeridas por submodulo despues del cierre funcional.
- [../../improvements/README.md](/home/felipe/platform_paas/docs/modules/improvements/README.md)
  Backlog transversal de mejoras sugeridas por modulo.

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
