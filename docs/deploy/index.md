# Deploy

Esta seccion agrupa guias de despliegue y operacion del proyecto.

## Documentos

- [Backend Debian](./backend-debian.md): base de despliegue con `systemd`, `nginx`, archivo `.env` y script de actualizacion.
- [Preflight de Producción Backend](./backend-production-preflight.md): chequeo previo del host antes de ejecutar el deploy real.
- [Frontend Estático con Nginx](./frontend-static-nginx.md): publicación del build Vite como SPA separada del backend.
- [Checklist de Cutover a Producción](./production-cutover-checklist.md): orden recomendado para publicar backend y frontend con validación corta de terreno.
- [Backend HTTPS con Nginx](./backend-https-nginx.md): terminacion TLS base con redirect a `443` y headers de seguridad.
- [Checklist de Aceptacion Operativa](./operational-acceptance-checklist.md): criterio minimo para aceptar deploys y restore drills.
- `scripts/dev/run_staging_published_provisioning_baseline.sh`: baseline published curado de `Provisioning/DLQ` para `staging`.
- `scripts/dev/run_production_published_provisioning_baseline.sh`: baseline published curado de `Provisioning/DLQ` para `production`.
- [Checklist de Release Funcional](./functional-release-checklist.md): validaciones funcionales para considerar la app usable despues de un release.
- [Verificacion Post-Deploy Backend](./backend-post-deploy-verification.md): checks minimos despues de un release, incluyendo convergencia tenant y `base smoke` del carril.
- [Backend Release y Rollback](./backend-release-and-rollback.md): base de deploy manual desde repo y rollback por ref git.
- [Estrategia de Entornos](./environment-strategy.md): separacion base entre `development`, `staging` y `production`.
- [Staging Single-Host](./staging-single-host.md): referencia del entorno de pruebas montado en el mini PC con backend `8200` y frontend `8081`.
- [Reset Bootstrap de Staging](./staging-bootstrap-reset.md): vuelta controlada del staging al modo instalador inicial para ensayar bootstrap desde cero.
- [Restaurar Staging a Espejo](./staging-restore-mirror.md): regreso controlado del staging desde bootstrap a espejo instalado para regresion normal.
- [Sincronizacion Externa de Backups](./external-backup-sync.md): copia de respaldos locales hacia almacenamiento externo.
- [PostgreSQL Backup y Restore](./postgres-backup-and-restore.md): respaldo y recuperacion base para `platform_control` y tenants.
- [Provisioning Worker](./provisioning-worker.md): ejecucion base de `provisioning_jobs` pendientes fuera del request HTTP.
- [Restore Drill de Platform Control](./restore-drill-platform-control.md): restauracion ensayada en DB temporal.
- [Restore Drill de Tenants](./restore-drill-tenants.md): restauracion ensayada de backups tenant en DBs temporales.
