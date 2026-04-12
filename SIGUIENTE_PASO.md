# SIGUIENTE_PASO

## Prioridad vigente

- abrir el slice de autollenado fino `maintenance -> finance` sobre una base contractual y de bootstrap ya publicada en `staging` y `production`

## Decisión previa obligatoria

- ¿qué decisión define el camino siguiente?
  - definir el alcance exacto del primer corte de autollenado:
    - si el sync sugerido ocurrirá al cerrar la OT o al confirmar costeo/cobro
    - qué campos se autocompletan y cuáles quedan siempre editables

## Próximo paso correcto

- revisar el puente ya existente `maintenance -> finance` para delimitar qué ya está resuelto y qué falta realmente en autollenado
- cerrar reglas funcionales de sugerencia:
  - categoría ingreso por defecto
  - categoría egreso por defecto
  - cuenta y glosa sugeridas
  - momento del sync
- implementar el primer corte usable sin duplicar lógica ya existente

## Si el escenario principal falla

- si durante la revisión aparece que el puente actual `maintenance -> finance` está incompleto o inconsistente, cerrar primero ese gap real antes de agregar autollenado
- si el problema es sólo de defaults financieros por tenant, arreglar bootstrap/catalogación sin mezclarlo con UX de mantenimiento

## Condición de cierre de la próxima iteración

- la próxima iteración debe dejar definido e implementado el primer corte de autollenado `maintenance -> finance`, o un bloqueo funcional explícito con evidencia suficiente para retomarlo sin releer el chat
