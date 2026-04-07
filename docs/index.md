# Documentacion de Platform PaaS

Este directorio centraliza la documentacion funcional, tecnica y operativa del proyecto `platform_paas`.

## Indice General

- [Arquitectura](./architecture/index.md): vision estructural del sistema, organizacion del repositorio y decisiones de base.
- [API](./api/index.md): documentacion de endpoints y contratos HTTP.
- [Install](./install/): pasos y notas del proceso de instalacion inicial.
- [Deploy](./deploy/index.md): guias de despliegue y configuracion de entornos.
- [Modules](./modules/index.md): documentacion por modulo funcional o dominio.
- [Runbooks](./runbooks/index.md): procedimientos operativos y de soporte.

## Estado Actual

La documentacion ya cubre arquitectura, modulos, runbooks, deploy, API y baseline E2E. El siguiente criterio oficial es mantenerla viva y alineada con cada cambio visible o estructural del producto.

## Memoria viva fuera del chat

Además del árbol `docs/`, el proyecto mantiene un set de archivos raíz para handoff rápido entre developers o IAs:

- [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md)
- [REGLAS_IMPLEMENTACION.md](../REGLAS_IMPLEMENTACION.md)
- [PROMPT_MAESTRO_MODULO.md](../PROMPT_MAESTRO_MODULO.md)
- [ESTADO_ACTUAL.md](../ESTADO_ACTUAL.md)
- [SIGUIENTE_PASO.md](../SIGUIENTE_PASO.md)
- [HANDOFF_STATE.json](../HANDOFF_STATE.json)
- [HISTORIAL_ITERACIONES.md](../HISTORIAL_ITERACIONES.md)
- [PLANTILLA_ACTUALIZACION_ESTADO.md](../PLANTILLA_ACTUALIZACION_ESTADO.md)
- [PAQUETE_RELEASE_OPERADOR.md](../PAQUETE_RELEASE_OPERADOR.md)

La regla práctica es esta:

- el chat no debe ser la memoria principal del proyecto
- el repo sí debe serlo
- si cambia el estado real del proyecto, estos archivos también deben revisarse

## Documento Inicial Recomendado

- [Contexto raiz del proyecto](../PROJECT_CONTEXT.md)
- [Reglas de implementacion raiz](../REGLAS_IMPLEMENTACION.md)
- [Estado actual de la iteracion](../ESTADO_ACTUAL.md)
- [Siguiente paso recomendado](../SIGUIENTE_PASO.md)
- [Estado maquina-legible de handoff](../HANDOFF_STATE.json)
- [Historial de iteraciones](../HISTORIAL_ITERACIONES.md)
- [Plantilla de actualizacion de estado](../PLANTILLA_ACTUALIZACION_ESTADO.md)
- [Paquete resumido de release para operador](../PAQUETE_RELEASE_OPERADOR.md)
- [Guia unica para entender la app](./architecture/app-understanding-guide.md)
- [Onboarding de developers](./runbooks/developer-onboarding.md)
- [Flujo visual del instalador](./install/installer-visual-flow.md)
- [Demo data y seeds de desarrollo](./runbooks/demo-data.md)
- [Flujo diario de trabajo](./runbooks/daily-workflow.md)
- [Estructura raiz del proyecto](./architecture/project-structure.md)
- [Convencion modular por slice](./architecture/module-slice-convention.md)
- [Estandar de construccion de modulos](./architecture/module-build-standard.md)
- [Gobernanza de implementacion](./architecture/implementation-governance.md)
- [Estandar de botones CRUD](./architecture/crud-button-standard.md)
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
- [Mapa de dominios del PaaS](./architecture/domain-map.md)
- [API actual](./api/index.md)
- [Flujo visual del instalador](./install/installer-visual-flow.md)
- [Contratos backend estables para frontend](./api/frontend-contract-stability.md)
- [Bootstrap inicial de plataforma](./runbooks/platform-bootstrap.md)
- [Implementacion backend platform](./runbooks/platform-backend-implementation.md)
- [Implementacion backend tenant](./runbooks/tenant-backend-implementation.md)
- [Implementacion modulo finance](./runbooks/finance-module-implementation.md)
- [Indice canonico de finance](./modules/finance/README.md)
- [Indice canonico de business core](./modules/business-core/README.md)
- [Guia de duplicados en business core](./modules/business-core/USER_GUIDE.md)
- [Indice canonico de community core](./modules/community-core/README.md)
- [Indice canonico de maintenance](./modules/maintenance/README.md)
- [Indice canonico de platform core](./modules/platform-core/README.md)
- [Reglas backend y guia de cambios](./runbooks/backend-rules-and-change-guidelines.md)
- [Onboarding de developers](./runbooks/developer-onboarding.md)
- [Demo data y seeds de desarrollo](./runbooks/demo-data.md)
- [Ciclo basico de tenants](./runbooks/tenant-basic-cycle.md)
- [Ciclo basico de usuarios de plataforma](./runbooks/platform-users-cycle.md)
- [Ciclo de vida de la cuenta raiz](./runbooks/platform-root-account-lifecycle.md)
- [Actividad de plataforma](./runbooks/platform-activity.md)
- [Prueba guiada de provisioning](./runbooks/provisioning-guided-test.md)
- [Prueba guiada de billing](./runbooks/billing-guided-test.md)
- [Prueba guiada de tenant portal](./runbooks/tenant-portal-guided-test.md)
- [Recuperación de estado en mantenciones cerradas por error](./runbooks/maintenance-status-recovery.md)
- [Higiene del repositorio para GitHub](./runbooks/github-repository-hygiene.md)
- [Migraciones backend](./runbooks/backend-migrations.md)
- [Hardening de seguridad](./runbooks/security-hardening.md)
- [Observabilidad backend](./runbooks/backend-observability.md)
- [Manejo de errores backend](./runbooks/backend-error-handling.md)
- [CI backend](./runbooks/backend-ci.md)
- [Pruebas backend](./runbooks/backend-tests.md)
- [Deploy backend Debian](./deploy/backend-debian.md)
- [Preflight de producción backend](./deploy/backend-production-preflight.md)
- [Frontend estático con Nginx](./deploy/frontend-static-nginx.md)
- [Checklist de cutover a producción](./deploy/production-cutover-checklist.md)
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
