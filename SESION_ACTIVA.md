# SESION_ACTIVA

## Propósito

Este archivo es el puntero rápido entre sesiones cuando el proyecto se retoma desde otra cuenta, otra IA o después de agotar cuota.

No reemplaza:

- `ESTADO_ACTUAL.md`
- `SIGUIENTE_PASO.md`
- `HANDOFF_STATE.json`
- `CHECKLIST_CIERRE_ITERACION.md`

Su objetivo es más corto:

- decir en 30 segundos dónde quedó la mano
- qué frente estaba activo
- cuál es el siguiente movimiento inmediato

## Cómo usarlo

Actualizar este archivo cuando cierres una iteración relevante o cuando vayas a cambiar de sesión/cuenta.

Debe permanecer corto, operativo y fácil de escanear.

Antes de cerrar una iteración relevante, pasar también por:

- `CHECKLIST_CIERRE_ITERACION.md`

## Estado rápido vigente

- fecha: 2026-04-09
- foco activo: `platform-core hardening + E2E` sobre `Provisioning`
- prioridad inmediata: abrir el siguiente subfrente de `Provisioning/DLQ` ahora que `Investigar en DLQ` ya quedó cerrado
- módulo o frente activo: `platform-core` / continuidad central

## Último contexto útil

- `finance` quedó cerrado en su alcance actual
- `business-core` y `maintenance` quedaron operativos en su primer corte y alineados al frente transversal
- el backlog residual editorial no bloquea salida a terreno
- el mini PC ya quedó asumido como host productivo real
- `/opt/platform_paas` ya existe como árbol productivo separado
- `/opt/platform_paas_staging` ya existe como árbol staging separado
- `platform-paas-backend` ya quedó instalado en `systemd`
- `platform-paas-backend-staging` ya quedó instalado en `systemd`
- `nginx` ya publica la SPA y enruta backend por un único dominio HTTPS: `orkestia.ddns.net`
- `nginx` ya publica además el staging local en `http://192.168.7.42:8081`
- el smoke remoto completo contra `https://orkestia.ddns.net` ya pasó con `7/7` checks OK
- el health staging ya responde en `8200` y `8081`
- el staging ya fue reseteado a bootstrap y el instalador visual quedó validado en browser
- el staging ya volvió a espejo instalado con baseline frontend y responde `installed=true`
- el sidebar principal del `tenant_portal` ya quedó backend-driven usando `effective_enabled_modules`
- existe smoke browser dedicado `tenant-portal-sidebar-modules`
- el carril `dev` ya quedó alineado para reproducir billing grace tenant-side con CORS y `.env` consistentes
- en código, `Nuevo tenant` ya exige `admin_full_name`, `admin_email` y `admin_password`
- en código, provisioning ya usa ese admin explícito en vez de depender de `TenantAdmin123!`
- en código, `Tenants` ya muestra preview de módulos por `plan` y el bloque `Plan y módulos` queda visible para operación
- ese mismo frente ya quedó desplegado y validado en `staging` y `production`
- el host productivo también quedó corregido para arrancar realmente con `APP_ENV=production`
- la documentación canónica ya fija `staging` como espejo operativo por defecto y deja `bootstrap reset` como flujo puntual de validación
- el hotfix productivo de `provisioning` ya quedó aplicado: secretos tenant runtime salen a `TENANT_SECRETS_FILE`, `condominio-demo` volvió a quedar sano y `ierisltda` quedó eliminado para recreación limpia
- la portabilidad tenant ya quedó implementada en repo con:
  - export mínimo `zip + manifest + csv`
  - import mínimo controlado con carga de `zip`, `dry_run` y `apply`
- el flujo browser completo `export + dry_run + apply` ya quedó validado en `staging` y `production`
- el import ya quedó endurecido para tipar booleanos, fechas, numéricos, JSON y binarios según la columna destino
- el deploy backend ya crea y deja escribible `TENANT_DATA_EXPORT_ARTIFACTS_DIR` al usuario real del servicio
- el backend productivo ya no arranca con defaults bootstrap demo inseguros embebidos en `settings.py`
- el modelo canónico de ese frente ya quedó abierto y actualizado en `docs/modules/platform-core/TENANT_DATA_PORTABILITY_MODEL.md`
- `Tenants` ya muestra el bloque `Portabilidad tenant` con creación de job, lectura de últimos exports y descarga del `zip`
- ya existe smoke browser `platform-admin-tenant-data-export`
- `Tenants` ya abre `Provisioning` con `tenantSlug` precargado
- `Provisioning` ya enfoca jobs, métricas, alertas y DLQ según ese tenant sin perder la consola global
- ya existe smoke browser `platform-admin-tenant-provisioning-context`
- ese smoke ya quedó validado en `staging` y `production`
- `Provisioning` ya implementa en repo, `staging` y `production` la acción `Investigar en DLQ` desde `Fallos por código` y `Alertas activas`
- el smoke nuevo `platform-admin-provisioning-dlq-investigation` ya quedó verde en `staging`

## Bloqueo actual

- no hay bloqueo activo en este corte
- la última corrección operativa fue usar `/opt/platform_paas_staging/.env.staging` como env real del servicio `staging` para los smokes publicados que siembran backend

## Siguiente acción inmediata

El siguiente movimiento correcto es este:

- mantener `production` estable
- mantener `staging` como carril previo real
- seguir dentro de `platform-core hardening + E2E`
- elegir el siguiente subfrente concreto dentro de `Provisioning/DLQ`

## Archivos a leer justo después de este

1. `PROMPT_MAESTRO_MODULO.md`
2. `ESTADO_ACTUAL.md`
3. `SIGUIENTE_PASO.md`
4. `HANDOFF_STATE.json`

## Última verificación útil conocida

- backend productivo en `/opt/platform_paas`: desplegado
- `platform-paas-backend`: activo en `systemd`
- `GET http://127.0.0.1:8000/health`: OK
- `GET https://orkestia.ddns.net/health` validado por resolución local: OK
- frontend static preflight en `/opt/platform_paas`: OK
- smoke remoto público `all` en `https://orkestia.ddns.net`: OK (`7/7`)
- backend staging en `/opt/platform_paas_staging`: desplegado
- `platform-paas-backend-staging`: activo en `systemd`
- `GET http://127.0.0.1:8200/health`: OK
- `GET http://127.0.0.1:8081/health`: OK
- smoke opt-in `platform-admin-installer-availability`: OK
- `GET http://127.0.0.1:8200/health` otra vez con `installed=true`: OK
- smoke `platform-admin-tenant-data-export` en `staging`: OK
- smoke `platform-admin-tenant-data-export` en `production`: OK
- smoke `platform-admin-tenant-provisioning-context` en `staging`: OK
- smoke `platform-admin-tenant-provisioning-context` en `production`: OK
- `npm run build` del frontend: OK para el corte `Investigar en DLQ`
- `npx playwright test --list`: OK (`43 tests`)
- smoke específico `platform-admin-provisioning-dlq-investigation` en `staging`: OK
- smoke de regresión `platform-admin-tenant-provisioning-context` en `production`: OK después de publicar el frontend
