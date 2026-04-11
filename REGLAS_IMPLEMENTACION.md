# REGLAS_IMPLEMENTACION

## Objetivo

Estas reglas existen para que cualquier implementación nueva mantenga coherencia técnica, documental y operativa.

Aplican para developers humanos y para IAs.

## Regla 1. La memoria vive en el repo

Nunca asumir que el chat será la fuente de verdad.

Siempre dejar contexto suficiente en archivos del proyecto.

Si una tarea cambia el estado real del proyecto, debe quedar reflejada en documentación viva.

## Regla 2. No abrir trabajo nuevo sin leer el contexto canónico

Antes de tocar código, revisar al menos:

- `PROJECT_CONTEXT.md`
- `SESION_ACTIVA.md`
- `CHECKLIST_CIERRE_ITERACION.md`
- `ESTADO_ACTUAL.md`
- `SIGUIENTE_PASO.md`
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

Si algo no pudo completarse, no dejarlo ambiguo.

Hay que dejar explícito:

- qué faltó
- por qué faltó
- si el bloqueo es técnico, operativo o de entorno
- cuál es el siguiente paso correcto

## Regla 18. El root debe ser suficiente para retomar

Una IA nueva debe poder entender desde el root, sin buscar demasiado:

- qué es el proyecto
- cuál es la prioridad actual
- qué reglas debe respetar
- en qué estado exacto quedó la iteración
- qué debe hacer después

Si eso no ocurre, hay que mejorar estos archivos antes de seguir abriendo trabajo nuevo.

## Checklist corto antes de cerrar cualquier iteración

El checklist corto oficial ya vive en:

- `CHECKLIST_CIERRE_ITERACION.md`

Debe usarse como referencia rápida obligatoria antes de dar una iteración por cerrada.
