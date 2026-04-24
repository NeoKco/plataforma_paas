# Modules

Esta sección agrupa la documentación canónica por módulo o dominio funcional.

## Regla oficial

Todos los modulos documentados bajo esta carpeta heredan estas reglas transversales:

- [Gobernanza de implementacion](/home/felipe/platform_paas/docs/architecture/implementation-governance.md)
- [Estandar de construccion de modulos](/home/felipe/platform_paas/docs/architecture/module-build-standard.md)

Desde este punto del proyecto, todo módulo nuevo debe nacer con un directorio propio en:

- `docs/modules/<module>/`

Y con este set mínimo:

- `README.md`
- `USER_GUIDE.md`
- `DEV_GUIDE.md`
- `ROADMAP.md`
- `CHANGELOG.md`

Documento adicional:

- `API_REFERENCE.md`
  recomendado cuando el módulo expone endpoints propios o contratos públicos claros
- [improvements/README.md](/home/felipe/platform_paas/docs/modules/improvements/README.md)
  backlog transversal de mejoras sugeridas por modulo

La idea no es duplicar toda la documentación técnica existente, sino:

- centralizar el punto de entrada
- separar por tipo de lector
- mantener el conocimiento del módulo fuera del código y del chat

## Módulos documentados hoy

- [business-core](/home/felipe/platform_paas/docs/modules/business-core/README.md)
  Dominio tenant transversal para clientes, empresas, contactos, sitios y taxonomias compartidas.
- [community-core](/home/felipe/platform_paas/docs/modules/community-core/README.md)
  Dominio vertical para condominios, residentes, unidades, visitas y operacion residencial.
- [crm](/home/felipe/platform_paas/docs/modules/crm/README.md)
  Módulo comercial para productos, oportunidades, histórico, plantillas y cotizaciones estructuradas apoyado sobre `business-core`.
- [finance](/home/felipe/platform_paas/docs/modules/finance/README.md)
  Primer módulo tenant funcional y módulo piloto del SaaS.
- [maintenance](/home/felipe/platform_paas/docs/modules/maintenance/README.md)
  Modulo operativo de mantenciones, redefinido para apoyarse sobre `business-core`.
- [platform-core](/home/felipe/platform_paas/docs/modules/platform-core/README.md)
  Bloque central de instalación, `platform_admin`, tenants, provisioning, billing y ciclo operativo base.
- [taskops](/home/felipe/platform_paas/docs/modules/taskops/README.md)
  Módulo tenant para tareas internas con kanban, comentarios, adjuntos e histórico apoyado sobre `business-core`, `crm` y `maintenance`.
- [techdocs](/home/felipe/platform_paas/docs/modules/techdocs/README.md)
  Módulo tenant para expediente técnico con dossiers, mediciones, evidencias y auditoría apoyado sobre `business-core`, `maintenance`, `crm` y `taskops`.
- [improvements](/home/felipe/platform_paas/docs/modules/improvements/README.md)
  Backlog transversal de mejoras sugeridas para todos los modulos existentes.
