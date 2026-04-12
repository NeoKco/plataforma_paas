# SIGUIENTE_PASO

## Prioridad vigente

- publicar y validar en `staging` el nuevo bootstrap contractual por módulos antes de abrir el autollenado fino `maintenance -> finance`

## Decisión previa obligatoria

- ¿qué decisión define el camino siguiente?
  - si la validación del baseline tenant nuevo se cerrará con smoke/browser o con verificación manual guiada en `staging`

## Próximo paso correcto

- desplegar este subcorte en `staging`
- crear o reprovisionar un tenant de prueba con `core`
- verificar:
  - moneda base `CLP`
  - categorías `Casa - ...` y `Empresa - ...`
  - perfiles funcionales default
  - tipos de tarea default
- si esa validación queda limpia, promover el mismo subcorte a `production`
- después de eso, abrir el slice de autollenado `maintenance -> finance`

## Si el escenario principal falla

- si el bootstrap visible no queda correcto en `staging`, corregir primero seed/backfill antes de tocar `maintenance -> finance`
- si el problema es solo de validación browser y no de backend, dejar runbook/manual de verificación y no mezclar el arreglo con el siguiente slice funcional

## Condición de cierre de la próxima iteración

- el siguiente cierre debe dejar este subcorte publicado y validado al menos en `staging`, o dejar un bloqueo técnico explícito con evidencia suficiente para retomarlo sin releer el chat
