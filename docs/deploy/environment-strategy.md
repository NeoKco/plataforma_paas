# Estrategia de Entornos

Esta guia deja una base minima para separar `development`, `staging` y `production` sin depender de un unico `.env`.

## Objetivo

- evitar configuracion mezclada entre entornos
- dejar plantillas claras para developers y operacion
- reducir errores de despliegue por variables incorrectas

## Archivos Base

- `infra/env/backend.development.example.env`
- `infra/env/backend.staging.example.env`
- `infra/env/backend.production.example.env`
- `infra/env/pgtest.example.env`

## Regla Recomendada

Usar un archivo por entorno real:

- desarrollo local: `.env`
- staging: `/opt/platform_paas_staging/.env.staging`
- produccion: `/opt/platform_paas/.env`

Y mantener los ejemplos del repo solo como plantillas.

## Diferencia Esperada por Entorno

### Development

- `APP_ENV=development`
- `DEBUG=true`
- puede trabajar con valores menos estrictos
- pensado para instalacion local y pruebas manuales
- en el mini PC compartido con producción, usar puertos dev separados:
  - backend: `127.0.0.1:8100`
  - frontend: `127.0.0.1:5173`

### Staging

- `APP_ENV=staging`
- `DEBUG=false`
- credenciales separadas de produccion
- replica el flujo operativo sin tocar datos reales
- si vive en el mismo mini PC, reservar puertos distintos a dev y prod:
  - backend: `127.0.0.1:8200`
  - frontend publicado por `nginx`: `http://192.168.7.42:8081`
- el staging operativo actual ya existe en `/opt/platform_paas_staging`
- hoy funciona como espejo instalado; si se necesita validar bootstrap inicial, hace falta reset controlado o un staging efimero adicional

### Production

- `APP_ENV=production`
- `DEBUG=false`
- secretos fuertes
- certificados, backups y timers reales
- mini PC actual:
  - backend: `127.0.0.1:8000`
  - frontend publicado por `nginx` en `https://orkestia.ddns.net`

## Uso Local

Para desarrollo:

```bash
cp infra/env/backend.development.example.env .env
```

Para staging o produccion en servidor, copiar y adaptar fuera del repo:

```bash
cp infra/env/backend.staging.example.env /opt/platform_paas/.env.staging
cp infra/env/backend.production.example.env /opt/platform_paas/.env
```

En el mini PC actual, la copia correcta para staging es:

```bash
cp infra/env/backend.staging.example.env /opt/platform_paas_staging/.env.staging
```

## Recomendacion Operativa

- no editar los archivos `*.example.env` para guardar secretos reales
- no compartir el mismo `CONTROL_DB_*` entre `staging` y `production`
- no reutilizar el mismo `JWT_SECRET_KEY` entre entornos
- usar nombres de DB y backups separados por entorno

## Relacion con Deploy

La plantilla `systemd` actual usa:

- `/opt/platform_paas/.env`

Si staging vive en la misma maquina, conviene duplicar la unidad `systemd` con:

- nombre de servicio distinto
- `EnvironmentFile` distinto
- puerto backend distinto
- `server_name` y `nginx` separados

Convención recomendada para el mini PC actual:

- desarrollo local:
  - backend `8100`
  - frontend `5173`
- staging/test:
  - backend `8200`
  - frontend `8081` via `nginx`
- producción:
  - backend `8000`
  - publicación pública en `80/443` con `nginx`

Wrappers incluidos para reducir errores manuales:

- `deploy/deploy_backend_staging.sh`
- `deploy/deploy_backend_production.sh`

Referencia operativa del staging actual:

- [Staging Single-Host](./staging-single-host.md)

Validador previo de entorno:

- `deploy/validate_backend_env.sh`

## Siguiente Evolucion Natural

- secretos fuera de archivos `.env`
- despliegue por entorno automatizado
- validacion previa de variables obligatorias
