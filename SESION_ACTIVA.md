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
- foco activo: último slice broker-only `tenant + capa técnica` ya validado y cierre formal de `Provisioning/DLQ`
- prioridad inmediata: volver al siguiente bloque central del roadmap fuera de DLQ
- módulo o frente activo: `platform-core`

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
- el helper `scripts/dev/run_staging_published_broker_dlq_smoke.sh` ya quedó validado con `--target family`, `--target family-requeue`, `--target family-batch`, `--target family-recommendation`, `--target tenant-focus` y `--target technical`
- `Provisioning` ya expone además:
  - `requeue guiado`
  - `capacidad activa de provisioning`
  - `gating visible` de la superficie DLQ
  - `familias DLQ visibles`
  - `Reencolar familia`
  - `Reencolar selección`
  - `Plan operativo sugerido`
  - `Prioridad por tenant visible`
  - `Diagnóstico DLQ / BD visible`
  - `Matriz tenant + capa técnica`
- el smoke `platform-admin-provisioning-dlq-tenant-technical-matrix` ya quedó validado en `staging`
- en `production`, ese smoke nuevo queda `skipped` mientras el dispatch backend siga sin ser `broker`
- el smoke `platform-admin-provisioning-dlq-technical-diagnosis` ya quedó validado en `staging`
- en `production`, ese smoke nuevo queda `skipped` mientras el dispatch backend siga sin ser `broker`
- este frente ya no debe seguir creciendo por inercia; cualquier profundización adicional de DLQ queda como backlog opcional
- la estructura canónica ya deja explícito además que `frontend/e2e/` y `scripts/dev/` son parte del contrato operativo y que `/opt/...` es solo espejo de runtime
- el flujo portable real `empresa-demo -> ieris-ltda` ya quedó ejecutado con `functional_data_only`
- `ieris-ltda` ya quedó poblado con los datos funcionales operativos de `empresa-demo`

## Bloqueo actual

- no hay bloqueo activo en este corte
- la última corrección operativa fue doble:
  - cerrar el diagnóstico técnico visible DLQ/BD en `Provisioning/DLQ`
  - corregir una nulabilidad TypeScript y endurecer el seed del smoke antes del publish final
- el cierre actual es de priorización, no por falta de capacidad técnica
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
- asumir cerrado también el subfrente `Prioridad por tenant visible`
- asumir cerrado también el subfrente `Diagnóstico DLQ / BD visible`
- asumir cerrado también el subfrente `Matriz tenant + capa técnica`
- asumir cerrado también el helper published broker-only de `staging`
- sacar `Provisioning/DLQ` del foco activo
- volver al siguiente bloque central del roadmap

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
- smoke `platform-admin-provisioning-dlq-family-requeue` en `staging`: OK
- smoke `platform-admin-provisioning-dlq-family-requeue` en `production`: SKIPPED (`dispatch backend != broker`)
- smoke `platform-admin-provisioning-dlq-family-batch-requeue` en `staging`: OK
- smoke `platform-admin-provisioning-dlq-family-batch-requeue` en `production`: SKIPPED (`dispatch backend != broker`)
- smoke `platform-admin-provisioning-dlq-family-recommendation` en `staging`: OK
- smoke `platform-admin-provisioning-dlq-family-recommendation` en `production`: SKIPPED (`dispatch backend != broker`)
- smoke `platform-admin-provisioning-dlq-tenant-focus` en `staging`: OK
- smoke `platform-admin-provisioning-dlq-tenant-focus` en `production`: SKIPPED (`dispatch backend != broker`)
- smoke `platform-admin-provisioning-dlq-technical-diagnosis` en `staging`: OK
- smoke `platform-admin-provisioning-dlq-technical-diagnosis` en `production`: SKIPPED (`dispatch backend != broker`)
- smoke `platform-admin-provisioning-dlq-tenant-technical-matrix` en `staging`: OK
- smoke `platform-admin-provisioning-dlq-tenant-technical-matrix` en `production`: SKIPPED (`dispatch backend != broker`)
