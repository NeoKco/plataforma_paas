# SIGUIENTE_PASO

## Prioridad vigente

- decidir si el corte `maintenance contractual + finance bootstrap por vertical` se publica ahora a `staging/production` antes de abrir el ajuste fino `maintenance -> finance`

## Decisión previa obligatoria

- ¿qué decisión define el camino siguiente?
  - si este corte se despliega ya para validarlo visualmente en entorno o si se sigue primero en repo con el siguiente slice funcional de autollenado `maintenance -> finance`

## Próximo paso correcto

- si la decisión es publicar:
  - desplegar backend/frontend en `staging`
  - validar sidebar tenant con contrato `maintenance` separado
  - validar bootstrap de tenant nuevo `empresa` y `condominio` revisando categorías por defecto
- si la decisión es seguir primero en repo:
  - abrir el slice de autollenado entre `maintenance` y `finance`
  - usar el nuevo catálogo vertical como base para seleccionar categorías sugeridas o por defecto

## Si el escenario principal falla

- si la publicación a `staging` detecta regresión de contrato, corregir primero middleware + sidebar antes de tocar `maintenance -> finance`
- si el bootstrap vertical de categorías no queda suficientemente claro para operación, agregar un helper visible o runbook corto de verificación por tenant nuevo
- si el usuario prefiere no publicar aún, no mezclar rollout con nuevos cambios funcionales; dejar explícito que el corte queda validado solo en repo

## Condición de cierre de la próxima iteración

- la próxima iteración debe dejar una de estas dos cosas cerradas:
  - este corte ya publicado y validado en entorno
  - o el siguiente slice `maintenance -> finance` arrancado sobre esta base, con handoff actualizado
