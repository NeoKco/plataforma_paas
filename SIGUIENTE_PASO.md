# SIGUIENTE_PASO

## Prioridad vigente

- dejar cerrado `Provisioning/DLQ broker-only` y mover la prioridad al siguiente bloque central fuera de DLQ

## Decisión previa obligatoria

- ¿qué decisión define el camino siguiente?
  - decidir cuál será el siguiente bloque central a retomar ahora que `Provisioning/DLQ` deja de ser prioridad activa

## Próximo paso correcto

- dejar explícito en el handoff que `Provisioning/DLQ` ya quedó suficientemente endurecido y que nuevos cortes ahí pasan a backlog opcional
- volver al roadmap central y seleccionar el siguiente frente fuera de DLQ
- preparar ese siguiente frente con el mismo estándar:
  - definición clara del alcance
  - corte visible o técnico concreto
  - validación `repo`
  - si aplica, validación `staging/production`

## Si el escenario principal falla

- si el roadmap central no deja claro el siguiente bloque, hacer primero una pasada corta de priorización antes de escribir código
- si reaparece una necesidad operativa real de DLQ, reabrirlo como incidencia o corte explícito, no como continuación por inercia

## Condición de cierre de la próxima iteración

- la próxima iteración debe dejar seleccionado y arrancado el siguiente bloque central fuera de DLQ, con estado y handoff actualizados
