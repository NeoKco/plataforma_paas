# Manual Visual de la App

Este manual esta pensado para entender la app mirandola como producto y no solo como codigo.

Su objetivo es responder:

- que pantalla corresponde a cada etapa
- que significa lo que se ve
- como distinguir un estado sano de uno incompleto
- que capturas conviene guardar para tener un recorrido visual estable

## Alcance del manual

Este documento cubre el flujo actual visible de:

- `platform_admin`
- `tenant_portal`

Y separa tres momentos:

1. arranque inicial esperado del producto
2. operacion desde `platform_admin`
3. trabajo normal desde `tenant_portal`

## Estado actual del producto

Hoy el backend ya soporta un modo instalador, pero el frontend todavia no muestra un wizard visual de primera ejecucion.

Por eso el recorrido real que hoy puede verse en navegador comienza por:

- login de `platform_admin`

Nota operativa:

- el login de `tenant_portal` ya es usable, pero su UX todavia tiene refinamientos pendientes para hacerlo mas natural para usuario final
- el set de capturas actual sirve para comprender la app, pero conviene hacer una recaptura final cuando se estabilice la siguiente pasada de frontend para no duplicar trabajo visual

Cuando se implemente el instalador visual, este manual ya deja definido donde encaja esa pantalla.

## Carpeta sugerida para capturas

Guardar las capturas en:

- `docs/assets/app-visual-manual/`

Con esta convencion:

- `01-platform-login.png`
- `02-platform-dashboard.png`
- `03-tenants-catalog.png`
- `04-tenant-pending.png`
- `05a-tenant-active-header.png`
- `05b-tenant-active-usage.png`
- `05c-tenant-billing-past-due-summary.png`
- `05d-tenant-billing-controls-identity.png`
- `06a-provisioning-jobs-overview.png`
- `06b-provisioning-metrics-alerts.png`
- `06c-provisioning-dlq.png`
- `07a-billing-overview-filters.png`
- `07b-billing-summary-alerts-workspace.png`
- `07c-billing-tenant-events-reconcile.png`
- `07d-billing-reconciled-workspace.png`
- `08a-platform-settings-overview.png`
- `08b-platform-settings-capabilities.png`
- `08c-platform-settings-enums-scope.png`
- `09-tenant-portal-login.png`
- `10-tenant-portal-overview.png`
- `10b-tenant-portal-posture-current-user.png`
- `10c-tenant-portal-module-usage.png`
- `11a-tenant-users-overview.png`
- `11b-tenant-users-form-list.png`
- `12a-tenant-finance-overview-form.png`

## Estado de capturas

Este bloque sirve para ir completando el manual de forma iterativa.

| Archivo | Pantalla | Estado |
| --- | --- | --- |
| `00-installer-first-run.png` | instalador inicial | pendiente |
| `01-platform-login.png` | login platform | listo |
| `02-platform-dashboard.png` | resumen operativo | listo |
| `03-tenants-catalog.png` | catalogo tenant | listo |
| `04-tenant-pending.png` | tenant incompleto | pendiente |
| `05a-tenant-active-header.png` | tenant operativo: contexto | listo |
| `05b-tenant-active-usage.png` | tenant operativo: uso por modulo | listo |
| `05c-tenant-billing-past-due-summary.png` | tenant operativo: billing en deuda con gracia | listo |
| `05d-tenant-billing-controls-identity.png` | tenant operativo: controles billing e identidad | listo |
| `06a-provisioning-jobs-overview.png` | provisioning: jobs y resumen | listo |
| `06b-provisioning-metrics-alerts.png` | provisioning: metricas y alertas | listo |
| `06c-provisioning-dlq.png` | provisioning: DLQ y recuperacion | listo |
| `07a-billing-overview-filters.png` | billing: resumen y filtros | listo |
| `07b-billing-summary-alerts-workspace.png` | billing: resumen, alertas y workspace tenant | listo |
| `07c-billing-tenant-events-reconcile.png` | billing: eventos tenant y reconcile | listo |
| `07d-billing-reconciled-workspace.png` | billing: workspace reconciliado | listo |
| `08a-platform-settings-overview.png` | configuracion: sesion y resumen | listo |
| `08b-platform-settings-capabilities.png` | configuracion: catalogo de capacidades | listo |
| `08c-platform-settings-enums-scope.png` | configuracion: enumeraciones y alcance | listo |
| `09-tenant-portal-login.png` | login tenant | listo |
| `10-tenant-portal-overview.png` | overview tenant | listo |
| `10b-tenant-portal-posture-current-user.png` | overview tenant: postura y usuario actual | listo |
| `10c-tenant-portal-module-usage.png` | overview tenant: uso por modulo | listo |
| `11a-tenant-users-overview.png` | usuarios tenant: resumen y contexto | listo |
| `11b-tenant-users-form-list.png` | usuarios tenant: alta y listado | listo |
| `12a-tenant-finance-overview-form.png` | finanzas tenant: resumen, uso y alta | listo |

## Orden recomendado para capturar

Para aprender la app en una secuencia razonable, conviene hacerlo asi:

1. `01-platform-login.png`
2. `02-platform-dashboard.png`
3. `03-tenants-catalog.png`
4. `04-tenant-pending.png`
5. `05a-tenant-active-header.png`
6. `05b-tenant-active-usage.png`
7. `05c-tenant-billing-past-due-summary.png`
8. `05d-tenant-billing-controls-identity.png`
9. `06a-provisioning-jobs-overview.png`
10. `06b-provisioning-metrics-alerts.png`
11. `06c-provisioning-dlq.png`
12. `07a-billing-overview-filters.png`
13. `07b-billing-summary-alerts-workspace.png`
14. `07c-billing-tenant-events-reconcile.png`
15. `07d-billing-reconciled-workspace.png`
16. `08a-platform-settings-overview.png`
17. `08b-platform-settings-capabilities.png`
18. `08c-platform-settings-enums-scope.png`
19. `09-tenant-portal-login.png`
20. `10-tenant-portal-overview.png`
21. `10b-tenant-portal-posture-current-user.png`
22. `10c-tenant-portal-module-usage.png`
23. `11a-tenant-users-overview.png`
24. `11b-tenant-users-form-list.png`
25. `12a-tenant-finance-overview-form.png`

Con este set ya queda explicado casi todo el producto visible actual.

## Recorrido visual recomendado

### 1. Instalador de primera ejecucion

Estado actual:

- backend listo
- frontend pendiente

Esta pantalla todavia no existe visualmente, pero el producto ideal deberia empezar aqui cuando la plataforma aun no esta instalada. En ese momento el sistema deberia pedir configuracion de base de control, bootstrap inicial y creacion del primer acceso administrativo.

### 2. Entrada a `platform_admin`

![Login de Platform Admin](../assets/app-visual-manual/01-platform-login.png)

Esta es la puerta de entrada del operador central. La pantalla ya deja clara la separacion entre dos mundos:

- `Platform Admin` para operar la plataforma
- `Tenant Portal` para operar un tenant puntual

Que conviene mirar aqui:

- selector de idioma
- formulario simple
- cambio visible entre ambos portales

### 3. Resumen operativo

![Dashboard de plataforma](../assets/app-visual-manual/02-platform-dashboard.png)

Esta pantalla sirve para leer la salud global de la plataforma sin entrar todavia al detalle. Es una vista ejecutiva, no una mesa de trabajo fina. Lo importante aqui es:

- KPIs de tenants
- presion operativa de provisioning
- alertas o anomalías de billing
- accesos rapidos hacia las pantallas donde realmente se corrigen cosas

### 4. Catalogo de tenants

![Catalogo de tenants](../assets/app-visual-manual/03-tenants-catalog.png)

`Tenants` es la pantalla mas importante para entender el producto. Desde aqui se ve el catalogo a la izquierda y el tenant seleccionado a la derecha. Este cruce entre listado y detalle permite leer rapidamente:

- `slug`
- tipo de tenant
- lifecycle
- billing
- maintenance
- plan

Si alguien quiere entender en que estado real se encuentra un tenant, casi siempre debe empezar aqui.

### 5. Tenant sano y operativo

#### Contexto general

![Tenant activo: encabezado](../assets/app-visual-manual/05a-tenant-active-header.png)

La primera captura muestra identidad y contexto:

- nombre del tenant
- `slug`
- estado `active`
- politica y estado general

#### Uso por modulo

![Tenant activo: uso por modulo](../assets/app-visual-manual/05b-tenant-active-usage.png)

La segunda captura confirma que el tenant ya no esta solo “activo” en lifecycle, sino realmente operativo. Cuando este bloque responde bien, normalmente ya se cumplieron tres condiciones:

- la DB tenant existe
- el secreto de conexion esta resuelto
- las migraciones tenant estan aplicadas

#### Billing en deuda con gracia

![Tenant activo: billing past_due con gracia](../assets/app-visual-manual/05c-tenant-billing-past-due-summary.png)

Esta captura agrega un caso importante: un tenant puede seguir `active` y `permitido`, pero quedar en `past_due` si entro a deuda y aun esta dentro de la ventana de gracia.

Aqui conviene mirar:

- `Facturación = past_due`
- `Billing en gracia = si`
- fechas de fin de periodo y gracia
- razon operativa del cambio

#### Controles billing e identidad

![Tenant activo: controles billing e identidad](../assets/app-visual-manual/05d-tenant-billing-controls-identity.png)

Esta vista sirve para entender donde se opera el billing manual desde `Tenants`:

- estado billing
- razon
- fechas
- plan
- identidad de billing (`provider`, `customer_id`, `subscription_id`)

### 6. Provisioning

#### Jobs y resumen

![Provisioning: jobs y resumen](../assets/app-visual-manual/06a-provisioning-jobs-overview.png)

#### Metricas y alertas

![Provisioning: metricas y alertas](../assets/app-visual-manual/06b-provisioning-metrics-alerts.png)

#### DLQ y recuperacion

![Provisioning: DLQ](../assets/app-visual-manual/06c-provisioning-dlq.png)

Esta pantalla explica por que un tenant nuevo no siempre queda listo apenas se crea en `platform_control`. Aqui se ve el tramo tecnico que:

- crea la DB tenant
- registra jobs
- muestra fallas
- permite reencolar trabajo

Lectura recomendada:

- `06a` para entender backlog y jobs
- `06b` para ver presion operativa y alertas
- `06c` para diagnosticar errores que terminaron en DLQ

### 7. Facturacion

#### Resumen y filtros

![Billing: resumen y filtros](../assets/app-visual-manual/07a-billing-overview-filters.png)

#### Alertas y workspace

![Billing: alertas y workspace](../assets/app-visual-manual/07b-billing-summary-alerts-workspace.png)

#### Eventos tenant y reconcile

![Billing: eventos y reconcile](../assets/app-visual-manual/07c-billing-tenant-events-reconcile.png)

#### Workspace reconciliado

![Billing: workspace reconciliado](../assets/app-visual-manual/07d-billing-reconciled-workspace.png)

`Facturacion` es una consola operativa, no una simple vista contable. Sirve para:

- leer eventos de billing
- detectar alertas
- mirar historial
- trabajar un tenant concreto
- lanzar reconcile individual o por lote

Con la captura `07d` ya puede verse tambien el paso siguiente del flujo:

- un evento ya aplicado
- luego reconciliado
- y el workspace actualizado con el resultado `reconciled`

Si quieres ver el flujo completo ya explicado con pasos, estado tenant y reconcile real, revisa:

- [Prueba guiada de billing](../runbooks/billing-guided-test.md)

### 8. Configuracion de plataforma

#### Sesion y contexto

![Settings: sesion y resumen](../assets/app-visual-manual/08a-platform-settings-overview.png)

#### Capacidades backend

![Settings: capacidades backend](../assets/app-visual-manual/08b-platform-settings-capabilities.png)

#### Enumeraciones y alcance

![Settings: enums y alcance](../assets/app-visual-manual/08c-platform-settings-enums-scope.png)

Esta pantalla no es “configuracion de negocio”; es soporte tecnico y transparencia operacional. Sirve para responder preguntas como:

- a que backend esta apuntando el frontend
- que capacidades declara el backend
- que enums y catalogos estan siendo consumidos
- que alcance funcional tiene realmente esta build

### 9. Entrada a `tenant_portal`

![Login de Tenant Portal](../assets/app-visual-manual/09-tenant-portal-login.png)

El login tenant ya es util, aunque su UX todavia tiene refinamientos pendientes. Lo importante es que esta pantalla ya diferencia claramente:

- el acceso del usuario tenant
- el acceso de `Platform Admin`

Tambien expone una ayuda contextual ligera para los campos menos obvios.

### 10. Overview del tenant

#### Shell y resumen principal

![Tenant portal overview](../assets/app-visual-manual/10-tenant-portal-overview.png)

Esta pantalla es la entrada natural del usuario tenant despues del login. Resume el espacio que esta operando y da contexto antes de entrar a usuarios o finanzas.

#### Postura y usuario actual

![Tenant posture y usuario actual](../assets/app-visual-manual/10b-tenant-portal-posture-current-user.png)

Aqui se ve:

- postura efectiva del tenant
- estado de acceso
- identidad del operador actual

#### Uso por modulo

![Tenant module usage](../assets/app-visual-manual/10c-tenant-portal-module-usage.png)

Este bloque traduce al lenguaje del tenant algo que en `Platform Admin` se ve desde operacion central: uso real por modulo y su estado efectivo.

### 11. Usuarios del tenant

#### Resumen y contexto

![Usuarios tenant: resumen](../assets/app-visual-manual/11a-tenant-users-overview.png)

#### Alta y listado

![Usuarios tenant: alta y listado](../assets/app-visual-manual/11b-tenant-users-form-list.png)

La pantalla `Usuarios` ya es una slice funcional real. Permite:

- ver metricas rapidas
- entender el contexto del operador actual
- crear usuarios
- listar usuarios del tenant
- activar o desactivar cuentas

### 12. Finanzas del tenant

![Finanzas tenant](../assets/app-visual-manual/12a-tenant-finance-overview-form.png)

La pantalla `Finanzas` muestra una segunda slice funcional del tenant portal. Hoy permite:

- ver resumen de ingresos, egresos y balance
- consultar uso efectivo del modulo financiero
- crear movimientos
- listar movimientos cuando existan

## Como leer el producto con este manual

Si alguien quiere entender rapidamente la app, el orden mas util no es “mirar todo”, sino este:

1. login de plataforma
2. dashboard
3. catalogo de tenants
4. un tenant sano
5. provisioning
6. billing
7. login tenant
8. overview tenant
9. usuarios
10. finanzas

Ese recorrido deja bastante claro:

- que parte opera el superadmin
- que parte opera el tenant
- como un tenant pasa de existir a estar realmente usable
- donde se resuelven los problemas cuando algo falla

## Huecos actuales que este manual deja visibles

El manual tambien sirve para ver lo que aun falta:

- instalador visual de primera ejecucion
- captura real de un tenant incompleto `04-tenant-pending.png`
- mas pulido UX en el login de `tenant_portal`

## Problema -> pantalla donde se resuelve

Esta es la tabla practica que mas ayuda cuando uno todavia no domina la app.

| Problema o pregunta | Pantalla principal | Que deberias mirar |
| --- | --- | --- |
| No se si la plataforma esta sana en general | `Dashboard` | KPIs, focos operativos, alertas visibles |
| No se en que estado real esta un tenant | `Tenants` | lifecycle, billing, maintenance, access policy |
| Un tenant existe pero no parece utilizable | `Tenants` + `Provisioning` | si falta DB, schema o jobs pendientes |
| Un tenant no carga `module-usage` | `Tenants` | mensaje operativo y bloque `Uso por modulo` |
| Un tenant nuevo no quedo provisionado | `Provisioning` | jobs `create_tenant_database`, alertas y DLQ |
| Hay errores tecnicos de aprovisionamiento | `Provisioning` | DLQ, backlog y requeue |
| Necesito revisar eventos o alertas de billing | `Facturacion` | resumen, alertas activas e historial |
| Necesito trabajar billing de un tenant puntual | `Facturacion` | workspace tenant y reconcile |
| Quiero confirmar a que backend apunta el frontend | `Configuracion` | `API base URL` y capacidades |
| No entiendo que funcionalidades declara esta build | `Configuracion` | capacidades, enums y alcance |
| Quiero entrar al portal de un tenant desde plataforma | `Tenants` | acceso rapido hacia `Tenant Portal` |
| Quiero revisar la postura del tenant desde su propio portal | `Tenant Portal > Resumen` | postura, usuario actual y uso por modulo |
| Quiero administrar usuarios del tenant | `Tenant Portal > Usuarios` | KPIs, formulario de alta y tabla |
| Quiero registrar movimientos financieros del tenant | `Tenant Portal > Finanzas` | resumen, formulario y uso efectivo |

## Accion tecnica -> endpoint o proceso backend

Este apendice sirve para unir la pantalla visible con la operacion tecnica real.

| Accion o lectura en UI | Endpoint o proceso principal | Comentario |
| --- | --- | --- |
| Login de `Platform Admin` | `POST /platform/auth/login` | autentica al operador central |
| Cargar dashboard de plataforma | `GET /platform/tenants/`, `GET /platform/provisioning-jobs/metrics`, `GET /platform/tenants/billing/events/summary` | el dashboard compone varias lecturas backend-driven |
| Ver catalogo de tenants | `GET /platform/tenants/` | fuente base del listado |
| Ver detalle de tenant | `GET /platform/tenants/{tenant_id}` | contexto central del tenant |
| Ver politica de acceso tenant | `GET /platform/tenants/{tenant_id}/access-policy` | muestra enforcement efectivo |
| Ver uso por modulo tenant desde plataforma | `GET /platform/tenants/{tenant_id}/module-usage` | depende de DB tenant y schema correcto |
| Ver historial de politicas tenant | `GET /platform/tenants/{tenant_id}/policy-history` | muestra mutaciones registradas |
| Cambiar estado lifecycle | `PATCH /platform/tenants/{tenant_id}/status` | actualiza `status` y `status_reason` |
| Cambiar mantenimiento | `PATCH /platform/tenants/{tenant_id}/maintenance` | actualiza modo, ventanas y scopes |
| Cambiar billing | `PATCH /platform/tenants/{tenant_id}/billing` | actualiza estado y fechas de billing |
| Cambiar plan | `PATCH /platform/tenants/{tenant_id}/plan` | ajusta `plan_code` |
| Cambiar rate limits | `PATCH /platform/tenants/{tenant_id}/rate-limits` | ajusta limites API efectivos |
| Cambiar identidad de billing | `PATCH /platform/tenants/{tenant_id}/billing-identity` | enlaza IDs externos del proveedor |
| Cambiar module limits | `PATCH /platform/tenants/{tenant_id}/module-limits` | ajusta cuotas por modulo |
| Sincronizar schema tenant | `POST /platform/tenants/{tenant_id}/sync-schema` | aplica migraciones tenant sobre una DB ya existente |
| Crear DB tenant real | job `create_tenant_database` + worker `run_provisioning_worker` | provisioning real, no simple alta visual |
| Revisar backlog y errores de provisioning | `Provisioning` + worker + DLQ | la UI refleja jobs, alertas y requeue |
| Ver resumen de billing | `GET /platform/tenants/billing/events/summary` | lectura agregada global |
| Ver alertas de billing | `GET /platform/tenants/billing/events/alerts` y `.../history` | alertas activas e historicas |
| Reconcile de evento billing tenant | endpoints de reconcile de billing tenant | se ejecuta sobre el tenant seleccionado |
| Login de `Tenant Portal` | `POST /tenant/auth/login` | autentica dentro del contexto de un tenant |
| Cargar overview tenant | `GET /tenant/info` y `GET /tenant/module-usage` | vista base del portal tenant |
| Listar usuarios tenant | `GET /tenant/users` | fuente del listado tenant |
| Crear usuario tenant | `POST /tenant/users` | alta basica desde portal tenant |
| Activar o desactivar usuario tenant | `PATCH /tenant/users/{user_id}/status` | cambia estado de la cuenta |
| Ver resumen financiero tenant | `GET /tenant/finance/summary` y `GET /tenant/finance/usage` | KPIs y uso efectivo |
| Listar movimientos financieros | `GET /tenant/finance/entries` | tabla de movimientos |
| Crear movimiento financiero | `POST /tenant/finance/entries` | alta basica de entry financiera |

## Uso recomendado

Este documento ya puede usarse como guia de onboarding funcional. La siguiente mejora natural seria hacer una version aun mas rica, con:

- anotaciones sobre cada imagen
- flechas o recuadros en puntos clave
- un segundo apendice corto de “accion tecnica -> endpoint o proceso backend”
