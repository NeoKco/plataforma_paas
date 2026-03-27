# Provisioning Worker

Esta guia deja una base minima para ejecutar `provisioning_jobs` pendientes fuera del ciclo normal de requests HTTP.

El objetivo es desacoplar el aprovisionamiento tecnico de tenants de la API publica y preparar el backend para crecer con menos riesgo.

## Archivos Base

- `backend/app/workers/provisioning_worker.py`
- `backend/app/scripts/run_provisioning_worker.py`
- `deploy/install_provisioning_worker_profile_units.sh`
- `deploy/run_provisioning_worker_profile.sh`
- `infra/systemd/platform-paas-provisioning-worker.service`
- `infra/systemd/platform-paas-provisioning-worker.timer`
- `infra/systemd/platform-paas-provisioning-worker@.service`
- `infra/systemd/platform-paas-provisioning-worker@.timer`

## Que hace hoy

El worker actual:

- consulta jobs `pending` o `retry_pending` elegibles en `platform_control`
- puede filtrar esos jobs por `job_type`
- procesa una cantidad limitada por ciclo
- ejecuta cada job con una sesion propia
- aplica reintentos con backoff exponencial simple
- continua con otros jobs aunque uno falle
- usa un lock de proceso para evitar ejecucion concurrente del script
- corta el ciclo si supera un umbral de fallos consecutivos configurado
- puede correr una sola vez o en modo polling
- puede exportar el resumen actual de `provisioning` a un textfile Prometheus si esta habilitado
- esa exportacion externa ya incluye tambien alertas activas de provisioning
- persiste snapshots por tenant y una traza resumida del ciclo, correlacionadas por `capture_key`
- procesa tanto alta tecnica de tenant como retiro tecnico cuando existen jobs compatibles

No es todavia una cola distribuida. Es una base simple y operable para sacar trabajo largo fuera de la request.

## Variables Relevantes

Desde `.env`:

- `WORKER_POLL_INTERVAL_SECONDS`
- `WORKER_MAX_JOBS_PER_CYCLE`
- `WORKER_MAX_FAILURES_PER_CYCLE`
- `WORKER_RETRY_BASE_SECONDS`
- `WORKER_MAX_RETRY_SECONDS`
- `WORKER_JOB_TYPES`
- `WORKER_BACKLOG_AGING_THRESHOLD_MINUTES`
- `WORKER_PROFILES`
- `WORKER_JOB_TYPE_PRIORITIES`
- `WORKER_JOB_TYPE_LIMITS`
- `WORKER_JOB_TYPE_BACKLOG_LIMITS`
- `WORKER_TENANT_TYPE_PRIORITIES`
- `WORKER_TENANT_TYPE_LIMITS`
- `WORKER_TENANT_TYPE_BACKLOG_LIMITS`
- `WORKER_SELECTION_BUFFER_MULTIPLIER`
- `WORKER_LOCK_FILE`
- `PROVISIONING_JOB_MAX_ATTEMPTS`
- `PROVISIONING_DISPATCH_BACKEND`
- `PROVISIONING_BROKER_URL`
- `PROVISIONING_ALERT_PENDING_JOBS_THRESHOLD`
- `PROVISIONING_ALERT_RETRY_PENDING_JOBS_THRESHOLD`
- `PROVISIONING_ALERT_FAILED_JOBS_THRESHOLD`
- `PROVISIONING_ALERT_MAX_ATTEMPTS_SEEN_THRESHOLD`
- `PROVISIONING_ALERT_CYCLE_FAILED_COUNT_THRESHOLD`
- `PROVISIONING_ALERT_CYCLE_DURATION_MS_THRESHOLD`
- `PROVISIONING_ALERT_CYCLE_AGED_JOBS_THRESHOLD`
- `OBSERVABILITY_PROMETHEUS_TEXTFILE_ENABLED`
- `OBSERVABILITY_PROMETHEUS_TEXTFILE_PATH`
- `CONTROL_DB_POOL_SIZE`
- `CONTROL_DB_MAX_OVERFLOW`
- `CONTROL_DB_POOL_TIMEOUT_SECONDS`
- `CONTROL_DB_POOL_RECYCLE_SECONDS`

## Ejecucion Manual

Una sola pasada:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python \
  app/scripts/run_provisioning_worker.py \
  --once
```

Con limite explicito:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python \
  app/scripts/run_provisioning_worker.py \
  --once \
  --max-jobs 5
```

Filtrado por tipo de job:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python \
  app/scripts/run_provisioning_worker.py \
  --once \
  --job-type create_tenant_database
```

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python \
  app/scripts/run_provisioning_worker.py \
  --once \
  --job-type deprovision_tenant_database
```

Uso por perfil:

```bash
cd /home/felipe/platform_paas/backend
WORKER_PROFILES="default=create_tenant_database,deprovision_tenant_database;sync=sync_tenant_schema" \
/home/felipe/platform_paas/platform_paas_venv/bin/python \
  app/scripts/run_provisioning_worker.py \
  --once \
  --profile default
```

## Job Types Relevantes

Hoy los `job_type` operativos principales son:

- `create_tenant_database`
- `deprovision_tenant_database`
- `sync_tenant_schema`

Lectura practica:

- `create_tenant_database` materializa DB tenant, rol tecnico, esquema y secreto tecnico
- `deprovision_tenant_database` retira DB tenant, rol tecnico y secretos tecnicos asociados
- `sync_tenant_schema` aplica migraciones sobre una DB tenant ya existente

Lectura operativa en consola:

- `deprovision_tenant_database` debe interpretarse como retiro tecnico, no como alta normal
- si falla, el `error_code` ya debe quedar clasificado por etapa:
  - `tenant_database_drop_failed`
  - `tenant_role_drop_failed`
  - `tenant_secret_clear_failed`
- si queda `retry_pending`, el tenant sigue archivado y puedes esperar el worker o ejecutar el job manualmente desde `Provisioning`
- la pantalla `Provisioning` ya deja filtrar por operacion (`Altas`, `Retiros técnicos`, `Esquema`) para no mezclar backlog de alta con retiros pendientes

Si usas perfiles o filtros por `job_type`, debes incluir `deprovision_tenant_database` en los workers que vayan a procesar retiros tecnicos. Si no lo haces, el job puede quedar `pending` hasta que lo ejecutes manualmente.

Modo continuo:

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python \
  app/scripts/run_provisioning_worker.py \
  --max-jobs 10 \
  --poll-interval-seconds 30
```

## Operacion con `systemd`

Archivos plantilla:

- `infra/systemd/platform-paas-provisioning-worker.service`
- `infra/systemd/platform-paas-provisioning-worker.timer`
- `infra/systemd/platform-paas-provisioning-worker@.service`
- `infra/systemd/platform-paas-provisioning-worker@.timer`

Destino sugerido:

- `/etc/systemd/system/platform-paas-provisioning-worker.service`
- `/etc/systemd/system/platform-paas-provisioning-worker.timer`

Comandos tipicos:

```bash
sudo cp infra/systemd/platform-paas-provisioning-worker.service /etc/systemd/system/
sudo cp infra/systemd/platform-paas-provisioning-worker.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now platform-paas-provisioning-worker.timer
sudo systemctl list-timers | grep platform-paas-provisioning-worker
```

Uso por perfil con unidad instanciada:

```bash
sudo cp infra/systemd/platform-paas-provisioning-worker@.service /etc/systemd/system/
sudo cp infra/systemd/platform-paas-provisioning-worker@.timer /etc/systemd/system/
sudo cp deploy/run_provisioning_worker_profile.sh /opt/platform_paas/deploy/
sudo chmod +x /opt/platform_paas/deploy/run_provisioning_worker_profile.sh
sudo systemctl daemon-reload
sudo systemctl enable --now platform-paas-provisioning-worker@default.timer
sudo systemctl list-timers | grep platform-paas-provisioning-worker@
```

Uso por perfil con cadencia propia materializada:

```bash
sudo bash deploy/install_provisioning_worker_profile_units.sh default "*-*-* *:*:00"
sudo bash deploy/install_provisioning_worker_profile_units.sh sync "*/5 * * * *"
sudo systemctl daemon-reload
sudo systemctl enable --now platform-paas-provisioning-worker-profile-default.timer
sudo systemctl enable --now platform-paas-provisioning-worker-profile-sync.timer
```

## Validacion Minima

```bash
sudo systemctl start platform-paas-provisioning-worker.service
systemctl status platform-paas-provisioning-worker.service --no-pager
systemctl status platform-paas-provisioning-worker.timer --no-pager
sudo journalctl -u platform-paas-provisioning-worker.service -n 50 --no-pager
```

Salida esperada del script:

- resumen del ciclo con `selection_strategy`, `job_types`, `priority_order`, `tenant_type_priority_order`, `job_type_limits`, `queued_jobs`, `eligible_jobs`, `backlog_aging_threshold_minutes`, `aged_eligible_jobs`, `processed_count`, `failed_count` y `duration_seconds`
- resumen adicional con `top_eligible_job_scores` para ver como quedo el score compuesto de los jobs elegibles mejor posicionados
- resumen adicional con `backlog_job_type_counts`, `selected_job_type_counts`, `dynamic_job_type_limits_applied` y `skipped_due_to_job_type_limits` cuando aplican cuotas por `job_type`
- resumen adicional con `backlog_tenant_type_counts`, `selected_tenant_type_counts`, `dynamic_tenant_type_limits_applied` y `skipped_due_to_tenant_type_limits` cuando aplican cuotas por clase de tenant
- persistencia de snapshots en `platform_control.provisioning_job_metric_snapshots`
- persistencia de trazas de ciclo en `platform_control.provisioning_worker_cycle_traces`
- emision de `provisioning_alert_summary` si el ciclo genera alertas operativas
- persistencia de alertas detectadas en `platform_control.provisioning_operational_alerts`
- mensaje de lock ocupado si otro worker ya esta corriendo
- logs estructurados por job y por ciclo en el logger operativo del backend
- si la exportacion esta habilitada, actualizacion del archivo Prometheus textfile con el estado actual por tenant y alertas activas

Notas operativas:

- si el worker corre con filtro por `job_type`, el lock file cambia para permitir separar workers por carga
- esto permite, por ejemplo, correr un worker dedicado para un tipo de job sin bloquear el worker general
- si se usa `--profile`, el worker resuelve los `job_type` desde `WORKER_PROFILES`
- `WORKER_PROFILES` usa formato `perfil=job_a,job_b;otro=job_c`
- si se pasan `--job-type` y `--profile`, el filtro explicito gana
- la unidad instanciada `platform-paas-provisioning-worker@<perfil>.timer` sirve para dejar un worker estable por perfil
- el instalador `install_provisioning_worker_profile_units.sh` sirve para dejar timers distintos por perfil sin editar unidades a mano
- si tu perfil `default` solo conoce `create_tenant_database`, debes ampliarlo para que tambien procese `deprovision_tenant_database` cuando quieras retiro tecnico automatico desde `Tenants`
- `WORKER_JOB_TYPE_PRIORITIES` usa formato `job_a=10;job_b=20` y menor numero significa mayor prioridad
- hoy el orden del ciclo ya no sale de pasos aislados sino de un `selection_strategy=composite_score`
- ese score combina envejecimiento del backlog, prioridad por clase de tenant, prioridad por `job_type` y antiguedad de espera
- `top_eligible_job_scores` expone el resumen de los mejores scores elegibles del ciclo para hacer auditable el criterio
- `WORKER_BACKLOG_AGING_THRESHOLD_MINUTES` define desde cuanta antiguedad un job pasa a considerarse envejecido para el ciclo actual
- si un job supera ese umbral, el worker lo adelanta dentro de la ventana elegible antes de aplicar cuotas
- `aged_eligible_jobs` muestra cuantos jobs elegibles fueron tratados como envejecidos en ese ciclo
- `WORKER_TENANT_TYPE_PRIORITIES` usa formato `empresa=20;condos=10` y menor numero significa mayor prioridad operativa para esa clase de tenant
- esa prioridad por clase se aplica sobre la ventana elegible del ciclo antes de entrar a cuotas por `job_type` o `tenant_type`
- `tenant_type_priority_order` muestra el orden efectivo de prioridad por clase que uso el worker en ese ciclo
- `WORKER_JOB_TYPE_LIMITS` usa formato `job_a=2;job_b=1` y deja una cuota maxima por ciclo para cada tipo
- `WORKER_JOB_TYPE_BACKLOG_LIMITS` usa formato `job_a=5:3;job_b=10:4` y significa `umbral_de_backlog:cuota_efectiva`
- si el backlog elegible de un `job_type` alcanza el umbral, el worker eleva la cuota efectiva de ese tipo para el ciclo actual
- `dynamic_job_type_limits_applied` muestra solo las cuotas que fueron elevadas dinamicamente por backlog en ese ciclo
- si una cuota por `job_type` se completa, el worker deja jobs elegibles fuera de ese ciclo y los reporta en `skipped_due_to_job_type_limits`
- `WORKER_SELECTION_BUFFER_MULTIPLIER` controla cuantas filas elegibles se leen por encima del limite final para poder aplicar prioridad y cuotas sin vaciar artificialmente el ciclo
- `backlog_job_type_counts` muestra el backlog observado por `job_type` dentro de la ventana elegible leida para el ciclo
- `selected_job_type_counts` muestra cuantos jobs de cada tipo terminaron realmente entrando al ciclo despues de aplicar prioridad, buffer y limites
- `tenant_type` se toma desde el tenant asociado al `provisioning_job` y hoy actua como clase operativa del tenant
- `WORKER_TENANT_TYPE_LIMITS` usa formato `empresa=2;condos=1` y deja una cuota maxima por ciclo para cada clase de tenant
- `WORKER_TENANT_TYPE_BACKLOG_LIMITS` usa formato `empresa=5:3;condos=3:2` y significa `umbral_de_backlog:cuota_efectiva` por clase de tenant
- `dynamic_tenant_type_limits_applied` muestra solo las cuotas de clase que fueron elevadas dinamicamente por backlog en ese ciclo
- `backlog_tenant_type_counts` muestra el backlog observado por clase de tenant dentro de la ventana elegible del ciclo
- `selected_tenant_type_counts` muestra cuantos jobs de cada clase terminaron realmente entrando al ciclo
- si una cuota de clase de tenant se completa, el worker deja jobs fuera de ese ciclo y los reporta en `skipped_due_to_tenant_type_limits`
- `capture_key` permite correlacionar los snapshots historicos por tenant con la traza resumida del ciclo completo que los produjo
- las alertas operativas salen de esos datos persistidos mas recientes, no de una tabla separada
- si `PROVISIONING_ALERT_*` vale `0`, esa regla queda deshabilitada
- `PROVISIONING_DISPATCH_BACKEND=database` mantiene el polling actual sobre DB
- `PROVISIONING_DISPATCH_BACKEND=broker` activa el backend real de Redis para dispatch y leasing de jobs
- `PROVISIONING_BROKER_URL` apunta al Redis usado por ese backend
- `PROVISIONING_BROKER_KEY_PREFIX` separa namespaces de claves
- `PROVISIONING_BROKER_PROCESSING_LEASE_SECONDS` define cuanto dura el lease de un job tomado por el worker

## Dispatch y broker Redis

El worker y la creacion de jobs ya no dependen directamente de llamadas crudas al repositorio o al servicio de jobs.

Hoy existe una capa intermedia en:

- `backend/app/apps/provisioning/services/provisioning_dispatch_service.py`

Esa capa deja:

- un backend operativo real `database`
- un backend `broker` operativo basado en Redis
- `TenantService` desacoplado de `create_job()` directo
- `ProvisioningWorker` desacoplado de `list_pending_jobs()` directo

En el estado actual:

- el sistema sigue operando por polling sobre `platform_control`
- si `PROVISIONING_DISPATCH_BACKEND=broker`, el alta inicial del job se registra en DB y ademas se agenda en Redis
- el worker reclama jobs vencidos o listos desde Redis, manteniendo `platform_control` como fuente de estado
- los retries con `next_retry_at` se reprograman en Redis al cerrar cada intento
- si un worker cae, los jobs con lease expirado vuelven a quedar elegibles
- si un job queda en `failed`, el broker lo mueve a una DLQ Redis por `job_type`
- `platform` ya expone lectura de esa DLQ y requeue operativo por API
- ese requeue puede ser individual o en lote, con filtro por `job_type` y `tenant_slug`
- tambien puede filtrarse por substring de `error_message` con `error_contains`
- tambien puede aplicarse un `delay_seconds` para replay diferido
- si `PROVISIONING_BROKER_DLQ_RETENTION_SECONDS>0`, la DLQ aplica retencion por tiempo y purga filas viejas automaticamente

## Exportacion manual de metricas

Tambien existe un script dedicado para exportar el estado actual sin correr el worker:

```bash
cd /home/felipe/platform_paas/backend
OBSERVABILITY_PROMETHEUS_TEXTFILE_ENABLED=true \
OBSERVABILITY_PROMETHEUS_TEXTFILE_PATH=/tmp/platform_paas_provisioning_metrics.prom \
/home/felipe/platform_paas/platform_paas_venv/bin/python app/scripts/export_provisioning_metrics.py
```

El textfile actual ya incluye:

- resumen por tenant y `status`
- resumen por tenant, `job_type` y `status`
- resumen por tenant, `error_code` y `status`
- alertas activas por severidad, codigo, tenant y perfil de worker
- resumen global de billing por `provider`, `event_type` y `processing_result`
- alertas activas de billing por severidad, codigo, proveedor y `processing_result`

## Siguiente Evolucion Natural

- politicas de asignacion y cadencia mas automaticas segun backlog o tipo de tenant
- ejecucion por cola dedicada o broker externo
- metricas de throughput y tiempo medio por job
- limites de concurrencia mas finos por tipo de carga

Guia relacionada:

- `docs/deploy/backend-debian.md`
- `docs/deploy/operational-acceptance-checklist.md`
- `docs/architecture/development-roadmap.md`
