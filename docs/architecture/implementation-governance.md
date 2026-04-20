# Gobernanza de Implementacion

Este documento fija las reglas transversales para implementar, revisar y cerrar cambios en `platform_paas`.

No reemplaza las guias especificas de backend, frontend o de cada modulo. Las ordena bajo un mismo criterio para que cualquier developer o IA pueda seguir trabajando sin depender de contexto conversacional previo.

Debe leerse junto con:

- [PROJECT_CONTEXT.md](../../PROJECT_CONTEXT.md)
- [SESION_ACTIVA.md](../../SESION_ACTIVA.md)
- [PROMPT_MAESTRO_MODULO.md](../../PROMPT_MAESTRO_MODULO.md)
- [REGLAS_IMPLEMENTACION.md](../../REGLAS_IMPLEMENTACION.md)
- [ESTADO_ACTUAL.md](../../ESTADO_ACTUAL.md)
- [SIGUIENTE_PASO.md](../../SIGUIENTE_PASO.md)
- [HANDOFF_STATE.json](../../HANDOFF_STATE.json)
- [HISTORIAL_ITERACIONES.md](../../HISTORIAL_ITERACIONES.md)
- [CHECKLIST_CIERRE_ITERACION.md](../../CHECKLIST_CIERRE_ITERACION.md)
- [PLANTILLA_ACTUALIZACION_ESTADO.md](../../PLANTILLA_ACTUALIZACION_ESTADO.md)
- [Gobernanza de datos](./data-governance.md)
- [Matriz de ownership de datos](./data-ownership-matrix.md)
- [SRED Driven Development](./sred-development.md)
- [Plantilla oficial de spec por slice](./slice-spec-template.md)
- [Estandar de construccion de modulos](./module-build-standard.md)
- [Convencion modular por slice](./module-slice-convention.md)
- [Estructura raiz del proyecto](./project-structure.md)
- [Convenciones de frontend](./frontend-conventions.md)
- [Reglas backend y guia de cambios](../runbooks/backend-rules-and-change-guidelines.md)
- [E2E Browser Local](../runbooks/frontend-e2e-browser.md)

## Regla Madre

Todo cambio visible o estructural debe cerrar cuatro planos a la vez:

- comportamiento real
- pruebas proporcionales al riesgo
- documentacion viva
- handoff claro para continuidad

Si uno de esos cuatro planos queda fuera, el cambio no se considera bien cerrado.

Ese criterio ahora también puede leerse como `SRED`:

- `Spec`
- `Rules and Review`
- `Evidence`
- `Documentation`

Ver [SRED Driven Development](./sred-development.md).

## Regla de Promoción Completa

Si una mejora se declara correcta para la PaaS, debe tratarse como cambio global y no como experimento local o de tenant aislado.

Eso obliga a cerrar cuatro niveles operativos:

- código del repo
- runtime de `staging/test` si existe
- runtime de `production` cuando corresponda promoción
- convergencia real de los tenants afectados dentro de cada ambiente

Corolarios prácticos:

- un cambio "correcto" en `development` no se considera cerrado por sí solo
- un cambio "correcto" en `empresa-demo` no prueba automáticamente a `ieris-ltda`
- un deploy con `healthcheck` sano no prueba automáticamente convergencia multi-tenant

Por eso el estándar de cierre exige:

- deploy por ambiente
- convergencia post-deploy
- auditoría activa por tenant
- documentación explícita del estado resultante

## Aplicacion transversal a toda la PaaS

La gobernanza de implementacion y `SRED` aplican a toda la PaaS, no solo a modulos nuevos.

Eso incluye:

- `platform-core`
- `business-core`
- `maintenance`
- `finance`
- `agenda`
- seeds, defaults e imports
- portabilidad y recovery
- deploy, staging y production
- E2E y validaciones operativas

Regla derivada:

- ningun frente puede declararse fuera de gobernanza o `SRED` por ser tecnico, transversal o de infraestructura

## Regla de Revalidación sobre slices cerrados

Cuando un usuario reporta un problema sobre un cambio ya declarado correcto:

- el primer paso no es reabrir el slice, sino revalidar que el cierre siga correcto en runtime
- la comunicación debe decirlo explícitamente

Mensajes correctos:

- `Comprobando que lo último realizado corresponde y quedó bien en runtime`
- `Revalidando el cierre anterior para distinguir si el problema es regresión real, caché o despliegue`

Mensajes a evitar en fase diagnóstica:

- `voy a revisar el flujo`
- `voy a investigar`
- `voy a bajar al detalle`

si todavía no existe evidencia de que el cierre previo falló realmente.

Corolario documental:

- los archivos de memoria viva no deben editarse en fase de exploración diagnóstica
- sólo se actualizan cuando el estado real ya quedó confirmado, corregido o descartado

## Antes de Implementar

Antes de escribir codigo, debe quedar claro:

- que problema funcional se resuelve
- en que modulo o dominio vive
- que entidades, reglas y estados toca
- si afecta contratos API o migraciones
- si cambia UX operativa visible
- que pruebas y documentos se deberan actualizar

Además, cualquier slice relevante debe poder describirse con dos piezas mínimas:

- ownership explícito en la [Matriz de ownership de datos](./data-ownership-matrix.md)
- spec mínima siguiendo la [Plantilla oficial de spec por slice](./slice-spec-template.md)

Si el cambio no calza limpio en un modulo existente, primero hay que aclarar la frontera del dominio en `docs/architecture/` o `docs/modules/<modulo>/`.

## Reglas de Implementacion

### 1. Una sola fuente de verdad por regla

- reglas de negocio en `services/`
- reglas transversales/configurables en `common/policies/`
- acceso por request en middleware o dependencies
- acceso a datos en `repositories/`
- forma y contrato HTTP en `schemas/`
- la UI ayuda, pero no reemplaza validacion backend

### 2. Slice completo, no parche aislado

Todo cambio de modulo debe pensarse como slice vertical:

- backend
- frontend
- migraciones si aplica
- pruebas
- documentacion del modulo

### 3. Lectura primero

- catalogo o lectura principal primero
- alta y edicion bajo demanda
- modales o vistas secundarias segun densidad
- no dejar formularios incrustados permanentes salvo razon operativa fuerte y documentada

### 4. Lenguaje operativo

- usar nombres humanos en UI
- ocultar `legacy_*`, `sort_order`, ids tecnicos y referencias internas
- no exponer conceptos de importacion o migracion como si fueran datos de captura normal

### 5. Fechas y zonas horarias

- backend guarda timestamps consistentes y comparables
- frontend no debe poblar `datetime-local` con `toISOString().slice(...)`
- usar helpers de conversion `ISO <-> datetime-local`
- normalizar en backend antes de validar o comparar

### 6. Eliminacion segura y estados

- si una entidad tiene historial operativo o financiero, privilegiar `deactivate/archive` sobre `delete`
- si el borrado es valido, debe tener protecciones backend
- no inventar estados nuevos sin documentar reglas y precedencias

### 7. Contratos y migraciones

- cambios de API requieren revisar estabilidad para frontend
- cambios de esquema requieren migracion versionada
- cambios tenant reales deben considerar sincronizacion de tenants baseline y runbook

## Reglas de Revision

Toda revision de cambio deberia recorrer este checklist.

### Revision funcional

- el flujo real resuelve el problema pedido
- no rompe la lectura principal
- respeta estados, permisos y precedencias
- no reintroduce datos tecnicos visibles

### Revision tecnica

- la regla vive en la capa correcta
- no hay duplicacion evidente entre backend y frontend
- no hay campos legacy usados como contrato nuevo sin justificacion
- si hubo migracion, existe cobertura minima o verificacion de flujo

### Revision UX

- sigue el patron visual del modulo existente
- usa modales, tablas, tarjetas y textos coherentes con el resto del producto
- no abre formularios permanentes que degraden lectura
- en movil no se rompe la captura principal

### Revision de cierre

- tests backend ejecutados cuando el cambio toca comportamiento
- `build` frontend limpio cuando el cambio toca UI
- smoke o `--list` E2E actualizado cuando el flujo visible cambia
- documentacion y `CHANGELOG` actualizados
- spec y ownership actualizados si el cambio movio datos, contratos o alcance real

## Minimo obligatorio segun tipo de cambio

### Cambio backend sin impacto visible

- tests backend focalizados
- documentacion tecnica si cambia regla o contrato interno

### Cambio frontend visible dentro de un modulo existente

- `npm run build`
- actualizar documentacion del modulo
- revisar si el smoke E2E existente debe ajustarse

### Cambio funcional visible con riesgo operativo

- tests backend focalizados
- `npm run build`
- actualizar smoke E2E afectado o agregar uno nuevo si no existe cobertura
- actualizar runbook si cambia la forma de probar o preparar datos

### Cambio de arquitectura o regla transversal

- actualizar `docs/architecture/`
- actualizar onboarding o runbooks si cambia la forma de trabajar
- actualizar roadmaps si cambia el estado de cierre o la secuencia futura

## Estructura Canónica por Modulo

Todo modulo nuevo o endurecido debe respetar esta expectativa minima.

### Backend tenant

- `backend/app/apps/tenant_modules/<modulo>/api/`
- `backend/app/apps/tenant_modules/<modulo>/models/`
- `backend/app/apps/tenant_modules/<modulo>/repositories/`
- `backend/app/apps/tenant_modules/<modulo>/services/`
- `backend/app/apps/tenant_modules/<modulo>/schemas/` o `schemas.py`
- `backend/app/apps/tenant_modules/<modulo>/permissions.py` cuando aplique

### Frontend tenant

- `frontend/src/apps/tenant_portal/modules/<modulo>/pages/`
- `frontend/src/apps/tenant_portal/modules/<modulo>/components/`
- `frontend/src/apps/tenant_portal/modules/<modulo>/services/`
- `frontend/src/apps/tenant_portal/modules/<modulo>/styles/` cuando el modulo tenga lenguaje visual propio
- `utils/` y `types.ts` solo cuando realmente clarifiquen el slice

### Docs

- `docs/modules/<modulo>/README.md`
- `docs/modules/<modulo>/USER_GUIDE.md`
- `docs/modules/<modulo>/DEV_GUIDE.md`
- `docs/modules/<modulo>/ROADMAP.md`
- `docs/modules/<modulo>/CHANGELOG.md`
- `docs/modules/<modulo>/API_REFERENCE.md` cuando aplique

### E2E

- un cambio visible debe revisar el spec existente mas cercano
- si no existe spec del flujo, hay que dejar al menos el smoke base actualizado del modulo o dominio afectado
- el baseline tenant del repo sigue siendo `empresa-bootstrap`

## Handoff para otra IA

Todo cierre relevante debe dejar a otra IA con capacidad real de continuar sin releer todo el repositorio.

Como mínimo, otra IA debe poder reconstruir:

- qué slice se abrió
- qué spec mínima se siguió
- qué ownership de datos se respetó
- qué evidencia realmente se ejecutó
- en qué ambientes y tenants quedó convergido

Minimo esperado:

- `SESION_ACTIVA.md` revisado cuando cambie el foco inmediato, el bloqueo principal o la siguiente acción concreta para retomar
- `PROJECT_CONTEXT.md`, `ESTADO_ACTUAL.md` y `SIGUIENTE_PASO.md` revisados cuando el cambio altera el estado real del proyecto
- `PROMPT_MAESTRO_MODULO.md` revisado si cambia la forma estándar de retomar con otra IA
- `CHECKLIST_CIERRE_ITERACION.md` usado como control corto antes de cerrar
- `HANDOFF_STATE.json` e `HISTORIAL_ITERACIONES.md` revisados cuando la iteración cierre o cambie de foco
- documentos canónicos enlazados desde `docs/index.md`
- `ROADMAP.md` con estado real, no deseado
- `CHANGELOG.md` con el hito recién implementado
- runbook E2E o técnico actualizado si cambió la forma de validar
- baseline y precondiciones explícitas si la validación depende de tenant, seed, migración o política

La pregunta de control final es:

- si mañana otra IA abre el repo, puede descubrir qué existe, cómo se valida y qué falta sin depender de un chat previo

## Criterio de Cierre

Un cambio se considera bien cerrado cuando:

- el comportamiento está implementado
- la verificación mínima fue ejecutada o la limitación quedó declarada
- la documentación canónica quedó al día
- el siguiente paso del roadmap quedó explícito

Si falta alguno de esos puntos, el cambio sigue abierto aunque el código compile.
