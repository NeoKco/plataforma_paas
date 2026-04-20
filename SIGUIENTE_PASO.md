# SIGUIENTE_PASO

## Prioridad vigente

- sostener la convergencia multi-tenant por ambiente como regla operativa permanente y mover el roadmap al siguiente frente real de hardening transversal; `Agenda` ya quedó promovida como módulo lateral propio del portal tenant y el saneamiento operativo de `condominio-demo` e `ieris-ltda` ya quedó cerrado en `production` y `staging`, con los cuatro tenants activos auditando en verde en ambos ambientes
- mantener como regla de diagnóstico tenant:
  - si se van a ejecutar scripts del repo contra `/opt/platform_paas/.env` o `/opt/platform_paas_staging/.env.staging`, usar `set -a` antes de `source`
  - no volver a aceptar auditorías tenant con `TENANT_SECRETS_FILE` no exportado, porque pueden producir falsos negativos como el que se observó inicialmente sobre `ieris-ltda`
- en `finance`, la semántica de cabecera ya quedó corregida y promovida:
  - `Resultado neto` = `ingresos - egresos`
  - `Saldo total en cuentas` = suma backend de balances visibles por cuenta
- en `tenant_portal`, `Agenda` ya quedó separada de `Mantenciones`:
  - ruta propia `tenant-portal/agenda`
  - entrada propia en la barra lateral
  - fuente actual: calendario operativo de `maintenance`
  - siguiente evolución natural: agregar fuentes de otros módulos cuando existan contratos reales

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
- siguiente frente recomendado del roadmap:
  - hardening transversal de plataforma sobre convergencia post-deploy y observabilidad tenant
  - objetivos concretos del siguiente corte:
    - detectar automáticamente drift de credenciales DB tenant antes de que rompa `Platform Admin -> Tenants` o `tenant-portal/login`
    - dejar runbook/script único de reparación para rotación DB tenant por ambiente
    - endurecer el gate post-deploy para diferenciar claramente:
      - servicio sano
      - tenant roto por drift
      - tenant convergido
    - mejorar la visibilidad operativa del estado tenant en la consola admin sin depender de errores genéricos `Internal server error`
    - dejar explícito qué módulos aportan eventos a la nueva `Agenda` general y cómo se habilitan tenant-side sin volver a duplicar navegación por módulo
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
- el siguiente corte de hardening deja explícito:
  - cómo se detecta drift tenant-local
  - cómo se repara por ambiente
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
