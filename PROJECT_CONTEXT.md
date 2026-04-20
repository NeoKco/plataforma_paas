# PROJECT_CONTEXT

## Propósito de este archivo

Este archivo existe para que una IA o developer nuevo pueda entender rápido qué es `platform_paas`, cómo está organizado y cuál es el foco real del proyecto sin depender del chat previo.

La idea central es esta:

- la memoria operativa del proyecto debe vivir en el repositorio
- el chat solo sirve como apoyo momentáneo
- cualquier handoff entre cuentas, personas o IAs debe poder reconstruirse desde archivos

## Cómo usar este archivo

Este archivo no debería cambiar por cada tarea pequeña.

Debe actualizarse cuando cambie alguno de estos puntos:

- la prioridad real del proyecto
- la arquitectura base
- la estrategia de despliegue
- la frontera entre módulos
- la forma oficial de retomar el proyecto

Si el cambio es solo de estado puntual de una iteración, ese cambio pertenece más a:

- `ESTADO_ACTUAL.md`
- `SIGUIENTE_PASO.md`

## Orden de lectura recomendado para retomar en 5 minutos

Si una IA llega sin contexto, este es el orden recomendado:

1. `PROJECT_CONTEXT.md`
2. `SESION_ACTIVA.md`
3. `PROMPT_MAESTRO_MODULO.md`
4. `REGLAS_IMPLEMENTACION.md`
5. `CHECKLIST_CIERRE_ITERACION.md`
6. `ESTADO_ACTUAL.md`
7. `SIGUIENTE_PASO.md`
8. documentación canónica del módulo o frente activo

Con eso debería poder responder rápidamente:

- qué es el proyecto
- qué reglas mandan
- en qué estado exacto quedó
- qué debe hacer ahora

## Qué es este proyecto

`platform_paas` es un PaaS multi-tenant con dos caras principales:

- `platform_admin`: consola central para instalación, tenants, billing, provisioning, usuarios de plataforma y operación
- `tenant_portal`: portal por tenant para módulos de negocio

## Stack principal

### Backend

- FastAPI
- SQLAlchemy
- PostgreSQL
- migraciones y scripts Python
- `systemd` + `nginx` para despliegue inicial recomendado

### Frontend

- React
- TypeScript
- Vite
- Playwright para E2E browser

### Operación

- deploy scripts en `deploy/`
- plantillas de entorno en `infra/env/`
- plantillas `systemd` en `infra/systemd/`
- plantillas `nginx` en `infra/nginx/`

## Estructura funcional importante

- `backend/app/apps/platform_control/`: control central de plataforma
- `backend/app/apps/tenant_modules/core/`: core tenant
- `backend/app/apps/tenant_modules/finance/`: módulo tenant piloto
- `backend/app/apps/tenant_modules/business_core/`: dominio transversal tenant
- `backend/app/apps/tenant_modules/maintenance/`: módulo de mantenciones
- `frontend/src/apps/platform_admin/`: app de administración de plataforma
- `frontend/src/apps/tenant_portal/`: portal tenant
- `docs/modules/`: documentación canónica por módulo
- `docs/deploy/`: despliegue, preflight, cutover y aceptación

## Estado de producto resumido

Hoy el proyecto ya tiene una base operable real:

- instalación web de plataforma
- login y operación `platform_admin`
- tenants, provisioning, billing y actividad
- `tenant_portal` con auth y shell base
- `finance` como módulo piloto cerrado en su alcance actual
- `business-core` operativo
- `maintenance` operativo en su primer corte funcional

## Prioridad actual real

La prioridad no es abrir un módulo nuevo desde cero.

La prioridad actual es:

1. conservar estable la salida productiva ya publicada
2. usar `staging/test` como carril previo real sin mezclarlo con `production`
3. abrir nuevos frentes funcionales solo con estado, roadmap y handoff explícitos
4. dejar backlog explícito para lo residual en vez de mezclarlo con el frente activo

Además, ya no basta con tener reglas sueltas de continuidad.

El proyecto ya asume como estándar transversal:

- gobernanza de datos para toda la PaaS
- `SRED` como criterio de cierre
- ownership explícito por dominio
- spec mínima por slice relevante

Eso aplica tanto a módulos de negocio como a frentes técnicos, deploy, convergencia y operación multi-tenant.

## Estrategia vigente de continuidad entre IAs

La continuidad entre sesiones debe apoyarse en dos capas:

### Capa 1. Contexto estable

Vive en:

- `PROJECT_CONTEXT.md`
- `REGLAS_IMPLEMENTACION.md`
- documentación canónica en `docs/`

### Capa 2. Estado vivo de la iteración

Vive en:

- `SESION_ACTIVA.md`
- `ESTADO_ACTUAL.md`
- `SIGUIENTE_PASO.md`

La primera capa explica el proyecto.

La segunda capa explica en qué punto exacto quedó el trabajo.

Matiz operativo:

- `SESION_ACTIVA.md` sirve como puntero corto para retomar en segundos
- `ESTADO_ACTUAL.md` y `SIGUIENTE_PASO.md` siguen siendo la fuente descriptiva principal del estado vivo
- `PLANTILLA_ACTUALIZACION_ESTADO.md` define el formato oficial con que deben reescribirse esos archivos cuando el estado cambie

Regla operativa asociada:

- en cada iteración importante deben revisarse y actualizarse estos archivos si el estado real cambió
- esa actualización no debe hacerse con estructura libre; debe seguir la plantilla oficial del root

## Módulos clave hoy

### `finance`

- módulo piloto
- referencia del `design system`
- referencia de slice tenant maduro

### `business-core`

- dominio transversal compartido
- dueño de organizaciones, clientes, contactos, sitios, activos, grupos y taxonomías
- base para `maintenance` y futuros módulos

### `maintenance`

- módulo ya funcional en primer corte
- depende de `business-core`
- incluye OT, historial, instalaciones, pendientes, costos, checklist, visitas y reportes base

## Decisión arquitectónica crítica

`maintenance` no debe adueñarse de clientes, empresas, sitios, grupos, perfiles ni taxonomías compartidas.

Eso pertenece a `business-core`.

## Convención documental del proyecto

Todo módulo serio debe tener al menos:

- `README.md`
- `USER_GUIDE.md`
- `DEV_GUIDE.md`
- `ROADMAP.md`
- `CHANGELOG.md`

y cuando aplique:

- `API_REFERENCE.md`
- backlog de mejoras
- smoke E2E asociado

## Documentos canónicos a leer primero

### Visión general

- `README.md`
- `docs/index.md`
- `docs/architecture/development-roadmap.md`
- `docs/architecture/frontend-roadmap.md`

### Gobernanza

- `docs/architecture/implementation-governance.md`
- `docs/architecture/data-governance.md`
- `docs/architecture/data-ownership-matrix.md`
- `docs/architecture/sred-development.md`
- `docs/architecture/slice-spec-template.md`
- `docs/architecture/adr/README.md`
- `docs/architecture/api-contract-standard.md`
- `docs/architecture/schema-and-migration-policy.md`
- `docs/architecture/environment-policy.md`
- `docs/architecture/e2e-test-data-policy.md`
- `docs/architecture/module-build-standard.md`

Eso significa que la continuidad mínima del proyecto ya no depende solo de reglas generales.

También depende de:

- ADRs para decisiones arquitectónicas cerradas
- estándar de contratos API para cambios entre frontend/backend y módulos
- política de schema/migraciones para cualquier cambio estructural
- política de entornos para distinguir `dev`, `staging` y `production`
- política E2E y datos de prueba para no ensuciar tenants ni producción
- `docs/modules/index.md`

### Estado modular

- `docs/modules/business-core/README.md`
- `docs/modules/maintenance/README.md`
- `docs/modules/improvements/README.md`

### Producción

- `docs/deploy/backend-production-preflight.md`
- `docs/deploy/frontend-static-nginx.md`
- `docs/deploy/production-cutover-checklist.md`
- `docs/deploy/backend-release-and-rollback.md`

## Árbol corto de decisión para otra IA

Si la tarea nueva es sobre:

### Producción

Leer primero:

- `ESTADO_ACTUAL.md`
- `SIGUIENTE_PASO.md`
- `docs/deploy/backend-production-preflight.md`
- `docs/deploy/production-cutover-checklist.md`

### Frontend transversal

Leer primero:

- `docs/architecture/frontend-roadmap.md`
- `docs/modules/improvements/README.md`
- documentación del módulo afectado

### Módulo específico

Leer primero:

- `docs/modules/<modulo>/README.md`
- `ROADMAP.md`
- `CHANGELOG.md`
- `ESTADO_ACTUAL.md`

## Filosofía de handoff para otra IA

Si otra IA retoma el proyecto, no debería depender del contexto conversacional.

Debe poder responder estas preguntas solo leyendo el repo:

- qué se estaba construyendo
- qué quedó listo
- qué decisiones ya no deben reabrirse
- qué falta realmente
- cómo se valida
- cómo se despliega

Si esa información no está en archivos, el handoff está incompleto.

## Regla práctica final

Si una IA termina una iteración y la siguiente no puede continuar solo leyendo estos archivos y la documentación canónica, entonces el cierre quedó incompleto.
