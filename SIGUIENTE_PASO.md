# SIGUIENTE_PASO

## Prioridad vigente

- sostener la convergencia multi-tenant por ambiente como regla operativa permanente y seguir con el siguiente ajuste fino de `finance`; el slice de `Mantenciones abiertas -> Tipo de tarea` en `ieris-ltda`, el incidente `finance -> adjuntos por transacción` y la corrección de cabecera `Resultado neto` + `Saldo total en cuentas` ya quedaron cerrados de punta a punta y no requieren más trabajo salvo nueva regresión reproducible
- en `finance`, la semántica de cabecera ya quedó corregida y promovida:
  - `Resultado neto` = `ingresos - egresos`
  - `Saldo total en cuentas` = suma backend de balances visibles por cuenta

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
  - revisar si conviene mostrar badges de completitud operativa en `Historial técnico` cuando una mantención antigua aún no tiene `visitas`, `logs` o datos de cierre homogéneos
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
- el nuevo subcorte de `maintenance -> finance` se verifica al menos en `empresa-demo` y `ieris-ltda` sobre runtime real
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
