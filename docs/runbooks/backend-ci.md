# CI Backend

Este documento deja una base minima para correr el backend de `platform_paas` en CI con el mismo runner local del equipo.

## Objetivo

- usar un unico punto de entrada para pruebas backend
- correr tambien las suites PostgreSQL temporales
- mantener alineado el flujo local con el flujo de CI

## Workflow Actual

Archivo:

- `.github/workflows/backend-tests.yml`

Ese workflow:

- instala dependencias desde `backend/requirements/base.txt`
- levanta PostgreSQL temporal como servicio
- expone `PGTEST_*` para activar suites PostgreSQL
- ejecuta `backend/app/scripts/run_backend_tests.py`
- acepta `workflow_dispatch` con `target=all|auth|tenant|finance|provisioning|platform`

## Variables de Entorno del Workflow

El job backend define estas variables:

- `APP_ENV=test`
- `DEBUG=true`
- `PGTEST_HOST=127.0.0.1`
- `PGTEST_PORT=5432`
- `PGTEST_ADMIN_DB=postgres`
- `PGTEST_ADMIN_USER=postgres`
- `PGTEST_ADMIN_PASSWORD=postgres`

## Replica Local del Flujo de CI

Archivo de ejemplo:

- `infra/env/pgtest.example.env`

Pasos:

```bash
cd /home/felipe/platform_paas
set -a
source infra/env/pgtest.example.env
set +a

cd backend
/home/felipe/platform_paas/platform_paas_venv/bin/python app/scripts/run_backend_tests.py
```

Alternativa corta desde la raiz:

```bash
scripts/dev/run_local_backend_baseline.sh --target all --with-postgres
```

## Resultado Esperado

Con el estado actual del repositorio, el runner unificado deberia cerrar con algo de este estilo:

```text
Ran 77 tests ... OK
```

## Siguientes Mejoras Naturales

- separar jobs `base` y `postgres` si el tiempo de CI crece demasiado
- agregar matriz de versiones de Python cuando el proyecto lo necesite
- volver obligatorio el workflow en ramas protegidas
- agregar artifacts si mas adelante aparecen reportes de test o coverage
- evaluar coverage formal cuando la baseline backend ya quede estable varias semanas seguidas
