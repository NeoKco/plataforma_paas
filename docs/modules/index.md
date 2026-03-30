# Modules

Esta sección agrupa la documentación canónica por módulo o dominio funcional.

## Regla oficial

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

- [finance](/home/felipe/platform_paas/docs/modules/finance/README.md)
  Primer módulo tenant funcional y módulo piloto del SaaS.
- [platform-core](/home/felipe/platform_paas/docs/modules/platform-core/README.md)
  Bloque central de instalación, `platform_admin`, tenants, provisioning, billing y ciclo operativo base.
