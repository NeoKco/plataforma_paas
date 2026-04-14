# SIGUIENTE_PASO

## Prioridad vigente

- dejar cerrada la convergencia multi-tenant por ambiente, especialmente en `staging`

## Decisión previa obligatoria

- ninguna; la arquitectura de convergencia ya quedó definida en repo

## Próximo paso correcto

- reparar runtime tenant en `staging` para:
  - `condominio-demo`
  - `ieris-ltda`
- volver a correr:
  - [seed_missing_tenant_defaults.py](/home/felipe/platform_paas/backend/app/scripts/seed_missing_tenant_defaults.py)
  - [repair_maintenance_finance_sync.py](/home/felipe/platform_paas/backend/app/scripts/repair_maintenance_finance_sync.py)
  - [audit_active_tenant_convergence.py](/home/felipe/platform_paas/backend/app/scripts/audit_active_tenant_convergence.py)
- mantener `production` como referencia convergida y auditada

## Si el escenario principal falla

- verificar primero si el cambio quedó solo en repo y no en runtime:
  - `/home/felipe/platform_paas`
  - `/opt/platform_paas_staging`
  - `/opt/platform_paas`
- verificar luego si el problema es tenant-local:
  - credenciales DB tenant
  - password DB tenant ausente
  - secuencia financiera desfasada
  - defaults/política faltantes

## Condición de cierre de la próxima iteración

- `staging` con auditoría activa sin fallos críticos en tenants activos
- `production` y `staging` alineados por:
  - código desplegado
  - convergencia post-deploy
  - auditoría activa por tenant
- documentación de release deja explícito que:
  - repo != runtime
  - deploy != convergencia completa
