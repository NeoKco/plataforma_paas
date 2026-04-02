# Maintenance Changelog

## 2026-04-02

- se crea la base tenant inicial del modulo con `0016_maintenance_base`
- se versionan tablas iniciales del dominio:
  - `maintenance_equipment_types`
  - `maintenance_installations`
  - `maintenance_work_orders`
  - `maintenance_visits`
  - `maintenance_status_logs`
- el scaffold backend deja estado `schema_base` para reflejar que el modulo ya no esta solo en diseno
- se documenta explicitamente que la BD de `ieris_app` sera solo fuente de migracion y validacion, no dependencia viva del runtime del PaaS
- se agrega [MIGRATION_MATRIX.md](/home/felipe/platform_paas/docs/modules/maintenance/MIGRATION_MATRIX.md) para mapear mantenciones, historico, instalaciones y tipos de equipo hacia el modelo nuevo
- se implementan APIs reales para:
  - `equipment_types`
  - `installations`
  - `work_orders`
- el frontend tenant deja de ser placeholder en:
  - `Tipos de equipo`
  - `Instalaciones`
  - `Órdenes de trabajo`
- el overview del modulo deja de presentarlo como solo scaffold
- se actualiza el backlog visible: `visits`, `status_logs` frontend, agenda, evidencias e importadores legacy

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
