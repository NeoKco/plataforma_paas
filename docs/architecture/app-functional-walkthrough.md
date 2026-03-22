# Guia de Comprension de la App

Este documento no describe solo endpoints o carpetas. Su objetivo es responder una pregunta mas simple:

- que es la app hoy
- que flujo deberia seguir un usuario u operador
- que partes ya existen
- que partes todavia faltan para que la experiencia se vea completa de punta a punta

## 1. Que es `platform_paas`

Hoy la app tiene dos caras principales:

- `platform_admin`: consola de operacion para administrar tenants, provisioning, billing y politicas
- `tenant_portal`: portal de trabajo del tenant ya provisionado

La arquitectura real separa:

- una DB central `platform_control`
- una DB independiente por tenant

Eso significa que la app no es una sola base con tablas compartidas. El flujo normal es:

1. instalar la plataforma
2. crear un tenant en `platform_control`
3. provisionar su DB propia
4. usar ese tenant desde `platform_admin` y luego desde `tenant_portal`

## 2. Cual deberia ser el flujo ideal completo

El flujo ideal de producto seria este:

1. abrir la app por primera vez
2. ver un instalador
3. configurar base de control y credenciales iniciales
4. entrar al login platform
5. crear tenants
6. ejecutar provisioning
7. operar tenants desde `platform_admin`
8. entrar al `tenant_portal` de cada tenant

Ese es el flujo conceptual correcto del producto.

## 3. Que existe hoy de ese flujo

### Instalador backend

El backend ya tiene un modo instalador:

- `GET /install/`
- `POST /install/setup`

Ese modo solo aparece si la plataforma no esta marcada como instalada.

La condicion actual vive en:

- `backend/app/bootstrap/install_checker.py`

Y hoy depende del archivo:

- `/.platform_installed`

### Limitacion actual importante

El frontend todavia no tiene una pantalla de instalador conectada al arranque.

Eso significa:

- el backend si sabe arrancar en modo instalador
- pero el frontend actual arranca directo hacia login y operacion

Por eso, aunque conceptualmente esperabas ver un wizard de instalacion, hoy ese flujo visual aun no esta implementado.

## 4. Que representa cada pantalla actual

### `Resumen`

Es la vista ejecutiva de `platform_admin`.

Sirve para mirar:

- estado general de tenants
- presion de provisioning
- alertas de billing
- focos operativos

No es una pantalla de configuracion profunda; es una consola de lectura rapida.

### `Tenants`

Es la pantalla mas importante para entender el sistema.

Desde aqui se puede ver y operar:

- catalogo de tenants
- lifecycle
- billing
- mantenimiento
- policy history
- limites por modulo
- uso por modulo
- sync de esquema tenant
- salto rapido al `Tenant Portal` con el `slug` precargado para superadmin

En terminos practicos, `Tenants` te deja distinguir rapidamente tres estados:

- tenant creado pero no provisionado
- tenant provisionado con DB incompleta o schema incompleto
- tenant operativo

### `Provisioning`

Esta pantalla representa el paso tecnico que conecta `platform_control` con la DB real de cada tenant.

Su funcion es:

- ver jobs de aprovisionamiento
- ver errores y reintentos
- operar DLQ
- reencolar jobs fallidos

En la practica, cuando un tenant no tiene DB lista, el problema real casi siempre se entiende aqui.

### `Facturacion`

Es la consola de eventos y alertas de billing.

Sirve para:

- revisar resumen de eventos
- ver alertas
- revisar historia de alertas
- reconciliar eventos

### `Configuracion`

Hoy cumple una funcion mas tecnica y de soporte:

- ver contexto de sesion
- ver base URL de API
- ver capacidades backend
- revisar enumeraciones y alcance real del frontend

## 5. Como leer el estado real de un tenant

Hoy un tenant puede estar en alguno de estos puntos practicos:

### A. Creado pero no provisionado

Senales tipicas:

- `status=pending`
- `sync-schema` falla
- `module-usage` dice que la configuracion de DB tenant es incompleta

Significa:

- el tenant existe en `platform_control`
- pero todavia no existe o no quedo registrada su DB tenant

Lo que corresponde:

- provisioning `create_tenant_database`

### B. DB tenant creada pero schema incompleto

Senales tipicas:

- el tenant ya tiene `db_host`, `db_port`, `db_name`, `db_user`
- errores con tablas faltantes como `finance_entries`

Significa:

- la DB tenant existe
- pero faltan migraciones tenant

Lo que corresponde:

- `sync-schema`
- o correr migraciones tenant manualmente

### C. Tenant operativo

Senales tipicas:

- `module-usage` responde bien
- `access-policy` responde bien
- el tenant puede entrar a `tenant_portal`

Significa:

- provisioning completo
- secretos tenant resolviendose bien
- schema tenant presente

## 6. Que arreglamos en esta etapa

En esta fase cerramos varios huecos que impedian entender la app:

- el frontend ya consume la API real en red local
- CORS y `OPTIONS` ya funcionan
- el login platform funciona con el seed real
- `empresa-demo` pudo pasar de tenant creado a tenant provisionado
- el backend ya distingue entre:
  - DB tenant incompleta
  - schema tenant incompleto
- la password tenant dinamica ya se resuelve tambien desde `/.env`
- `Tenants` ya muestra mejor esos estados sin mezclar todo como si fuera un mismo error

## 7. Que sigue faltando para que la experiencia sea redonda

Lo principal que aun falta para que la app se entienda sola desde el primer minuto es:

- pantalla visual de instalador en frontend
- decision de arranque basada en estado `installed`
- wizard de primera ejecucion
- guia visual con capturas reales de cada pantalla

En otras palabras:

- backend de instalacion: existe
- frontend de instalacion: falta
- consola operativa principal: ya existe

## 8. Que manual conviene tener

Para comprender la app sin depender del codigo, conviene tener dos documentos separados:

### Manual 1. Comprension funcional

Debe explicar:

- que es `platform_admin`
- que es `tenant_portal`
- que es provisioning
- que significa cada estado tenant
- cuando usar `sync-schema`
- cuando usar `billing`

Este documento cubre esa necesidad base.

### Manual 2. Recorrido visual con capturas

Debe mostrar, con capturas:

1. pantalla de login
2. dashboard `Resumen`
3. pantalla `Tenants`
4. un tenant no provisionado
5. un tenant provisionado
6. pantalla `Provisioning`
7. pantalla `Facturacion`
8. `tenant_portal`

Ese segundo manual todavia no esta generado dentro del repo.

## 9. Recomendacion practica

Antes de seguir abriendo nuevas funcionalidades, la mejor inversion para que el proyecto sea mas comprensible es:

1. implementar el flujo visual de instalador
2. dejar un manual visual con capturas
3. documentar el recorrido basico de uso de la app ya instalada

Con eso, cada nuevo paso del proyecto se entiende mucho mejor, porque ya existe una narrativa visible del sistema y no solo piezas tecnicas sueltas.
