# SIGUIENTE_PASO

## Prioridad vigente

- decidir si el corte `maintenance contractual + finance bootstrap por vertical`, ya validado en `staging`, se promueve ahora a `production` o si primero se abre el ajuste fino `maintenance -> finance`

## Decisión previa obligatoria

- ¿qué decisión define el camino siguiente?
  - si este corte se promueve ya a `production` o si se aprovecha primero la base ya validada en `staging` para abrir el siguiente slice funcional de autollenado `maintenance -> finance`

## Próximo paso correcto

- si la decisión es promover:
  - publicar backend/frontend en `production`
  - validar sidebar tenant con contrato `maintenance` separado
  - si se quiere cierre visible completo, crear un tenant nuevo `empresa` y uno `condominio` para revisar categorías por defecto
- si la decisión es seguir primero sobre esta base:
  - abrir el slice de autollenado entre `maintenance` y `finance`
  - usar el nuevo catálogo vertical como base para seleccionar categorías sugeridas o por defecto

## Si el escenario principal falla

- si la promoción a `production` detecta regresión de contrato, corregir primero middleware + sidebar antes de tocar `maintenance -> finance`
- si el bootstrap vertical de categorías no queda suficientemente claro para operación, agregar un helper visible o runbook corto de verificación por tenant nuevo
- si el usuario prefiere no promover aún, no mezclar ese rollout con nuevos cambios funcionales; dejar explícito que el corte queda validado en `staging` y en repo

## Condición de cierre de la próxima iteración

- la próxima iteración debe dejar una de estas dos cosas cerradas:
  - este corte ya promovido y validado en `production`
  - o el siguiente slice `maintenance -> finance` arrancado sobre esta base ya validada en `staging`, con handoff actualizado
