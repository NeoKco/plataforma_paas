# ESTADO_ACTUAL

## Última actualización

- fecha: 2026-04-07
- foco de iteración: cierre de handoff entre IAs + preparación de salida a producción
- estado general: código y documentación listos; producción real aún depende de host objetivo

## Resumen ejecutivo en 30 segundos

- `finance` quedó como módulo piloto cerrado
- `business-core` y `maintenance` quedaron como foco transversal reciente
- el remanente editorial de frontend quedó explícitamente como backlog no bloqueante
- ya existen preflight backend/frontend y documentación de cutover
- no se ejecutó producción real porque el workspace actual no es el host productivo

## Frente activo real al momento de este estado

El frente activo real ya no es abrir funcionalidad mayor nueva.

Es este:

- consolidar continuidad entre IAs y developers
- mantener backlog residual explícito
- dejar el proyecto listo para salida a producción real en cuanto exista host objetivo

## Qué módulo se estaba construyendo

En esta etapa no se estaba abriendo un módulo completamente nuevo desde cero.

Lo que se estaba haciendo era esto:

1. cerrar la alineación transversal de frontend sobre los módulos nuevos ya abiertos, principalmente:
   - `business-core`
   - `maintenance`
2. dejar explícito qué parte de ese trabajo queda como backlog no bloqueante
3. preparar el proyecto para salida a producción / prueba en terreno

En otras palabras:

- `finance` ya quedó como módulo piloto cerrado
- `business-core` y `maintenance` quedaron como foco de alineación transversal
- luego el foco cambió a deploy, preflight y cutover productivo

## Qué ya quedó hecho

### A nivel funcional general

- `platform_admin` ya es operable
- `tenant_portal` ya es operable en su base
- `finance` ya está cerrado en su alcance actual
- `business-core` ya está operativo en backend y frontend
- `maintenance` ya está operativo en su primer corte funcional

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

### A nivel producción / deploy

Ya quedaron creados y documentados:

- preflight backend
- preflight frontend estático
- build frontend productivo
- loader robusto para `.env`
- guía de frontend estático con `nginx`
- guía de preflight backend
- checklist de cutover a producción

### A nivel handoff entre IAs

Ya quedaron creados y enlazados desde el repo:

- `PROJECT_CONTEXT.md`
- `REGLAS_IMPLEMENTACION.md`
- `PROMPT_MAESTRO_MODULO.md`
- `ESTADO_ACTUAL.md`
- `SIGUIENTE_PASO.md`

Además, `README.md`, `docs/index.md` y la gobernanza ya apuntan a ellos como memoria viva del proyecto.

## Qué archivos se tocaron

### Archivos raíz de continuidad creados recientemente

- `PROJECT_CONTEXT.md`
- `REGLAS_IMPLEMENTACION.md`
- `PROMPT_MAESTRO_MODULO.md`
- `ESTADO_ACTUAL.md`
- `SIGUIENTE_PASO.md`

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

## Qué decisiones quedaron cerradas

1. `finance` sigue siendo el módulo piloto y referencia de slice tenant
2. `business-core` es el dueño del dominio transversal tenant
3. `maintenance` depende de `business-core`; no debe duplicarlo
4. el remanente editorial de i18n / `design system` en `business-core` y `maintenance` queda como backlog no bloqueante
5. la salida a terreno no debe frenarse por copy residual si el flujo principal ya está validado
6. el deploy recomendado para una primera salida productiva es:
   - backend separado
   - frontend estático separado
   - `nginx` delante
7. la memoria útil del proyecto debe vivir en archivos del repo, no en el chat

## Qué falta exactamente

### Falta operativa real

Lo que falta ya no es principalmente código de negocio.

Lo que falta es ejecutar la salida real en un host de producción.

Puntualmente:

1. preparar servidor real en `/opt/platform_paas`
2. crear `.env` productivo final y real
3. instalar unidad `systemd` `platform-paas-backend`
4. configurar `nginx` backend
5. construir frontend con la URL real de API
6. publicar `frontend/dist` con `nginx`
7. correr preflight backend sin fallos
8. correr preflight frontend sin fallos
9. ejecutar cutover productivo
10. ejecutar smoke corto de terreno

### Falta de contexto operativo aún no resuelta

Todavía no existe en este repo información concreta de producción real como:

- dominio backend definitivo
- dominio frontend definitivo
- host productivo definitivo
- ruta exacta del servidor real ya provisionado
- evidencia de un primer cutover ejecutado

Eso significa que el proyecto está listo para salir, pero no puede declararse todavía como “ya desplegado en producción”.

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

- el `.env` local no representa producción real
- el servicio `platform-paas-backend` no existe instalado en este host
- el cutover productivo no puede completarse desde esta máquina

### Tipo de bloqueo

- no es principalmente bloqueo de código
- es bloqueo de entorno y operación real

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
