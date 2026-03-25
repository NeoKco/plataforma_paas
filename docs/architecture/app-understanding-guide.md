# Guia Unica para Entender la App

Este documento junta lo mejor de la guia rapida, el walkthrough funcional y las notas operativas necesarias para entender la plataforma sin entrar primero al codigo.

Si solo vas a leer un documento para ubicarte, deberia ser este.

## 1. Que es esta plataforma

`platform_paas` tiene dos espacios principales:

- `platform_admin`: consola del operador o superadmin
- `tenant_portal`: portal de trabajo de un tenant ya operativo

La forma mas simple de pensarlo es esta:

- `platform_admin` gobierna y corrige tenants
- `platform_admin` tambien gobierna sus propios operadores
- `tenant_portal` usa el espacio ya preparado de un tenant

La plataforma no funciona como una sola base con todo mezclado.

Funciona con:

- una base central: `platform_control`
- una base independiente por tenant

## 2. Que es un tenant

Un `tenant` es un espacio independiente dentro de la plataforma.

En terminos practicos, un tenant tiene:

- identidad propia
- configuracion propia
- politica de acceso propia
- limites propios
- una base de datos propia

Ejemplos de tenants demo del proyecto:

- `empresa-demo`
- `condominio-demo`
- `empresa-bootstrap`

## 3. Que significa provisionar

`Provisionar` un tenant significa dejarlo listo para operar.

No es solo crear un registro en una tabla.

En esta plataforma, provisionar normalmente implica:

- crear la base de datos del tenant
- crear el usuario de esa base
- aplicar el esquema inicial
- guardar el secreto tecnico de acceso
- sembrar el admin bootstrap del tenant
- dejar el tenant en estado usable

Dicho simple:

- crear tenant = existe en `platform_control`
- provisionar tenant = ya tiene infraestructura minima para funcionar

## 4. Flujo conceptual completo

El flujo correcto del producto es este:

1. instalar la plataforma
2. entrar a `platform_admin`
3. crear o registrar un tenant en `platform_control`
4. provisionar su base de datos
5. revisar su estado en `Tenants`
6. corregir problemas desde `Provisioning` o `Billing` si hace falta
7. entrar al `tenant_portal` cuando el tenant ya esta operativo

Prioridad actual del producto:

- antes de abrir mas modulos de negocio, conviene cerrar bien la base de plataforma
- eso incluye que `platform_admin` pueda manejar de forma clara el ciclo basico del tenant como entidad central
- hoy esa base ya cubre alta, edicion basica y archivo operativo desde `Tenants`
- la politica vigente ya es:
  - `slug` estable
  - `archive` como baja operativa correcta
  - `delete` fisico fuera de UI por ahora
  - `restore` solo como flujo explicito, no como cambio improvisado de estado

## 5. Que hace cada pantalla principal

### `Resumen`

Es la vista ejecutiva de `platform_admin`.

Sirve para mirar:

- salud general
- KPIs
- focos operativos
- presion de provisioning
- alertas visibles

No es la pantalla principal para corregir cosas. Es la pantalla para detectar donde mirar.

### `Tenants`

Es la pantalla mas importante para operar el producto.

Desde aqui puedes ver o mutar:

- alta y ciclo basico del tenant como entidad central de plataforma
- lifecycle del tenant
- mantenimiento
- billing
- plan
- limites
- identidad de billing
- policy history
- uso por modulo

Si un tenant no funciona, normalmente empiezas aqui.

Tambien es la pantalla donde deberia terminar de cerrarse el CRUD basico seguro del tenant:

- crear tenant
- editar su identidad basica
- archivarlo como baja operativa

Ese ciclo ya esta disponible en la UI actual.

Para leerlo de forma aislada, revisa:

- [Ciclo basico de tenants](../runbooks/tenant-basic-cycle.md)

No conviene empezar por borrado fisico duro porque un tenant no es solo una fila: tambien arrastra DB tenant, jobs, billing history, policy history y auditoria.

Politica operativa vigente:

- `slug` estable
- `archive` como salida basica
- `delete` duro fuera del alcance actual
- `restore` ya existe como accion formal solo para tenants archivados

### `Usuarios de plataforma`

Es el bloque que gobierna quienes pueden entrar a la consola central.

Desde aqui se puede:

- listar operadores de plataforma
- crear usuarios de plataforma
- editar nombre visible y rol
- activar o desactivar acceso
- reemplazar contraseñas iniciales

Politica actual:

- `superadmin` gobierna la cuenta raiz y puede crear `admin` y `support`
- `admin` ya puede crear y gobernar usuarios `support`
- `support` hoy queda principalmente en lectura dentro de este bloque
- la plataforma debe operar con un solo `superadmin` activo

Tambien aplica esta regla:

- la cuenta `superadmin` no se crea ni se borra desde el flujo normal de usuarios
- si existen `superadmin` heredados extra, solo otro `superadmin` puede degradarlos o desactivarlos manteniendo siempre uno activo

Para leerlo de forma aislada, revisa:

- [Ciclo basico de usuarios de plataforma](../runbooks/platform-users-cycle.md)

Politica corta de acceso por bloque:

- `superadmin` ve toda la consola
- `admin` hoy opera `Usuarios de plataforma` y `Actividad`
- `support` hoy queda concentrado en `Usuarios de plataforma` con alcance mas acotado

Nota importante de lectura:

- la UI ya traduce varios codigos internos del backend a labels mas naturales
- por ejemplo, `past_due` se muestra como `con deuda`
- eso hace mas facil operar sin perder la logica real del sistema

### `Provisioning`

Es la pantalla que explica por que un tenant nuevo no quedo listo.

Aqui ves:

- jobs pendientes
- jobs en ejecucion
- jobs fallidos
- alertas
- DLQ
- reencolado

No es una pantalla de negocio. Es una pantalla operativa de automatizacion.

### `Actividad`

Es la vista corta de auditoria de accesos recientes.

Aqui ves:

- eventos `platform`
- eventos `tenant`
- accesos correctos
- accesos fallidos
- accesos denegados

No reemplaza logs ni una auditoria completa, pero sirve para soporte y validacion funcional rapida.

Para leerla de forma aislada, revisa:

- [Actividad de plataforma](../runbooks/platform-activity.md)

### `Facturacion`

Es la consola operativa de billing.

Aqui ves:

- resumen de eventos
- alertas
- historial
- workspace por tenant
- reconcile

Para entenderla con un caso real ya ejecutado, revisa:

- [Prueba guiada de billing](../runbooks/billing-guided-test.md)

En la UI actual, los resultados tambien ya se leen con mejor lenguaje:

- `applied`
- `reconciled`
- y los estados del tenant se muestran con etiquetas mas cercanas a negocio

### `Configuracion`

Es una pantalla de soporte y lectura tecnica.

Sirve para ver:

- sesion actual
- `API configurada`
- `API esperada en esta red`
- capacidades backend
- enums y alcance actual del frontend

### `Tenant Portal`

Es el espacio del tenant ya autenticado.

Pantallas principales hoy:

- `Resumen`
- `Usuarios`
- `Finanzas`

Para ver ese flujo con un caso real ya ejecutado, revisa:

- [Prueba guiada de tenant portal](../runbooks/tenant-portal-guided-test.md)

Tambien ya se redujo bastante la jerga tecnica visible:

- roles mas legibles
- estados de uso por modulo mas claros
- mensajes de bloqueo explicados por cupo o plan

## 6. Como leer el estado real de un tenant

En la practica hay tres estados importantes.

### A. Tenant creado pero no operativo

Senales tipicas:

- `status=pending`
- `module-usage` no carga
- `sync-schema` falla por configuracion incompleta

Esto significa:

- el tenant existe en `platform_control`
- pero todavia no tiene su DB tenant lista o registrada

Lo que corresponde mirar:

- `Tenants`
- luego `Provisioning`

### B. Tenant provisionado pero incompleto

Senales tipicas:

- la DB tenant ya existe
- pero faltan tablas o migraciones
- aparecen errores por schema incompleto

Esto significa:

- la infraestructura base existe
- pero el esquema tenant aun no esta completo

Lo que corresponde mirar:

- `Tenants`
- `sync-schema`
- o revisiones de provisioning si hubo fallos

### C. Tenant sano

Senales tipicas:

- estado `active`
- `access-policy` responde bien
- `Uso por modulo` muestra filas con estado `ok`
- se puede entrar al `tenant_portal`

Esto significa:

- provisioning correcto
- secretos correctos
- schema presente
- acceso listo

## 7. Que significa cada concepto de Provisioning

### `Job`

Es una tarea automatica de plataforma.

Ejemplos:

- crear DB tenant
- sincronizar schema tenant
- reparar schema tenant

### `DLQ`

Es la cola de errores.

Ahi caen jobs que no pudieron seguir su flujo normal.

No significa necesariamente perdida definitiva. Significa que necesitan revision o reintento.

### `Reencolar`

Es volver a poner un job en la cola para que se procese otra vez.

Se usa cuando:

- el error ya fue corregido
- el job fallo por una condicion temporal
- quieres reintentar una tanda focalizada del DLQ

### `Alerta`

Es una senal operativa del backend.

Sirve para avisar que algo supero un umbral o se esta degradando.

## 8. Como se prueba Provisioning hoy

Hoy hay tres formas utiles de probarlo.

### 1. Lectura operativa

Abrir `Provisioning` y entender:

- que jobs existen
- cuales fallaron
- que tenants tienen mas presion
- si hay alertas o DLQ

### 2. Recuperacion

Si hay jobs fallidos o en DLQ:

- usar `Reencolar`
- volver a correr el worker
- confirmar si el tenant logra quedar listo

### 3. Flujo de punta a punta

Usar un tenant `pending`, crear o reactivar su provisioning y ver como pasa a `active`.

Ese es el ejercicio mas pedagogico para entender como se conecta:

- `Tenants`
- `Provisioning`
- la DB tenant real

Prueba guiada real recomendada:

- [Prueba guiada de provisioning](../runbooks/provisioning-guided-test.md)

## 9. Entorno demo recomendado para aprender

Hoy el baseline de demo deja tres casos utiles:

- `empresa-demo`
  - tenant `pending`
  - sirve para onboarding y provisioning incompleto
- `condominio-demo`
  - tenant `active`
  - sirve para revisar `tenant_portal`
- `empresa-bootstrap`
  - tenant `active`
  - sirve como segundo caso sano

Credenciales utiles:

### Plataforma

- `admin@platform.local`
- `AdminTemporal123!`

### Tenant demo

- `admin@condominio-demo.local`
- `TenantAdmin123!`

### Tenant bootstrap

- `admin@empresa-bootstrap.local`
- `TenantAdmin123!`

## 10. Donde mirar cuando aparece un problema

- tenant no usable: `Tenants`
- tenant nuevo no quedo listo: `Provisioning`
- errores de cobro o reconcile: `Facturacion`
- dudas de entorno o backend: `Configuracion`
- dudas de usuarios o finanzas tenant: `Tenant Portal`

## 11. Que ya existe y que sigue faltando

Ya existe:

- login platform
- dashboard
- tenants
- provisioning
- billing
- configuracion
- portal tenant
- usuarios tenant
- finanzas tenant
- instalador visual frontend

Todavia sigue pendiente o en refinamiento:

- pulido fino de onboarding
- refinamientos UX en `Tenants` y `Provisioning`
- captura final del manual visual una vez estabilizadas mas pantallas

## 12. Orden recomendado para aprender la app

Si quieres entenderla bien, sigue este recorrido:

1. `Platform Admin`
2. `Resumen`
3. `Tenants`
4. `Provisioning`
5. `Facturacion`
6. `Tenant Portal`

Si quieres complementar esta guia:

- [Manual visual de la app](./app-visual-manual.md)
- [Guia rapida de la app](./app-quick-guide.md)
- [Guia de comprension de la app](./app-functional-walkthrough.md)
- [Demo data y seeds de desarrollo](../runbooks/demo-data.md)
- [Prueba guiada de provisioning](../runbooks/provisioning-guided-test.md)
