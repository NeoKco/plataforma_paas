# Reset Bootstrap de Staging

Guia para devolver `staging/test` al modo de instalador inicial sin tocar `production`.

## Objetivo

Usar el mismo mini PC para dos necesidades distintas:

- regresion funcional sobre un staging ya instalado
- validacion del instalador inicial desde cero

La segunda no debe hacerse manualmente a mano sobre `production`. Para eso existe un reset controlado solo sobre `staging`.

## Script canonico

- [reset_staging_bootstrap.sh](/home/felipe/platform_paas/deploy/reset_staging_bootstrap.sh)

## Alcance del reset

Cuando se ejecuta en modo real:

- detiene `platform-paas-backend-staging`
- detecta DBs y roles tenant registrados en `platform_control_staging`
- elimina esas DBs y roles tenant, salvo que se use `--preserve-tenant-dbs`
- elimina `platform_control_staging`
- remueve el archivo `.platform_installed`
- fuerza `PLATFORM_INSTALLED=false` en `/opt/platform_paas_staging/.env.staging`
- fuerza `INSTALL_FLAG_FILE=/opt/platform_paas_staging/.platform_installed` en `/opt/platform_paas_staging/.env.staging`
- remueve `/opt/platform_paas_staging/.env` si quedó heredado de una instalación previa
- vuelve a levantar `platform-paas-backend-staging`
- valida que `/health` responda con `"installed": false`

## Seguridad

El script trae defensas para no apuntar a producción por error:

- exige `APP_ENV=staging`
- exige que `PROJECT_ROOT` y `SERVICE_NAME` contengan `staging`
- por defecto corre en `--plan`

## Uso recomendado

### 1. Ver el plan sin tocar nada

```bash
cd /home/felipe/platform_paas
bash deploy/reset_staging_bootstrap.sh --plan
```

### 2. Ejecutar el reset real

```bash
cd /home/felipe/platform_paas
sudo bash deploy/reset_staging_bootstrap.sh --execute
```

### 3. Si necesitas preservar DBs tenant

```bash
cd /home/felipe/platform_paas
sudo bash deploy/reset_staging_bootstrap.sh --execute --preserve-tenant-dbs
```

## Validacion posterior

Backend staging:

```bash
curl --silent --show-error http://127.0.0.1:8200/health
curl --silent --show-error http://127.0.0.1:8200/install/
```

Frontend staging:

- abrir `http://192.168.7.42:8081`
- la SPA debe terminar en el flujo `/install`

## Relacion con E2E

El baseline browser normal no incluye el instalador porque el flujo es destructivo para el entorno donde corre.

Para validar visualmente el instalador:

1. ejecutar el reset de staging
2. apuntar Playwright a `http://192.168.7.42:8081`
3. correr el smoke opt-in del instalador

Referencia:

- [frontend/e2e/README.md](/home/felipe/platform_paas/frontend/e2e/README.md)

## Regla operativa

- si quieres regresion funcional: usa el staging ya instalado
- si quieres probar instalacion inicial: primero ejecuta el reset bootstrap

No mezclar ambos objetivos en la misma pasada sin dejar el estado explícito en los archivos raíz.
