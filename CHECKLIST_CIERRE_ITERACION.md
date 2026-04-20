# CHECKLIST_CIERRE_ITERACION

Checklist corto oficial para cerrar una iteración en `platform_paas`.

No reemplaza:

- `REGLAS_IMPLEMENTACION.md`
- `PROMPT_MAESTRO_MODULO.md`
- `docs/architecture/implementation-governance.md`
- `docs/architecture/data-governance.md`
- `docs/architecture/sred-development.md`

Su función es operativa:

- recordar qué revisar antes de dar un cambio por cerrado
- evitar que código, documentación, validación y handoff queden desalineados
- servir como referencia rápida para otra IA o developer

## Pregunta de control

No cerrar una iteración hasta responder `sí` a todo esto:

- ¿el comportamiento real quedó implementado o corregido?
- ¿la validación ejecutada fue proporcional al riesgo?
- ¿la documentación visible quedó actualizada?
- ¿el estado vivo del repo refleja lo que realmente pasó?
- ¿el siguiente paso correcto quedó explícito?
- ¿otra IA podría retomar sin depender del chat?
- ¿el cambio quedó promovido en todos los ambientes afectados o quedó explícito qué ambiente falta?
- ¿los tenants afectados quedaron convergidos o quedó explícito cuál sigue con drift y por qué?
- si el trabajo nació como reporte sobre un slice ya cerrado, ¿primero se trató como revalidación y no como reapertura automática?
- si el cambio fue relevante o transversal, ¿quedó ownership explícito y spec mínima del slice?

## Actualización mínima del root

Si el estado real cambió, revisar y actualizar:

- `SESION_ACTIVA.md`
- `ESTADO_ACTUAL.md`
- `SIGUIENTE_PASO.md`
- `HANDOFF_STATE.json`
- `HISTORIAL_ITERACIONES.md`

Usar como formato guía:

- `PLANTILLA_ACTUALIZACION_ESTADO.md`

## Actualización mínima por tipo de cambio

### Si hubo frontend visible

- `npm run build`
- revisar smoke E2E cercano o crear uno nuevo
- revisar `frontend/e2e/README.md`
- revisar `docs/runbooks/frontend-e2e-browser.md`

### Si hubo backend con cambio de comportamiento

- tests backend focalizados
- revisar `DEV_GUIDE` o runbook técnico si cambió una regla o contrato

### Si hubo cambio funcional visible en un módulo

- revisar `README.md`
- revisar `USER_GUIDE.md`
- revisar `DEV_GUIDE.md`
- revisar `ROADMAP.md`
- revisar `CHANGELOG.md`

### Si hubo deploy, publish o cambio de entorno

- revisar `deploy/`
- revisar `infra/env/`, `infra/nginx/`, `infra/systemd/` si aplica
- revisar `docs/deploy/*`
- revisar `PAQUETE_RELEASE_OPERADOR.md`
- ejecutar `bash deploy/check_release_governance.sh`
- validar `health` y smoke corto post-deploy
- validar también si el cambio quedó realmente reflejado en:
  - `staging/test`
  - `production`
  - tenants impactados del ambiente

### Si hubo cambio transversal

- revisar `PROJECT_CONTEXT.md`
- revisar `REGLAS_IMPLEMENTACION.md`
- revisar `PROMPT_MAESTRO_MODULO.md`
- revisar `docs/architecture/implementation-governance.md`
- revisar `docs/architecture/data-ownership-matrix.md`
- revisar `docs/architecture/slice-spec-template.md`
- revisar si corresponde abrir o actualizar un ADR en `docs/architecture/adr/`
- revisar `docs/runbooks/tenant-incident-response.md` si el cambio afecta runtime, entornos, convergencia o diagnóstico tenant

### Si hubo cambio de datos, defaults o integración entre módulos

- revisar `docs/architecture/data-governance.md`
- confirmar ownership del dato y contrato entre módulos
- confirmar si hace falta runbook adicional de seed, sync, import o recovery
- si hubo `archive/deprovision/delete` de tenant o datos críticos, confirmar respaldo/export previo y evidencia de recuperación

## Control SRED

Antes de cerrar, confirmar:

- `S`: la spec del cambio quedó clara
- `R`: las reglas y la revisión aplicable quedaron cubiertas
- `E`: la evidencia ejecutada es proporcional al riesgo
- `D`: la documentación viva quedó al día

Para cambios relevantes, además:

- ¿la spec mínima del slice quedó explícita?
- ¿el ownership del dato afectado quedó claro?
- ¿el gate `deploy/check_release_governance.sh` quedó en verde?

## Cierre esperado

Todo cierre debe dejar explícito:

- qué se hizo
- qué se validó
- qué archivos se actualizaron
- qué quedó pendiente
- cuál es ahora el siguiente paso correcto

## Regla final

No considerar "cerrado" un cambio global de la PaaS si solo quedó comprobado en un tenant o en un ambiente.

El cierre correcto debe dejar explícito:

- dónde quedó desplegado
- qué ambientes faltan
- qué tenants se verificaron
- qué drift real sigue abierto

Si mañana otra IA abre el repo, debe poder saber:

- qué leer
- qué validar
- qué actualizar
- y qué hacer después

Si eso no ocurre, la iteración todavía no está bien cerrada.

## Regla adicional para regresiones aparentes

Si un usuario reporta un problema sobre algo ya cerrado:

- primero validar runtime, caché, bundles y despliegue efectivo
- no reabrir documentalmente el slice durante exploración
- sólo actualizar memoria viva cuando el estado real ya esté confirmado
