# SIGUIENTE_PASO

## Prioridad vigente

- sostener la convergencia multi-tenant por ambiente como regla operativa permanente y abrir el siguiente subcorte fino de `maintenance -> finance` sobre una base ya alineada y sin drift entre repo/runtime

## Decisión previa obligatoria

- ninguna; la arquitectura de convergencia ya quedó definida y validada en `staging` y `production`

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
- siguiente subcorte funcional recomendado:
  - endurecer hints/controles de egreso seleccionable para que el operador vea con claridad qué líneas sí salen a egreso y cuáles no
  - revisar si conviene un endpoint atómico `close-with-costs` para evitar cualquier drift futuro entre `cost-actual`, `status` y `finance_sync`
  - dejar visible en la ficha/historial si la transacción financiera vinculada quedó conciliada, anulada o sin cuenta/categoría
- mantener como comando obligatorio de cierre multi-tenant:
  - [seed_missing_tenant_defaults.py](/home/felipe/platform_paas/backend/app/scripts/seed_missing_tenant_defaults.py)
  - [repair_maintenance_finance_sync.py](/home/felipe/platform_paas/backend/app/scripts/repair_maintenance_finance_sync.py)
  - [audit_active_tenant_convergence.py](/home/felipe/platform_paas/backend/app/scripts/audit_active_tenant_convergence.py)

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

- `staging` y `production` mantienen auditoría activa sin fallos críticos en tenants activos después del nuevo cambio
- el nuevo slice queda probado al menos en ambos ambientes reales afectados
- el nuevo subcorte de `maintenance -> finance` se verifica al menos en `empresa-demo` y `ieris-ltda` sobre runtime real
- documentación de release deja explícito que:
  - repo != runtime
  - deploy != convergencia completa
  - cambio correcto para la PaaS = promoción + convergencia + pruebas + documentación en todos los ambientes/tenants afectados
