# SIGUIENTE_PASO

## Prioridad vigente

- sostener la convergencia multi-tenant por ambiente como regla operativa permanente y mover el roadmap al siguiente frente real de hardening transversal; `Agenda` ya quedó promovida como módulo lateral propio del portal tenant, el saneamiento operativo de `condominio-demo` e `ieris-ltda` ya quedó cerrado en `production` y `staging`, con los cuatro tenants activos auditando en verde en ambos ambientes, y desde ahora la PaaS completa queda gobernada por ownership explícito + spec mínima + cierre `SRED`
- revalidación tenant más reciente ya cerrada:
  - `staging` se mantuvo sano `4/4`
  - `production` se recuperó rotando credenciales DB técnicas de `condominio-demo`
  - ambos ambientes vuelven a quedar `4/4` en `audit_active_tenant_convergence.py`
- mantener como regla de diagnóstico tenant:
  - si se van a ejecutar scripts del repo contra `/opt/platform_paas/.env` o `/opt/platform_paas_staging/.env.staging`, usar `set -a` antes de `source`
  - no volver a aceptar auditorías tenant con `TENANT_SECRETS_FILE` no exportado, porque pueden producir falsos negativos como el que se observó inicialmente sobre `ieris-ltda`
- subcorte nuevo ya cerrado en runtime:
  - `audit_active_tenant_convergence.py` ahora clasifica `invalid_db_credentials`, `db_unreachable`, `schema_incomplete` y `unknown_error`
  - `repair_tenant_operational_drift.py` ya quedó publicado y validado desde `/opt/platform_paas_staging` y `/opt/platform_paas`
  - durante la promoción el script nuevo volvió a detectar y cerró drift real de `condominio-demo` en ambos ambientes
  - ambos ambientes terminan otra vez con `processed=4`, `warnings=0`, `failed=0`
- subcorte adicional ya cerrado en runtime:
  - `verify_backend_deploy.sh` ahora distingue `tenant roto por drift recuperable` vs `ambiente sano con notes`
  - `staging` mostró el caso de drift recuperable con comando sugerido para `condominio-demo`
  - `production` mostró el caso `tenants_with_notes=3` con `NOTICE` no crítico
- subcorte adicional ya cerrado en runtime:
  - el falso `missing_core_defaults` de tenants legacy quedó corregido backfilleando `code` canónico por `name`
  - `repair_tenant_operational_drift.py` ya puede sincronizar el secreto válido de un tenant hacia el carril hermano con `--sync-env-file`
  - eso cerró el ping-pong de `condominio-demo` entre `staging` y `production`
  - estado final:
    - `staging`: `processed=4`, `warnings=0`, `failed=0`
    - `production`: `processed=4`, `warnings=0`, `failed=0`, `tenants_with_notes=2`
- subcorte adicional ya cerrado en runtime:
  - `missing_finance_defaults:usage` ya no se usa para tenants con uso financiero y base legacy `USD`
  - `seed_missing_tenant_defaults.py` deja de intentar un seed inútil en ese caso
  - una revalidación adicional separó dos casos reales distintos y luego cerró el caso `metadata-only`:
    - `condominio-demo` se confirmó como `repair_base_currency_setting_only` y en `staging` quedó alineado `USD -> CLP`
    - en la foto final de `production`, `condominio-demo` ya aparece `no_action`
    - `empresa-bootstrap` queda como único caso residual `legacy_finance_base_currency:USD`
  - validación final:
    - `staging` -> `changed=0`, sin `notes`
    - `production` -> `processed=4`, `warnings=0`, `failed=0`, `tenants_with_notes=1`, `notes_by_reason={'legacy_finance_base_currency:USD': 1}`
- subcorte adicional ya cerrado en runtime:
  - `empresa-bootstrap` deja de quedar como decisión abierta de `finance`
  - la convivencia legacy `USD` queda aceptada explícitamente en repo como `accepted_legacy_coexistence`
  - validación real en `staging` y `production` sobre `empresa-bootstrap`:
    - `status=ok`
    - `recommendation=accepted_legacy_coexistence`
    - `readiness.status=accepted_legacy`
    - `audit_note=accepted_legacy_finance_base_currency:USD`
  - el caso deja de bloquear el roadmap actual
  - si en el futuro se quisiera migrar igual, seguiría haciendo falta:
    - `historical_usd_to_clp_rate_policy`
    - `migration_effective_at`
    - `account_currency_policy`
    - `loan_currency_policy`
- subcorte documental/estructural ya cerrado en repo:
  - [project-structure.md](/home/felipe/platform_paas/docs/architecture/project-structure.md) ya refleja el árbol real de `tenant_modules`, `deploy`, `scripts/dev` y la estructura vigente de frontend
  - [docs/index.md](/home/felipe/platform_paas/docs/index.md), [README.md](/home/felipe/platform_paas/README.md) y [implementation-governance.md](/home/felipe/platform_paas/docs/architecture/implementation-governance.md) ya incluyen [PROMPT_MAESTRO_SESION.md](/home/felipe/platform_paas/PROMPT_MAESTRO_SESION.md) como arranque canónico de continuidad
  - queda explícito además que `project-structure.md` es la referencia estructural mantenida y `estructura_proyecto.txt` solo un snapshot auxiliar si no está regenerado
- subcorte nuevo ya cerrado en repo dentro de `auditoría/observabilidad`:
  - [audit_active_tenant_convergence.py](/home/felipe/platform_paas/backend/app/scripts/audit_active_tenant_convergence.py) ya puede emitir snapshot JSON con `overall_status`, resumen agregado y detalle por tenant
  - [verify_backend_deploy.sh](/home/felipe/platform_paas/deploy/verify_backend_deploy.sh) ya guarda ese snapshot en `operational_evidence/`
  - [collect_backend_operational_evidence.sh](/home/felipe/platform_paas/deploy/collect_backend_operational_evidence.sh) ya embebe el snapshot más reciente dentro de la evidencia operativa del ambiente
- subcorte nuevo ya cerrado en repo dentro de `secretos`:
  - [TenantSecretService](/home/felipe/platform_paas/backend/app/common/security/tenant_secret_service.py) ya clasifica runtime, legacy y custom secret files
  - [repair_tenant_operational_drift.py](/home/felipe/platform_paas/backend/app/scripts/repair_tenant_operational_drift.py) ya imprime `secret_posture ...` antes de reparar o sincronizar
  - `--sync-env-file` ya no permite por defecto escribir en el `.env` legacy; si ese fallback temporal hiciera falta, debe declararse con `--allow-legacy-env-sync`
- promoción runtime ya cerrada para ambos subfrentes:
  - `staging`:
    - snapshot JSON de convergencia publicado con `overall_status=ok`
    - `secret_posture` validada sobre `condominio-demo`
  - `production`:
    - snapshot JSON de convergencia publicado con `overall_status=ok_with_accepted_notes`
    - `secret_posture` validada sobre `empresa-bootstrap`
  - ajuste fino adicional:
    - [verify_backend_deploy.sh](/home/felipe/platform_paas/deploy/verify_backend_deploy.sh) ya no mezcla `accepted_tenants_with_notes` con `tenants_with_notes`
- subcorte nuevo ya cerrado en runtime dentro de `infraestructura/deploy`:
  - [sync_backend_runtime_tree.sh](/home/felipe/platform_paas/deploy/sync_backend_runtime_tree.sh) ya refleja `backend/` desde el repo fuente hacia el árbol runtime del ambiente antes del release
  - [deploy_backend.sh](/home/felipe/platform_paas/deploy/deploy_backend.sh) ya integra esa promoción `repo -> runtime backend` usando `SOURCE_REPO_ROOT`, `SOURCE_BACKEND_DIR` y `SYNC_RUNTIME_BACKEND_FROM_SOURCE`
  - [check_backend_release_readiness.sh](/home/felipe/platform_paas/deploy/check_backend_release_readiness.sh) ya valida la presencia del repo fuente, del sync script y si el wrapper realmente va a promover backend al runtime esperado
  - validación real sin `cp -a` manual previo:
    - `staging` -> `bash deploy/deploy_backend_staging.sh` -> `528 tests OK`, `processed=4`, `warnings=0`, `failed=0`
    - `production` -> `bash deploy/deploy_backend_production.sh` -> `528 tests OK`, `processed=4`, `warnings=0`, `failed=0`, `accepted_tenants_with_notes=1`
  - queda cerrada la deuda operativa donde el release dependía de recordar una copia manual de `/home/felipe/platform_paas/backend` a `/opt/.../backend`
- subcorte nuevo ya cerrado en repo dentro de `calidad técnica + rollback`:
  - [rollback_backend.sh](/home/felipe/platform_paas/deploy/rollback_backend.sh) ya alinea el rollback con `SOURCE_REPO_ROOT` y deja de asumir que `/opt/...` es un checkout git
  - [run_backend_post_deploy_gate.sh](/home/felipe/platform_paas/deploy/run_backend_post_deploy_gate.sh) ya puede ejecutar smoke remoto corto opcional y fallar o advertir según `REMOTE_BACKEND_SMOKE_STRICT`
  - [collect_backend_operational_evidence.sh](/home/felipe/platform_paas/deploy/collect_backend_operational_evidence.sh) ya embebe además el reporte `remote_backend_smoke_*.json` cuando existe
  - este subcorte quedó validado en repo con sintaxis shell y `run_remote_backend_smoke.py --help`, pero no se ejecutó rollback real para no mover la ref del workspace sin incidente efectivo
- promoción runtime ya cerrada para ese mismo subcorte:
  - `staging` -> `bash deploy/deploy_backend_staging.sh` con `RUN_REMOTE_BACKEND_SMOKE_POST_DEPLOY=true`, `REMOTE_BACKEND_SMOKE_TARGET=base`, `REMOTE_BACKEND_SMOKE_BASE_URL=http://127.0.0.1:8200`
  - `production` -> `bash deploy/deploy_backend_production.sh` con `RUN_REMOTE_BACKEND_SMOKE_POST_DEPLOY=true`, `REMOTE_BACKEND_SMOKE_TARGET=base`, `REMOTE_BACKEND_SMOKE_BASE_URL=http://127.0.0.1:8000`
  - ambos carriles terminan con:
    - `528 tests OK`
    - auditoría activa verde
    - reporte `remote_backend_smoke_*.json` guardado en `operational_evidence/`
  - decisión ya tomada:
    - `base smoke` sí puede ser baseline repetible por ambiente
    - el smoke autenticado completo sigue `opt-in` mientras las credenciales `SMOKE_*` no se gestionen por canal seguro/repetible
- institucionalización ya cerrada:
  - [deploy_backend_staging.sh](/home/felipe/platform_paas/deploy/deploy_backend_staging.sh) y [deploy_backend_production.sh](/home/felipe/platform_paas/deploy/deploy_backend_production.sh) ya activan `base smoke` por defecto
  - `.github/workflows/backend-deploy.yml` ahora deja `remote_smoke_target=base` como default del deploy manual
  - validación final sin overrides:
    - `staging` -> `bash deploy/deploy_backend_staging.sh` -> `528 tests OK`, `processed=4`, `warnings=0`, `failed=0`
    - `production` -> `bash deploy/deploy_backend_production.sh` -> `528 tests OK`, `processed=4`, `warnings=0`, `failed=0`, `accepted_tenants_with_notes=1`
- en `finance`, la semántica de cabecera ya quedó corregida y promovida:
  - `Resultado neto` = `ingresos - egresos`
  - `Saldo total en cuentas` = suma backend de balances visibles por cuenta
- en `tenant_portal`, `Agenda` ya quedó separada de `Mantenciones`:
  - ruta propia `tenant-portal/agenda`
  - entrada propia en la barra lateral
  - fuente actual: calendario operativo de `maintenance`
  - siguiente evolución natural: agregar fuentes de otros módulos cuando existan contratos reales
- gobernanza transversal ya institucionalizada:
  - usar [data-ownership-matrix.md](/home/felipe/platform_paas/docs/architecture/data-ownership-matrix.md) para cualquier cambio que toque datos, ownership o integraciones entre módulos
  - usar [slice-spec-template.md](/home/felipe/platform_paas/docs/architecture/slice-spec-template.md) para cualquier slice relevante, transversal o de riesgo operativo real
  - usar ADRs en `docs/architecture/adr/` cuando la decisión cambie arquitectura o continuidad operativa
  - respetar [api-contract-standard.md](/home/felipe/platform_paas/docs/architecture/api-contract-standard.md) en cambios de request/response/errores/side effects
  - respetar [schema-and-migration-policy.md](/home/felipe/platform_paas/docs/architecture/schema-and-migration-policy.md) en cambios estructurales o backfills
  - respetar [environment-policy.md](/home/felipe/platform_paas/docs/architecture/environment-policy.md) para distinguir correctamente `development`, `staging` y `production`
  - respetar [e2e-test-data-policy.md](/home/felipe/platform_paas/docs/architecture/e2e-test-data-policy.md) para no contaminar tenants operativos con pruebas
  - no volver a cerrar cambios grandes solo con criterio implícito; ahora el estándar oficial es `ownership + spec + evidence + docs`
  - pasar el gate [check_release_governance.sh](/home/felipe/platform_paas/deploy/check_release_governance.sh) antes de dar por cerrado cualquier slice relevante
  - usar [check_memory_viva_sync.py](/home/felipe/platform_paas/backend/app/scripts/check_memory_viva_sync.py) como verificación explícita de coherencia entre cambios relevantes y memoria viva
  - usar [tenant-incident-response.md](/home/felipe/platform_paas/docs/runbooks/tenant-incident-response.md) como runbook canónico para incidentes tenant antes de reabrir slices funcionales cerrados

## Próximo paso correcto

- usar la nueva regla de promoción completa en el siguiente slice real del roadmap:
  - cambio en repo
  - deploy `staging`
  - convergencia `staging`
  - auditoría `staging`
  - promoción `production`
  - convergencia `production`
  - auditoría `production`
  - documentación viva cerrada
- aplicar el siguiente frente ya con el paquete de enforcement activo:
  - ADR vigente o nuevo si la decisión es transversal
  - gate de release en verde
  - runbook de incidente tenant como referencia diagnóstica oficial
- subcorte ya cerrado en runtime dentro de ese frente:
  - `platform_admin > Tenants` ya sintetiza `Postura operativa tenant` usando señales existentes de access policy, provisioning, schema y credenciales DB
  - quedó publicado en `staging` y `production`
  - el rollout volvió a confirmar la regla transversal del proyecto:
    - un cambio visible puede destapar drift tenant-local previo
    - por eso el cierre correcto siguió exigiendo convergencia y auditoría final por ambiente
- subcorte adicional ya cerrado en runtime dentro del mismo frente:
  - `platform_admin > Tenants` ahora también muestra `Contexto de alertas activas`
  - el operador puede distinguir desde la misma ficha si la señal visible parece:
    - tenant-local
    - amplia de ambiente
    - ambiente con alertas pero sin impacto directo en ese tenant
    - o sin lectura/sin alertas activas
  - quedó publicado por ambiente:
    - `staging` con `API_BASE_URL=http://192.168.7.42:8081`
    - `production` con `API_BASE_URL=https://orkestia.ddns.net`
  - ambos carriles pasaron `check_frontend_static_readiness.sh` con `0 fallos, 0 advertencias`
- subcorte adicional ya cerrado en runtime dentro de `frontend fino`:
  - `platform_admin > Tenants` ahora ordena primero:
    - prioridad actual
    - acción sugerida
    - lectura ambiente
  - las CTA principales del bloque operativo ya no compiten igual con las secundarias
  - `Provisioning` ahora arranca con `Plan operativo sugerido` y saltos directos a:
    - `Jobs que requieren acción`
    - `Alertas activas`
    - `Observabilidad`
    - `DLQ`
  - quedó publicado en `staging` y `production` con `static readiness` verde en ambos carriles
  - refinamiento adicional ya cerrado en el mismo slice:
    - copy más corto
    - menos densidad al inicio de `Provisioning`
    - una CTA secundaria redundante menos en `Tenants`
- subcorte adicional ya cerrado en runtime dentro del mismo frente:
  - `Dashboard` ya quedó alineado con el lenguaje operativo del resto de `platform_admin`
  - ahora muestra:
    - labels KPI más cortos
    - franja `Ruta rápida`
    - paneles `Prioridades visibles` y `Acciones rápidas`
    - tabla `Señal de provisioning por tenant`
  - quedó publicado en:
    - `staging` con `DashboardPage-C3ovaSy4.js`, `ProvisioningPage-DpCCxewH.js`, `TenantsPage-Dx8mwonv.js`, `index-DXDopmzv.js`
    - `production` con los mismos bundles actuales
  - ambos carriles volvieron a pasar `check_frontend_static_readiness.sh` con `0 fallos, 0 advertencias`
- siguiente frente recomendado del roadmap:
  - hardening transversal final de plataforma y cierre operativo del alcance actual
  - objetivos concretos del siguiente corte:
    - endurecer calidad técnica, secretos, auditoría/observabilidad e infraestructura para el cierre real de las etapas 9, 11, 12, 16 y 17
    - mantener el gate post-deploy separando correctamente:
      - drift recuperable
      - `notes` no críticas pendientes
      - `accepted notes` ya institucionalizadas
    - decidir si el siguiente bloque de producto es `registro y activación de módulos` (etapa 15) o el siguiente módulo grande del roadmap
    - entrar ya al siguiente subfrente concreto del bloque 1 con la documentación estructural reordenada y sin deuda de handoff
    - siguiente subfrente sugerido ahora dentro del mismo bloque 1:
      - el baseline backend ya quedó cerrado y este primer corte de observabilidad visible + jerarquía operativa en `platform_admin` también
      - el salto útil ahora es el siguiente subcorte de `frontend fino` después de cerrar la consistencia global inicial:
        - recorte adicional de textos de ayuda repetidos en bloques secundarios de `Dashboard`, `Tenants` y `Provisioning`
        - revisar si `Billing` necesita la misma compactación/jerarquía visible
        - decidir si parte de la señal de convergencia/secretos sube a UI o sigue solo en evidencia/runbook
    - decidir si el helper `--sync-env-file` debe quedar manual/explicito o integrarse en un flujo más guiado para carriles que comparten rol PostgreSQL
    - endurecer el gate post-deploy para diferenciar claramente:
      - servicio sano
      - tenant roto por drift
      - tenant convergido con notas
      - dejar explícito qué módulos aportan eventos a la nueva `Agenda` general y cómo se habilitan tenant-side sin volver a duplicar navegación por módulo
    - ejecutar ese frente ya usando la nueva spec mínima oficial, el ownership explícito del dato técnico que se toca y el paquete normativo nuevo de ADR/API/schema/env/E2E

## Qué Falta Para Terminar

Queda concentrado en 5 bloques:

1. hardening técnico-operativo final:
   testing, migraciones, secretos, observabilidad, deploy y rollback más cerrados
2. frontend fino:
   labels, UX, catálogos backend más ricos y bordes operativos todavía abiertos
3. `business-core` de adopción profunda:
   contratos con módulos, `assets`, importadores y merge profundo de duplicados
4. registro y activación de módulos:
   etapa 15 del roadmap, todavía pendiente como bloque formal
5. expansión de producto:
   decidir y abrir el siguiente módulo grande después de `finance`
- mantener como regla ya cerrada del lifecycle tenant:
  - no borrar tenant archivado/unprovisioned sin export portable completado del mismo tenant
  - no tratar `functional_data_only` como restauración `1:1`
- mantener como comando obligatorio de cierre multi-tenant:
  - [seed_missing_tenant_defaults.py](/home/felipe/platform_paas/backend/app/scripts/seed_missing_tenant_defaults.py)
  - [repair_maintenance_finance_sync.py](/home/felipe/platform_paas/backend/app/scripts/repair_maintenance_finance_sync.py)
  - [audit_active_tenant_convergence.py](/home/felipe/platform_paas/backend/app/scripts/audit_active_tenant_convergence.py)

## Si el escenario principal falla

- verificar primero si el cambio quedó solo en repo y no en runtime:
  - `/home/felipe/platform_paas`
  - `/opt/platform_paas_staging`
  - `/opt/platform_paas`
- si el bug es de upload/download de adjuntos, verificar además:
  - valor efectivo de `FINANCE_ATTACHMENTS_DIR`
  - permisos reales del directorio compartido bajo `/opt/platform_paas/backend/storage` o `/opt/platform_paas_staging/backend/storage`
  - que el backend desplegado no siga usando rutas legacy dentro de `apps/tenant_modules/.../storage`
- verificar luego si el problema es tenant-local:
  - credenciales DB tenant
  - password DB tenant ausente
  - secuencia financiera desfasada
  - defaults/política faltantes

## Condición de cierre de la próxima iteración

- `staging` y `production` mantienen auditoría activa sin fallos críticos en tenants activos después del nuevo cambio
- el nuevo slice queda probado al menos en ambos ambientes reales afectados
- si el slice es relevante o transversal:
  - la matriz de ownership quedó actualizada o validada
  - la spec mínima del slice quedó creada o referenciada
- el siguiente corte de hardening deja explícito:
  - cómo se detecta drift tenant-local
  - cómo se repara por ambiente
  - cómo se distinguen `failed` críticos vs `notes` no críticas en la auditoría
  - cómo se diferencia operativamente entre incidente de runtime, incidente de datos tenant y problema de frontend/caché
- documentación de release deja explícito que:
  - repo != runtime
  - deploy != convergencia completa
  - cambio correcto para la PaaS = promoción + convergencia + pruebas + documentación en todos los ambientes/tenants afectados
  - delete tenant definitivo = export portable previo + confirmación explícita + archivo de retiro con evidencia
- mantener en maintenance esta regla operativa ya cerrada:
  - crear/editar OT desde `Mantenciones abiertas` o `Agenda` debe resolver por defecto `tipo de tarea = mantencion` cuando exista en el catálogo tenant
  - si una OT abierta vieja aún quedó sin tipo, usar [backfill_open_maintenance_task_type.py](/home/felipe/platform_paas/backend/app/scripts/backfill_open_maintenance_task_type.py) antes de diagnosticar UI
- antes de reabrir un bug de `Mantenciones abiertas` sobre `tipo de tarea`, verificar primero:
  - runtime backend productivo
  - runtime frontend productivo con publicación limpia
  - hard refresh del navegador o limpieza de caché del sitio
  - si el slice ya estaba cerrado, comunicar el trabajo como `revalidación` y no como reapertura automática
