# PROMPT_MAESTRO_MODULO

Usar este prompt como base cuando una IA retome un módulo o una iteración transversal del proyecto.

---

## Prompt base

Estás trabajando en el repositorio `platform_paas`.

Antes de implementar, debes leer y respetar estos archivos del root:

- `PROJECT_CONTEXT.md`
- `REGLAS_IMPLEMENTACION.md`
- `ESTADO_ACTUAL.md`
- `SIGUIENTE_PASO.md`

Y además la documentación canónica del módulo o frente afectado.

### Tu tarea

1. entender el estado real del proyecto antes de tocar código
2. identificar qué parte de la tarea ya está hecha y qué parte no
3. no reabrir decisiones ya cerradas sin dejarlo explícito
4. implementar solo lo necesario con cambios mínimos y coherentes
5. mantener documentación, validación y handoff al día

### Reglas de ejecución

- la memoria del proyecto vive en archivos del repo, no en el chat
- no asumir contexto no escrito
- si una decisión ya está cerrada, respetarla
- si una mejora es residual y no bloqueante, dejarla como backlog explícito
- cualquier cambio visible debe actualizar documentación relevante
- cualquier cambio operacional debe pensar en validación y deploy

### Si el trabajo es sobre un módulo

Debes responder al menos estas preguntas antes de editar:

- cuál es el objetivo funcional del módulo
- cuál es su frontera con otros módulos
- qué documentación canónica ya existe
- qué backlog ya está declarado
- qué validaciones existen
- qué no debe tocarse

### Si el trabajo es transversal frontend

Debes usar la capa transversal ya existente:

- `pickLocalizedText()`
- `AppIcon`
- `AppSpotlight`
- `AppBadge`
- `AppToolbar`
- `AppFilterGrid`
- `AppTableWrap`
- `AppForm`

No abrir una convención paralela.

### Si el trabajo es de producción o deploy

Debes revisar antes:

- `docs/deploy/backend-production-preflight.md`
- `docs/deploy/frontend-static-nginx.md`
- `docs/deploy/production-cutover-checklist.md`
- `docs/deploy/backend-release-and-rollback.md`

Y usar los scripts del repo en vez de inventar flujo nuevo.

### Entregable mínimo esperado al terminar

Debes dejar claro:

- qué hiciste
- qué validaste
- qué quedó pendiente
- qué archivos se tocaron
- si hace falta actualizar `ESTADO_ACTUAL.md`
- cuál es el siguiente paso correcto

Además, antes de cerrar debes revisar explícitamente:

- si cambió el contexto estable del proyecto → actualizar `PROJECT_CONTEXT.md`
- si cambió una regla transversal → actualizar `REGLAS_IMPLEMENTACION.md`
- si cambió el estado real de la iteración → actualizar `ESTADO_ACTUAL.md`
- si cambió la prioridad siguiente → actualizar `SIGUIENTE_PASO.md`
- en cada iteración importante debes mantener estos archivos actualizados para no perder continuidad entre IAs

---

## Plantilla breve para módulos nuevos o retomados

### Contexto del módulo

- módulo:
- objetivo:
- estado actual:
- documentación canónica:
- dependencias:
- riesgos:

### Meta de esta iteración

- 

### Qué sí se puede tocar

- 

### Qué no debe tocarse

- 

### Validaciones mínimas

- 

### Handoff obligatorio al cerrar

- actualizar `ESTADO_ACTUAL.md`
- actualizar `SIGUIENTE_PASO.md`
- actualizar roadmap/changelog si hubo cambio visible
- declarar explícitamente si hubo bloqueo de entorno, de deploy o de producto

---

## Prompt ultra corto de reanudación

Usar esto cuando una nueva IA solo necesite retomar rápido:

"Lee `PROJECT_CONTEXT.md`, `REGLAS_IMPLEMENTACION.md`, `ESTADO_ACTUAL.md` y `SIGUIENTE_PASO.md`. Luego revisa la documentación canónica del frente activo. No asumas contexto fuera del repo. Resume primero el estado real, identifica bloqueos reales y solo después propone o ejecuta el siguiente paso correcto." 
