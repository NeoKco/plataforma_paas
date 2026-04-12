# SESION_ACTIVA

## Propósito

Puntero corto para retomar rápido entre sesiones.

## Estado rápido vigente

- fecha: 2026-04-12
- foco activo: validar visualmente en `staging` el primer corte de defaults efectivos `maintenance -> finance`
- prioridad inmediata: revisar `Resumen técnico` y `Costos y cobro` ya publicados en `staging`
- módulo o frente activo: `maintenance` + `finance`

## Último contexto útil

- `maintenance -> finance` ya existía; este corte no recrea la integración, endurece defaults y ergonomía
- el repo ya agrega `GET /tenant/maintenance/finance-sync-defaults`
- `Resumen técnico` y `Costos y cobro` ya consumen esa misma fuente de verdad para moneda, cuentas y categorías sugeridas
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
- todavía no está promovido a `production`

## Bloqueo actual

- no hay bloqueo técnico
- falta únicamente validación visual en `staging`

## Siguiente acción inmediata

- validar visualmente prellenado efectivo en `Resumen técnico` y `Costos y cobro`
- decidir promoción a `production`

## Archivos a leer justo después de este

1. `ESTADO_ACTUAL.md`
2. `SIGUIENTE_PASO.md`
3. `HANDOFF_STATE.json`
4. `docs/modules/maintenance/ROADMAP.md`
5. `docs/modules/maintenance/CHANGELOG.md`
