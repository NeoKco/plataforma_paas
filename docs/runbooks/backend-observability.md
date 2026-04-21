# Observabilidad Backend

Esta guia resume la capa minima de observabilidad tecnica implementada hoy en el backend.

## Objetivo

Dar trazabilidad tecnica basica sin meter todavia una plataforma externa de monitoreo.

La meta de esta etapa es responder al menos estas preguntas:

- que request entro
- con que `request_id`
- que status devolvio
- cuanto demoro
- si venia en scope `platform` o `tenant`
- con que `request_id` responde un error

## Componentes actuales

### 1. Request ID por request

Cada request recibe un `request_id`.

Regla:

- si el cliente envia `X-Request-ID`, se reutiliza
- si no lo envia, el backend genera uno

El valor queda:

- en `request.state.request_id`
- en el header de respuesta `X-Request-ID`

Archivo principal:

- `backend/app/common/middleware/request_observability_middleware.py`

## 2. Logging estructurado basico

Al cerrar una request, el backend registra un evento JSON con:

- `request_id`
- `method`
- `path`
- `status_code`
- `duration_ms`
- `token_scope`
- `platform_user_id` cuando existe
- `tenant_user_id` cuando existe
- `tenant_slug` cuando existe

Tambien registra errores de request no controlados.

Archivo principal:

- `backend/app/common/observability/logging_service.py`

## 3. Integracion con middleware de auth

La observabilidad envuelve el ciclo completo de la request y por eso tambien cubre:

- respuestas publicas
- respuestas protegidas
- errores `401` y `403` generados por auth

Eso permite correlacionar rechazos de autenticacion con un `request_id`.

## 4. Integracion con manejo centralizado de errores

La observabilidad ya trabaja junto con los handlers globales de errores.

Eso permite que:

- el `request_id` salga en headers y payload de error
- el soporte pueda usar el mismo identificador para revisar logs

## 5. Observabilidad operativa del provisioning worker

El backend ya registra tambien eventos estructurados para el flujo de `provisioning_jobs`.

Hoy existen dos eventos tecnicos base:

- `provisioning_job`: resultado de un job individual, incluyendo `tenant_slug`, `status`, `attempts`, `max_attempts`, `duration_ms` y `next_retry_at`
- `provisioning_worker_cycle`: resumen de un ciclo del worker, incluyendo `job_types`, `queued_jobs`, `processed_count`, `failed_count`, `duration_ms` y si el ciclo se corto por el limite de fallos
- el mismo evento ya incluye `worker_profile` cuando el ciclo corre bajo un perfil nombrado
- ese mismo evento ya incluye `selection_strategy` para dejar explicito el criterio de orden usado en el ciclo
- ese mismo evento ya incluye `priority_order` cuando aplica una politica de prioridad por `job_type`
- ese mismo evento ya incluye `tenant_type_priority_order` cuando aplica una politica de prioridad por clase de tenant
- ese mismo evento ya incluye `backlog_aging_threshold_minutes` y `aged_eligible_jobs` cuando aplica envejecimiento de backlog
- ese mismo evento ya incluye `top_eligible_job_scores` para inspeccionar el score compuesto de los jobs mejor posicionados
- ese mismo evento ya incluye `job_type_limits`, `eligible_jobs`, `selected_job_type_counts` y `skipped_due_to_job_type_limits` cuando el ciclo aplica cuotas y backpressure por `job_type`
- ese mismo evento ya incluye `backlog_job_type_counts` y `dynamic_job_type_limits_applied` cuando la cuota efectiva sube dinamicamente por backlog observado
- ese mismo evento ya incluye `tenant_type_limits`, `backlog_tenant_type_counts`, `selected_tenant_type_counts`, `skipped_due_to_tenant_type_limits` y `dynamic_tenant_type_limits_applied` cuando el ciclo aplica cuotas por clase de tenant
- al final de cada ciclo, el backend tambien puede persistir una traza resumida en `platform_control.provisioning_worker_cycle_traces`
- esa traza queda correlacionada con los snapshots por tenant mediante `capture_key`
- si una corrida activa umbrales operativos, el backend registra tambien `provisioning_alert_summary`

Esto permite responder preguntas como:

- que tenant tuvo un fallo de provisioning
- cuantos jobs proceso realmente un ciclo
- sobre que `job_type` estaba trabajando ese ciclo
- bajo que perfil logico de worker se ejecuto ese ciclo
- que estrategia de orden uso el ciclo
- en que orden de prioridad despacho esos `job_type`
- en que orden de prioridad trato las clases de tenant de ese ciclo
- cuantos jobs envejecidos detecto en la ventana elegible y con que umbral
- como se veia el score compuesto de los jobs elegibles mejor posicionados
- cuantas filas elegibles habia antes de aplicar cuotas
- cual era el backlog observado por `job_type` dentro del ciclo
- que cuotas se elevaron dinamicamente por ese backlog
- cuantas quedaron fuera del ciclo por backpressure segun `job_type`
- cuantos jobs por tipo terminaron entrando realmente al ciclo
- cual era el backlog observado por clase de tenant
- que cuotas de clase se elevaron dinamicamente
- cuantas quedaron fuera del ciclo por limite de clase de tenant
- cuantos jobs por clase terminaron entrando realmente al ciclo
- si un ciclo se corto por exceso de fallos
- cuanto tiempo demoro un job o un ciclo
- que ciclo concreto produjo un snapshot historico por tenant
- cual fue el top de scores compuesto del ciclo que produjo esa captura
- si ese ciclo o ese tenant ya estaban en condicion de alerta operativa

## 6. Exportacion minima a salida externa

Ahora tambien existe una salida externa minima basada en archivo Prometheus textfile.

La idea es no depender todavia de una plataforma completa de monitoreo, pero si dejar un punto de integracion simple para:

- `node_exporter` con textfile collector
- agentes locales
- jobs de sincronizacion a otra stack

Componentes:

- `backend/app/apps/platform_control/services/provisioning_metrics_export_service.py`
- `backend/app/scripts/export_provisioning_metrics.py`

Variables de entorno:

- `OBSERVABILITY_PROMETHEUS_TEXTFILE_ENABLED`
- `OBSERVABILITY_PROMETHEUS_TEXTFILE_PATH`

Si esta salida esta habilitada:

- el worker exporta el resumen actual de `provisioning` por tenant al final de cada ciclo
- esa misma salida ahora exporta tambien alertas activas de provisioning
- esa misma salida ahora exporta tambien resumen agregado y alertas activas de billing
- tambien puedes ejecutar una exportacion manual con script

Metricas base expuestas:

- `platform_paas_provisioning_jobs`
- `platform_paas_provisioning_jobs_by_type`
- `platform_paas_provisioning_jobs_by_error_code`
- `platform_paas_provisioning_total_jobs`
- `platform_paas_provisioning_max_attempts_seen`
- `platform_paas_provisioning_tenants_with_jobs`
- `platform_paas_provisioning_active_alerts`
- `platform_paas_provisioning_active_alerts_by_severity`
- `platform_paas_provisioning_active_alerts_by_code`
- `platform_paas_provisioning_active_alerts_by_tenant`
- `platform_paas_provisioning_active_alerts_by_worker_profile`
- `platform_paas_billing_sync_events_total`
- `platform_paas_billing_sync_tenants_total`
- `platform_paas_billing_active_alerts`
- `platform_paas_billing_active_alerts_by_severity`
- `platform_paas_billing_active_alerts_by_code`
- `platform_paas_billing_active_alerts_by_provider`
- `platform_paas_billing_active_alerts_by_processing_result`

El detalle por `job_type` permite separar operativamente distintos tipos de trabajo cuando el worker crezca en variedad de cargas.
El detalle por `error_code` permite ver que causa estable de fallo domina por tenant y en que estado se acumula.
La exportacion de alertas permite detectar desde fuera del backend si ya existe degradacion operativa relevante sin tener que consultar la API.
El bloque de billing permite ver volumen de sync por proveedor y si ya se acumulan `duplicate` o `ignored` por encima de lo esperado.

## 6.1 Snapshot JSON de convergencia tenant por ambiente

Ademas del texto de consola del gate post-deploy, la auditoría activa tenant ya puede dejar un snapshot JSON reutilizable.

Objetivo:

- comparar rapido `staging` y `production`
- guardar evidencia de ambiente sin parsear logs
- consumir el estado del audit desde scripts, soporte o inspección manual

Componente:

- `backend/app/scripts/audit_active_tenant_convergence.py`

Salidas nuevas:

- `--format json`
- `--json-output-file /ruta/al/snapshot.json`

Campos relevantes del snapshot:

- `generated_at`
- `target`
- `overall_status`
- `summary.processed`
- `summary.warnings`
- `summary.failed`
- `summary.failed_by_reason`
- `summary.notes_by_reason`
- `summary.accepted_notes_by_reason`
- `tenant_results`

Integración operativa:

- `deploy/verify_backend_deploy.sh` ya guarda automáticamente ese snapshot bajo `operational_evidence/`
- `deploy/collect_backend_operational_evidence.sh` ya embebe el snapshot más reciente dentro del paquete de evidencia cuando existe

## 7. Persistencia de trazas del ciclo del worker

Ademas de los snapshots por tenant, hoy existe una persistencia resumida del ciclo completo del worker.

Eso guarda:

- `capture_key`
- `worker_profile`
- `selection_strategy`
- `eligible_jobs`
- `aged_eligible_jobs`
- `queued_jobs`
- `processed_count`
- `failed_count`
- `duration_ms`
- `priority_order`
- `tenant_type_priority_order`
- `top_eligible_job_scores`

Con eso soporte y desarrollo pueden comparar:

- backlog visible por tenant
- decision de despacho del ciclo que genero ese backlog capturado
- perfil del worker que ejecuto la corrida

Componentes:

- `backend/app/apps/platform_control/models/provisioning_worker_cycle_trace.py`
- `backend/app/apps/platform_control/repositories/provisioning_worker_cycle_trace_repository.py`
- `backend/app/apps/platform_control/services/provisioning_worker_cycle_trace_service.py`

## 8. Alertas operativas sobre snapshots y trazas

Hoy existe una capa minima de alertas evaluadas sobre datos ya persistidos.

Fuentes usadas:

- ultimo snapshot por tenant desde `platform_control.provisioning_job_metric_snapshots`
- ultima traza por perfil desde `platform_control.provisioning_worker_cycle_traces`

Umbrales disponibles:

- `PROVISIONING_ALERT_PENDING_JOBS_THRESHOLD`
- `PROVISIONING_ALERT_RETRY_PENDING_JOBS_THRESHOLD`
- `PROVISIONING_ALERT_FAILED_JOBS_THRESHOLD`
- `PROVISIONING_ALERT_MAX_ATTEMPTS_SEEN_THRESHOLD`
- `PROVISIONING_ALERT_CYCLE_FAILED_COUNT_THRESHOLD`
- `PROVISIONING_ALERT_CYCLE_DURATION_MS_THRESHOLD`
- `PROVISIONING_ALERT_CYCLE_AGED_JOBS_THRESHOLD`

Comportamiento:

- si el umbral es `0`, la alerta queda deshabilitada
- `stopped_due_to_failure_limit` genera alerta `critical` aunque no dependa de un umbral numerico
- `capture_key` permite correlacionar la alerta con los snapshots y trazas del mismo ciclo
- el worker registra un resumen estructurado cuando detecta alertas en una corrida
- las alertas detectadas tambien pueden persistirse en `platform_control.provisioning_operational_alerts`

Componentes:

- `backend/app/apps/platform_control/models/provisioning_operational_alert.py`
- `backend/app/apps/platform_control/repositories/provisioning_operational_alert_repository.py`
- `backend/app/apps/platform_control/services/provisioning_alert_service.py`
- `backend/app/apps/platform_control/api/provisioning_job_routes.py`
- `backend/app/common/observability/logging_service.py`

## Ubicacion en la app

Registro actual en:

- `backend/app/bootstrap/app_factory.py`

## Pruebas

Suite unitaria:

- `backend/app/tests/test_observability.py`

Smoke HTTP:

- `backend/app/tests/test_http_smoke.py`

Validaciones actuales:

- preserva `X-Request-ID` entrante
- genera `X-Request-ID` cuando falta
- agrega header a respuestas reales
- mantiene `X-Request-ID` tambien en respuestas `401`
- registra resumen de request y excepciones
- registra payload JSON para `provisioning_job`
- registra payload JSON para `provisioning_worker_cycle`
- puede exportar resumen actual de `provisioning` a textfile Prometheus
- puede exportar tambien desglose actual por `job_type`

## Ejecucion recomendada

```bash
cd /home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python app/scripts/run_backend_tests.py
```

Exportacion manual:

```bash
cd /home/felipe/platform_paas/backend
OBSERVABILITY_PROMETHEUS_TEXTFILE_ENABLED=true \
OBSERVABILITY_PROMETHEUS_TEXTFILE_PATH=/tmp/platform_paas_provisioning_metrics.prom \
/home/felipe/platform_paas/platform_paas_venv/bin/python app/scripts/export_provisioning_metrics.py
```

## Lo que aun falta

Esta capa todavia es minima. Falta:

- metricas tecnicas formales
- correlacion mas rica entre logs y auditoria funcional
- exportacion a stack externa mas rica que un textfile local
- dashboards y alertas
