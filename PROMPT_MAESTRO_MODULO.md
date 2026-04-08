# PROMPT_MAESTRO_MODULO

Usar este prompt como base cuando una IA retome un módulo, una iteración transversal o una salida a producción del proyecto.

La meta es que cualquier IA pueda continuar desde el repo sin depender del chat previo.

---

## Prompt maestro recomendado

Estoy trabajando en el repositorio `platform_paas`.

Antes de responder, proponer o tocar código, debes leer y usar como contexto principal estos archivos del root, en este orden:

1. `PROJECT_CONTEXT.md`
2. `SESION_ACTIVA.md`
3. `REGLAS_IMPLEMENTACION.md`
4. `ESTADO_ACTUAL.md`
5. `SIGUIENTE_PASO.md`
6. `HANDOFF_STATE.json`
7. `HISTORIAL_ITERACIONES.md`
8. `PLANTILLA_ACTUALIZACION_ESTADO.md`
9. `PAQUETE_RELEASE_OPERADOR.md`
10. `PROMPT_MAESTRO_MODULO.md`

Además, debes usar como fuente secundaria obligatoria la documentación canónica ya existente del repo, especialmente:

- `docs/architecture/implementation-governance.md`
- `docs/architecture/module-build-standard.md`
- `docs/architecture/module-slice-convention.md`
- `docs/architecture/project-structure.md`
- `docs/runbooks/developer-onboarding.md`
- `docs/runbooks/backend-rules-and-change-guidelines.md`
- `docs/runbooks/frontend-e2e-browser.md`
- `frontend/e2e/README.md`
- y la documentación canónica del módulo o frente afectado en `docs/modules/<modulo>/`

## Reglas de precedencia

- si hay conflicto entre chat y repo, manda el repo
- si hay conflicto entre resumen operativo y documentación arquitectónica, debes explicitarlo
- `ESTADO_ACTUAL.md`, `SIGUIENTE_PASO.md` y `HANDOFF_STATE.json` mandan para el foco vigente
- `docs/architecture/*` manda para estándares y decisiones transversales
- `docs/modules/<modulo>/*` manda para fronteras, roadmap y UX del módulo

## Restricciones

- no asumas contexto fuera del repo
- no inventes estructura nueva si ya existe una convención documentada
- respeta la arquitectura y decisiones ya cerradas
- no modifiques `auth`, lifecycle tenant, provisioning o billing sin necesidad explícita
- sigue el patrón `router -> service -> repository`
- no abras trabajo nuevo si `SIGUIENTE_PASO.md` indica otra prioridad vigente
- si el estado real cambia durante la iteración, debes mantener actualizados:
  - `SESION_ACTIVA.md`
  - `ESTADO_ACTUAL.md`
  - `SIGUIENTE_PASO.md`
  - `HANDOFF_STATE.json`
  - `HISTORIAL_ITERACIONES.md`
- usa `PLANTILLA_ACTUALIZACION_ESTADO.md` como guía para actualizar estado
- si la iteración afecta salida a producción, también debes revisar y actualizar `PAQUETE_RELEASE_OPERADOR.md` si corresponde

## Modo de trabajo obligatorio

### Fase 1. Diagnóstico

Primero debes:

- confirmar que entendiste el contexto
- resumir el estado actual real del proyecto
- decir cuál es el siguiente paso correcto según los archivos
- listar los archivos clave que revisaste
- indicar cualquier contradicción, ambigüedad o riesgo detectado

No debes editar código todavía, salvo que el usuario explícitamente pida ejecutar de inmediato.

### Fase 2. Propuesta o ejecución

Solo después del diagnóstico:

- propón el cambio correcto o ejecútalo si te lo piden
- limita el cambio al foco vigente
- actualiza documentación, roadmap, changelog, E2E y handoff si el cambio lo exige
- no dejes backlog implícito; si algo queda pendiente, déjalo explícito

## Formato mínimo obligatorio de la primera respuesta

1. `Contexto entendido`
2. `Estado actual real`
3. `Siguiente paso correcto`
4. `Archivos revisados`
5. `Riesgos o contradicciones detectadas`

## Formato mínimo obligatorio de la respuesta de cierre

Si haces cambios, debes cerrar con:

1. `Qué hice`
2. `Qué validé`
3. `Qué archivos actualicé`
4. `Qué quedó pendiente`
5. `Cuál es ahora el siguiente paso correcto`

## Regla especial vigente del proyecto

Si los archivos indican que el foco actual es deploy, preflight o cutover productivo, no abras trabajo funcional nuevo salvo instrucción explícita del usuario.

---

## Plantilla breve para iteraciones

### Contexto de la iteración

- frente o módulo:
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

- actualizar `ESTADO_ACTUAL.md` si cambia el estado real
- actualizar `SESION_ACTIVA.md` si cambia el foco inmediato o el bloqueo principal
- actualizar `SIGUIENTE_PASO.md` si cambia la prioridad siguiente
- actualizar `HANDOFF_STATE.json` si cambia foco, bloqueos o validaciones
- actualizar `HISTORIAL_ITERACIONES.md` si la iteración fue relevante
- actualizar roadmap/changelog del módulo si hubo cambio visible o funcional
- declarar explícitamente si hubo bloqueo de entorno, deploy o producto

---

## Prompt ultra corto de reanudación

Usar esto cuando una nueva IA solo necesite retomar rápido:

`Lee PROJECT_CONTEXT.md, SESION_ACTIVA.md, REGLAS_IMPLEMENTACION.md, ESTADO_ACTUAL.md, SIGUIENTE_PASO.md y HANDOFF_STATE.json. Luego revisa la documentación canónica del frente activo. No asumas contexto fuera del repo. Resume primero el estado real, identifica bloqueos reales y solo después propone o ejecuta el siguiente paso correcto.`
