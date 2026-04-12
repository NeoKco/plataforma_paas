# SIGUIENTE_PASO

## Prioridad vigente

- abrir el slice de llenado fino `maintenance -> finance` sobre una base ya publicada y validada en `staging` y `production`

## Decisión previa obligatoria

- ¿qué decisión define el camino siguiente?
  - qué reglas exactas de autollenado entre `maintenance` y `finance` deben quedar como baseline primero: categorías, cuentas, price/cost default o ambos

## Próximo paso correcto

- abrir el slice de autollenado entre `maintenance` y `finance`
- usar el nuevo catálogo vertical como base para seleccionar categorías sugeridas o por defecto
- mantener como verificación complementaria pendiente, pero no bloqueante del slice:
  - alta visible de un tenant nuevo `empresa`
  - alta visible de un tenant nuevo `condominio`
  - revisión de categorías por defecto sembradas en cada caso

## Si el escenario principal falla

- si el bootstrap vertical de categorías no queda suficientemente claro para operación, agregar un helper visible o runbook corto de verificación por tenant nuevo
- si el slice `maintenance -> finance` descubre huecos de catálogo, corregir primero defaults/categorías base antes de automatizar costeo o cobro

## Condición de cierre de la próxima iteración

- la próxima iteración debe dejar una de estas dos cosas cerradas:
  - reglas base de autollenado `maintenance -> finance` definidas e implementadas en un primer corte
  - o, como mínimo, el diseño funcional/backend/frontend de ese slice dejado cerrado para implementación directa
