# ESTADO_ACTUAL

## Última actualización

- fecha: 2026-04-08
- foco de iteración: implementación de la Fase 1 de `tenant data portability CSV`
- estado general: producción validada con HTTPS, desarrollo desacoplado por puertos, staging/test separado, staging restaurado a espejo, sidebar tenant ya filtrando por `effective_enabled_modules`, alta de tenant ya operativa con admin inicial explícito, `provisioning` productivo re-alineado y Fase 1 de export portable tenant ya implementada

## Resumen ejecutivo en 30 segundos

- `finance` quedó como módulo piloto cerrado
- `business-core` y `maintenance` quedaron como foco transversal reciente
- el remanente editorial de frontend quedó explícitamente como backlog no bloqueante
- ya existen preflight backend/frontend y documentación de cutover
- ya existe host productivo real sobre mini PC Debian
- `/opt/platform_paas` quedó creado como árbol productivo separado
- `/opt/platform_paas_staging` quedó creado como árbol staging separado
- backend y frontend quedaron levantados en `https://orkestia.ddns.net` bajo topología single-host
- el smoke remoto completo contra la URL pública ya pasó con `7/7` checks OK
- desarrollo local ya no pisa producción: backend `8100`, frontend `5173`
- staging/test ya quedó operativo: backend `8200`, frontend `8081`
- el staging ya puede volver al modo instalador inicial mediante un wrapper seguro del repo
- el staging ya fue reseteado realmente y el flujo visual `/install` quedó validado sobre el mini PC
- el staging ya fue restaurado otra vez a espejo instalado y hoy responde con `installed=true`
- el sidebar principal del `tenant_portal` ya quedó backend-driven según `/tenant/info.effective_enabled_modules`
- el carril `dev` ya quedó alineado para reproducir ese gating: CORS local corregido a `5173` y política `TENANT_BILLING_GRACE_*` declarada en `.env`
- el alta de `Nuevo tenant` ya quedó corregida en código para exigir `admin_full_name`, `admin_email` y `admin_password`
- el alta de `Nuevo tenant` ya no depende de un bootstrap fijo compartido tipo `admin@<slug>.local / TenantAdmin123!`
- `platform_admin` ya expone un `plan_catalog` visible para mostrar qué módulos habilita cada plan en el alta y en el bloque `Plan y módulos`
- el smoke browser específico `platform-admin-tenants-create-form` ya quedó aprobado en `staging` y `production`
- el `.env` productivo quedó realineado a `APP_ENV=production`, `DEBUG=false`, `INSTALL_FLAG_FILE=/opt/platform_paas/.platform_installed` y variables bootstrap seguras explícitas para los tenants demo heredados
- la documentación canónica ya deja fijado que `staging` opera por defecto como espejo instalado, no como bootstrap permanente
- `provisioning` y `retiro técnico` ya no dependen de escribir `/opt/platform_paas/.env`; el runtime usa `TENANT_SECRETS_FILE`
- `condominio-demo` ya quedó re-alineado con credencial técnica válida y su `sync_tenant_schema` volvió a `completed`
- `ierisltda` ya terminó retiro técnico y fue eliminado de `platform_control`, quedando libre para recreación limpia con nuevo correo/password
- el frente `tenant data portability CSV` ya dejó de ser solo diseño: la Fase 1 de export portable mínimo ya quedó implementada en `platform_control`
- `platform_admin > Tenants` ya permite generar y descargar `zip + manifest + csv` por tenant cuando la DB tenant está operativa
- el siguiente paso de ese frente ya pasó a ser Fase 2: import controlado con `dry_run`

## Frente activo real al momento de este estado

El frente activo real que ahora queda abierto es este:

- consolidar la Fase 1 de export portable por tenant en `CSV + manifest`
- mantenerla separada del backup técnico PostgreSQL ya existente
- abrir después la Fase 2 de import controlado dentro de `platform-core`

## Qué módulo se estaba construyendo

En esta etapa no se estaba abriendo un módulo completamente nuevo desde cero.

Lo que se estaba haciendo era esto:

1. cerrar la salida real de `platform-core`
2. estabilizar `Nuevo tenant` y `provisioning`
3. implementar el siguiente frente central ya elegido

En otras palabras:

- `finance` ya quedó como módulo piloto cerrado
- `business-core` y `maintenance` quedaron como foco de alineación transversal
- luego el foco cambió a deploy, preflight y cutover productivo
- ahora el foco pasa a portabilidad de datos tenant en `CSV + manifest`

## Qué ya quedó hecho

### A nivel funcional general

- `platform_admin` ya es operable
- `tenant_portal` ya es operable en su base
- `finance` ya está cerrado en su alcance actual
- `business-core` ya está operativo en backend y frontend
- `maintenance` ya está operativo en su primer corte funcional
- `tenant_portal` ya refleja visualmente los módulos efectivos calculados por backend en su sidebar principal
- `platform_admin` ya tiene en código el alta de tenant con admin inicial explícito y preview de módulos por plan
- `platform_admin` ya tiene ese mismo flujo visible y validado en `staging` y `production`

### A nivel transversal frontend

Ya quedó incorporado o reforzado:

- helper `pickLocalizedText()`
- uso del `design system` transversal en superficies importantes
- alineación de navegación, placeholders, catálogos, paneles, modales y varias páginas densas
- `AppSpotlight` en entradas principales de módulos nuevos

### A nivel documentación

Ya quedó actualizado que el remanente de i18n/capa transversal no bloquea salida a terreno y pasa a backlog.

Se actualizaron documentos de:

- roadmap frontend
- changelog de `business-core`
- changelog de `maintenance`
- backlog transversal por módulos
- checklist de release funcional
- checklist de aceptación operativa
- guía de desarrollo y roadmap de `platform-core` para reflejar el alta explícita del admin tenant y la visibilidad plan-driven de módulos
- modelo canónico nuevo de portabilidad tenant en CSV dentro de `platform-core`
- migración de control `0026_tenant_data_transfer_jobs` con jobs y artifacts de export portable
- servicio backend `tenant_data_portability_service` para generar paquete `zip + manifest + csv`
- bloque visible `Portabilidad tenant` dentro de `platform_admin > Tenants`
- smoke browser nuevo `platform-admin-tenant-data-export`

### A nivel producción / deploy

Ya quedaron creados, documentados y usados realmente:

- preflight backend
- preflight frontend estático
- build frontend productivo
- loader robusto para `.env`
- guía de frontend estático con `nginx`
- guía de preflight backend
- checklist de cutover a producción
- árbol productivo `/opt/platform_paas`
- árbol staging `/opt/platform_paas_staging`
- unidad `systemd` `platform-paas-backend`
- unidad `systemd` `platform-paas-backend-staging`
- publicación SPA + backend por rutas en `orkestia.ddns.net`
- publicación staging local por `nginx` en `http://192.168.7.42:8081`
- certificado Let's Encrypt activo para `orkestia.ddns.net`
- evidencia operativa post-deploy en `/opt/platform_paas/operational_evidence/`
- smoke remoto backend aprobado sobre `https://orkestia.ddns.net`
- baseline backend estable bajo `.env.staging` con `510 tests OK`
- wrapper formal `deploy/reset_staging_bootstrap.sh` para devolver staging al modo bootstrap sin tocar `production`
- wrapper formal `deploy/restore_staging_mirror.sh` para devolver staging desde bootstrap a espejo instalado
- smoke browser opt-in del instalador para validar `/install` en staging bootstrap
- validación real del reset bootstrap con `platform-paas-backend-staging` activo y `/install/` disponible en backend
- validación browser real de `/install` en `http://192.168.7.42:8081/install` con Playwright opt-in aprobado
- restauración real de `staging` a espejo instalado con baseline frontend y `health` en `installed=true`
- smoke browser nuevo de sidebar tenant validado en carril `dev` aislado sobre `4173 -> 8101`
- alineación local real de `dev` para browser tenant:
  - CORS ya no queda atrasado en `4173` cuando la convención vigente es `5173`
  - el baseline `.env` ya declara `TENANT_BILLING_GRACE_*` para reproducir `effective_enabled_modules=core,users` durante `billing grace`
- migración de control `0025_tenant_bootstrap_admin` ya aplicada en `staging`
- flujo `Nuevo tenant` validado en `staging` con smoke browser dedicado
- flujo `Nuevo tenant` validado en `production` con smoke browser dedicado
- `.env` productivo corregido en host real para arrancar verdaderamente como `production`

### A nivel handoff entre IAs

Ya quedaron creados y enlazados desde el repo:

- `PROJECT_CONTEXT.md`
- `SESION_ACTIVA.md`
- `REGLAS_IMPLEMENTACION.md`
- `PROMPT_MAESTRO_MODULO.md`
- `ESTADO_ACTUAL.md`
- `SIGUIENTE_PASO.md`

Además, el `PROMPT_MAESTRO_MODULO.md` ya quedó endurecido para obligar:

- precedencia explícita entre fuentes root, arquitectura y módulos
- fase inicial de diagnóstico antes de ejecutar
- formato de respuesta homogéneo entre IAs
- actualización obligatoria de estado e handoff si la iteración cambia el estado real
- lectura inicial rápida desde `SESION_ACTIVA.md` para alternar entre cuentas sin perder el hilo

Además, `README.md`, `docs/index.md` y la gobernanza ya apuntan a ellos como memoria viva del proyecto.

## Qué archivos se tocaron

### Archivos raíz de continuidad creados recientemente

- `PROJECT_CONTEXT.md`
- `SESION_ACTIVA.md`
- `REGLAS_IMPLEMENTACION.md`
- `PROMPT_MAESTRO_MODULO.md`
- `ESTADO_ACTUAL.md`
- `SIGUIENTE_PASO.md`
- `HANDOFF_STATE.json`
- `HISTORIAL_ITERACIONES.md`

### Frontend / transversal ya tocado en iteraciones recientes

Entre los archivos frontend más relevantes ya intervenidos están:

- `frontend/src/store/language-context.tsx`
- `frontend/src/apps/tenant_portal/modules/business_core/components/common/BusinessCoreModuleNav.tsx`
- `frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceModuleNav.tsx`
- `frontend/src/apps/tenant_portal/modules/business_core/components/common/BusinessCoreCatalogPage.tsx`
- `frontend/src/apps/tenant_portal/modules/maintenance/components/common/MaintenanceCatalogPage.tsx`
- `frontend/src/apps/tenant_portal/modules/business_core/pages/BusinessCoreOverviewPage.tsx`
- `frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceOverviewPage.tsx`
- `frontend/src/apps/tenant_portal/modules/business_core/pages/BusinessCoreTaxonomyPage.tsx`
- `frontend/src/apps/tenant_portal/modules/business_core/pages/BusinessCoreClientDetailPage.tsx`
- `frontend/src/apps/tenant_portal/modules/business_core/pages/BusinessCoreClientsPage.tsx`
- `frontend/src/apps/tenant_portal/modules/business_core/pages/BusinessCoreWorkGroupsPage.tsx`
- `frontend/src/apps/tenant_portal/modules/business_core/pages/BusinessCoreWorkGroupMembersPage.tsx`
- `frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceHistoryPage.tsx`
- `frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceCostTemplatesPage.tsx`
- `frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceInstallationsPage.tsx`
- `frontend/src/apps/tenant_portal/modules/maintenance/pages/MaintenanceWorkOrdersPage.tsx`

### Documentación tocada recientemente

- `README.md`
- `docs/architecture/frontend-roadmap.md`
- `docs/modules/business-core/CHANGELOG.md`
- `docs/modules/maintenance/CHANGELOG.md`
- `docs/modules/improvements/README.md`
- `docs/architecture/implementation-governance.md`
- `docs/deploy/functional-release-checklist.md`
- `docs/deploy/operational-acceptance-checklist.md`
- `docs/deploy/backend-debian.md`
- `docs/deploy/backend-release-and-rollback.md`
- `docs/deploy/index.md`
- `docs/index.md`
- `docs/deploy/backend-production-preflight.md`
- `docs/deploy/frontend-static-nginx.md`
- `docs/deploy/production-cutover-checklist.md`

### Scripts y plantillas tocados recientemente

- `.env`
- `deploy/validate_backend_env.sh`
- `deploy/deploy_backend.sh`
- `deploy/load_dotenv.sh`
- `deploy/check_backend_release_readiness.sh`
- `deploy/build_frontend.sh`
- `deploy/check_frontend_static_readiness.sh`
- `infra/env/backend.development.example.env`
- `infra/env/backend.staging.example.env`
- `infra/env/backend.production.example.env`
- `infra/nginx/platform-paas-frontend.conf`
- `infra/nginx/platform-paas-frontend-ssl.conf`
- `infra/nginx/platform-paas-single-host.conf`
- `infra/nginx/platform-paas-single-host-ssl.conf`

## Qué decisiones quedaron cerradas

1. `finance` sigue siendo el módulo piloto y referencia de slice tenant
2. `business-core` es el dueño del dominio transversal tenant
3. `maintenance` depende de `business-core`; no debe duplicarlo
4. el remanente editorial de i18n / `design system` en `business-core` y `maintenance` queda como backlog no bloqueante
5. la salida a terreno no debe frenarse por copy residual si el flujo principal ya está validado
6. la topología objetivo recomendada sigue siendo backend y frontend separados, pero la primera salida productiva puede operar temporalmente como single-host en un mini PC
7. la memoria útil del proyecto debe vivir en archivos del repo, no en el chat
8. toda IA que retome debe partir con diagnóstico explícito antes de proponer o ejecutar cambios
9. `SESION_ACTIVA.md` queda como puntero corto oficial para retomar entre cuentas o sesiones con cuota limitada

## Qué falta exactamente

### No queda bloqueo operativo de salida

Tampoco queda pendiente el frente central de sidebar tenant:

- el menú principal del `tenant_portal` ya consume `effective_enabled_modules`
- existe smoke browser específico para validarlo
- el siguiente paso ya no es cerrar este frente, sino elegir el siguiente frente explícito del roadmap
- la documentación y el handoff de este slice ya quedaron cerrados; no queda deuda editorial específica del frente `Nuevo tenant`

La salida inicial ya quedó validada para operación:

1. `https://orkestia.ddns.net` respondió correctamente desde navegador real
2. el smoke remoto completo pasó sobre la URL pública
3. `staging` ya fue llevado a bootstrap, el instalador quedó validado visualmente y luego volvió a espejo instalado
4. el estado y la evidencia operativa ya quedaron asentados en el repo

### Lo siguiente ya es post-producción y pre-producción controlada

Lo que queda ahora no es este frente de `Nuevo tenant`, sino elegir el siguiente frente real:

- mantener `staging` como espejo operativo para regresión normal
- decidir cuál es el siguiente frente real de producto o hardening transversal
- seguir con backlog explícito, no con pendientes implícitos de deploy

### Evidencia operativa ya disponible

- backend health público: `https://orkestia.ddns.net/health`
- reporte smoke remoto: `/opt/platform_paas/operational_evidence/remote_backend_smoke_20260407_final.json`
- evidencia backend post-deploy previa: `/opt/platform_paas/operational_evidence/backend_operational_evidence_20260407_223208.log`
- health staging backend: `http://127.0.0.1:8200/health`
- health staging frontend/nginx: `http://127.0.0.1:8081/health`
- login staging app: `http://192.168.7.42:8081/login`

Eso significa que el proyecto ya está desplegado en producción y además tiene un carril staging separado en el mismo mini PC.

### Falta residual de frontend, pero no bloqueante

Sigue quedando remanente editorial/transversal en páginas como:

- `BusinessCoreDuplicatesPage.tsx`
- `BusinessCoreOrganizationsPage.tsx`
- `BusinessCoreContactsPage.tsx`
- `BusinessCoreSitesPage.tsx`
- `BusinessCoreAssetsPage.tsx`
- `BusinessCoreAssetTypesPage.tsx`
- `BusinessCoreFunctionProfilesPage.tsx`
- `BusinessCoreTaskTypesPage.tsx`
- `MaintenanceDueItemsPage.tsx`
- partes de `MaintenanceOverviewPage.tsx`
- remanentes de `MaintenanceWorkOrdersPage.tsx`

Eso quedó deliberadamente como backlog no bloqueante.

## Fuentes canónicas por frente

### Si alguien retoma producción

- `docs/deploy/backend-production-preflight.md`
- `docs/deploy/frontend-static-nginx.md`
- `docs/deploy/production-cutover-checklist.md`

### Si alguien retoma frontend transversal

- `docs/architecture/frontend-roadmap.md`
- `docs/modules/improvements/README.md`

### Si alguien retoma `business-core`

- `docs/modules/business-core/README.md`
- `docs/modules/business-core/ROADMAP.md`
- `docs/modules/business-core/CHANGELOG.md`

### Si alguien retoma `maintenance`

- `docs/modules/maintenance/README.md`
- `docs/modules/maintenance/ROADMAP.md`
- `docs/modules/maintenance/CHANGELOG.md`

## Qué no debe tocarse

No tocar sin una razón clara y documentada:

- la frontera `business-core` vs `maintenance`
- la decisión de `finance` como módulo piloto
- auth/middleware base sin necesidad real
- lifecycle crítico de tenants sin tarea explícita
- provisioning crítico sin tarea explícita
- billing crítico sin tarea explícita
- contratos ya estabilizados solo por “limpieza”
- backlog residual mezclándolo como si fuera blocker de producción

Tampoco conviene:

- abrir un módulo nuevo antes de estabilizar producción
- volver a meter memoria del proyecto solo en conversaciones

## Validaciones ya ejecutadas en esta etapa

- baseline backend en verde
- build frontend en verde
- validación del `.env` local de desarrollo en verde
- preflight frontend local en verde
- preflight backend local útil para detectar bloqueos de entorno

## Bloqueos reales detectados

### Bloqueos del workspace actual

- no hay bloqueo productivo activo
- no hay bloqueo técnico activo en `dev`, `staging` o `production`
- la decisión abierta ya no es de entorno sino de roadmap: cuál es el siguiente frente real a abrir

### Tipo de bloqueo

- no es bloqueo de código
- no es bloqueo de entorno
- es solo una decisión de priorización del siguiente frente

## Cómo debe actualizarse este archivo en adelante

La próxima IA debe reescribir este archivo si cambia cualquiera de estos puntos:

- foco principal de trabajo
- estado de deploy real
- backlog restante
- decisiones cerradas
- bloqueos reales

## Condición de obsolescencia de este archivo

Este archivo queda viejo en cuanto ocurra cualquiera de estas cosas:

- se ejecute el primer cutover real a producción
- cambie la prioridad desde producción hacia backlog residual
- se abra un módulo nuevo como prioridad principal
- cambie la frontera entre `business-core` y `maintenance`

## Mi conclusión

Sí, la estrategia tiene sentido.

Pedir que la documentación quede entendible por otra IA es correcto y recomendable.

Lo importante no es solo usar el mismo modelo, sino dejar el contexto y las reglas aterrizadas dentro del proyecto.

La idea correcta para este repo es esta:

- la memoria real del proyecto no debe vivir en el chat
- la memoria real del proyecto debe vivir en archivos del repositorio

Hoy el proyecto ya quedó bastante cerca de ese objetivo, pero estos archivos del root existen justamente para cerrar ese gap y hacer el handoff repetible.

Por lo mismo, en cada iteración importante estos archivos deben revisarse y mantenerse actualizados.
