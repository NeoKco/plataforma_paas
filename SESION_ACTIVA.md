# SESION_ACTIVA

## Propósito

Puntero corto para retomar rápido entre sesiones.

## Estado rápido vigente

- fecha: 2026-04-12
- foco activo: publicar el segundo corte de llenado fino `maintenance -> finance` (glosa y fecha contable)
- prioridad inmediata: deploy a `staging` y smoke del modal `Costos y cobro`
- módulo o frente activo: `maintenance` + `finance`

## Último contexto útil

- `maintenance -> finance` ya existía; este corte no recrea la integración, endurece defaults y ergonomía
- el repo ya agrega `GET /tenant/maintenance/finance-sync-defaults`
- `Resumen técnico` y `Costos y cobro` ya consumen esa misma fuente de verdad para moneda, cuentas y categorías sugeridas
- el smoke [tenant-portal-maintenance-finance-defaults.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-maintenance-finance-defaults.smoke.spec.ts) ya pasó en `staging` y `production`
- durante la validación se detectó un falso negativo de runtime en `staging`: `TENANT_PLAN_ENABLED_MODULES` seguía atrasado y ya quedó corregido
- el repo ya soporta:
  - `CLP` como moneda base efectiva por defecto
  - categorías `Casa - ...` y `Empresa - ...`
  - perfiles funcionales default
  - tipos de tarea default
  - backfill por cambio de plan para tenants activos
- este subcorte ya está publicado en `staging` y `production`
- el repo ya tiene además:
  - `docs/architecture/data-governance.md`
  - `docs/architecture/sred-development.md`
- `staging` ya quedó validado con tenants nuevos reales:
  - `bootstrap-empresa-20260412002354`
  - `bootstrap-condominio-20260412002354`
- este nuevo corte ya está publicado en `staging`
- este nuevo corte ya está también publicado en `production`

## Bloqueo actual

- no hay bloqueo técnico
- no hay deuda de rollout abierta para este corte

## Siguiente acción inmediata

- desplegar backend + frontend en `staging` y validar el smoke
- promover a `production` si `staging` queda verde

## Archivos a leer justo después de este

1. `ESTADO_ACTUAL.md`
2. `SIGUIENTE_PASO.md`
3. `HANDOFF_STATE.json`
4. `docs/modules/maintenance/ROADMAP.md`
5. `docs/modules/maintenance/CHANGELOG.md`
