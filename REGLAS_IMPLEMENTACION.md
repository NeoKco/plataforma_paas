# REGLAS_IMPLEMENTACION

## Objetivo

Estas reglas existen para que cualquier implementación nueva mantenga coherencia técnica, documental y operativa.

Aplican para developers humanos y para IAs.

## Regla 1. La memoria vive en el repo

Nunca asumir que el chat será la fuente de verdad.

Siempre dejar contexto suficiente en archivos del proyecto.

Si una tarea cambia el estado real del proyecto, debe quedar reflejada en documentación viva.

Verificación mínima asociada:

- correr `bash deploy/check_release_governance.sh` cuando haya cambios relevantes en código o runtime
- usar ese gate como prueba rápida de que la memoria viva acompaña el trabajo real

## Regla 2. No abrir trabajo nuevo sin leer el contexto canónico

Antes de tocar código, revisar al menos:

- `PROJECT_CONTEXT.md`
- `SESION_ACTIVA.md`
- `CHECKLIST_CIERRE_ITERACION.md`
- `ESTADO_ACTUAL.md`
- `SIGUIENTE_PASO.md`
- `docs/architecture/data-governance.md` si el cambio toca datos, defaults, seeds, integraciones o portabilidad
- documentación canónica del módulo afectado
- roadmap o changelog correspondiente

## Regla 3. Mantener la arquitectura por módulos y slices

No mezclar responsabilidades entre dominios.

Ejemplos críticos:

- `business-core` es dueño de entidades compartidas tenant
- `maintenance` consume `business-core`; no lo reemplaza
- `finance` sigue siendo el módulo piloto de referencia para slices tenant
- `platform_control` sigue siendo el núcleo de plataforma

## Regla 4. No romper decisiones ya cerradas sin dejarlo explícito

Si una decisión ya estaba cerrada, no reabrirla implícitamente.

Si hay que cambiarla:

- documentar el motivo
- actualizar el archivo afectado
- dejar claro qué reemplaza a qué

Si la decisión era transversal o costosa de revertir:

- revisar si corresponde abrir ADR en `docs/architecture/adr/`

## Regla 5. Todo cambio visible debe actualizar documentación

Si cambia UX, flujo o naming visible, actualizar lo necesario:

- `README` del módulo
- `ROADMAP`
- `CHANGELOG`
- guías operativas si corresponde
- checklist o deploy docs si afecta salida a producción

## Regla 6. Todo cambio visible importante debe pensar en E2E

Si una mejora cambia operación real, revisar si requiere:

- smoke E2E nuevo
- ampliación de smoke existente
- validación manual explícita documentada

Regla operativa de tenants E2E:

- nunca usar `ieris-ltda` para E2E
- los tenants permitidos para E2E son `empresa-bootstrap` y `empresa-demo`

## Regla 7. No mezclar backlog residual con prioridades de release

Si algo es residual, editorial o no bloqueante, dejarlo explícito como backlog.

No retrasar un release operativo por copy residual si el flujo principal ya está estable y validado.

## Regla 8. Frontend nuevo debe seguir la capa transversal existente

Usar la base ya instalada del proyecto:

- `AppIcon`
- `AppSpotlight`
- `AppBadge`
- `AppToolbar`
- `AppFilterGrid`
- `AppTableWrap`
- `AppForm`
- helper `pickLocalizedText()`

Evitar abrir nuevas pantallas con copy manual o estructuras paralelas sin necesidad.

## Regla 9. CRUD nuevo = lectura primero

La convención del proyecto es:

- lectura/catálogo primero
- creación/edición bajo demanda
- preferencia por modal o flujo contextual

No volver a formularios permanentemente abiertos salvo justificación fuerte.

## Regla 10. Backend debe seguir patrón por capas

Patrón esperado:

- `router`
- `service`
- `repository`
- `schemas`
- tests cuando corresponda

Evitar lógica de negocio pesada en routers.

## Regla 11. No editar por impulso archivos de entorno o deploy sin validar efecto

Si se toca algo en:

- `deploy/`
- `infra/env/`
- `infra/systemd/`
- `infra/nginx/`

entonces también debe revisarse:

- preflight
- documentación de deploy
- checklist de aceptación
- compatibilidad con producción real
- runbook de incidentes tenant si el cambio puede afectar convergencia o credenciales técnicas

## Regla 12. `.env` debe ser válido como archivo dotenv real

No dejar líneas ambiguas o incompatibles.

Ejemplo correcto:

- `APP_NAME="Platform Backend"`

No asumir que `source` shell tolerará cualquier formato improvisado.

## Regla 13. Validar siempre antes de dar por cerrado

Según el cambio, ejecutar lo que corresponda:

### Frontend

- `npm run build`

### Backend

- baseline backend
- tests del área afectada

### Producción

- preflight backend
- preflight frontend
- gate post-deploy
- `bash deploy/check_release_governance.sh`

## Regla 14. No tocar sin necesidad estos frentes sensibles

Salvo que la tarea lo exija claramente:

- auth y middleware base
- ciclo lifecycle tenant
- provisioning crítico
- billing crítico
- contratos backend ya estabilizados
- decisiones ya cerradas sobre `business-core` vs `maintenance`

## Regla 15. Cada sesión debe dejar handoff entendible

Al terminar una iteración importante, actualizar si aplica:

- `SESION_ACTIVA.md`
- `ESTADO_ACTUAL.md`
- `SIGUIENTE_PASO.md`

La siguiente IA debe poder retomar sin reconstruir el proyecto desde cero.

Esto implica además que en cada iteración importante deben mantenerse actualizados los archivos raíz de continuidad cuando el estado real cambie.

La actualización de estado no debe hacerse con formato libre:

- `ESTADO_ACTUAL.md`
- `SIGUIENTE_PASO.md`
- `HANDOFF_STATE.json`
- `HISTORIAL_ITERACIONES.md`

deben alinearse usando:

- `PLANTILLA_ACTUALIZACION_ESTADO.md`

Si el problema reportado es sobre un slice ya cerrado:

- tratar primero el caso como revalidación de runtime
- usar mensajes como `Comprobando que lo último realizado corresponde y quedó bien`
- no reabrir documentalmente el slice antes de confirmar causa real

## Regla 16. Protocolo obligatorio de actualización de archivos raíz

Usar esta matriz:

### `PROJECT_CONTEXT.md`

Actualizar solo si cambia:

- visión global del proyecto
- prioridad estructural
- estrategia de despliegue
- frontera entre módulos
- filosofía oficial de handoff

### `REGLAS_IMPLEMENTACION.md`

Actualizar solo si cambia:

- una regla transversal
- el estándar de cierre
- el criterio de validación
- la política de documentación viva

### `PROMPT_MAESTRO_MODULO.md`

Actualizar si cambia:

- la forma estándar de pedir trabajo a otra IA
- el set mínimo de contexto que debe leer antes de tocar código

### `ESTADO_ACTUAL.md`

Actualizar cuando cambie cualquiera de estos puntos:

- foco real de la iteración
- trabajo ya completado
- decisiones cerradas
- archivos tocados relevantes
- backlog exacto restante
- bloqueos reales

Usar la estructura explícita de `PLANTILLA_ACTUALIZACION_ESTADO.md`.

### `SESION_ACTIVA.md`

Actualizar cuando cambie:

- el foco inmediato
- el bloqueo principal
- la siguiente acción concreta para retomar
- el frente activo entre cuentas o sesiones

### `SIGUIENTE_PASO.md`

Actualizar cuando cambie:

- la prioridad siguiente real
- el orden recomendado
- la condición de salida de la próxima iteración
- el escenario operativo principal

Usar la estructura explícita de `PLANTILLA_ACTUALIZACION_ESTADO.md`.

## Regla 17. No cerrar una iteración sin declarar bloqueos reales

Si una iteración no quedó totalmente cerrada, debe declararse explícitamente:

- qué quedó pendiente
- por qué quedó pendiente
- si el bloqueo es técnico, operativo o de entorno
- cuál es el siguiente paso correcto

No dejar cierres ambiguos.

## Regla 18. Slice cerrado + reporte nuevo = revalidación, no reapertura automática

Si un tema ya estaba cerrado y reaparece un reporte:

- primero tratarlo como `revalidación de cierre previo`
- no comunicarlo como si se estuviera rehaciendo o reabriendo el slice desde cero

Mensajes recomendados:

- `Comprobando que lo último realizado corresponde y quedó bien en runtime`
- `Revalidando el cierre anterior para distinguir si es regresión real, caché o despliegue`

Evitar durante diagnóstico frases como:

- `voy a revisar el flujo`
- `voy a bajar al detalle`
- `voy a investigar`

salvo que ya exista evidencia clara de regresión real.

## Regla 19. No editar memoria viva durante exploración diagnóstica

Si un slice cerrado entra en revalidación:

- no actualizar `ESTADO_ACTUAL.md`
- no actualizar `SIGUIENTE_PASO.md`
- no actualizar `HANDOFF_STATE.json`
- no actualizar `HISTORIAL_ITERACIONES.md`

hasta que ocurra una de estas dos cosas:

- se confirma que no había regresión y solo hubo caché/runtime/despliegue
- se confirma regresión real, se corrige y se valida

La memoria viva debe reflejar estado resuelto, no hipótesis intermedias.

## Regla 20. Cambio correcto = promoción completa por ambiente y tenant

Si una modificación se declara correcta y válida para la PaaS, no basta con dejarla funcionando en `development` o en un solo tenant.

Debe cerrarse explícitamente en estos planos:

- `repo` actualizado
- `staging/test` actualizado si existe ese carril
- `production` actualizado cuando la mejora ya fue promovida
- tenants impactados convergidos, no solo un tenant usado como referencia

Esto implica:

- desplegar el cambio en todos los ambientes activos afectados
- correr convergencia post-deploy cuando el cambio toca lógica multi-tenant, defaults, seeds, finanzas, mantenciones o contratos
- ejecutar pruebas proporcionales en cada ambiente relevante
- documentar el resultado real por ambiente y declarar cualquier drift tenant-local restante

No se debe cerrar un cambio con frases del tipo:

- "funciona en `empresa-demo`"
- "ya quedó en repo"
- "pasó localmente"

si todavía no quedó claro:

- qué ambientes tienen el cambio realmente publicado
- qué tenants quedaron convergidos
- qué evidencia lo demuestra

## Regla 21. El root debe ser suficiente para retomar

Una IA nueva debe poder entender desde el root, sin buscar demasiado:

- qué es el proyecto
- cuál es la prioridad actual
- qué reglas debe respetar
- en qué estado exacto quedó la iteración
- qué debe hacer después

Si eso no ocurre, hay que mejorar estos archivos antes de seguir abriendo trabajo nuevo.

## Regla 22. Cambios de datos críticos deben respetar gobernanza de datos

Si el cambio toca:

- ownership de entidades
- seeds o defaults
- portabilidad/importación
- integraciones entre módulos
- archivo, delete o retención
- calidad o unicidad de datos

entonces debe revisarse:

- `docs/architecture/data-ownership-matrix.md`
- `docs/architecture/data-governance.md`

No corresponde cerrar ese cambio sin explicitar:

- dominio dueño
- contrato entre módulos
- precedencia de datos
- estrategia de validación

Regla operativa explícita para tenants:

- no se debe borrar un tenant archivado sin export portable previo del mismo tenant
- si se destruye infraestructura o registro tenant, debe existir evidencia recuperable antes del borrado
- la consola y la API deben exigir esa evidencia; no basta una advertencia visual

## Regla 23. El cierre recomendado sigue `SRED`

Para cambios relevantes, el orden esperado es:

- `Spec`
- `Rules and Review`
- `Evidence`
- `Documentation`

Referencia canónica:

- `docs/architecture/sred-development.md`

## Regla 24. Gobernanza de datos y `SRED` aplican a toda la PaaS

No aplican solo a módulos nuevos ni solo a trabajo funcional visible.

Aplican a:

- `platform-core`
- `business-core`
- `maintenance`
- `finance`
- `agenda`
- defaults, seeds, imports y exports
- convergencia multi-tenant
- deploy, staging y production
- hardening, recovery y operación técnica

Si el trabajo cambia comportamiento real o continuidad operativa, entra en gobernanza y `SRED`.

## Regla 25. Slice relevante = ownership + spec mínima antes de tocar código

Antes de implementar un slice relevante debe existir, como mínimo:

- ownership explícito del dato en `docs/architecture/data-ownership-matrix.md`
- spec mínima siguiendo `docs/architecture/slice-spec-template.md`

Si el cambio no puede describirse con esas dos piezas, todavía no está listo para implementarse.

## Regla 26. No cerrar mejoras transversales sin impacto institucionalizado

Si una mejora se declara “para toda la PaaS”, no basta con que el código exista.

Debe quedar institucionalizada en:

- reglas centrales
- documentación de arquitectura
- prompt maestro / continuidad
- checklist de cierre
- roadmap si cambia prioridad o definición de cierre

Si no quedó integrada ahí, sigue siendo una mejora local, no un estándar real del proyecto.

## Regla 27. Toda decisión transversal aceptada debe dejar ADR o referencia equivalente

Si una decisión cambia arquitectura, contratos, gobernanza o continuidad operativa de la PaaS, debe quedar registrada en:

- un ADR en `docs/architecture/adr/`
- o una referencia canónica equivalente si todavía no corresponde un ADR formal

No dejar decisiones grandes solo en conversación o en commits.

## Regla 28. Todo cambio de contrato debe respetar el estándar API

Si se toca un endpoint, request, response, semántica de error o side effect:

- revisar `docs/architecture/api-contract-standard.md`
- asegurar compatibilidad o documentar ruptura explícita
- dejar claro ownership y efectos colaterales

## Regla 29. Todo cambio estructural debe respetar política de schema y migraciones

Si el cambio toca tablas, columnas, constraints, seeds estructurales o backfills:

- revisar `docs/architecture/schema-and-migration-policy.md`
- no cerrar el cambio sin migración o justificación explícita
- contemplar tenants existentes, no solo bootstrap nuevo

## Regla 30. El entorno correcto forma parte de la evidencia correcta

Todo cambio relevante debe respetar `docs/architecture/environment-policy.md`.

Eso incluye:

- propósito de `development`
- propósito de `staging`
- propósito de `production`
- reglas de promoción por ambiente
- restricciones de pruebas y datos

`repo` correcto no equivale a `runtime` correcto.

## Regla 31. E2E y datos de prueba deben respetar política explícita

Toda prueba E2E, smoke o dato temporal debe respetar `docs/architecture/e2e-test-data-policy.md`.

Esto incluye:

- tenants permitidos
- tenants prohibidos
- nomenclatura de artefactos
- limpieza obligatoria
- prohibición de contaminar tenants operativos reales

## Checklist corto antes de cerrar cualquier iteración

El checklist corto oficial ya vive en:

- `CHECKLIST_CIERRE_ITERACION.md`

Debe usarse como referencia rápida obligatoria antes de dar una iteración por cerrada.
