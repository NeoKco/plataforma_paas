# Documentacion de Platform PaaS

Este directorio centraliza la documentacion funcional, tecnica y operativa del proyecto `platform_paas`.

## Indice General

- [Arquitectura](./architecture/index.md): vision estructural del sistema, organizacion del repositorio y decisiones de base.
- [API](./api/index.md): documentacion de endpoints y contratos HTTP.
- [Install](./install/): pasos y notas del proceso de instalacion inicial.
- [Deploy](./deploy/index.md): guias de despliegue y configuracion de entornos.
- [Modules](./modules/): documentacion por modulo funcional o dominio.
- [Runbooks](./runbooks/index.md): procedimientos operativos y de soporte.

## Estado Actual

En este momento la documentacion creada formalmente dentro del repositorio comienza por arquitectura. Las demas secciones ya existen como carpetas y quedan preparadas para crecer de forma ordenada.

## Documento Inicial Recomendado

- [Guia unica para entender la app](./architecture/app-understanding-guide.md)
- [Onboarding de developers](./runbooks/developer-onboarding.md)
- [Flujo visual del instalador](./install/installer-visual-flow.md)
- [Demo data y seeds de desarrollo](./runbooks/demo-data.md)
- [Flujo diario de trabajo](./runbooks/daily-workflow.md)
- [Estructura raiz del proyecto](./architecture/project-structure.md)
- [Flujo actual del backend](./architecture/backend-current-flow.md)
- [Cierre del backend base](./architecture/backend-closure-status.md)
- [Matriz de politicas y precedencias backend](./architecture/backend-policy-precedence-matrix.md)
- [Mapa de permisos](./architecture/permission-map.md)
- [Roadmap de frontend](./architecture/frontend-roadmap.md)
- [Baseline de UX para frontend](./architecture/frontend-ux-baseline.md)
- [Guia rapida de la app](./architecture/app-quick-guide.md)
- [Guia de comprension de la app](./architecture/app-functional-walkthrough.md)
- [Manual visual de la app](./architecture/app-visual-manual.md)
- [Plantilla frontend de plataforma](./architecture/platform-frontend-template.md)
- [UX operativa de platform admin](./architecture/platform-admin-operational-ux.md)
- [Definicion de MVP](./architecture/product-mvp-definition.md)
- [Modelo multi-tenant](./architecture/multi-tenant-model.md)
- [Autenticacion y autorizacion](./architecture/authentication-and-authorization.md)
- [Roadmap de desarrollo](./architecture/development-roadmap.md)
- [API actual](./api/index.md)
- [Flujo visual del instalador](./install/installer-visual-flow.md)
- [Contratos backend estables para frontend](./api/frontend-contract-stability.md)
- [Bootstrap inicial de plataforma](./runbooks/platform-bootstrap.md)
- [Implementacion backend platform](./runbooks/platform-backend-implementation.md)
- [Implementacion backend tenant](./runbooks/tenant-backend-implementation.md)
- [Implementacion modulo finance](./runbooks/finance-module-implementation.md)
- [Reglas backend y guia de cambios](./runbooks/backend-rules-and-change-guidelines.md)
- [Onboarding de developers](./runbooks/developer-onboarding.md)
- [Demo data y seeds de desarrollo](./runbooks/demo-data.md)
- [Ciclo basico de tenants](./runbooks/tenant-basic-cycle.md)
- [Prueba guiada de provisioning](./runbooks/provisioning-guided-test.md)
- [Prueba guiada de billing](./runbooks/billing-guided-test.md)
- [Prueba guiada de tenant portal](./runbooks/tenant-portal-guided-test.md)
- [Higiene del repositorio para GitHub](./runbooks/github-repository-hygiene.md)
- [Migraciones backend](./runbooks/backend-migrations.md)
- [Hardening de seguridad](./runbooks/security-hardening.md)
- [Observabilidad backend](./runbooks/backend-observability.md)
- [Manejo de errores backend](./runbooks/backend-error-handling.md)
- [CI backend](./runbooks/backend-ci.md)
- [Pruebas backend](./runbooks/backend-tests.md)
- [Deploy backend Debian](./deploy/backend-debian.md)
- [Backend HTTPS con Nginx](./deploy/backend-https-nginx.md)
- [Checklist de aceptacion operativa](./deploy/operational-acceptance-checklist.md)
- [Checklist de release funcional](./deploy/functional-release-checklist.md)
- [Verificacion post-deploy backend](./deploy/backend-post-deploy-verification.md)
- [Backend release y rollback](./deploy/backend-release-and-rollback.md)
- [Estrategia de entornos](./deploy/environment-strategy.md)
- [Sincronizacion externa de backups](./deploy/external-backup-sync.md)
- [Backup y restore PostgreSQL](./deploy/postgres-backup-and-restore.md)
- [Provisioning worker](./deploy/provisioning-worker.md)
- [Restore drill de platform control](./deploy/restore-drill-platform-control.md)
- [Restore drill de tenants](./deploy/restore-drill-tenants.md)
