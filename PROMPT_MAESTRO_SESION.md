# PROMPT_MAESTRO_SESION

Usar este prompt cuando una IA o una sesión nueva necesite retomar `platform_paas` con el menor nivel posible de ambigüedad.

La meta es que el contexto operativo, normativo y arquitectónico ya exista dentro del repo y no dependa del chat anterior.

---

## Prompt maestro recomendado

Estoy trabajando en `platform_paas`.

Antes de responder, analizar o tocar código, usa como fuente de verdad principal estos archivos del root y docs vinculadas:

### Archivos obligatorios

- `PROJECT_CONTEXT.md`
- `REGLAS_IMPLEMENTACION.md`
- `CHECKLIST_CIERRE_ITERACION.md`
- `ESTADO_ACTUAL.md`
- `SIGUIENTE_PASO.md`
- `HISTORIAL_ITERACIONES.md`
- `HANDOFF_STATE.json`
- `docs/architecture/index.md`
- `docs/runbooks/tenant-incident-response.md`

### Arquitectura / normativa

- `docs/architecture/implementation-governance.md`
- `docs/architecture/data-governance.md`
- `docs/architecture/sred-development.md`
- `docs/architecture/data-ownership-matrix.md`
- `docs/architecture/slice-spec-template.md`
- `docs/architecture/adr/README.md`
- `docs/architecture/api-contract-standard.md`
- `docs/architecture/schema-and-migration-policy.md`
- `docs/architecture/environment-policy.md`
- `docs/architecture/e2e-test-data-policy.md`

## Reglas de contexto

- usa esos archivos como contexto principal del proyecto
- no asumas contexto fuera del repo
- respeta la arquitectura y decisiones ya cerradas
- no inventes estructura nueva si ya existe una vigente
- no modifiques `auth`, lifecycle tenant, provisioning, billing o secretos sin necesidad explícita
- sigue patrón backend `router -> service -> repository`
- usa `apply_patch` para ediciones manuales
- si un tema ya estaba cerrado y reaparece, trátalo primero como revalidación de runtime/caché/deploy, no como reapertura automática
- si estás revalidando algo ya cerrado, dilo explícitamente como:
  - `Comprobando que lo último realizado corresponde y quedó bien...`
- no actualices memoria viva durante exploración o diagnóstico; actualízala solo cuando el estado final esté confirmado
- un cambio no se considera correcto si solo funciona en repo, en un tenant o en un ambiente:
  - debe quedar promovido, convergido, probado y documentado
- si el cambio afecta runtime real, considera `development`, `staging` y `production` según corresponda
- si el cambio afecta comportamiento multi-tenant, considera convergencia de tenants activos
- no uses `ieris-ltda` para E2E o pruebas basura; solo `empresa-demo` y `empresa-bootstrap`

## Reglas de trabajo

1. primero confirma que entendiste el contexto actual
2. resume el estado real vigente del proyecto en pocas líneas
3. indica cuál es el siguiente paso correcto según `SIGUIENTE_PASO.md`
4. distingue claramente si vas a:
   - diagnosticar
   - revalidar
   - implementar
   - desplegar
   - converger
   - documentar
5. si el problema puede ser `repo != runtime`, compruébalo antes de proponer cambios
6. si el problema puede ser tenant-local, usa el runbook de incidentes tenant antes de reabrir slices
7. si haces cambios relevantes:
   - especifica el impacto por módulo
   - valida pruebas proporcionales
   - valida deploy/convergencia si aplica
   - actualiza memoria viva al final
8. al cerrar una iteración, asegúrate de dejar consistente:
   - `ESTADO_ACTUAL.md`
   - `SIGUIENTE_PASO.md`
   - `HISTORIAL_ITERACIONES.md`
   - `HANDOFF_STATE.json`

## Criterio de cierre

No declares un punto como terminado hasta que:

- el código esté correcto
- el runtime afectado esté alineado
- los tenants afectados estén convergidos si aplica
- exista evidencia suficiente
- la documentación viva esté actualizada

## Primera respuesta obligatoria

Tu primera respuesta en esta sesión debe tener exactamente este orden:

1. `Contexto entendido`
2. `Estado actual real`
3. `Siguiente paso correcto`
4. `Qué vas a comprobar primero antes de tocar código`

Después de eso, recién propón o ejecuta cambios.

---

## Variante corta de continuidad

Usar esta variante cuando solo se necesite retomar rápido:

`Lee PROJECT_CONTEXT.md, REGLAS_IMPLEMENTACION.md, CHECKLIST_CIERRE_ITERACION.md, ESTADO_ACTUAL.md, SIGUIENTE_PASO.md, HISTORIAL_ITERACIONES.md, HANDOFF_STATE.json, docs/architecture/index.md y docs/runbooks/tenant-incident-response.md. Resume primero el estado real, identifica el siguiente paso correcto y no reabras slices cerrados sin evidencia reproducible. Si estás revalidando algo ya cerrado, dilo como: "Comprobando que lo último realizado corresponde y quedó bien...".`
