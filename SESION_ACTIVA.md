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

- fecha: 2026-04-11
- foco activo: slice broker-only `Provisioning/DLQ family recommendation` ya cerrado
- prioridad inmediata: abrir el siguiente slice broker-only real dentro de `Provisioning/DLQ`
- módulo o frente activo: `platform-core` / `Provisioning/DLQ`

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
  - export/import portable `zip + manifest + csv`
  - dos modos visibles: `portable_full` y `functional_data_only`
  - compatibilidad heredada de import para `portable_minimum`
- el flujo browser completo `export + dry_run + apply` desde `platform_admin` ya quedó validado en `staging` y `production`
- el mismo flujo ya quedó expuesto también en `tenant_portal` para admin tenant, con smoke dedicado en repo
- el import ya quedó endurecido para tipar booleanos, fechas, numéricos, JSON y binarios según la columna destino
- el deploy backend ya crea y deja escribible `TENANT_DATA_EXPORT_ARTIFACTS_DIR` al usuario real del servicio
- el backend productivo ya no arranca con defaults bootstrap demo inseguros embebidos en `settings.py`
- el modelo canónico de ese frente ya quedó abierto y actualizado en `docs/modules/platform-core/TENANT_DATA_PORTABILITY_MODEL.md`
- `Tenants` ya muestra el bloque `Portabilidad tenant` con selección de modo, creación de job, lectura de últimos exports y descarga del `zip`
- `Tenant Portal > Resumen técnico` ya muestra el mismo bloque de portabilidad e import controlado para admin tenant
- ya existe smoke browser `platform-admin-tenant-data-export`
- ya existe smoke browser `tenant-portal-data-portability`
- el corte dual portable ya quedó desplegado y validado en `staging`
- el corte dual portable ya quedó desplegado y validado en `production`
- `Provisioning` ya expone observabilidad visible con snapshots recientes e historial de alertas
- el smoke `platform-admin-provisioning-observability-history` ya quedó validado en `staging`
- el smoke `platform-admin-provisioning-observability-history` ya quedó validado en `production`
- `Provisioning` ya expone además `requeue guiado` dentro de `Operación DLQ`
- el smoke `platform-admin-provisioning-guided-requeue` ya quedó validado en `staging`
- en `production`, ese smoke broker-only queda `skipped` mientras el dispatch backend no sea `broker`
- `Provisioning` ya expone además la `Capacidad activa de provisioning`, mostrando si el entorno corre con `dispatch backend` `broker` o `database`
- el smoke `platform-admin-provisioning-dispatch-capability` ya quedó validado en `staging`
- el smoke `platform-admin-provisioning-dispatch-capability` ya quedó validado en `production`
- `Provisioning` ya adapta además el panel `Operación DLQ` según ese backend activo
- el smoke `platform-admin-provisioning-dlq-surface-gating` ya quedó validado en `staging`
- el smoke `platform-admin-provisioning-dlq-surface-gating` ya quedó validado en `production`
- `Provisioning` ya expone además `familias DLQ visibles` y `Enfocar familia` dentro del panel broker-only
- el smoke `platform-admin-provisioning-dlq-family-focus` ya quedó validado en `staging`
- en `production`, ese smoke broker-only queda `skipped` mientras el dispatch backend siga sin ser `broker`
- `Provisioning` ya expone además `Reencolar familia` directo desde ese resumen broker-only
- el smoke `platform-admin-provisioning-dlq-family-requeue` ya quedó validado en `staging`
- en `production`, ese smoke nuevo también queda `skipped` mientras el dispatch backend siga sin ser `broker`
- `Provisioning` ya expone además selección múltiple homogénea y `Reencolar selección` sobre familias visibles
- el smoke `platform-admin-provisioning-dlq-family-batch-requeue` ya quedó validado en `staging`
- en `production`, ese smoke nuevo también queda `skipped` mientras el dispatch backend siga sin ser `broker`
- `Provisioning` ya expone además un bloque `Plan operativo sugerido` sobre `Familias DLQ visibles`
- el smoke `platform-admin-provisioning-dlq-family-recommendation` ya quedó validado en `staging`
- en `production`, ese smoke nuevo también queda `skipped` mientras el dispatch backend siga sin ser `broker`
- el catálogo de `Tenants` ya no desborda la columna izquierda cuando aparecen slugs largos o tenants efímeros E2E
- ya existe el helper `scripts/dev/run_staging_published_broker_dlq_smoke.sh`
- ese helper ya quedó validado con `--target family`, `--target family-requeue`, `--target family-batch` y `--target family-recommendation` en el staging publicado
- el flujo portable real `empresa-demo -> ieris-ltda` ya quedó ejecutado con `functional_data_only`
- durante esa operación se corrigieron dos bugs reales del servicio portable:
  - faltaban tablas soporte por FK en el scope funcional
  - `skip_existing` no respetaba constraints únicos de negocio
- `ieris-ltda` ya quedó poblado con los datos funcionales operativos de `empresa-demo`
- `Tenants` ya abre `Provisioning` con `tenantSlug` precargado
- `Provisioning` ya enfoca jobs, métricas, alertas y DLQ según ese tenant sin perder la consola global
- ya existe smoke browser `platform-admin-tenant-provisioning-context`
- ese smoke ya quedó validado en `staging` y `production`
- `Provisioning` ya implementa en repo, `staging` y `production` la acción `Investigar en DLQ` desde `Fallos por código` y `Alertas activas`
- el smoke nuevo `platform-admin-provisioning-dlq-investigation` ya quedó verde en `staging`

## Bloqueo actual

- no hay bloqueo activo en este corte
- la última corrección operativa fue doble:
  - cerrar la recomendación operativa sobre familias visibles en `Provisioning/DLQ`
  - corregir el release frontend por entorno para no romper `staging` con `API_BASE_URL` equivocada
- el único detalle operativo adicional es de ejecución del agente: el smoke tenant-side puede requerir salir del sandbox si Chromium falla con `SIGTRAP`

## Siguiente acción inmediata

El siguiente movimiento correcto es este:

- mantener `production` estable
- mantener `staging` como carril previo real
- asumir cerrado el corte dual de portabilidad tenant-side y su hotfix operativo adicional
- asumir cerrado también el subfrente de `requeue guiado` en repo y `staging`
- asumir cerrado también el subfrente `familias DLQ visibles`
- asumir cerrado también el subfrente `Reencolar familia`
- asumir cerrado también el subfrente `Reencolar selección` por familias visibles
- asumir cerrado también el subfrente `Plan operativo sugerido` por familias visibles
- asumir cerrado también el helper published broker-only de `staging`
- volver al roadmap central de `Provisioning/DLQ` con foco en el siguiente slice funcional broker-only

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
- import real `empresa-demo -> ieris-ltda` con `functional_data_only`: OK
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
- smoke `tenant-portal-data-portability` en `staging`: OK
- smoke `tenant-portal-data-portability` en `production`: OK
- smoke `platform-admin-provisioning-observability-history` en `staging`: OK
- smoke `platform-admin-provisioning-observability-history` en `production`: OK
- smoke `platform-admin-provisioning-guided-requeue` en `staging`: OK
- smoke `platform-admin-provisioning-guided-requeue` en `production`: SKIPPED (`dispatch backend != broker`)
- smoke `platform-admin-provisioning-dispatch-capability` en `staging`: OK
- smoke `platform-admin-provisioning-dispatch-capability` en `production`: OK
- smoke `platform-admin-provisioning-dlq-surface-gating` en `staging`: OK
- smoke `platform-admin-provisioning-dlq-surface-gating` en `production`: OK
- smoke `platform-admin-tenant-provisioning-context` en `staging`: OK
- smoke `platform-admin-tenant-provisioning-context` en `production`: OK
- smoke `platform-admin-provisioning-dlq-family-requeue` en `staging`: OK
- smoke `platform-admin-provisioning-dlq-family-requeue` en `production`: SKIPPED (`dispatch backend != broker`)
- smoke `platform-admin-provisioning-dlq-family-batch-requeue` en `staging`: OK
- smoke `platform-admin-provisioning-dlq-family-batch-requeue` en `production`: SKIPPED (`dispatch backend != broker`)
- smoke `platform-admin-provisioning-dlq-family-recommendation` en `staging`: OK
- smoke `platform-admin-provisioning-dlq-family-recommendation` en `production`: SKIPPED (`dispatch backend != broker`)
- backend `unittest` del corte de portabilidad dual: OK (`294 tests`)
- `npm run build` del frontend: OK para el corte de portabilidad dual
- `npx playwright test --list`: OK (`44 tests`)
- despliegue `staging/production` del corte dual tenant-side: completado
