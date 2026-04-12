# SESION_ACTIVA

## Propósito

Puntero corto para retomar rápido entre sesiones.

## Estado rápido vigente

- fecha: 2026-04-11
- foco activo: bootstrap contractual por módulos para tenants nuevos y cambio de plan
- prioridad inmediata: publicar y validar este baseline en `staging`
- módulo o frente activo: `platform-core` + `finance` + `business-core`

## Último contexto útil

- `maintenance -> finance` ya existe en primer corte; no es un frente en blanco
- el repo ya soporta:
  - `CLP` como moneda base efectiva por defecto
  - categorías `Casa - ...` y `Empresa - ...`
  - perfiles funcionales default
  - tipos de tarea default
  - backfill por cambio de plan para tenants activos
- este subcorte todavía no está publicado en `staging/production`
- el siguiente slice funcional seguirá siendo `maintenance -> finance`, pero solo después del publish de este baseline

## Bloqueo actual

- no hay bloqueo técnico
- falta validación visible del bootstrap tenant nuevo en `staging`

## Siguiente acción inmediata

- desplegar a `staging`
- verificar tenant nuevo con `core`
- promover a `production` si queda limpio

## Archivos a leer justo después de este

1. `ESTADO_ACTUAL.md`
2. `SIGUIENTE_PASO.md`
3. `HANDOFF_STATE.json`
4. `docs/modules/business-core/ROADMAP.md`
5. `docs/modules/finance/ROADMAP.md`
