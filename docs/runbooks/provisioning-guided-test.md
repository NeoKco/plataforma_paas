# Prueba Guiada de Provisioning

Este runbook documenta la prueba real usada para entender `Provisioning` de punta a punta sobre un caso controlado.

La idea es simple:

- crear un tenant nuevo
- ver como aparece su job en `Provisioning`
- ejecutar el worker
- interpretar `pending`, `retry_pending` y `completed`
- corregir un fallo real si aparece

## Objetivo

Entender en la practica que significa `provisionar` un tenant en esta plataforma.

Provisionar un tenant no es solo crearlo en `platform_control`.

Provisionar significa dejar lista su infraestructura minima:

- DB tenant
- usuario tecnico de la DB
- esquema tenant
- secreto tecnico en `TENANT_SECRETS_FILE`
- admin inicial del tenant capturado al momento del alta

Lectura corta para no confundir conceptos:

- `crear tenant` = darlo de alta en `platform_control`
- `provisionar tenant` = preparar su infraestructura tecnica real

Hoy ese ciclo se ve repartido asi:

- `Tenants` crea el tenant y dispara el job
- `Tenants` ya muestra el ultimo job de provisioning del tenant seleccionado
- `Provisioning` muestra la cola global, reintentos, alertas y recuperacion
- el worker ejecuta el trabajo tecnico real
- `Provisioning` ya deja tambien ejecutar un job pendiente o en retry desde la misma consola
- `Provisioning` ya muestra familias de fallo por `error_code` y ciclos recientes del worker
- `Provisioning` ya resume primero los jobs que requieren accion para no perderse entre historial y tablas largas
- las acciones manuales de `Ejecutar ahora`, `Reencolar job` y `Reencolar DLQ` ya pasan por confirmacion previa y dejan feedback especifico por accion
- `Provisioning` ya muestra tambien un bloque `Que revisar ahora` para distinguir backlog normal, retries, jobs fallidos, DLQ y ciclos del worker cortados por error
- `Tenants` ya deja `Reprovisionar tenant` cuando el historial previo quedo `completed`, pero la configuracion DB sigue incompleta
- `Tenants` ya deja abrir `Provisioning` con el `tenantSlug` precargado cuando quieres leer solo el backlog tecnico de ese tenant

## Cuándo usar esta prueba

Usa esta guia cuando necesites:

- explicar `Provisioning` a alguien nuevo
- validar que el worker funciona
- reproducir un flujo `pending -> completed`
- entender un `retry_pending`
- demostrar como se lee la pantalla `Provisioning`

## Precondiciones

- backend levantado
- frontend levantado
- acceso como `superadmin` a `platform_admin`
- PostgreSQL operativo
- `POSTGRES_ADMIN_PASSWORD` correctamente configurado

## Caso Controlado Usado

Tenant creado para la prueba:

- nombre: `Empresa Provisioning Demo`
- slug: `empresa-provisioning-demo`
- tipo: `empresa`
- plan: `mensual`

## Paso 1. Crear el tenant

Comando usado:

```bash
cd /home/felipe/platform_paas/backend
PYTHONPATH=/home/felipe/platform_paas/backend \
/home/felipe/platform_paas/platform_paas_venv/bin/python - <<'PY'
from app.common.db.control_database import ControlSessionLocal
from app.apps.platform_control.services.tenant_service import TenantService

db = ControlSessionLocal()
try:
    tenant = TenantService().create_tenant(
        db=db,
        name="Empresa Provisioning Demo",
        slug="empresa-provisioning-demo",
        tenant_type="empresa",
        plan_code="mensual",
        admin_full_name="Provisioning Demo Admin",
        admin_email="admin@empresa-provisioning-demo.local",
        admin_password="TenantAdmin123!",
    )
    print(
        f"tenant_id={tenant.id} slug={tenant.slug} "
        f"status={tenant.status} plan={tenant.plan_code}"
    )
finally:
    db.close()
PY
```

Resultado esperado:

- el tenant queda creado en `platform_control`
- el tenant queda con `status=pending`
- se genera automaticamente un job `create_tenant_database`
- el admin inicial queda explícitamente fijado al crear el tenant; ya no debe asumirse un bootstrap implícito fuera de este caso controlado

## Paso 2. Leer la pantalla `Provisioning`

Despues de crear el tenant, la pantalla debe mostrar:

- una fila nueva en `Jobs de provisioning`
- `tenant = empresa-provisioning-demo`
- `tipo de job = Crear base del tenant`
- `estado = pending`

Interpretacion:

- el tenant existe
- todavia no esta listo
- el trabajo quedo en cola y espera al worker

## Paso 3. Ejecutar el worker

Comando usado:

```bash
cd /home/felipe/platform_paas/backend
PYTHONPATH=/home/felipe/platform_paas/backend \
/home/felipe/platform_paas/platform_paas_venv/bin/python -m app.scripts.run_provisioning_worker --once
```

Resultado esperado:

- el worker toma el job pendiente
- intenta crear el rol Postgres
- intenta crear la DB tenant
- intenta bootstrapear el esquema tenant
- deja el job como `completed` o lo mueve a retry/fallo si algo sale mal

## Lo que ocurrió realmente en esta prueba

### Primer intento

Estado observado en UI:

- `retry_pending`
- `attempts = 1/3`
- `error_code = tenant_schema_bootstrap_failed`

Interpretacion:

- el worker si tomo el job
- la creacion del tenant no se completo
- el sistema agendo un nuevo intento automatico

### Segundo intento

Estado observado:

- `retry_pending`
- `attempts = 2/3`
- mismo `error_code`

Esto confirmo que no era un fallo transitorio.

## Diagnóstico del fallo real

Se inspecciono el job y el `error_message` real fue:

- autenticacion password fallida para el usuario `user_empresa_provisioning_demo`

Lectura correcta del problema:

- la DB tenant y el rol Postgres ya existian de un intento previo
- en el retry el worker genero una contraseña nueva
- el backend no estaba rotando la contraseña del rol existente
- por eso el bootstrap del esquema tenant intentaba entrar con una contraseña distinta a la real

## Fix aplicado a partir de esta prueba

Archivo corregido:

- [postgres_bootstrap_service.py](/home/felipe/platform_paas/backend/app/apps/installer/services/postgres_bootstrap_service.py)

Cambio realizado:

- si el rol Postgres ya existe, ahora se ejecuta `ALTER ROLE ... PASSWORD ...`
- eso vuelve idempotente el retry del provisioning

Prueba agregada:

- [test_postgres_bootstrap_service.py](/home/felipe/platform_paas/backend/app/tests/test_postgres_bootstrap_service.py)

Validacion usada:

```bash
python3 -m compileall backend/app/apps/installer/services/postgres_bootstrap_service.py backend/app/tests/test_postgres_bootstrap_service.py

PYTHONPATH=/home/felipe/platform_paas/backend \
/home/felipe/platform_paas/platform_paas_venv/bin/python -m unittest backend.app.tests.test_postgres_bootstrap_service
```

## Paso 4. Reintento despues del fix

Se volvio a ejecutar:

```bash
cd /home/felipe/platform_paas/backend
PYTHONPATH=/home/felipe/platform_paas/backend \
/home/felipe/platform_paas/platform_paas_venv/bin/python -m app.scripts.run_provisioning_worker --once
```

Resultado real:

- el worker completo el job
- se imprimio `==== TENANT DB CREATED ====`
- se creo `tenant_empresa_provisioning_demo`
- se creo `user_empresa_provisioning_demo`
- se guardo `TENANT_DB_PASSWORD__EMPRESA_PROVISIONING_DEMO` en `TENANT_SECRETS_FILE`
- el job paso a `completed`
- el login tenant bootstrap quedo disponible con el correo y password capturados al crear el tenant

## Qué significa cada estado en Provisioning

- `pending`: el job esta en cola
- `running`: el worker lo esta procesando
- `retry_pending`: fallo, pero aun quedan intentos
- `completed`: provisioning terminado correctamente
- `failed`: agoto intentos y necesita intervencion explicita

## Caso operativo adicional: `completed` historico pero DB incompleta

Puede ocurrir que un tenant muestre un job historico `completed`, pero aun asi no tenga:

- `db_name`
- `db_user`
- `db_host`
- `db_port`

En ese caso:

- el acceso rapido al `tenant_portal` debe seguir bloqueado
- la consola ya no intenta ejecutar el job historico completado
- el camino correcto es usar `Reprovisionar tenant` desde `Tenants`

Ese flujo crea un job nuevo `create_tenant_database` para recomponer la base tenant sin reescribir el historial anterior.

## Qué se ve en frontend despues del ajuste

En entorno de desarrollo, la pantalla `Provisioning` ahora muestra ademas un bloque fijo con:

- usuario bootstrap: `admin@<tenant_slug>.local`
- password bootstrap: `TenantAdmin123!`

Eso existe para facilitar onboarding y pruebas manuales del `tenant_portal` sin exponer secretos dinamicos reales.

## Qué aprendimos de esta prueba

- crear tenant genera job automatico
- `Provisioning` sirve para leer el estado tecnico del tenant
- `retry_pending` no es un estado muerto; es un fallo recuperable
- los reintentos deben ser idempotentes
- el detalle importante no es solo el `error_code`, sino tambien el `error_message`

### Secuencia operativa para dejar un tenant nuevo listo

Cuando el tenant todavia no debe abrir portal tenant, sigue esta secuencia:

1. crear el tenant desde `Platform Admin > Tenants`
2. verificar que se genere `create_tenant_database`
3. revisar el job en `Provisioning`
4. si queda `pending` o `retry_pending`, ejecutar o reencolar segun corresponda
5. si el tenant quedo `completed` historico pero la DB sigue incompleta, usar `Reprovisionar tenant`
6. si la DB ya existe pero el esquema esta atrasado, ejecutar `sync_tenant_schema` o `schema auto-sync`
7. volver a `Tenants` y verificar:
   - `status=active`
   - `db_configured=true`
   - esquema al dia
8. confirmar que ahora ya aparecen:
   - `Archivar tenant`
   - `Abrir portal tenant`

Regla de interpretacion:

- `pending` / `retry_pending`: aun falta provisioning
- `active` + `db_configured=false`: el tenant existe, pero no debe abrir portal
- `active` + `db_configured=true` + esquema al dia: el portal ya debe estar disponible
- `sync_tenant_schema` fallando por DB incompleta: reprovisionar, no insistir sobre el mismo job

## Cómo leer la pantalla después de la prueba

Si todo esta sano, `Provisioning` deberia mostrar:

- `jobs fallidos = 0`
- `alertas activas = 0`
- `filas DLQ = 0`
- el job del tenant nuevo en `completed`

En `Tenants`, el tenant deberia terminar como usable y visible en el catalogo.

## Regla operativa para futuras pruebas

De aqui en adelante, cada prueba funcional relevante del proyecto deberia dejar:

- contexto del problema o del flujo
- pasos ejecutados
- resultado esperado
- resultado real
- diagnostico si fallo
- fix aplicado si correspondio
- archivos tocados
- comandos de validacion

El objetivo es que la documentacion crezca junto con el producto y no como trabajo separado al final.
