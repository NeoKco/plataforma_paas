# Roadmap de Frontend

Este documento ya no describe solo un plan de construccion. Tambien deja el estado real del frontend despues de las iteraciones ya implementadas sobre `platform_admin`, `tenant_portal` e instalador.

La idea es evitar dos errores comunes:

- empezar el frontend sin un orden claro
- abrir muchas pantallas antes de estabilizar auth, layout y contratos base

## Estado actual resumido

Hoy el frontend ya es operable de punta a punta para los flujos visibles principales:

- existe instalador visual para primer arranque
- existe `platform_admin` con login, sesion, dashboard, `Usuarios de plataforma`, `Tenants`, `Provisioning`, `Billing` y `Settings`
- existe `tenant_portal` con login, resumen, usuarios y finanzas
- ya existe una capa comun de mensajes, estados vacios, labels y manejo de errores menos tecnicos

Lo que queda pendiente ya no es abrir el frontend desde cero.

Lo pendiente es sobre todo:

- cerrar el ciclo basico de tenants y operadores de plataforma desde UI
- refinamiento de UX
- labels y catalogos mas ricos desde backend
- endurecimiento de bordes y automatizacion
- cierre visual y operativo de algunos detalles

Nota de ejecucion:

- la documentacion visual ya no debe empujar el ritmo del frontend mientras las pantallas sigan moviendose
- primero conviene cerrar producto, reglas y UX
- despues hacer la recaptura visual final de los bloques estables

## Objetivo del frontend en esta etapa

El objetivo actual ya no es construir la base del frontend.

El objetivo ahora es este:

- cerrar experiencia operativa y consistencia visual
- seguir consumiendo backend como fuente de verdad
- endurecer mensajes, estados y catalogos visibles
- dejar el frontend listo para crecer sin retrabajo grande

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

Estado: `En progreso`

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

Pendientes finos conocidos:

- decidir si `slug` queda definitivamente estable y, si es asi, mantener la edicion basica limitada a `name` y `tenant_type`
- no abrir `delete` duro mientras no exista una politica clara sobre DB tenant, billing history, policy history y auditoria
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

Bloque basico ya cerrado en paralelo:

- `Usuarios de plataforma` ya existe como flujo visible en `platform_admin`
- hoy ya permite listar operadores, crear usuarios, editar nombre y rol, activar o desactivar acceso y resetear contraseña inicial
- la politica ya bloquea crear o promover mas de un `superadmin` activo y tambien protege que siempre quede uno activo

Avance reciente de lenguaje y labels:

- `Tenants` ya traduce estados internos frecuentes como `past_due`, `retry_pending`, `canceled` o `trialing`
- `Tenants` ya muestra nombres mas legibles para fuentes de bloqueo y modos de mantenimiento
- `Billing` ya presenta `processing_result` y `billing_status` con labels mas comprensibles
- `tenant_portal` ya muestra roles, tipos, fuentes y estados de uso por modulo con etiquetas menos tecnicas
- `Tenants`, `Billing`, `Provisioning` y `tenant_portal` ya muestran mensajes de exito y encabezados de accion mas cercanos a lenguaje operativo

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
- `Provisioning` ya traduce mejor `job_type`, `alert_code` y `error_code` sin perder el codigo tecnico

Lectura practica:

- la pantalla ya es funcional
- lo pendiente es enriquecer la comprension operativa y cerrar mejor algunos casos de recuperacion

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

Pendiente fino conocido:

- sigue pendiente alinear de forma definitiva la configuracion real del frontend con el host efectivo, aunque `Settings` ya hace visible la diferencia entre URL configurada y URL esperada en la red actual

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
- seguir cerrando dashboard y settings hasta dejarlos con el mismo nivel de claridad ya alcanzado por `Tenants`, `Billing` y `tenant_portal`

## Prioridades inmediatas

Lo mas rentable para las proximas sesiones es esto:

1. cerrar el flujo basico de tenants desde `platform_admin`: crear, editar identidad basica, archivar y filtrar
2. definir explicitamente que `archivar` es la baja operativa base y que `delete` fisico no se abre todavia
3. rematar `Dashboard` y `Settings`, que ya mejoraron su lenguaje y lectura operativa pero todavia pueden ganar consistencia final
4. seguir endureciendo bordes reales solo cuando aparezcan durante cambios funcionales, evitando volver a modo de prueba manual pesada por defecto
5. pedir al backend catalogos mas ricos para planes, estados y ayudas visibles donde todavia asomen codigos internos
6. documentar de inmediato cada validacion importante y cada captura util para no tener que reconstruir contexto despues
