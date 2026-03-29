# Roadmap de Frontend

Este documento ya no describe solo un plan de construccion. Tambien deja el estado real del frontend despues de las iteraciones ya implementadas sobre `platform_admin`, `tenant_portal` e instalador.

La idea es evitar dos errores comunes:

- empezar el frontend sin un orden claro
- abrir muchas pantallas antes de estabilizar auth, layout y contratos base

## Estado actual resumido

Hoy el frontend ya es operable de punta a punta para los flujos visibles principales:

- existe instalador visual para primer arranque
- existe `platform_admin` con login, sesion, dashboard, `Usuarios de plataforma`, `Tenants`, `Provisioning`, `Billing` y `Settings`
- existe tambien `Actividad` de plataforma para auditoria breve de accesos recientes
- `Actividad` ya no solo muestra accesos: ahora tambien expone cambios administrativos recientes sobre tenants
- `Actividad` ya permite leer senales operativas breves y filtrar cambios tenant por tipo de evento y actor
- existe `tenant_portal` con login, resumen, usuarios y finanzas
- `Overview` y `Users` del `tenant_portal` ya respetan el selector de idioma en su lectura principal
- el frontend visible ya quedo conectado al idioma activo en guards, login, recovery, installer, `tenant_portal`, `Dashboard`, `Actividad`, `Settings`, `Usuarios de plataforma`, `Histórico tenants`, `Billing`, `Provisioning`, `Tenants` y el borde legacy de finanzas, incluyendo ya la pasada fina sobre formularios densos y lecturas operativas de `Billing`, `Provisioning` y `Tenants`
- los helpers compartidos de labels, feedback, estados vacios, errores, badges y tablas ya dejaron de forzar español cuando el idioma activo es ingles
- `finance` ya tiene slice frontend propio en `tenant_portal/modules/finance`
- la ruta `/tenant-portal/finance` ya queda servida desde ese slice, preservando la vista actual de movimientos como base operativa
- `finance` ya expone frontend operativo para cuentas, categorias, catalogos auxiliares y configuracion financiera
- `finance` ya permite además asignar iconos semánticos controlados en `Categorías` y releerlos en el catálogo visible
- `finance` ya extiende esa misma convención de iconos controlados a `Cuentas`, `Beneficiarios` y `Personas`
- `finance` ya expone una primera pantalla moderna de transacciones sobre `finance_transactions`, con balances por cuenta, panel de detalle operacional, filtros reales, modo edicion sobre la misma vista y una mesa de trabajo guiada con seleccion multiple, nota, motivo estructurado y confirmacion para favoritas/conciliacion
- `finance` ya permite además adjuntar boletas, facturas o respaldos por transacción, con compresión previa de imágenes antes de subirlas y descarga/eliminación desde el mismo detalle
- `finance` ya permite además anular transacciones erróneas sin borrado físico, conservando trazabilidad y excluyéndolas de balances, listados activos y reportes
- `finance` ya expone una primera pantalla real de `Presupuestos` con lectura mensual `presupuesto vs real`
- `finance` ya expone una pantalla real de `Préstamos` con cartera, cuotas base, próximo vencimiento y cronograma por préstamo
- `finance` ya permite aplicar pagos manuales sobre cuotas del cronograma
- `finance` ya permite elegir reparto del pago entre interés y capital
- `finance` ya permite revertir parcial o totalmente esos abonos sobre cuotas
- `finance` ya permite selección múltiple y operación batch sobre cuotas del cronograma
- `finance` ya expone en `Préstamos` una lectura contable derivada más rica, con resumen operativo y exportación CSV/JSON desde el detalle
- `finance` ya explica desde la propia UI para que sirve sincronizar estructura cuando el schema del tenant quedó atrasado
- `tenant admin` ya puede lanzar esa sincronizacion desde el propio `tenant_portal`, verla como job activo y esperar su cierre sin ejecucion inline
- el contrato legacy `/entries` sigue existiendo solo como compatibilidad
- ya existe una capa comun de mensajes, estados vacios, labels y manejo de errores menos tecnicos
- el frontend ya usa code-splitting por ruta para `platform_admin`, `tenant_portal` y `finance`, reduciendo el bundle inicial y eliminando la advertencia de chunk principal > `500 kB`
- `finance` ya puede considerarse cerrado en su alcance actual como slice base del portal tenant; desde aquí lo que sigue ya es trabajo transversal posterior o expansión nueva del dominio

Lo que queda pendiente ya no es abrir el frontend desde cero.

Lo pendiente es sobre todo:

- cerrar completamente el ciclo basico del tenant y de los operadores de plataforma desde UI
- cerrar la politica visible por rol dentro de `platform_admin`
- refinamiento de UX
- labels y catalogos mas ricos desde backend
- endurecimiento de bordes y automatizacion
- cierre visual y operativo de algunos detalles
- definir la convencion oficial para que los siguientes modulos nazcan como slices coherentes, tomando `finance` como modulo piloto
- `Transacciones` ya cerró la selección asistida en lote sobre el filtro visible; cualquier iteración futura sería solo una expansión de negocio adicional
- `Presupuestos` ya cerró plantillas operativas enriquecidas con escala y redondeo; cualquier preset por tenant queda fuera del alcance actual
- `Préstamos` ya cerró una lectura/exportación contable más densa; cualquier profundización futura sería por necesidad contable nueva
- `Reportes` y `Planificación` ya cerraron la capa de comparativas/charts prevista para este alcance; cualquier densidad adicional queda fuera del cierre actual
- consolidar la adopción visible del auto-sync post-deploy en consola operativa, ahora que ya existe el follow-up automático post-provisioning, la acción masiva desde `Provisioning` y la integración al wrapper de release/verify
- `finance` ya tiene una primera capa visual propia con iconografía semántica, bloques `spotlight` y charts livianos en `Reportes` y `Planificación`; si se sigue por ahí debe ser para densidad adicional, no para abrir esa base desde cero
- el `design system` transversal del PaaS ya quedó aplicado sobre el frontend visible con `AppIcon`, `AppSpotlight`, `AppBadge`, `AppToolbar`, `AppFilterGrid`, `AppTableWrap`, `AppForm` y primitives compartidas; `finance` quedó como primer bloque integral, `Overview` + `Users` ya consumen la misma base, `platform_admin` ya la usa en `Dashboard`, `Actividad`, `Usuarios de plataforma`, `Tenants`, `Histórico tenants`, `Provisioning`, `Billing`, `Settings`, login, recuperación raíz e instalador, y el portal tenant ya absorbió también esa capa en login y el borde legacy de finanzas
- la matriz visible de acceso por rol en `platform_admin` ya quedó centralizada para `SidebarNav`, redirecciones por ruta y gestión de `Usuarios de plataforma`, evitando permisos frontend dispersos entre páginas
- la internacionalizacion transversal del frontend ya quedó resuelta en la superficie visible principal, helpers compartidos, formularios densos y estados operativos; lo que resta baja a editorial secundaria puntual, ayudas largas y futuras pantallas nuevas que se abran fuera del alcance actual
- dejar como pendiente posterior un stack E2E browser para desarrollo local, enfocado en recorridos reales de `platform_admin` y `tenant_portal`, sin bloquear el cierre actual de producto

Nota de ejecucion:

- la documentacion visual ya no debe empujar el ritmo del frontend mientras las pantallas sigan moviendose
- primero conviene cerrar producto, reglas y UX
- despues hacer la recaptura visual final de los bloques estables

## Objetivo del frontend en esta etapa

El objetivo actual ya no es construir la base del frontend.

El objetivo ahora es este:

- cerrar experiencia operativa y consistencia visual del bloque basico tenant
- seguir consumiendo backend como fuente de verdad
- endurecer mensajes, estados y catalogos visibles
- preservar code-splitting por ruta para que los nuevos slices no vuelvan a inflar el chunk inicial
- dejar el frontend listo para crecer sin retrabajo grande antes de abrir nuevos modulos
- tratar `finance` como modulo base visible del SaaS antes de abrir otros dominios tenant
- mantener `tenant_portal/modules/finance` como estructura canonica para la evolucion del modulo
- tratar `finance` como primer slice cerrado y ya migrado como referencia del `design system` transversal, no como módulo todavía abierto por defecto

## Principio rector

El frontend debe consumir el backend como fuente de verdad.

Eso implica:

- no hardcodear estados, modulos o claves de cuota cuando ya existen por API
- preferir `GET /platform/capabilities` para poblar catalogos, labels y agrupaciones
- mantener en frontend la logica de presentacion, no la logica central de negocio

## Etapa F1. Auth y Shell Base

Estado: `Completado`

Objetivo:

- login platform
- persistencia de sesion
- refresh de token
- layout base
- navegacion
- manejo comun de `401`, `403` y errores API

Entregables minimos:

- pantalla de login
- store de sesion
- cliente HTTP base
- layout con sidebar o navegacion superior
- proteccion de rutas privadas

Avance actual:

- scaffold Vite + React + TypeScript creado en `frontend/`
- `platform_admin` con login inicial, sesion persistida y logout
- shell base con `SidebarNav`, `Topbar` y rutas protegidas
- cliente HTTP simple sobre `fetch`
- manejo comun de `401` con expulsion correcta por scope
- expiracion por inactividad y warning previo de sesion
- persistencia de sesion en `sessionStorage`

## Etapa F2. Catalogo de Capacidades

Estado: `Completado`

Objetivo:

- hacer el frontend `backend-driven` desde el comienzo

Entregables minimos:

- consumo de `GET /platform/capabilities`
- mapeo UI para:
  - `tenant_statuses`
  - `tenant_billing_statuses`
  - `maintenance_scopes`
  - `maintenance_access_modes`
  - `module_limit_capabilities`

Esto evita hardcodear claves como:

- `core.users.admin`
- `finance.entries.monthly.income`

Avance actual:

- dashboard inicial leyendo `GET /platform/capabilities`
- tabla base de `module_limit_capabilities`
- metric cards simples basadas en el catalogo expuesto por backend
- `Billing`, `Tenants` y `tenant_portal` ya consumen labels y capacidades sin depender de tanto hardcodeo visual

## Etapa F3. Tenants List y Detalle

Estado: `Completado`

Objetivo:

- hacer visible el dominio principal de operacion platform

Entregables minimos:

- listado de tenants
- detalle de tenant
- cards o secciones para:
  - status
  - billing
  - maintenance
  - access policy
  - module usage

APIs base sugeridas:

- endpoints `platform/tenants/*`
- `GET /platform/tenants/{tenant_id}/access-policy`
- `GET /platform/tenants/{tenant_id}/module-usage`

Avance actual:

- listado base de tenants ya montado en `platform_admin`
- seleccion de tenant y panel de detalle inicial
- lectura de `access-policy` y `module-usage` desde backend
- lectura operativa de billing, mantenimiento, politica de acceso y uso por modulo ya integrada

## Etapa F4. Acciones Administrativas de Tenant

Estado: `Completado`

Objetivo:

- operar el tenant desde UI

Entregables minimos:

- alta visual de tenant
- edicion basica de identidad tenant
- archivo de tenant como baja operativa segura
- cambio de `status`
- cambio de `maintenance`
- cambio de `plan`
- cambio de `rate-limit`
- cambio de `module-limits`
- edicion de billing identity y billing state

Condicion importante:

- estas pantallas deben reutilizar el catalogo de capacidades del backend

Avance actual:

- backend ya permite crear tenants por API
- `Tenants` ya permite crear tenants desde frontend con nombre, slug, tipo y plan inicial
- `Tenants` ya permite buscar y filtrar por nombre, slug, tipo, estado y billing
- `Tenants` ya permite editar identidad basica del tenant para `name` y `tenant_type`
- `Tenants` ya expone `archivar tenant` como baja operativa segura usando el lifecycle existente
- `Tenants` ya expone `restaurar tenant` como flujo formal solo para tenants archivados, con estado destino explicito
- `Tenants` ya expone `eliminar tenant` como borrado seguro para tenants archivados sin DB tenant materializada; antes de borrar, backend resume la auditoria minima en `tenant_retirement_archives`
- la barra lateral ya expone `Histórico tenants` como vista propia para consultar retirados sin mantenerlos en la lista principal
- `Histórico tenants` ya deja abrir el detalle del archivo historico solo bajo demanda y volver a colapsarlo sin dejar el panel expandido por defecto
- `Tenants` ya muestra el ultimo job de provisioning del tenant seleccionado con acceso rapido a la consola global y acciones directas segun estado
- `Tenants` ya muestra tambien el estado de esquema tenant con version actual, ultima version disponible, migraciones pendientes y ultima sincronizacion
- `Tenants` ya permite rotar credenciales tecnicas de DB tenant cuando la base ya esta materializada
- `Tenants` ya expone `Reprovisionar tenant` para estados inconsistentes donde existe historial `completed`, pero la DB tenant sigue incompleta
- pendiente futuro: decidir si vale la pena abrir un `reprovisionado profundo` separado para tenants ya materializados, con controles mucho mas estrictos
- `Tenants` ya permite operar `status`
- `Tenants` ya permite operar `maintenance`
- `Tenants` ya permite operar `billing`
- `Tenants` ya permite operar `plan`
- `Tenants` ya permite operar `rate-limit`
- `Tenants` ya permite operar `billing identity`
- `Tenants` ya permite operar `module-limits`
- `Tenants` ya muestra `policy history` del tenant
- `Tenants` ya permite abrir `Tenant Portal` con el tenant seleccionado precargado
- `Tenants` ya pide confirmacion previa para acciones administrativas sensibles
- `Tenants` ya oculta el bloque de usuarios/reset del portal cuando el tenant fue desprovisionado y ya no existe DB tenant operable
- `Tenants` ya deja un acceso corto a `Histórico tenants` en vez de mezclar auditoria de retirados dentro de la misma columna operativa
- `Histórico tenants` ya soporta filtros server-side por tipo, billing, actor y ventana de retiro, y tambien exportacion `CSV/JSON` del resultado visible
- `Tenants` ya usa la misma capa compartida de formularios, toolbar y badges en alta, filtros y operación central, sin depender de tantos layouts manuales por bloque

Pendientes finos conocidos:

- decidir si `slug` queda definitivamente estable y, si es asi, mantener la edicion basica limitada a `name` y `tenant_type`
- mantener `delete` acotado al flujo seguro actual y no abrir todavia un borrado duro para tenants provisionados
- decidir mas adelante si vale la pena abrir una restauracion mas rica o si el flujo actual `archived -> restore` ya es suficiente
- revisar el tono final de varias ayudas `?` para que suenen menos tecnicas
- decidir si todas las ayudas `?` actuales aportan o si algunas deben simplificarse o salir
- seguir refinando labels visibles para que conceptos de negocio y operacion suenen mas naturales segun contexto, aunque ya no dependemos de codigos crudos para casos comunes
- exponer desde backend catalogos mas ricos para planes y estados, de forma que la UI no dependa de codigos internos
- seguir puliendo mensajes de exito y CTA segun contexto, aunque ya existe una primera capa comun menos cercana a respuesta cruda de API

Lectura practica:

- la operacion sobre tenants ya esta avanzada
- el CRUD basico seguro ya esta muy cerca de cierre
- lo que sigue abierto aqui es sobre todo politica de producto: confirmar `slug` estable y seguir sin `delete` fisico por ahora
- la trazabilidad de esquema tenant ya no depende de revisar tablas a mano ni de recordar la ultima migracion aplicada

Bloque basico ya cerrado en paralelo:

- `Usuarios de plataforma` ya existe como flujo visible en `platform_admin`
- hoy ya permite listar operadores, crear usuarios, editar nombre y rol, activar o desactivar acceso, resetear contraseña inicial y borrar usuarios no criticos
- la politica ya bloquea crear o promover mas de un `superadmin` activo, protege que siempre quede uno activo y deja `superadmin` fuera del borrado
- ya existe un rol `admin` intermedio para gobernar usuarios `support` sin tocar la cuenta raiz
- `Actividad` ya existe como flujo visible para `superadmin` y `admin`
- `Actividad` ya deja separar mejor ruido normal de una senal operativa con el bloque `Que revisar ahora`
- `Actividad` ya puede filtrar cambios tenant por `event_type` y por correo del actor sin depender de buscar a mano dentro de toda la tabla
- `support` ya no ve `Actividad` ni los bloques exclusivos de `superadmin`, evitando rutas visibles que terminen en `403`
- el instalador ya define la cuenta raiz inicial y emite una clave de recuperacion de una sola vez
- el login ya expone un flujo formal de `Recuperar cuenta raíz` en vez de depender de seeds o credenciales por defecto

Avance reciente de lenguaje y labels:

- `Tenants` ya traduce estados internos frecuentes como `past_due`, `retry_pending`, `canceled` o `trialing`
- `Tenants` ya muestra nombres mas legibles para fuentes de bloqueo y modos de mantenimiento
- `Billing` ya presenta `processing_result` y `billing_status` con labels mas comprensibles
- `tenant_portal` ya muestra roles, tipos, fuentes y estados de uso por modulo con etiquetas menos tecnicas
- el login tenant y la lectura de `access_detail` ya traducen mejor bloqueos comunes de lifecycle y billing
- `Tenants`, `Billing`, `Provisioning` y `tenant_portal` ya muestran mensajes de exito y encabezados de accion mas cercanos a lenguaje operativo
- el bloque base de usuarios tenant ya cubre lectura clara de `core.users`, `core.users.active`, `core.users.monthly` y limites por rol sin dejar mensajes crudos de error

## Etapa F5. Provisioning y Operacion

Estado: `En progreso`

Objetivo:

- hacer visible la parte operativa que hoy vive solo en API

Entregables minimos:

- tabla de provisioning jobs
- metricas por tenant
- metricas por `job_type`
- alertas
- DLQ y acciones de requeue

Avance actual:

- `Provisioning` ya muestra el catalogo actual de jobs
- `Provisioning` ya muestra metricas por tenant
- `Provisioning` ya muestra metricas por `job_type`
- `Provisioning` ya muestra alertas activas
- `Provisioning` ya permite inspeccionar DLQ y hacer requeue individual o batch
- `Provisioning` ya muestra mensajes de error por accion con el detalle real del backend
- `Provisioning` ya pide confirmacion previa antes del reencolado batch de DLQ
- `Provisioning` ya pide tambien confirmacion previa al reencolar un job fallido o forzar ejecucion manual
- `Provisioning` ya traduce mejor `job_type`, `alert_code` y `error_code` sin perder el codigo tecnico
- `Provisioning` ya permite ejecutar desde la consola un job `pending` o `retry_pending`
- `Provisioning` ya muestra fallos agregados por `error_code`
- `Provisioning` ya muestra ciclos recientes del worker para distinguir backlog de ejecucion
- `Provisioning` ya muestra un bloque corto de `Jobs que requieren accion` para decidir rapido si conviene ejecutar, esperar retry o reencolar
- `Provisioning` ya permite exportar el catálogo visible de jobs en `CSV` y un snapshot operativo completo en `JSON`

Lectura practica:

- la pantalla ya es funcional y mas explicita
- lo pendiente queda mas cerca de endurecimiento del worker que de falta de controles basicos en la UI

## Etapa F6. Billing Operativo

Estado: `En progreso`

Objetivo:

- hacer operable desde UI la capa de billing ya implementada en backend

Entregables minimos:

- historial de eventos
- resumen por proveedor, tipo y `processing_result`
- alertas de billing
- reconciliacion individual y batch
- policy history del tenant

Avance actual:

- `Billing` ya muestra resumen global por proveedor, `event_type` y `processing_result`
- `Billing` ya muestra alertas activas e historial de alertas
- `Billing` ya permite seleccionar tenant y leer su historial de eventos
- `Billing` ya permite reconciliacion individual por evento persistido
- `Billing` ya permite reconciliacion batch sobre el filtro activo del tenant
- `Billing` ya traduce mejor estados de facturacion y resultados de procesamiento para lectura operativa
- `Billing` ya muestra un bloque corto de `Que revisar ahora` para separar alertas vivas, historial estabilizado y necesidad real de reconcile
- `Billing` ya pide confirmacion previa antes de reconciliar un evento individual o un lote filtrado
- `Billing` ya permite exportar el workspace visible en `JSON` y los eventos del tenant seleccionado en `CSV`

Lectura practica:

- la operacion de billing ya esta visible y usable
- sigue abierta por refinamiento de estados de negocio, textos y mas casos de borde

## Etapa F7. Dashboard Platform

Estado: `En progreso`

Objetivo:

- dar una vista ejecutiva minima, no solo pantallas de detalle

Entregables minimos:

- KPIs base
- estado general de tenants
- alertas activas de provisioning y billing
- accesos rapidos a operaciones relevantes

Avance actual:

- `Dashboard` ya muestra KPIs base de tenants, provisioning y billing
- `Dashboard` ya destaca tenants con atencion operativa inmediata
- `Dashboard` ya muestra focos de provisioning y billing para soporte
- `Dashboard` ya incluye accesos rapidos hacia `Tenants`, `Provisioning` y `Billing`
- `Dashboard` ya usa un lenguaje mas ejecutivo y menos tecnico en cards, focos y tablas
- `Settings` ya expone sesion actual, `API configurada`, `API esperada en esta red`, catalogo backend y alcance de la UI
- `Settings` ya expone tambien estado visible de cuenta raiz y recuperacion, para no depender solo del instalador o del login de recuperacion
- `Settings` ya resume tambien la gobernanza visible de acceso de plataforma para detectar rapido si quedaron multiples `superadmin`, cuantos `admin` activos existen y cuanto soporte operativo esta habilitado
- `Settings` ya expone tambien la postura de secretos y runtime sin mostrar valores sensibles
- `Settings` ya no colapsa completa si falla solo el bloque de `root recovery`; las lecturas se resuelven por bloque y el warning queda localizado

Pendiente fino conocido:

- sigue pendiente alinear de forma definitiva la configuracion real del frontend con el host efectivo, aunque `Settings` ya hace visible la diferencia entre URL configurada y URL esperada en la red actual
- queda cerrado el bug donde `GET /platform/auth/root-recovery/status` podia devolver `401` aun siendo parte del flujo publico de recuperacion; el middleware ya lo trata como ruta publica

Lectura practica:

- dashboard y settings ya existen y sirven
- esta etapa sigue abierta por cierre visual y consistencia final, no por falta de funcionalidad base

## Etapa F8. Portal Tenant

Estado: `En progreso`

Objetivo:

- abrir la segunda app del frontend solo cuando `platform` ya sea operable

Orden sugerido dentro del portal tenant:

1. auth tenant
2. shell tenant
3. vista de `tenant/info`
4. usuarios
5. `finance`

Avance actual:

- existe login tenant separado del `platform_admin`
- existe shell inicial para el portal tenant
- la primera pantalla ya consume `GET /tenant/info`
- la primera pantalla ya consume `GET /tenant/module-usage`
- `Users` ya tiene listado, alta basica y cambio de estado
- `Finance` ya tiene resumen, uso efectivo, listado y alta basica de movimientos
- `Finance` ya tiene tambien contratos backend CRUD para catalogos base, aunque aun no se abren sus vistas dedicadas
- `Finance` ya tiene una vista real de `Presupuestos` con comparacion mensual `presupuesto vs real`
- `Finance` ya tiene una vista real de `Préstamos` con cartera básica y filtros por estado/tipo
- el portal ya refleja enforcement real de billing y limites por modulo
- el portal ya traduce mejor roles, fuentes y estados visibles

Lectura practica:

- el portal tenant ya es funcional para los flujos base
- sigue abierto por refinamiento de UX, onboarding y mensajes

## Que frontend NO conviene abrir aun

Antes de cerrar `platform` base, no conviene:

- abrir muchos modulos visuales en paralelo
- intentar dashboards muy ricos desde el dia uno
- meter mucha logica de negocio en el cliente
- diseñar pantallas que ignoren el catalogo de capacidades ya expuesto por backend

Referencia de estabilizacion previa:

- [Baseline de UX para frontend](./frontend-ux-baseline.md)

## Criterio de cierre del frontend base

El frontend base de plataforma puede considerarse cerrado cuando:

- login y sesion funcionan de forma estable
- existe shell base usable
- tenants pueden verse y operarse desde UI
- provisioning y billing tienen vistas operativas minimas
- el cliente consume capacidades backend sin hardcodear politicas principales

Estado real frente a este criterio:

- ese frontend base ya puede considerarse conseguido
- lo que sigue es cierre de producto, no apertura de base

## Orden recomendado

1. Auth y shell base
2. Catalogo de capacidades
3. Tenants list y detalle
4. Acciones administrativas de tenant
5. Provisioning y operacion
6. Billing operativo
7. Dashboard platform
8. Portal tenant

## Resumen ejecutivo

El frontend ya dejo de ser una iniciativa temprana.

Hoy la lectura correcta es esta:

- `platform_admin`, instalador y `tenant_portal` ya existen
- los flujos principales ya son usables
- el roadmap sigue abierto sobre todo por refinamiento, labels, catalogos y endurecimiento de bordes

## Pendientes de UX

- refinar todavia mas el login de `tenant_portal` para hacerlo menos tecnico y mas evidente para usuario final, manteniendo el acceso rapido desde `Tenants` para superadmin
- seguir endureciendo copy, estados vacíos y microcopy operativo ahora que la capa visual compartida ya quedó aplicada

## Prioridades inmediatas

Lo mas rentable para las proximas sesiones es esto:

1. cerrar el tramo fino de internacionalizacion transversal del frontend, aprovechando que la base visible principal y los helpers ya quedaron bajo idioma activo
2. decidir el siguiente módulo tenant grande después de `finance`, ya con slices naciendo sobre la convención visual actual
3. seguir endureciendo bordes reales solo cuando aparezcan durante cambios funcionales, evitando volver a modo de prueba manual pesada por defecto
4. pedir al backend catálogos más ricos para planes, estados y ayudas visibles donde todavía asomen códigos internos
5. documentar de inmediato cada validación importante y cada captura útil para no tener que reconstruir contexto después
