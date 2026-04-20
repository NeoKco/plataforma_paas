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
- siguiente frente recomendado del roadmap:
  - hardening transversal de plataforma sobre convergencia post-deploy y observabilidad tenant
  - objetivos concretos del siguiente corte:
    - decidir el tratamiento final de `missing_finance_defaults:usage`, porque ya quedó aislado como única `note` residual real
    - decidir si el helper `--sync-env-file` debe quedar manual/explicito o integrarse en un flujo más guiado para carriles que comparten rol PostgreSQL
    - endurecer el gate post-deploy para diferenciar claramente:
      - servicio sano
      - tenant roto por drift
      - tenant convergido con notas
    - dejar explícito qué módulos aportan eventos a la nueva `Agenda` general y cómo se habilitan tenant-side sin volver a duplicar navegación por módulo
    - ejecutar ese frente ya usando la nueva spec mínima oficial, el ownership explícito del dato técnico que se toca y el paquete normativo nuevo de ADR/API/schema/env/E2E
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
