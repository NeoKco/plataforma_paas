# TechDocs Changelog

## 2026-04-24

- se abre y se cierra el módulo `techdocs` como siguiente frente de expansión post-`taskops`
- backend tenant nuevo en [backend/app/apps/tenant_modules/techdocs](/home/felipe/platform_paas/backend/app/apps/tenant_modules/techdocs)
- migración tenant nueva en [v0043_techdocs_base.py](/home/felipe/platform_paas/backend/migrations/tenant/v0043_techdocs_base.py)
- frontend tenant nuevo en [frontend/src/apps/tenant_portal/modules/techdocs](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/techdocs)
- el módulo ya queda operativo con:
  - `Resumen`
  - `Expedientes`
  - `Auditoría`
- `techdocs` ya soporta:
  - dossiers técnicos
  - secciones
  - mediciones
  - evidencias con descarga
  - auditoría por dossier
  - referencias cruzadas a cliente, sitio, instalación, OT, oportunidad y tarea
- el módulo ya entra al catálogo contractual de módulos tenant como add-on `techdocs`
- la plataforma ya expone:
  - dependencia técnica `techdocs -> core`
  - labels visibles para el nuevo módulo
- validación repo inicial:
  - `backend.app.tests.test_techdocs_services + backend.app.tests.test_migration_flow + backend.app.tests.test_platform_flow` -> `262 tests OK`
  - `cd frontend && npm run build` -> `OK`
