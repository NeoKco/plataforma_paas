# SIGUIENTE_PASO

## Prioridad vigente

- abrir el segundo corte funcional `maintenance -> finance`, ahora sobre llenado fino operativo y no sobre defaults efectivos

## Decisión previa obligatoria

- fijar qué parte del llenado fino debe atacarse primero:
  - glosa y referencia sugerida
  - sync al cerrar OT
  - sync manual desde `Costos y cobro`
  - reglas de campos bloqueados vs editables

## Próximo paso correcto

- definir el flujo funcional exacto del segundo corte `maintenance -> finance`:
  - qué se propone automáticamente
  - qué se deriva desde OT
  - qué sigue editable por el operador
  - en qué momento se crea o propone el movimiento financiero
- después implementar el primer subcorte usable con evidencia browser o backend suficiente

## Si el escenario principal falla

- si aparece ambigüedad funcional, cerrar primero reglas de negocio antes de tocar código
- si el nuevo llenado fino rompe el puente actual, preservar el contrato ya validado de defaults efectivos y aislar el cambio nuevo detrás de un corte más pequeño
- si surge inconsistencia contable real, revisar primero `transaction_service.py` y la gobernanza de datos antes de automatizar más campos

## Condición de cierre de la próxima iteración

- debe quedar cerrada la especificación operativa del segundo corte `maintenance -> finance`, o idealmente implementado y validado su primer subcorte funcional
