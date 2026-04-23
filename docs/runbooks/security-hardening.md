# Hardening de Seguridad

Esta guia resume el hardening de seguridad ya aplicado en el backend y lo que sigue pendiente.

## Objetivo

Reducir decisiones temporales de desarrollo en tres frentes:

- secretos y credenciales
- contrato de autenticacion JWT
- validaciones minimas de runtime para produccion

## Hardening ya implementado

### 1. Validacion de configuracion insegura

En el arranque del backend se valida que en produccion no sigan valores inseguros como:

- `JWT_SECRET_KEY` por defecto
- `CONTROL_DB_PASSWORD` por defecto
- `POSTGRES_ADMIN_PASSWORD` vacio
- passwords bootstrap tenant de demo o demasiado cortas
- `JWT_ISSUER` vacio
- `JWT_PLATFORM_AUDIENCE` vacio
- `JWT_TENANT_AUDIENCE` vacio

Archivo principal:

- `backend/app/common/security/runtime_security_service.py`
- `backend/app/apps/platform_control/api/routes.py`

Politica actual para bootstrap tenant:

- en `development` o `test`, las passwords bootstrap de demo pueden existir y se reportan como hallazgo
- en `production`, cualquier `TENANT_BOOTSTRAP_DB_PASSWORD_*` con valor de demo o con menos de 16 caracteres hace fallar el arranque

Esto busca evitar que una plataforma pase a produccion con secretos tecnicos tenant triviales heredados del baseline local.

Lectura operativa visible:

- `GET /platform/security-posture`
- `Configuracion -> Postura de secretos y runtime`

Esta lectura no expone secretos; solo resume:

- entorno actual
- si el runtime quedaria listo para produccion
- cantidad de hallazgos
- lista de hallazgos descriptivos
- archivo runtime efectivo de secretos tenant
- si ese archivo realmente queda separado del `.env` legacy
- si el backend puede leerlo y escribirlo

## 2. Secretos tenant dinamicos

La password tecnica de DB tenant ya no se resuelve con `if/elif` por `slug`.

Ahora se usa una convencion de env var dinamica:

- `TENANT_DB_PASSWORD__<TENANT_SLUG_NORMALIZADO>`

Ejemplo:

- `TENANT_DB_PASSWORD__EMPRESA_BOOTSTRAP`

Archivo principal:

- `backend/app/common/security/tenant_secret_service.py`

Resolucion actual:

- modo normal:
  - primero intenta `TENANT_SECRETS_FILE`
  - luego `os.environ`
  - luego settings estaticos ya declarados
- `/.env` legacy ya no participa como candidato normal cuando el runtime usa `TENANT_SECRETS_FILE` separado
- el `/.env` legacy queda solo como compatibilidad residual de rescate explicito

Esto permite que el provisioning cree secretos tenant dinámicos después de la instalación inicial y que el backend pueda resolverlos tras reinicios, sin tratar el `.env` principal como carril normal de escritura.

### Rotacion formal de credenciales tecnicas tenant

Desde `Tenants` ya existe una accion explicita para rotar la password tecnica de DB tenant cuando la base del tenant ya esta configurada.

Politica actual:

- genera una password nueva y fuerte
- altera la password del rol PostgreSQL del tenant
- valida que el nuevo acceso realmente funcione
- si la validacion falla, restaura la password anterior
- guarda el secreto dinámico nuevo en `TENANT_SECRETS_FILE`
- limpia la variable bootstrap antigua si todavia existia
- deja trazabilidad en actividad e historial de politica tenant

Esto permite endurecer operacion sin tocar credenciales del portal tenant ni depender de cambios manuales sobre PostgreSQL.

### Sincronizacion formal del secreto runtime tenant

Desde `Tenants` ya existe tambien una accion separada para `Sincronizar secreto runtime`.

Politica actual:

- no cambia la password PostgreSQL
- solo asegura que el secreto DB tenant quede presente en `TENANT_SECRETS_FILE`
- reutiliza el valor runtime si ya estaba bien gestionado
- si todavia faltaba en runtime pero seguia disponible en `/.env`, la consola ya no rescata ese valor dentro de esta acción
- deja trazabilidad operativa y de policy como `technical_secret_distribution`

Uso recomendado:

- usar `Rotar credenciales tecnicas` cuando sospechas exposición o quieres renovar la credencial
- usar `Sincronizar secreto runtime` cuando el valor ya es válido pero el carril runtime quedó incompleto o desalineado
- si el valor solo sobrevive en `/.env`, usar el tooling controlado [rescue_tenant_runtime_secrets_from_legacy.py](/home/felipe/platform_paas/backend/app/scripts/rescue_tenant_runtime_secrets_from_legacy.py) antes de reintentar la sincronización normal

### Sincronizacion central por lote

Desde `Configuración -> Postura de secretos y runtime` ya existe también `Sincronizar runtime central`.

Política actual:

- recorre tenants activos
- solo sincroniza desde fuentes runtime-managed
- no rota la password PostgreSQL
- no rescata desde `/.env`
- deja como `skipped_legacy_rescue_required` a los tenants que todavía requieren rescate controlado

Objetivo:

- corregir drift de distribución runtime en lote sin convertir la consola en carril de rescate legacy
- dejar visibilidad rápida de qué tenants siguen bien, cuáles ya estaban listos y cuáles todavía requieren tooling controlado

### Rotacion central por lote

Desde `Configuración -> Postura de secretos y runtime` ya existe también `Rotar credenciales central`.

Politica actual:

- recorre tenants activos
- solo rota tenants con secreto runtime ya gestionado
- genera una password nueva y fuerte por tenant
- valida el acceso con la credencial nueva antes de confirmar
- persiste la credencial nueva en `TENANT_SECRETS_FILE`
- no rescata desde `/.env`
- deja a los tenants legacy como `skipped_legacy_rescue_required`

Objetivo:

- renovar en lote credenciales técnicas DB sin reabrir el carril legacy
- usar el mismo criterio runtime-only de la sincronización central
- dejar trazabilidad por tenant de qué rotó, qué quedó omitido y qué falló

### Plan central previo de secretos runtime

Antes de ejecutar sync o rotate por lote, `Configuración -> Postura de secretos y runtime` ya muestra también un `Plan central de secretos runtime`.

Esta lectura:

- clasifica tenants activos por:
  - `runtime_ready`
  - `sync_recommended`
  - `legacy_rescue_required`
  - `missing_secret`
  - `skipped_not_configured`
- indica acción recomendada por tenant:
  - `rotate_db_credentials`
  - `sync_runtime_secret`
  - `legacy_rescue`
  - `investigate_secret_source`
  - `configure_database`
- deja explícita la elegibilidad para:
  - `sync batch`
  - `rotate batch`

Objetivo:

- evitar que el operador adivine si un tenant debe rotar, sincronizar o salir al tooling legacy
- formalizar la capa previa de distribución/rotación centralizada sin reintroducir rescate desde `/.env`

### Campañas batch gobernadas desde consola

El `Plan central de secretos runtime` ya permite además seleccionar tenants antes de ejecutar:

- `Sincronizar runtime central`
- `Rotar credenciales central`

Regla operativa:

- sin selección visible, el batch sigue operando sobre todos los tenants activos evaluados
- con selección visible, el batch queda acotado a `tenant_slugs` explícitos
- el backend también tolera exclusiones opcionales para tooling futuro, pero la consola hoy prioriza selección positiva simple

Objetivo:

- permitir campañas cortas y controladas sin abrir todavía persistencia formal de campañas
- no volver a mezclar rescate legacy dentro del carril batch normal

### Postura operativa de secretos por carril

El script canónico [repair_tenant_operational_drift.py](/home/felipe/platform_paas/backend/app/scripts/repair_tenant_operational_drift.py) ya expone tambien una lectura rápida de postura de secretos:

- archivo runtime efectivo (`TENANT_SECRETS_FILE`)
- archivo legacy (`.env`)
- si existen
- si son legibles
- si son escribibles
- y qué archivos adicionales se usarían como `sync_targets`

Objetivo:

- detectar más rápido si el carril está leyendo/escribiendo donde corresponde
- evitar diagnósticos ambiguos entre `staging`, `production` y repo local
- dejar visible cuándo un operador intenta reutilizar el `.env` legacy como target de sincronización

### Regla visible nueva de readiness

`GET /platform/security-posture` y `Configuración -> Postura de secretos y runtime` ahora también marcan hallazgo si:

- `TENANT_SECRETS_FILE` apunta al mismo path que el `.env` legacy
- el archivo runtime de secretos tenant no es legible
- el archivo runtime de secretos tenant no es escribible

En `production`, esa mezcla con `.env` principal ya deja `production_ready=false`.

Ademas, la postura visible ya resume cobertura tenant del carril runtime:

- tenants auditados
- tenants ya runtime-managed
- tenants con secreto runtime faltante
- tenants donde todavía existe rescate legacy disponible

Eso permite detectar drift de distribución sin revisar tenant por tenant a ciegas.

### Regla nueva para sincronización cross-env

`--sync-env-file` sigue existiendo para carriles que comparten rol PostgreSQL, pero desde ahora:

- el target normal debe ser `TENANT_SECRETS_FILE` o un archivo de secretos dedicado
- sincronizar hacia el `.env` legacy ya no es el camino por defecto
- si realmente hace falta escribir en `.env`, debe usarse `--allow-legacy-env-sync`

Eso baja el riesgo de volver a mezclar secretos runtime con configuración general por accidente.

## 3. Menor exposicion de secretos en logs

El provisioning ya no imprime la password completa de la DB tenant.

Archivo relacionado:

- `backend/app/apps/provisioning/services/provisioning_service.py`

## 4. Contrato JWT mas estricto

Los access tokens ahora incluyen:

- `sub`
- `email`
- `role`
- `token_scope`
- `jti`
- `iss`
- `aud`
- `token_type=access`
- `iat`
- `nbf`
- `exp`

Audiencias actuales:

- `platform-api`
- `tenant-api`

Issuer actual:

- `platform_paas`

Archivos principales:

- `backend/app/common/auth/jwt_service.py`
- `backend/app/common/middleware/tenant_context_middleware.py`
- `backend/app/common/config/settings.py`

## 5. Validacion estricta por scope y audiencia

El middleware comun ahora:

- exige Bearer token en rutas protegidas
- valida firma y expiracion
- valida `iss`
- valida `aud` segun la ruta
- exige `token_scope=platform` en `/platform/*`
- exige `token_scope=tenant` en `/tenant/*`

Eso evita mezclar tokens entre contextos aunque tengan firma valida.

## 6. Refresh token y revocacion basica

El backend ahora maneja un ciclo de sesion basico:

- login devuelve `access_token` y `refresh_token`
- el refresh token se registra en `platform_control.auth_tokens`
- `POST /platform/auth/refresh` y `POST /tenant/auth/refresh` rotan el refresh token
- `POST /platform/auth/logout` y `POST /tenant/auth/logout` revocan la sesion actual
- el middleware rechaza access tokens revocados

Esto no es todavia un sistema completo de sesiones multi-dispositivo, pero ya evita dos huecos importantes:

- reuso indefinido de refresh tokens antiguos
- uso continuado de access tokens marcados como revocados

Baseline actual recomendado:

- `ACCESS_TOKEN_EXPIRE_MINUTES=15`
- `REFRESH_TOKEN_EXPIRE_MINUTES=480`

Y en frontend:

- la sesion se guarda en `sessionStorage`
- la sesion se cierra automaticamente por inactividad
- el refresh solo ocurre mientras exista continuidad real de uso

Eso reduce el riesgo de dejar sesiones largas abiertas en un navegador compartido o desatendido.

Archivos principales:

- `backend/app/apps/platform_control/models/auth_token.py`
- `backend/app/apps/platform_control/repositories/auth_token_repository.py`
- `backend/app/common/auth/auth_token_service.py`
- `backend/app/common/middleware/tenant_context_middleware.py`

## 7. Auditoria de autenticacion

El backend ya registra eventos persistentes de autenticacion en `platform_control`.

Eventos cubiertos en esta etapa:

- `platform.login`
- `platform.refresh`
- `platform.logout`
- `tenant.login`
- `tenant.refresh`
- `tenant.logout`

Cada evento registra al menos:

- tipo de evento
- scope
- resultado `success` o `failed`
- `subject_user_id` cuando existe
- `tenant_slug` cuando aplica
- `email` cuando existe
- `token_jti` cuando existe
- `detail`

Archivos principales:

- `backend/app/apps/platform_control/models/auth_audit_event.py`
- `backend/app/apps/platform_control/repositories/auth_audit_event_repository.py`
- `backend/app/apps/platform_control/services/auth_audit_service.py`

Limitacion actual:

- esta auditoria esta concentrada en rutas de autenticacion
- aun no cubre rechazos del middleware, cambios administrativos ni eventos funcionales de modulos

## Pruebas relacionadas

Suites utiles:

- `backend/app/tests/test_security_hardening.py`
- `backend/app/tests/test_http_smoke.py`

Runner recomendado:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python app/scripts/run_backend_tests.py
```

## Pendiente

Lo que aun falta para considerar esta etapa cerrada:

- secret manager real fuera de `.env`
- rotacion centralizada de secretos fuera de `/.env`
- cierre global de sesiones por dispositivo o familia
- ampliar auditoria hacia middleware, operaciones administrativas y eventos funcionales
