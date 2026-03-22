# Demo Data y Seeds de Desarrollo

Este runbook deja una forma reproducible de cargar datos de demo mas ricos que el bootstrap minimo.

El objetivo es tener un entorno que sirva para:

- demos de `platform_admin`
- pruebas manuales de estados operativos
- validacion de frontend sin depender solo de fixtures de tests

## Que Hace el Seed de Demo

El script:

- asegura instalacion y `superadmin`
- crea o actualiza tenants de demo en `platform_control`
- deja escenarios distintos de lifecycle, billing y maintenance
- intenta sembrar DB tenant cuando el tenant ya tiene DB configurada y accesible

Script:

```bash
cd /home/felipe/platform_paas/backend
python app/scripts/seed_demo_data.py
```

## Baseline Canonica para Frontend

Para dejar un entorno estable y facil de recorrer en UI existe ademas este script:

```bash
cd /home/felipe/platform_paas/backend
PYTHONPATH=/home/felipe/platform_paas/backend \
/home/felipe/platform_paas/platform_paas_venv/bin/python -m app.scripts.seed_frontend_demo_baseline
```

Este baseline intenta dejar siempre estos tres casos:

- `empresa-demo`: tenant `pending`, sin configuracion DB tenant, util para validar estados de onboarding o provisioning incompleto
- `condominio-demo`: tenant `active`, con DB tenant provisionada y datos demo para `tenant_portal`
- `empresa-bootstrap`: tenant `active`, con DB tenant provisionada y util para administracion desde `platform_admin`

Si `POSTGRES_ADMIN_PASSWORD` esta disponible, el script provisiona de punta a punta los tenants activos. Si ya estaban provisionados, solo reusa la configuracion y vuelve a sembrar datos demo tenant.

## Escenarios que Crea

### `condominio-demo`

- `status=active`
- `billing_status=active`
- cuotas y limites de modulo para demo

### `empresa-gracia`

- `status=active`
- `billing_status=past_due`
- `billing_grace_until` futuro

### `torre-mantenimiento`

- `status=active`
- mantenimiento activo sobre `finance`
- `maintenance_access_mode=write_block`

### `empresa-suspendida`

- `status=suspended`
- billing suspendido

### `archivo-demo`

- `status=archived`
- billing cancelado y fuera de periodo

## Datos Tenant que Intenta Sembrar

Si el tenant ya tiene DB provisionada y credenciales completas, el script agrega:

- roles base `admin`, `manager`, `operator`
- usuarios de demo:
  - `manager@{tenant_slug}.local`
  - `operator@{tenant_slug}.local`
  - `backoffice@{tenant_slug}.local`
- movimientos de `finance` de ingreso y gasto del mes actual

Si la DB tenant no existe o no esta configurada, el script no falla el seed general: solo informa `skipped`.

## Credenciales Demo

Plataforma:

- `admin@platform.local`
- `AdminTemporal123!`

Usuarios tenant adicionales:

- manager: `TenantManager123!`
- operator: `TenantOperator123!`
- backoffice: `TenantBackoffice123!`

El admin tenant bootstrap sigue siendo:

- `admin@{tenant_slug}.local`
- `TenantAdmin123!`

## Uso Recomendado

Orden sugerido:

1. correr migraciones de control
2. correr `seed_platform_control.py` o directamente `seed_demo_data.py`
3. provisionar al menos un tenant activo si quieres probar login tenant
4. volver a correr `seed_demo_data.py` para enriquecer la DB tenant ya provisionada

Para demos de frontend y manuales visuales, conviene usar en cambio:

1. correr migraciones de control
2. correr `seed_frontend_demo_baseline.py`
3. abrir `platform_admin` y `tenant_portal`
4. solo despues, si quieres mas variedad operativa, complementar con `seed_demo_data.py`

## Limitaciones

- el seed de demo no crea por si mismo bases PostgreSQL tenant
- el enriquecimiento de DB tenant depende de que el tenant ya tenga configuracion de DB valida
- los planes usados dependen de los planes efectivamente definidos por entorno
