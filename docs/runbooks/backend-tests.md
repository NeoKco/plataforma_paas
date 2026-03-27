# Pruebas Backend

Esta guia resume las suites de pruebas backend disponibles actualmente y como ejecutarlas dentro del entorno del proyecto.

## Objetivo

Dejar una forma repetible de validar los dos contextos principales de la plataforma:

- flujo tenant
- flujo platform

Ademas, dejar una regla operativa de documentacion continua:

- toda prueba manual relevante que descubra comportamiento, fallo o fix debe terminar convertida en runbook o ampliacion de la documentacion existente
- la documentacion no se deja para el final; se actualiza junto con el aprendizaje real
- si la prueba ya tiene capturas guardadas en el repo, esas imagenes deben usarse en la documentacion
- si la prueba genero capturas nuevas utiles, conviene guardarlas en `docs/assets/app-visual-manual/` y enlazarlas desde el runbook correspondiente

## Requisito

Usar el interprete del virtualenv del proyecto:

```bash
/home/felipe/platform_paas/platform_paas_venv/bin/python
```

## Runner Unificado

Script:

- `backend/app/scripts/run_backend_tests.py`

Objetivo:

- dejar un solo punto de entrada para el equipo
- correr suites base siempre
- incluir suites HTTP smoke por defecto
- incluir suites PostgreSQL automaticamente si `PGTEST_*` esta configurado

Ejecucion base:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python app/scripts/run_backend_tests.py
```

Opciones utiles:

```bash
# omitir smoke HTTP
/home/felipe/platform_paas/platform_paas_venv/bin/python app/scripts/run_backend_tests.py --skip-http-smoke

# forzar suites PostgreSQL
/home/felipe/platform_paas/platform_paas_venv/bin/python app/scripts/run_backend_tests.py --with-postgres

# omitir PostgreSQL aunque exista PGTEST_*
/home/felipe/platform_paas/platform_paas_venv/bin/python app/scripts/run_backend_tests.py --skip-postgres
```

Notas:

- `--with-postgres` falla rapido si faltan `PGTEST_HOST`, `PGTEST_ADMIN_USER` o `PGTEST_ADMIN_PASSWORD`
- la suite HTTP smoke levanta `uvicorn` temporal y requiere socket local disponible

## CI Backend

Workflow base del repositorio:

- `.github/workflows/backend-tests.yml`

Archivo de ejemplo para entorno local:

- `infra/env/pgtest.example.env`

Objetivo:

- correr el mismo runner unificado tambien en CI
- activar automaticamente las suites PostgreSQL con `PGTEST_*`
- mantener alineado el flujo local con el flujo del repositorio

Replica local sugerida:

```bash
cd /home/felipe/platform_paas
set -a
source infra/env/pgtest.example.env
set +a

cd backend
/home/felipe/platform_paas/platform_paas_venv/bin/python app/scripts/run_backend_tests.py
```

## Convencion de Fixtures

Archivo base:

- `backend/app/tests/fixtures.py`

Objetivo:

- centralizar builders reutilizables para contexto `tenant` y `platform`
- evitar stubs duplicados por suite
- estabilizar refactors entre `router`, `service`, `repository` y `schemas`

Builders disponibles actualmente:

- `build_tenant_request()`
- `build_tenant_context()`
- `build_tenant_user_stub()`
- `build_tenant_record_stub()`
- `build_platform_request()`
- `build_platform_context()`
- `build_platform_user_stub()`
- `build_finance_entry_stub()`
- `set_test_environment()`

Regla recomendada:

- cuando una suite necesite stubs simples o contexto autenticado, debe partir desde `fixtures.py`
- solo crear builders locales si la estructura de prueba es realmente especifica del caso

## Suite Tenant

Archivo:

- `backend/app/tests/test_tenant_flow.py`

Cobertura actual:

- dependencies tenant
- validacion de admin tenant
- resolucion de `get_tenant_db()`
- `TenantDataService` con repositories fake
- rutas tenant basicas
- CRUD basico de usuarios tenant
- respuestas tipadas con schemas

Ejecucion:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest app.tests.test_tenant_flow
```

Cobertura adicional relevante:

- middleware auth tenant y platform
- rutas publicas de login, refresh y recuperacion raiz
- guardas de mantenimiento, billing y rate limit
- regresion para que `GET /platform/auth/root-recovery/status` siga siendo publico y no vuelva a romper `Settings`
- hardening de runtime para que passwords bootstrap tenant de demo o demasiado cortas no pasen en `production`
- `GET /platform/security-posture` para no perder la lectura operativa de seguridad en `Settings`
- rotacion formal de credenciales tecnicas tenant, incluyendo rollback seguro si la nueva password no valida
- desprovisionado tecnico de tenants archivados mediante job `deprovision_tenant_database`
- archivo historico minimo del tenant en `tenant_retirement_archives` antes del borrado definitivo
- endpoint de detalle del archivo historico y snapshot funcional resumido del tenant retirado
- construccion segura de URLs PostgreSQL cuando las credenciales contienen caracteres reservados como `@`, `:` o `/`
- arranque backend aplicando migraciones de control automaticamente cuando la plataforma ya esta instalada, para no romper `Tenants` por columnas nuevas aun no migradas
- validacion temprana de conexion tenant para que credenciales DB rotas se traduzcan a error operativo controlado y no a `500` crudo
- login tenant degradando a error operativo controlado cuando la credencial tecnica de la DB tenant ya no coincide con PostgreSQL
- rotacion de credenciales tecnicas tenant devolviendo detalle operativo accionable cuando falta el rol, falta la base o la validacion de la nueva password se revierte
- borrado seguro devolviendo `400/404` con motivo legible en vez de dejar escapar `500`
- selector real de usuarios tenant en `Tenants` para resetear contraseñas del portal sin asumir `admin@<slug>.local`
- `GET /platform/tenants/{id}/users` devolviendo error controlado o quedando oculto en UI cuando el tenant ya fue desprovisionado

Pendiente recomendado de cobertura:

- smoke del ciclo completo `create -> provision -> archive -> deprovision -> delete -> tenant_history`
- validacion de permisos de `tenant-history` por rol para que no se abra fuera del alcance esperado

Suite puntual de seguridad:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest app.tests.test_security_hardening
```

Suite puntual de builders DB:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest app.tests.test_db_url_factory
```

## Suite Tenant Finance

Archivo:

- `backend/app/tests/test_tenant_finance_flow.py`

Cobertura actual:

- permisos finos de finance
- validaciones del `FinanceService`
- listado, creacion y resumen del modulo
- listado, creacion y detalle moderno de `transactions`
- balances por cuenta expuestos por API
- filtros por transaccion, edicion completa, filtro por favoritas y operaciones batch de favorito/conciliacion
- migraciones tenant del modulo hasta `0005_finance_transactions`
- seeds idempotentes para moneda base, `CLP`, categorias y settings
- repositories CRUD base del modulo y sus restricciones de unicidad/activacion
- validaciones de servicio para cuentas, categorias y moneda base
- rutas CRUD base para catalogos, settings y exchange rates
- rutas de detalle y `reorder` para catalogos principales
- backfill desde `finance_entries` hacia `finance_transactions`
- reglas del core transaccional para transferencias, moneda no base y balances por cuenta
- degradacion operativa de `Uso por módulo` cuando la credencial tecnica tenant ya no coincide con PostgreSQL

Ejecucion:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest app.tests.test_tenant_finance_flow app.tests.test_finance_catalog_repositories app.tests.test_finance_catalog_services app.tests.test_finance_catalog_routes app.tests.test_finance_transaction_core app.tests.test_migration_flow
```

## Suite Tenant Integration

Archivo:

- `backend/app/tests/test_tenant_integration_flow.py`

Cobertura actual:

- `TenantDataService` contra DB SQLite temporal
- CRUD tenant real sobre persistencia
- `FinanceService` contra DB temporal con resumen real
- balances por cuenta con ingresos, gastos y transferencias sobre el core transaccional nuevo

Ejecucion:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest app.tests.test_tenant_integration_flow
```

## Suite Platform Integration

Archivo:

- `backend/app/tests/test_platform_integration_flow.py`

Cobertura actual:

- `PlatformAuthService` contra DB control temporal
- `TenantService` persistiendo tenant real
- `ProvisioningJobService` leyendo jobs reales
- flujo basico seguro de tenants:
  - alta
  - edicion basica
  - archive
  - request de desprovisionado tecnico como job de provisioning
  - restore formal sobre tenants archivados
  - delete seguro solo despues de retirar configuracion DB tenant

Ejecucion:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest app.tests.test_platform_integration_flow
```

## Suite Tenant PostgreSQL Integration

Archivo:

- `backend/app/tests/test_tenant_postgres_integration_flow.py`

Cobertura actual:

- CRUD tenant real contra PostgreSQL temporal
- `FinanceService` contra PostgreSQL temporal
- validacion real del builder de conexion cuando las credenciales contienen caracteres reservados

Requisito:

- definir `PGTEST_HOST`

## Suites Puntuales Relevantes para Lifecycle Tenant

Cuando toques lifecycle, provisioning o retiro tecnico de tenants, conviene correr como minimo:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest \
  app.tests.test_platform_flow \
  app.tests.test_provisioning_worker
```

Cobertura relevante de ese bloque:

- enqueue de `create_tenant_database`
- enqueue de `deprovision_tenant_database`
- worker procesando ambos `job_type`
- reintentos y estados `retry_pending` o `failed`
- reglas de borrado seguro despues de desprovisionar
- definir `PGTEST_ADMIN_USER`
- definir `PGTEST_ADMIN_PASSWORD`
- opcionalmente `PGTEST_PORT` y `PGTEST_ADMIN_DB`

Ejecucion:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest app.tests.test_tenant_postgres_integration_flow
```

## Suite Platform PostgreSQL Integration

Archivo:

- `backend/app/tests/test_platform_postgres_integration_flow.py`

Cobertura actual:

- `PlatformAuthService` contra PostgreSQL temporal
- creacion de tenant y `provisioning_job` contra PostgreSQL temporal
- validacion real del acceso control DB con credenciales reservadas bien escapadas

Requisito:

- definir `PGTEST_HOST`
- definir `PGTEST_ADMIN_USER`
- definir `PGTEST_ADMIN_PASSWORD`
- opcionalmente `PGTEST_PORT` y `PGTEST_ADMIN_DB`

Ejecucion:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest app.tests.test_platform_postgres_integration_flow
```

## Suite Platform de regresion rapida

Archivo:

- `backend/app/tests/test_platform_flow.py`

Usarla cuando toques:

- lifecycle tenant
- archive o restore
- billing y politica de acceso
- provisioning y recuperacion

Ejecucion:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest app.tests.test_platform_flow
```

Casos importantes ya congelados aqui:

- `past_due` con gracia
- `past_due` sin gracia
- `canceled` dentro y fuera de periodo
- `suspended` por billing con bloqueo `423`
- mantenimiento con fechas naive/aware
- retries de provisioning con password rotada
- alta y edicion basica de tenant
- restore formal de tenant archivado
- alta, permisos y borrado seguro de usuarios de plataforma
- listado y filtros base de `Actividad` de plataforma

## Suite HTTP Smoke

Archivo:

- `backend/app/tests/test_http_smoke.py`

Cobertura actual:

- `/health`
- `/`
- middleware auth real por HTTP
- `X-Request-ID` en respuestas reales
- rechazo de rutas protegidas sin token
- rechazo de rutas protegidas con token invalido

Ejecucion:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest app.tests.test_http_smoke
```

Nota:

- esta suite abre un socket local y levanta `uvicorn` temporalmente

## Suite Security Hardening

Archivo:

- `backend/app/tests/test_security_hardening.py`

Cobertura actual:

- validacion de secretos inseguros por entorno
- persistencia y resolucion de secretos tenant
- enmascarado de secretos

Ejecucion:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest app.tests.test_security_hardening
```

## Suite Observability

Archivo:

- `backend/app/tests/test_observability.py`

Cobertura actual:

- preserva `X-Request-ID` entrante
- genera `X-Request-ID` cuando falta
- logging basico de resumen por request
- logging de excepciones

Ejecucion:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest app.tests.test_observability
```

## Suite Error Handling

Archivo:

- `backend/app/tests/test_error_handling.py`

Cobertura actual:

- payload uniforme para errores HTTP
- `request_id` en errores
- `errors` en validacion `422`
- `error_type` en errores inesperados

Ejecucion:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest app.tests.test_error_handling
```

## Suite Migration Flow

Archivo:

- `backend/app/tests/test_migration_flow.py`

Cobertura actual:

- aplicacion de migraciones `control`
- aplicacion de migraciones `tenant`
- idempotencia del runner

Ejecucion:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest app.tests.test_migration_flow
```

## Suite Platform

Archivo:

- `backend/app/tests/test_platform_flow.py`

Cobertura actual:

- dependencies platform
- role guard de platform
- auth service de platform
- tenant service con repositories fakes
- provisioning job service con repository fake
- login platform
- ping a DB control
- create tenant
- provisioning jobs
- politica de acceso tenant por `billing`, incluyendo `past_due` con y sin gracia, `canceled` dentro o fuera del periodo vigente y `suspended`

Ejecucion:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest app.tests.test_platform_flow
```

## Suite Provisioning Worker

Archivo:

- `backend/app/tests/test_provisioning_worker.py`

Cobertura actual:

- listado de jobs `pending` desde `ProvisioningJobService`
- procesamiento secuencial del worker
- uso de una sesion separada por job
- cierre correcto de sesiones
- continuidad del worker aunque un job individual falle
- reintentos y backoff del `ProvisioningService`
- corte del ciclo por umbral maximo de fallos

Ejecucion:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest app.tests.test_provisioning_worker
```

## Ejecutar ambas suites

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest \
  app.tests.test_observability \
  app.tests.test_tenant_flow \
  app.tests.test_tenant_finance_flow \
  app.tests.test_tenant_integration_flow \
  app.tests.test_tenant_postgres_integration_flow \
  app.tests.test_platform_integration_flow \
  app.tests.test_platform_postgres_integration_flow \
  app.tests.test_http_smoke \
  app.tests.test_security_hardening \
  app.tests.test_migration_flow \
  app.tests.test_provisioning_worker \
  app.tests.test_platform_flow
```

## Estado actual

Resultados verificados en este entorno:

- `app.tests.test_tenant_flow`: OK
- `app.tests.test_tenant_finance_flow`: OK
- `app.tests.test_observability`: OK
- `app.tests.test_error_handling`: OK
- `app.tests.test_platform_flow`: OK
- `app.tests.test_tenant_integration_flow`: OK
- `app.tests.test_platform_integration_flow`: OK
- `app.tests.test_migration_flow`: OK
- `app.tests.test_platform_flow`: OK, incluyendo lectura y respuesta de `schema-status` tenant
- `app.tests.test_provisioning_worker`: OK
- `app.tests.test_security_hardening`: OK
- `app.tests.test_http_smoke`: OK

Ejecuciones verificadas mas recientes:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest \
  app.tests.test_observability \
  app.tests.test_tenant_flow \
  app.tests.test_tenant_finance_flow \
  app.tests.test_platform_flow \
  app.tests.test_provisioning_worker \
  app.tests.test_tenant_integration_flow \
  app.tests.test_platform_integration_flow \
  app.tests.test_migration_flow \
  app.tests.test_security_hardening
```

Resultado:

- `Ran 70 tests ... OK` con el runner unificado sin smoke HTTP

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest app.tests.test_http_smoke
```

Resultado:

- `Ran 6 tests ... OK`

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python app/scripts/run_backend_tests.py
```

Resultado:

- `Ran 77 tests ... OK`
- suites PostgreSQL omitidas por no tener `PGTEST_*` configurado en este entorno

## Limitaciones

- son pruebas unitarias, no end-to-end
- no levantan base de datos real
- dependen de mocks para servicios y acceso a datos
- validan el patron actual `router -> service`, no integracion completa con infraestructura

Nota:

- las suites de integracion usan SQLite temporal; validan persistencia real y relaciones basicas, pero no reemplazan pruebas contra PostgreSQL
- las suites PostgreSQL temporales se saltan automaticamente si `PGTEST_*` no esta configurado
- la suite HTTP smoke usa servidor real temporal, pero sigue siendo una validacion corta y no reemplaza pruebas end-to-end completas

## Siguiente paso recomendado

Despues de estas suites, lo ideal es agregar:

- pruebas de servicios con fake repositories
- pruebas HTTP de integracion mas profundas sobre endpoints clave
- incorporar estas suites PostgreSQL al flujo normal de CI o pre-release
- mas smoke tests sobre flujos autenticados completos

## Bordes recientes ya congelados

Estos casos ya quedaron cubiertos y no deberian volver a depender solo de prueba manual:

- mantenimiento con datetimes `naive` y `aware`
- rotacion de password para roles PostgreSQL tenant ya existentes durante retries de provisioning
- migracion de control `0023_tenant_db_credentials_tracking`
- bloqueo por `core.users.admin` al crear, cambiar rol o reactivar admins fuera de cupo
- bloqueo por `core.users.active` al reactivar usuarios fuera de cupo
- acceso tenant permitido o bloqueado por `billing` en estados `past_due`, `canceled` y `suspended`
- login tenant rechazado cuando `billing_status=suspended`
- creacion de usuarios tenant bloqueada por `core.users.monthly`
- paso correcto de `core.users.monthly` desde middleware/ruta tenant hacia el servicio de usuarios
