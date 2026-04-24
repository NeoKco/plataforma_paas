# TechDocs Dev Guide

Guía de desarrollo del módulo `techdocs`.

## Objetivo técnico

Cubrir el bloque de expediente técnico con:

- dossiers técnicos
- secciones
- mediciones
- evidencias
- auditoría

sin mezclarlo con:

- `maintenance` como dueño de OT
- `crm` como workflow comercial
- `taskops` como workflow interno
- `business-core` como identidad base

La frontera correcta es:

- `business-core` es dueño de clientes y sitios
- `maintenance` es dueño de instalaciones y OT
- `crm` es dueño de oportunidades
- `taskops` es dueño de tareas
- `techdocs` es dueño de:
  - expediente técnico
  - estructura técnica del dossier
  - mediciones
  - evidencias
  - trazabilidad del expediente

## Estructura

- Backend:
  - [backend/app/apps/tenant_modules/techdocs](/home/felipe/platform_paas/backend/app/apps/tenant_modules/techdocs)
- Frontend:
  - [frontend/src/apps/tenant_portal/modules/techdocs](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/techdocs)
- Migraciones tenant:
  - [v0043_techdocs_base.py](/home/felipe/platform_paas/backend/migrations/tenant/v0043_techdocs_base.py)

## Modelo actual

Entidades activas del módulo:

- `techdocs_dossiers`
- `techdocs_sections`
- `techdocs_measurements`
- `techdocs_evidences`
- `techdocs_audit_events`

## Relaciones clave

- `techdocs_dossiers.client_id -> business_clients.id`
- `techdocs_dossiers.site_id -> business_sites.id`
- `techdocs_dossiers.installation_id -> maintenance_installations.id`
- `techdocs_dossiers.work_order_id -> maintenance_work_orders.id`
- `techdocs_dossiers.opportunity_id -> crm_opportunities.id`
- `techdocs_dossiers.task_id -> taskops_tasks.id`
- `techdocs_sections.dossier_id -> techdocs_dossiers.id`
- `techdocs_measurements.section_id -> techdocs_sections.id`
- `techdocs_measurements.dossier_id -> techdocs_dossiers.id`
- `techdocs_evidences.dossier_id -> techdocs_dossiers.id`
- `techdocs_audit_events.dossier_id -> techdocs_dossiers.id`

Notas:

- `responsible_user_id`, `uploaded_by_user_id` y `created_by_user_id` quedan como referencias blandas a usuario tenant
- no se forzó FK directa a usuario tenant por la misma razón aplicada en otros módulos tenant

## Contrato funcional actual

### Dossiers

- CRUD completo
- archivado lógico vía `active`
- estados controlados:
  - `draft`
  - `in_review`
  - `approved`
  - `archived`
- tipos controlados:
  - `installation`
  - `diagnosis`
  - `maintenance_support`
  - `commercial_support`
  - `compliance`
  - `custom`

### Secciones

- alta, edición y borrado
- tipos controlados:
  - `dc`
  - `ac`
  - `grounding`
  - `inspection`
  - `documents`
  - `custom`

### Mediciones

- alta, edición y borrado
- almacenan lectura estructurada con unidad, resultado y observación
- persisten auditoría de mutación

### Evidencias

- alta, descarga y borrado
- validación por:
  - content type
  - tamaño máximo
- almacenamiento filesystem local bajo `TECHDOCS_ATTACHMENTS_DIR`

### Auditoría

- create y mutaciones relevantes persisten evento en `techdocs_audit_events`
- la vista tenant sale de esta tabla y de los serializers del módulo

### Resumen

- métricas:
  - total
  - activas
  - en revisión
  - aprobadas
  - archivadas

## API tenant actual

Prefijo:

- `/tenant/techdocs/*`

Routers visibles:

- `overview`
- `dossiers`
- `audit`

Subrecursos visibles:

- `sections`
- `measurements`
- `evidences`

## Frontend tenant actual

Rutas:

- `/tenant-portal/techdocs`
- `/tenant-portal/techdocs/dossiers`
- `/tenant-portal/techdocs/audit`

Piezas relevantes:

- `TechDocsModuleNav.tsx`
- `techdocsService.ts`
- páginas:
  - `TechDocsOverviewPage.tsx`
  - `TechDocsDossiersPage.tsx`
  - `TechDocsAuditPage.tsx`

## Permisos

- lectura:
  - `tenant.techdocs.read`
- gestión:
  - `tenant.techdocs.manage`

## Contrato comercial y dependencias

- módulo contractual:
  - `techdocs`
- activation kind:
  - `addon`
- dependencia técnica visible:
  - `techdocs -> core`

Razón:

- `Expediente técnico` reutiliza clientes y sitios de `business-core`

## Cobertura de regresión actual

- [test_techdocs_services.py](/home/felipe/platform_paas/backend/app/tests/test_techdocs_services.py)
  - validación básica de tipos, mediciones y evidencias
- [test_migration_flow.py](/home/felipe/platform_paas/backend/app/tests/test_migration_flow.py)
  - presencia e idempotencia de `0043_techdocs_base`
- [test_platform_flow.py](/home/felipe/platform_paas/backend/app/tests/test_platform_flow.py)
  - catálogo contractual y dependencias visibles del módulo

## Regla de evolución

No duplicar desde `techdocs`:

- clientes
- sitios
- instalaciones
- oportunidades
- tareas
- OT

Todo eso sigue resolviéndose desde sus módulos dueños.

La siguiente evolución razonable del módulo ya no es “cerrar lo básico”, sino profundizar:

- versionado formal de expediente
- PDF ensamblado
- firmas o aprobaciones
- plantillas técnicas
- checklists reutilizables
