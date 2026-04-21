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

## 2. Secretos tenant dinamicos

La password tecnica de DB tenant ya no se resuelve con `if/elif` por `slug`.

Ahora se usa una convencion de env var dinamica:

- `TENANT_DB_PASSWORD__<TENANT_SLUG_NORMALIZADO>`

Ejemplo:

- `TENANT_DB_PASSWORD__EMPRESA_BOOTSTRAP`

Archivo principal:

- `backend/app/common/security/tenant_secret_service.py`

Resolucion actual:

- primero intenta `os.environ`
- luego settings estaticos ya declarados
- y finalmente lee la clave directamente desde `/.env`

Esto ultimo es importante porque el provisioning puede crear secretos tenant dinamicos despues de la instalacion inicial y el backend necesita poder resolverlos tras reinicios.

### Rotacion formal de credenciales tecnicas tenant

Desde `Tenants` ya existe una accion explicita para rotar la password tecnica de DB tenant cuando la base del tenant ya esta configurada.

Politica actual:

- genera una password nueva y fuerte
- altera la password del rol PostgreSQL del tenant
- valida que el nuevo acceso realmente funcione
- si la validacion falla, restaura la password anterior
- guarda el secreto dinamico nuevo en `/.env`
- limpia la variable bootstrap antigua si todavia existia
- deja trazabilidad en actividad e historial de politica tenant

Esto permite endurecer operacion sin tocar credenciales del portal tenant ni depender de cambios manuales sobre PostgreSQL.

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
