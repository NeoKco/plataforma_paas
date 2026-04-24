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
- validación runtime final:
  - backup PostgreSQL tenant previo ejecutado en `staging` y `production` antes de mutar esquemas tenant
  - `production` incluye backup previo explícito de `ieris-ltda`
  - `staging` backend redeployado con `583 tests OK`, convergencia `processed=4, synced=4, skipped=0, failed=0`
  - `production` backend redeployado con `583 tests OK`, convergencia `processed=4, synced=4, skipped=0, failed=0`
  - `staging` publicado con `TechDocsAuditPage-Q2dSXmUO.js`, `techdocsService-CAK4Mack.js`, `TechDocsOverviewPage-DND6CEQw.js`, `TechDocsDossiersPage-Cp3Qsd53.js` e `index-CWMe3h3Z.js`
  - `production` publicado con `TechDocsAuditPage-D1piog8w.js`, `techdocsService-BnycfeUu.js`, `TechDocsOverviewPage-Dh78pDD-.js`, `TechDocsDossiersPage-B3QJqAFE.js` e `index-HTzRcALh.js`
  - `check_frontend_static_readiness.sh` -> `0 fallos, 0 advertencias` en ambos carriles
