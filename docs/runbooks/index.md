# Runbooks

Esta seccion agrupa procedimientos operativos y pasos repetibles para trabajar con `platform_paas`.

## Documentos

- [Bootstrap inicial de plataforma](./platform-bootstrap.md): secuencia minima para instalar, inicializar y validar el backend.
- [Implementacion backend platform](./platform-backend-implementation.md): guia del flujo platform, auth, runtime y provisioning desde la estructura real del proyecto.
- [Implementacion backend tenant](./tenant-backend-implementation.md): guia paso a paso del flujo tenant desde JWT hasta consulta real a la DB del tenant.
- [Implementacion modulo finance](./finance-module-implementation.md): primer modulo tenant funcional usando permisos, servicio, repositorio y DB tenant.
- [Reglas backend y guia de cambios](./backend-rules-and-change-guidelines.md): donde vive cada tipo de regla, que puede operarse manualmente y cuando hace falta programar.
- [Onboarding de developers](./developer-onboarding.md): secuencia minima para levantar backend y frontend localmente, correr tests y ubicarse en el repo.
- [Catalogo de variables de entorno backend](./backend-env-catalog.md): resumen por categoria de las variables de runtime y operacion del backend.
- [Demo data y seeds de desarrollo](./demo-data.md): carga reproducible de tenants y datos de ejemplo para demos y validacion manual.
- [Prueba guiada de provisioning](./provisioning-guided-test.md): ejercicio real de `pending -> retry_pending -> completed` para entender y validar el worker.
- [Higiene del repositorio para GitHub](./github-repository-hygiene.md): que debe versionarse, que debe ignorarse y que revisar antes de publicar.
- [Migraciones backend](./backend-migrations.md): mecanismo actual de migraciones versionadas para control DB y tenant DB.
- [Hardening de seguridad](./security-hardening.md): validaciones de runtime, manejo de secretos tenant y reduccion de exposicion de credenciales.
- [Observabilidad backend](./backend-observability.md): request ID, logging estructurado basico y trazabilidad tecnica por request.
- [Manejo de errores backend](./backend-error-handling.md): formato uniforme de errores con `request_id` y handlers globales.
- [CI backend](./backend-ci.md): workflow base para correr el runner unificado con PostgreSQL temporal.
- [Pruebas backend](./backend-tests.md): suites actuales de tenant y platform, con comandos de ejecucion.
