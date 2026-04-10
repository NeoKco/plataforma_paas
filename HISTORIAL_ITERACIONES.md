# HISTORIAL_ITERACIONES

## 2026-04-09 - Provisioning DLQ investigation staging+production

- se implementa la acción visible `Investigar en DLQ` en [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx) sobre `Fallos por código` y `Alertas activas`
- el cambio precarga `tenantSlug`, `errorCode` y/o `errorContains`, muestra feedback visible y desplaza la lectura al panel `Operación DLQ`
- se agrega el smoke [platform-admin-provisioning-dlq-investigation.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-investigation.smoke.spec.ts)
- se endurece [backend-control.ts](/home/felipe/platform_paas/frontend/e2e/support/backend-control.ts) con `E2E_BACKEND_ROOT` y `E2E_BACKEND_PYTHON` para seeds contra árboles publicados como `/opt/platform_paas_staging`
- se endurece [platform-admin.ts](/home/felipe/platform_paas/frontend/e2e/support/platform-admin.ts) para que el helper del modal `Nuevo tenant` deje de depender de placeholders ambiguos
- validaciones cerradas en esta iteración:
  - `npm run build` OK
  - `npx playwright test --list` OK (`43 tests`)
  - smoke de regresión [platform-admin-tenant-provisioning-context.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-provisioning-context.smoke.spec.ts) OK en `staging`
  - smoke específico [platform-admin-provisioning-dlq-investigation.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-investigation.smoke.spec.ts) OK en `staging`
  - smoke de regresión [platform-admin-tenant-provisioning-context.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-provisioning-context.smoke.spec.ts) OK en `production` después del publish frontend
- estado de despliegue:
  - `repo`: actualizado
  - `staging`: frontend publicado y smoke específico verde
  - `production`: frontend publicado y regresión segura verde
- hallazgo operativo:
  - los smokes publicados que siembran backend en `staging` deben cargar `/opt/platform_paas_staging/.env.staging`; usar `/opt/platform_paas_staging/.env` deja el seed apuntando al entorno equivocado

## 2026-04-09 - Checklist único de cierre de iteración

- se agrega [CHECKLIST_CIERRE_ITERACION.md](/home/felipe/platform_paas/CHECKLIST_CIERRE_ITERACION.md) como checklist corto oficial para cerrar iteraciones
- se integra el checklist al flujo de retoma y handoff en [PROMPT_MAESTRO_MODULO.md](/home/felipe/platform_paas/PROMPT_MAESTRO_MODULO.md), [REGLAS_IMPLEMENTACION.md](/home/felipe/platform_paas/REGLAS_IMPLEMENTACION.md), [PROJECT_CONTEXT.md](/home/felipe/platform_paas/PROJECT_CONTEXT.md), [README.md](/home/felipe/platform_paas/README.md), [SESION_ACTIVA.md](/home/felipe/platform_paas/SESION_ACTIVA.md) y [docs/architecture/implementation-governance.md](/home/felipe/platform_paas/docs/architecture/implementation-governance.md)
- la regla queda institucionalizada: ninguna iteración relevante debe cerrarse sin revisar código, validación, documentación y handoff contra ese checklist

Este archivo resume iteraciones importantes para que otra IA o developer pueda ver la secuencia reciente sin releer todo el repositorio.

## Formato recomendado

Para nuevas entradas usar:

- fecha
- objetivo
- cambios principales
- validaciones
- bloqueos
- siguiente paso

---

## 2026-04-09 — Tenants abre Provisioning con foco tenant precargado

### Objetivo

- cerrar el subfrente de acceso tenant más profundo desde `Tenants`
- evitar que el operador se pierda en la cola global de `Provisioning` cuando ya viene desde un tenant concreto

### Cambios principales

- [TenantsPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/tenants/TenantsPage.tsx) ahora abre `Provisioning` con `tenantSlug` y `operation` precargados cuando existe job visible
- [ProvisioningPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/provisioning/ProvisioningPage.tsx) agrega foco tenant visible por URL/UI y filtra jobs, métricas, alertas y lectura DLQ en client-side
- se agrega el smoke [platform-admin-tenant-provisioning-context.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-provisioning-context.smoke.spec.ts)
- el frontend actualizado se publica en `staging` y `production`

### Validaciones

- `npm run build`: OK
- `npx playwright test --list`: `42 tests`
- `platform-admin-tenant-provisioning-context.smoke.spec.ts`: OK en `staging`
- `platform-admin-tenant-provisioning-context.smoke.spec.ts`: OK en `production`

### Bloqueos

- no quedó bloqueo técnico en este corte

### Siguiente paso

- seguir con el frente `platform-core hardening + E2E`
- abrir el siguiente corte dentro de `Provisioning` con foco en DLQ, recuperación fina y observabilidad visible

---

## 2026-04-09 — Fase 2 mínima implementada de `tenant data portability CSV`

### Objetivo

- implementar el import controlado mínimo sobre el paquete portable ya exportable
- dejar `dry_run` y `apply` explícito dentro de `platform_admin > Tenants`

### Cambios principales

- `tenant_data_portability_service.py` ahora soporta import desde `zip + manifest + csv`
- el import valida `manifest.json`, `checksums` y `schema_version`
- la estrategia inicial queda cerrada como `skip_existing`
- `platform_admin > Tenants` suma el bloque `Import portable controlado`
- el smoke `platform-admin-tenant-data-export` se amplía para fijar la superficie visible del import

### Validaciones

- backend slice afectado: `218 OK`
- frontend `npm run build`: OK
- `npx playwright test --list`: `41 tests`

### Bloqueos

- no hay bloqueo técnico de implementación base
- falta validación browser real del import antes de despliegue

### Siguiente paso

- validar browser/dev-staging del import portable mínimo y decidir despliegue

---

## 2026-04-08 — Fase 1 implementada de `tenant data portability CSV`

### Objetivo

- implementar el primer corte real de portabilidad tenant en `CSV + manifest`
- dejar una capacidad de producto usable desde `platform_admin > Tenants`

### Cambios principales

- se agrega la migración [v0026_tenant_data_transfer_jobs.py](/home/felipe/platform_paas/backend/migrations/control/v0026_tenant_data_transfer_jobs.py)
- `platform_control` ahora persiste jobs y artifacts de export portable por tenant
- se implementa [tenant_data_portability_service.py](/home/felipe/platform_paas/backend/app/apps/platform_control/services/tenant_data_portability_service.py) para generar `zip + manifest + csv`
- `platform_admin > Tenants` agrega el bloque `Portabilidad tenant` y el historial corto de exports
- se agrega el smoke [platform-admin-tenant-data-export.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-data-export.smoke.spec.ts)
- se agrega el runbook [tenant-data-portability.md](/home/felipe/platform_paas/docs/runbooks/tenant-data-portability.md)
- `.env.example`, `backend.production.example.env` y `backend-env-catalog.md` documentan `TENANT_DATA_EXPORT_ARTIFACTS_DIR`

### Validaciones

- backend slice afectado: `213 OK`
- `python3 -m compileall` sobre `platform_control`: OK
- frontend `npm run build`: OK
- `npx playwright test --list`: `41 tests`

### Bloqueos

- no hay bloqueo técnico para export
- la importación controlada todavía no existe

### Siguiente paso

- abrir la Fase 2: import controlado con `dry_run`

---

## 2026-04-08 — Apertura del frente `tenant data portability CSV`

### Objetivo

- elegir explícitamente el siguiente frente central del roadmap
- dejar canónico cómo debe resolverse export/import portable por tenant sin confundirlo con backup PostgreSQL real

### Cambios principales

- se agrega [TENANT_DATA_PORTABILITY_MODEL.md](/home/felipe/platform_paas/docs/modules/platform-core/TENANT_DATA_PORTABILITY_MODEL.md) dentro de `platform-core`
- el modelo deja explícito:
  - `pg_dump` como respaldo técnico canónico
  - `CSV + manifest` como portabilidad y migración
  - jobs centralizados en `platform_control`
  - paquete por tenant en `zip`
  - `dry_run` obligatorio antes de `apply`
- `platform-core/README`, `DEV_GUIDE`, `ROADMAP` y `CHANGELOG` quedan alineados con este frente nuevo
- `postgres-backup-and-restore.md` deja explícito que backup PostgreSQL y export/import CSV no son lo mismo
- estado vivo y handoff quedan reescritos para que la próxima IA ya no tenga que “elegir frente”, sino implementar la Fase 1

### Validaciones

- revisión cruzada de documentación canónica: OK
- `HANDOFF_STATE.json` válido: esperado en esta iteración

### Bloqueos

- no hay bloqueo técnico
- el frente todavía está en fase de diseño, no de implementación

### Siguiente paso

- implementar la Fase 1 de `tenant data portability CSV` en `platform-core`

---

## 2026-04-08 — Hotfix de provisioning/deprovision en producción

### Objetivo

- corregir los fallos visibles de `Provisioning` en producción
- permitir de nuevo el retiro técnico y borrado seguro de un tenant archivado para recrearlo limpio

### Cambios principales

- `TenantSecretService` deja institucionalizado `TENANT_SECRETS_FILE` como archivo runtime para passwords técnicas tenant
- `provisioning` y `deprovision` escriben/limpian primero ese archivo y mantienen compatibilidad con el `.env` legado
- se actualizan `.env.example`, `backend.production.example.env` y el catálogo de variables backend
- se despliega el hotfix en `staging` y `production`
- se crea `/opt/platform_paas/.tenant-secrets.env` y `/opt/platform_paas_staging/.tenant-secrets.env` con permisos para el usuario `platform`
- se rota la credencial técnica de `condominio-demo`, su `sync_tenant_schema` vuelve a `completed`
- se reencola y completa el retiro técnico de `ierisltda`, y luego se elimina el tenant archivado para permitir recreación limpia

### Validaciones

- `app.tests.test_security_hardening`: `10 OK`
- slice backend afectado: `236 OK`
- baseline backend en `/opt/platform_paas_staging`: `512 OK`
- baseline backend en `/opt/platform_paas`: `512 OK`
- `GET http://127.0.0.1:8000/health`: OK
- verificación final en `platform_control`:
  - `condominio-demo` activo y sano
  - `ierisltda` ya no existe

### Bloqueos

- no queda bloqueo técnico en este frente

### Siguiente paso

- volver al roadmap principal y elegir el siguiente frente explícito

---

## 2026-04-08 — Alineación final de documentación y handoff del frente `Nuevo tenant`

### Objetivo

- dejar el repo completamente coherente con el cierre real del frente `Nuevo tenant`
- fijar por documentación que `staging` ya no está “por decidir”, sino que opera por defecto como espejo instalado

### Cambios principales

- `platform-core/ROADMAP.md` ya refleja explícitamente el smoke y despliegue real del frente `Nuevo tenant`
- `platform-core/DEV_GUIDE.md` incorpora el smoke `platform-admin-tenants-create-form`
- `frontend/e2e/README.md` y `frontend-e2e-browser.md` incluyen ese smoke en listas y cobertura validada
- `PAQUETE_RELEASE_OPERADOR.md` deja explícitos los invariantes del `.env` productivo real
- `ESTADO_ACTUAL.md`, `SIGUIENTE_PASO.md`, `SESION_ACTIVA.md` y `HANDOFF_STATE.json` quedan alineados al hecho de que este slice ya está cerrado

### Validaciones

- revisión cruzada de roadmap, handoff y runbooks: OK
- `HANDOFF_STATE.json` válido: esperado en esta iteración

### Bloqueos

- no hay bloqueo técnico
- no hay bloqueo editorial pendiente en este frente

### Siguiente paso

- elegir el siguiente frente explícito del roadmap sin reabrir `Nuevo tenant`

---

## 2026-04-08 — Nuevo tenant con admin explícito + módulos visibles por plan

### Objetivo

- eliminar la dependencia de un admin bootstrap fijo compartido para tenants nuevos
- hacer visible en `platform_admin` que los módulos del tenant se habilitan por `plan`

### Cambios principales

- `platform_control` ahora acepta `admin_full_name`, `admin_email` y `admin_password` al crear tenant
- el control DB guarda bootstrap admin explícito por tenant
- provisioning reutiliza ese admin explícito al sembrar la DB tenant
- se agrega la migración de control `0025_tenant_bootstrap_admin`
- `platform_admin > Tenants` ahora exige admin inicial explícito en `Nuevo tenant`
- el modal de alta ya muestra preview de módulos habilitados por el plan seleccionado
- el bloque de tenant existente se vuelve explícito como `Plan y módulos`
- se actualizan los smokes de `platform_admin` para rellenar admin explícito en el alta

### Validaciones

- `npm run build`: OK
- `npx playwright test --list`: OK (`40 tests`)
- suite backend del slice:
  - `252 tests OK (skipped=1)`
- smoke visible nuevo:
  - `platform-admin-tenants-create-form.smoke.spec.ts`: OK en `staging`
  - `platform-admin-tenants-create-form.smoke.spec.ts`: OK en `production`

### Cierre operativo adicional

- `staging` queda desplegado con migración de control `0025_tenant_bootstrap_admin`
- `production` queda desplegada con el mismo frente
- durante el deploy productivo se detecta y corrige una desalineación real del host:
  - `/opt/platform_paas/.env` estaba heredando `APP_ENV=development`
  - se corrige a `APP_ENV=production`
  - se corrige `DEBUG=false`
  - se corrige `INSTALL_FLAG_FILE=/opt/platform_paas/.platform_installed`
  - se fijan `TENANT_BOOTSTRAP_DB_PASSWORD_EMPRESA_BOOTSTRAP` y `TENANT_BOOTSTRAP_DB_PASSWORD_CONDOMINIO_DEMO` con valores seguros explícitos para pasar validación runtime

### Bloqueos

- no hay bloqueo técnico en este frente
- ya no queda pendiente de despliegue para este slice

### Siguiente paso

- asumir cerrado este frente
- elegir el siguiente frente explícito del roadmap

---

## 2026-04-08 — Sidebar backend-driven de tenant_portal + realineación de dev

### Objetivo

- cerrar el pendiente central de `tenant_portal` para que el sidebar visible dependa de `effective_enabled_modules`
- validar el cambio en browser y dejar el carril `dev` consistente con esa política

### Cambios principales

- se agrega [module-visibility.ts](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/utils/module-visibility.ts) como matriz única de visibilidad tenant-side para `overview`, `users`, `business-core`, `maintenance` y `finance`
- [TenantSidebarNav.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/layout/TenantSidebarNav.tsx) deja de hardcodear el menú y ahora filtra por `tenantInfo.effective_enabled_modules`
- [auth.ts](/home/felipe/platform_paas/frontend/e2e/support/auth.ts) deja de asumir que `Finanzas` siempre está visible después del login tenant
- se agrega [tenant-portal-sidebar-modules.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-sidebar-modules.smoke.spec.ts)
- durante la validación se corrigen desalineamientos reales del carril `dev`:
  - CORS local seguía apuntando a `4173` en `.env`
  - faltaba declarar `TENANT_BILLING_GRACE_*` en `.env`
  - [settings.py](/home/felipe/platform_paas/backend/app/common/config/settings.py) ahora agrega orígenes locales esperados en `development`
- se rota la credencial técnica local de `empresa-bootstrap` para reparar el baseline tenant de `dev`

### Validaciones

- `npm run build`: OK
- `npx playwright test --list`: OK (`39 tests`)
- smoke aislado de sidebar en `dev` limpio:
  - backend temporal `8101` con `.env` cargado
  - frontend temporal `4173` apuntando a `8101`
  - `tenant-portal-sidebar-modules.smoke.spec.ts`: `1 passed`

### Bloqueos

- no queda bloqueo técnico en este frente
- el carril `dev` principal que ya estaba arriba en `8100/5173` venía desalineado; el cambio quedó corregido en código/env, pero la validación formal se hizo sobre un carril limpio aislado para no pisar procesos existentes

### Siguiente paso

- asumir cerrado el frente `tenant sidebar backend-driven`
- elegir el siguiente frente explícito del roadmap
- usar `staging` como carril previo real si el próximo frente vuelve a tocar UI visible

---

## 2026-04-07 — Separación dev/staging/prod en mini PC

### Objetivo

- evitar que desarrollo local pise producción
- montar un carril previo real de `staging/test` en el mismo mini PC

### Cambios principales

- desarrollo local queda normalizado a backend `8100` y frontend `5173`
- se crea el árbol `/opt/platform_paas_staging`
- se crea la unidad `systemd` `platform-paas-backend-staging`
- se agrega el sitio `nginx` local para staging en `8081`
- se endurecen `backend/app/tests/fixtures.py` y `backend/app/scripts/run_backend_tests.py` para que la baseline backend siga siendo determinística aunque el shell cargue `.env.staging`
- se deja documentada la diferencia entre `staging espejo instalado` y `bootstrap inicial`

### Validaciones

- frontend build local: OK
- `Playwright --list`: OK
- baseline backend con `.env.staging` cargado: `510 tests OK`
- `platform-paas-backend-staging` activo en `systemd`: OK
- `GET http://127.0.0.1:8200/health`: OK
- `GET http://127.0.0.1:8081/health`: OK

### Bloqueos

- no hay bloqueo técnico en este frente
- el siguiente uso del staging debe dejar explícito si corre como `espejo` o como `bootstrap reset`

### Siguiente paso

- usar el wrapper de `bootstrap reset` cuando se necesite validar el instalador
- después abrir el siguiente frente funcional o transversal explícito

## 2026-04-07 — Staging bootstrap reset automatizado

### Objetivo

- dejar una forma segura y repetible de volver `staging` al modo instalador inicial

### Cambios principales

- se agrega `deploy/reset_staging_bootstrap.sh`
- se agrega `docs/deploy/staging-bootstrap-reset.md`
- `staging-single-host.md` reconoce formalmente los modos `espejo instalado` y `bootstrap reset`
- se agrega smoke browser opt-in `platform-admin-installer-availability.smoke.spec.ts`

### Validaciones

- `bash -n deploy/reset_staging_bootstrap.sh`: esperado para esta iteración
- `Playwright --list` debe incluir el spec del instalador sin romper la baseline normal
- reset real ejecutado sobre `/opt/platform_paas_staging`: OK
- `platform-paas-backend-staging` vuelve arriba en `8200`: OK
- `GET http://127.0.0.1:8200/health` responde `installed=false`: OK
- `GET http://127.0.0.1:8200/install/` responde `Installer available`: OK

### Bloqueos

- no hay bloqueo técnico
- queda solo decidir si `staging` se mantiene temporalmente en bootstrap o si se reinstala como espejo

### Siguiente paso

- tomar la decisión operativa sobre el modo final de `staging`
- luego abrir el siguiente frente del roadmap

## 2026-04-07 — Validación visual del instalador en staging bootstrap

### Objetivo

- confirmar que el reset controlado de `staging` no solo deja el backend en `installed=false`, sino que también expone correctamente el flujo visual `/install`

### Cambios principales

- se corrige el enrutado frontend para que `/install` quede protegido por `RequireNotInstalled` y no por `RequireInstalled`
- se agrega `RequireNotInstalled.tsx` como guard explícito del instalador
- se usa el smoke opt-in `platform-admin-installer-availability.smoke.spec.ts` contra `http://192.168.7.42:8081`

### Validaciones

- `GET http://127.0.0.1:8200/health` responde `installed=false`: OK
- `GET http://127.0.0.1:8200/install/` responde `Installer available`: OK
- `E2E_BASE_URL=http://192.168.7.42:8081 E2E_EXPECT_INSTALLER=1 E2E_USE_EXISTING_FRONTEND=1 npx playwright test e2e/specs/platform-admin-installer-availability.smoke.spec.ts`: `1 passed`

### Bloqueos

- no hay bloqueo técnico
- queda solo decidir en qué modo debe quedar `staging` antes del próximo frente real

### Siguiente paso

- decidir si `staging` vuelve a espejo o si se mantiene en bootstrap por más validaciones del instalador

## 2026-04-08 — Restauración de staging a espejo instalado

### Objetivo

- cerrar el ciclo completo del mini PC dejando `staging` nuevamente utilizable para regresion normal despues de validar el instalador

### Cambios principales

- se agrega `deploy/restore_staging_mirror.sh`
- se agrega `docs/deploy/staging-restore-mirror.md`
- el wrapper recrea el role y la DB `platform_control_staging` si faltan
- el wrapper corre migraciones de control, siembra `seed_frontend_demo_baseline.py`, recrea `.platform_installed` y levanta otra vez `platform-paas-backend-staging`

### Validaciones

- `bash -n deploy/restore_staging_mirror.sh`: OK
- restauracion real ejecutada sobre `/opt/platform_paas_staging`: OK
- `GET http://127.0.0.1:8200/health` responde `installed=true`: OK
- `http://192.168.7.42:8081/login` vuelve al flujo normal de `platform_admin`: OK

### Bloqueos

- no hay bloqueo tecnico
- no hay bloqueo de entorno

### Siguiente paso

- abrir el siguiente frente real del roadmap ahora que `production` y `staging` ya quedaron estables

## 2026-04-07 — Bootstrap productivo real en mini PC

### Objetivo

- ejecutar la primera salida productiva técnica real sobre el mini PC Debian usando `/opt/platform_paas`

### Cambios principales

- se crea `/opt/platform_paas` como árbol productivo separado del workspace de desarrollo
- se crea el usuario de servicio `platform`
- se instala la unidad `systemd` `platform-paas-backend`
- se corrige `deploy/deploy_backend.sh` para exportar `PYTHONPATH` en migraciones y pruebas
- se agrega `httpx` a `backend/requirements/base.txt` para que el deploy pueda ejecutar la baseline real que exige
- se endurece `deploy/validate_backend_env.sh` para bloquear `TENANT_BOOTSTRAP_DB_PASSWORD_*` inseguros antes del restart
- se agrega `infra/nginx/platform-paas-single-host.conf` y se publica frontend + backend por rutas bajo `orkestia.ddns.net`
- se rotan en producción las bootstrap passwords inseguras de tenants demo para permitir arranque en `APP_ENV=production`

### Validaciones

- preflight backend en `/opt/platform_paas`: OK
- deploy backend productivo: OK
- baseline backend productiva: `510 tests OK`
- `platform-paas-backend` en `systemd`: OK
- `GET http://127.0.0.1:8000/health`: OK
- build frontend en `/opt/platform_paas`: OK
- frontend static preflight en `/opt/platform_paas`: OK
- `GET http://orkestia.ddns.net/health` validado por resolución local: OK

### Bloqueos

- falta validación externa real desde navegador sobre `orkestia.ddns.net`
- la salida actual sigue en HTTP single-host; TLS queda como endurecimiento inmediato recomendado

### Siguiente paso

- validar externamente `orkestia.ddns.net`
- emitir TLS o decidir si luego se separará `app/api`
- cerrar evidencia post-producción y actualizar el estado final

## 2026-04-07 — Activación HTTPS en orkestia.ddns.net

### Objetivo

- cerrar el endurecimiento TLS sobre el mismo mini PC sin cambiar la topología single-host ya operativa

### Cambios principales

- se emite certificado Let's Encrypt para `orkestia.ddns.net` con `certbot`
- se agrega `infra/nginx/platform-paas-single-host-ssl.conf`
- se reconstruye el frontend con `VITE_API_BASE_URL=https://orkestia.ddns.net`
- `nginx` queda redirigiendo `http -> https` y sirviendo SPA + backend sobre HTTPS

### Validaciones

- `GET https://orkestia.ddns.net/health` validado localmente por resolución forzada: OK
- `GET http://orkestia.ddns.net/` redirige a `https://orkestia.ddns.net/`: OK
- `certbot.timer` ya estaba activo y queda cubriendo renovación automática

### Bloqueos

- falta el smoke corto final desde navegador real sobre HTTPS

### Siguiente paso

- ejecutar smoke corto de terreno y cerrar evidencia post-producción

## 2026-04-07 — Cierre post-cutover validado

### Objetivo

- cerrar la salida inicial real en el mini PC y sacar al proyecto del estado "deploy pendiente"

### Cambios principales

- el operador confirma acceso real a `orkestia.ddns.net` desde navegador
- se ejecuta smoke remoto completo contra `https://orkestia.ddns.net`
- se reasienta el estado del repo para dejar `platform-core` como bloque central ya validado en producción inicial

### Validaciones

- smoke remoto `all` sobre `https://orkestia.ddns.net`: `7/7` checks OK
- `platform_admin` login: OK
- `tenant_portal` login baseline `empresa-bootstrap`: OK
- evidencia JSON guardada en `/opt/platform_paas/operational_evidence/remote_backend_smoke_20260407_final.json`

### Bloqueos

- no queda bloqueo operativo de cutover
- queda pendiente solo decidir el siguiente frente real del roadmap

### Siguiente paso

- salir del frente central de deploy
- elegir el siguiente bloque explícito de estabilización o desarrollo

## 2026-04-07 — Endurecimiento del prompt maestro de continuidad

### Objetivo

- dejar un prompt root suficientemente fuerte para que cualquier IA retome el proyecto sin depender del chat previo

### Cambios principales

- se reescribió `PROMPT_MAESTRO_MODULO.md` con:
  - orden de lectura obligatorio
  - reglas de precedencia entre fuentes
  - fase inicial de diagnóstico
  - formato mínimo de respuesta
  - obligación de actualizar handoff y estado
- se agrega `SESION_ACTIVA.md` como puntero corto para alternar entre cuentas o sesiones sin releer todo el estado vivo
- se reforzó `ESTADO_ACTUAL.md` para dejar explícito ese protocolo como decisión cerrada

### Validaciones

- revisión manual de consistencia contra:
  - `PROJECT_CONTEXT.md`
  - `REGLAS_IMPLEMENTACION.md`
  - `ESTADO_ACTUAL.md`
  - `SIGUIENTE_PASO.md`
  - `HANDOFF_STATE.json`
  - documentación canónica de arquitectura y E2E

### Bloqueos

- no cambia el bloqueo principal del proyecto: sigue faltando host productivo real confirmado en este workspace

### Siguiente paso

- sigue vigente la misma decisión raíz:
  - confirmar si ya existe host productivo real
  - si existe, ir a preflight y cutover
  - si no existe, preparar release packet o retomar backlog residual explícito

## 2026-04-07 — Handoff entre IAs y preparación de producción

### Objetivo

- dejar memoria operativa del proyecto dentro del repo
- cerrar preparación documental y operativa para salida a producción

### Cambios principales

- se crearon archivos raíz de continuidad:
  - `PROJECT_CONTEXT.md`
  - `REGLAS_IMPLEMENTACION.md`
  - `PROMPT_MAESTRO_MODULO.md`
  - `ESTADO_ACTUAL.md`
  - `SIGUIENTE_PASO.md`
- se enlazaron esos archivos desde `README.md`, `docs/index.md` y la gobernanza
- se creó y documentó el flujo de preflight backend y frontend
- se creó y documentó el cutover productivo recomendado
- se dejó explícito que el remanente editorial de frontend pasa a backlog no bloqueante

### Validaciones

- baseline backend: OK
- build frontend: OK
- preflight frontend local: OK
- preflight backend local: útil, pero bloqueado por entorno local no productivo

### Bloqueos

- no existe host productivo confirmado en este workspace
- no existe unidad `platform-paas-backend` en este host
- el `.env` local no representa producción real

### Siguiente paso

- decidir si ya existe host productivo real
- si existe, ejecutar preflight y cutover
- si no existe, preparar release packet o volver al backlog residual explícito

## 2026-04-09 — Cierre de portabilidad tenant CSV y validación en staging/production

### Objetivo

- cerrar la Fase 2 mínima de `tenant data portability CSV`
- validarla en browser sobre `staging` y `production`
- dejar el repo y el handoff alineados para abrir el siguiente frente

### Cambios principales

- se amplía [platform-admin-tenant-data-export.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-data-export.smoke.spec.ts) para cubrir `export + dry_run + apply`
- se corrige [tenant_data_portability_service.py](/home/felipe/platform_paas/backend/app/apps/platform_control/services/tenant_data_portability_service.py) para convertir valores CSV según el tipo real de la columna destino
- se endurece [deploy_backend.sh](/home/felipe/platform_paas/deploy/deploy_backend.sh) para crear y dejar escribible `TENANT_DATA_EXPORT_ARTIFACTS_DIR`
- se corrige [settings.py](/home/felipe/platform_paas/backend/app/common/config/settings.py) para no arrastrar passwords bootstrap demo inseguras como defaults embebidos en `production`
- se redeploya backend en `staging` y `production`
- se reconstruye el frontend productivo para publicar la UI nueva de `Portabilidad tenant`

### Validaciones

- backend slice local: `214 tests OK`
- frontend build local: OK
- smoke browser `platform-admin-tenant-data-export` en `staging`: OK
- smoke browser `platform-admin-tenant-data-export` en `production`: OK

### Bloqueos

- no queda bloqueo técnico en el frente de portabilidad tenant base

### Siguiente paso

- abrir el siguiente frente explícito del roadmap central:
  - `platform-core hardening + E2E`
  - con foco en `Provisioning`, DLQ y acceso tenant más profundo desde `Tenants`

---

## 2026-04-06 — Cierre transversal frontend en módulos nuevos

### Objetivo

- seguir cerrando i18n/capa transversal y `design system` sobre módulos nuevos

### Cambios principales

- se extendió `pickLocalizedText()` y la convención visual a varias pantallas de `business-core` y `maintenance`
- se reforzó `AppSpotlight` y la capa compartida en páginas densas y componentes reutilizables
- se actualizó documentación de roadmap y changelog para reflejar el estado real

### Validaciones

- builds frontend repetidos: OK
- revisión de errores en archivos tocados: OK

### Bloqueos

- quedaron remanentes editoriales en páginas densas
- se decidió no tratarlos como bloqueantes para salida a terreno

### Siguiente paso

- congelar backlog residual como no bloqueante y pivotar a producción
