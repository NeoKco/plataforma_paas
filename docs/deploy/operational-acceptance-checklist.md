# Checklist de Aceptacion Operativa

Esta guia deja un criterio minimo para decidir si un deploy o un restore drill quedaron realmente aceptados.

La idea es evitar el clasico "respondio una vez" como unica validacion.

## Objetivo

- definir criterios minimos de aceptacion
- dejar una evidencia repetible
- reducir decisiones improvisadas despues de deploy o restore

## Archivo Base

- `deploy/collect_backend_operational_evidence.sh`

## Aceptacion Minima Post-Deploy

Un deploy backend se considera aceptable si:

- `systemd` deja el servicio en estado `active`
- el healthcheck responde `200`
- no hay errores persistentes en logs recientes del servicio
- la verificacion post-deploy termina exitosa
- la lectura operativa base de `business-core` y `maintenance` no presenta errores visibles en la prueba corta de terreno definida para el release

Comandos minimos:

```bash
systemctl status platform-paas-backend --no-pager
curl -I http://127.0.0.1/health
sudo journalctl -u platform-paas-backend -n 100 --no-pager
```

## Aceptacion Minima Post-Restore Drill de `platform_control`

El drill se considera aceptable si:

- la DB temporal se crea
- el backup restaura sin error
- existen tablas clave:
  - `platform_users`
  - `tenants`
  - `provisioning_jobs`
  - `auth_tokens`
  - `auth_audit_events`

## Aceptacion Minima Post-Restore Drill de Tenants

El drill tenant se considera aceptable si:

- cada backup restaurado crea una DB temporal valida
- existen tablas core:
  - `tenant_info`
  - `users`
  - `roles`
- el proceso termina sin tenants fallidos, o los fallidos quedan identificados explicitamente

## Recoleccion de Evidencia

Script:

- `deploy/collect_backend_operational_evidence.sh`

Uso:

```bash
SERVICE_NAME=platform-paas-backend \
HEALTHCHECK_URL=http://127.0.0.1/health \
bash deploy/collect_backend_operational_evidence.sh
```

Que deja:

- revision git actual, si existe checkout git
- estado del servicio
- logs recientes
- respuesta del healthcheck

## Cuando No Aceptar

No aceptar un deploy o restore si:

- el servicio queda inestable
- el healthcheck falla o responde intermitente
- hay errores repetidos en logs recientes
- faltan tablas clave en el restore drill
- la evidencia no deja claro que se valido el resultado

## Accion Recomendada si Falla

- deploy fallido por codigo: usar rollback por ref git
- restore drill fallido: revisar backup, logs de PostgreSQL y repetir sobre una DB temporal
- problemas de migracion o datos: no asumir que rollback de codigo arregla el estado

## Guias Relacionadas

- `docs/deploy/backend-post-deploy-verification.md`
- `docs/deploy/backend-release-and-rollback.md`
- `docs/deploy/restore-drill-platform-control.md`
- `docs/deploy/restore-drill-tenants.md`
