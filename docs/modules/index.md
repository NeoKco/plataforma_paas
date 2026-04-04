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

La idea no es duplicar toda la documentación técnica existente, sino:

- centralizar el punto de entrada
- separar por tipo de lector
- mantener el conocimiento del módulo fuera del código y del chat

## Módulos documentados hoy

- [business-core](/home/felipe/platform_paas/docs/modules/business-core/README.md)
  Dominio tenant transversal para clientes, empresas, contactos, sitios y taxonomias compartidas.
- [community-core](/home/felipe/platform_paas/docs/modules/community-core/README.md)
  Dominio vertical para condominios, residentes, unidades, visitas y operacion residencial.
- [finance](/home/felipe/platform_paas/docs/modules/finance/README.md)
  Primer módulo tenant funcional y módulo piloto del SaaS.
- [maintenance](/home/felipe/platform_paas/docs/modules/maintenance/README.md)
  Modulo operativo de mantenciones, redefinido para apoyarse sobre `business-core`.
- [platform-core](/home/felipe/platform_paas/docs/modules/platform-core/README.md)
  Bloque central de instalación, `platform_admin`, tenants, provisioning, billing y ciclo operativo base.
