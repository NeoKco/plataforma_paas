# TechDocs Module

Documentación canónica del módulo `techdocs`.

Nombre funcional visible:

- `Expediente técnico`

Estado actual:

- módulo tenant ya operativo dentro del PaaS
- backend tenant ya expone:
  - dossiers técnicos
  - secciones técnicas
  - mediciones
  - evidencias con adjuntos
  - auditoría de cambios
- frontend tenant ya entrega lectura y captura para:
  - `Resumen`
  - `Expedientes`
  - `Auditoría`
- el módulo reutiliza:
  - clientes y sitios de `business-core`
  - instalaciones y OT de `maintenance`
  - oportunidades de `crm`
  - tareas de `taskops`
- el módulo ya entra al catálogo contractual como add-on tenant (`techdocs`)

Objetivo del módulo:

- cubrir el frente de expediente técnico faltante respecto de `ieris_app`
- concentrar evidencia técnica/documental sin repartirla entre módulos ajenos
- dejar una base reusable para terreno, soporte, mantenciones y apoyo comercial

## Alcance actual

El módulo hoy incluye:

- dossiers técnicos con:
  - tipo
  - estado
  - título
  - resumen
  - alcance
  - referencias cruzadas opcionales
- secciones técnicas categorizadas
- mediciones técnicas por sección
- evidencias con:
  - archivo
  - tipo de evidencia
  - observación
  - subida con descarga posterior
- auditoría por dossier con trazabilidad visible
- resumen con métricas:
  - total
  - activas
  - en revisión
  - aprobadas
  - archivadas

Queda fuera por ahora:

- versionado formal de documentos
- aprobaciones multinivel
- firmas
- PDF ensamblado final del expediente
- plantillas técnicas complejas

## Mapa de documentos

- [USER_GUIDE.md](/home/felipe/platform_paas/docs/modules/techdocs/USER_GUIDE.md)
  Guía operativa para usuario tenant y soporte funcional.
- [DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/techdocs/DEV_GUIDE.md)
  Estructura, contratos y criterios de extensión del módulo.
- [API_REFERENCE.md](/home/felipe/platform_paas/docs/modules/techdocs/API_REFERENCE.md)
  Referencia resumida de endpoints del módulo.
- [ROADMAP.md](/home/felipe/platform_paas/docs/modules/techdocs/ROADMAP.md)
  Estado del módulo y backlog posterior al cierre del alcance actual.
- [CHANGELOG.md](/home/felipe/platform_paas/docs/modules/techdocs/CHANGELOG.md)
  Hitos funcionales y técnicos del módulo.
- [../improvements/README.md](/home/felipe/platform_paas/docs/modules/improvements/README.md)
  Backlog transversal de mejoras sugeridas por módulo.

## Código principal

- Backend: [techdocs](/home/felipe/platform_paas/backend/app/apps/tenant_modules/techdocs)
- Frontend: [techdocs](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/techdocs)

## Criterio de uso

Si necesitas operar el módulo:

- parte por [USER_GUIDE.md](/home/felipe/platform_paas/docs/modules/techdocs/USER_GUIDE.md)

Si necesitas modificar o extender el módulo:

- parte por [DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/techdocs/DEV_GUIDE.md)

Si necesitas revisar estado y backlog posterior:

- parte por [ROADMAP.md](/home/felipe/platform_paas/docs/modules/techdocs/ROADMAP.md)
