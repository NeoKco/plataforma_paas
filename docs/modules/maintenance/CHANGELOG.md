# Maintenance Changelog

## 2026-04-02

- se documenta explicitamente que la BD de `ieris_app` sera solo fuente de migracion y validacion, no dependencia viva del runtime del PaaS
- se agrega [MIGRATION_MATRIX.md](/home/felipe/platform_paas/docs/modules/maintenance/MIGRATION_MATRIX.md) para mapear mantenciones, historico, instalaciones y tipos de equipo hacia el modelo nuevo

## 2026-04-01

- se declara `maintenance` como siguiente modulo de negocio priorizado para el PaaS
- se audita `ieris_app` como fuente funcional del modulo
- se define que `egresos` no sera migrado porque el reemplazo es `finance`
- se crea la documentacion canonica inicial del modulo:
  - `README.md`
  - `USER_GUIDE.md`
  - `DEV_GUIDE.md`
  - `API_REFERENCE.md`
  - `ROADMAP.md`
  - `CHANGELOG.md`
- se fija el alcance del primer corte:
  - mantenciones
  - historial
  - instalaciones
  - tipos de equipo
  - integracion con agenda
- se deja `expediente tecnico` como extension posterior, no como parte del primer corte
