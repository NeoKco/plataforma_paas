# Restaurar Staging a Espejo

Guia para devolver `staging/test` desde `bootstrap reset` a `espejo instalado` sin rehacer pasos manuales.

## Objetivo

Cerrar el ciclo completo del mini PC:

- `production` estable
- `staging` util para regresion funcional
- `bootstrap reset` disponible solo cuando haga falta revalidar `/install`

## Script canonico

- [restore_staging_mirror.sh](/home/felipe/platform_paas/deploy/restore_staging_mirror.sh)

## Que hace

Cuando corre en modo real:

- detiene `platform-paas-backend-staging`
- remueve `/opt/platform_paas_staging/.env` si quedo heredado del instalador
- fuerza `PLATFORM_INSTALLED=true` en `/opt/platform_paas_staging/.env.staging`
- fuerza `INSTALL_FLAG_FILE=/opt/platform_paas_staging/.platform_installed`
- corre migraciones de control bajo `.env.staging`
- ejecuta `seed_frontend_demo_baseline.py`
- recrea `.platform_installed`
- vuelve a levantar `platform-paas-backend-staging`
- valida que `/health` responda con `"installed": true`

## Seguridad

El wrapper trae defensas equivalentes al reset:

- exige `APP_ENV=staging`
- exige que `PROJECT_ROOT` y `SERVICE_NAME` contengan `staging`
- por defecto corre en `--plan`

## Uso recomendado

### 1. Ver plan sin tocar nada

```bash
cd /home/felipe/platform_paas
bash deploy/restore_staging_mirror.sh --plan
```

### 2. Ejecutar la restauracion real

```bash
cd /home/felipe/platform_paas
sudo bash deploy/restore_staging_mirror.sh --execute
```

## Estado esperado despues

- `GET http://127.0.0.1:8200/health` responde `installed=true`
- `http://192.168.7.42:8081/login` vuelve al flujo normal de `platform_admin`
- quedan nuevamente disponibles los tenants demo del baseline de frontend

## Relacion con el reset bootstrap

Los dos wrappers quedan asi:

- [reset_staging_bootstrap.sh](/home/felipe/platform_paas/deploy/reset_staging_bootstrap.sh): lleva `staging` a instalador inicial
- [restore_staging_mirror.sh](/home/felipe/platform_paas/deploy/restore_staging_mirror.sh): devuelve `staging` a espejo operativo

## Regla operativa

No dejar `staging` en bootstrap por costumbre.

Usar bootstrap solo para:

- validar el instalador
- probar primera ejecucion
- ensayar bootstrap en un servidor nuevo

Terminada esa prueba, devolver `staging` a espejo instalado antes de seguir con regresion normal o con un nuevo frente del roadmap.
