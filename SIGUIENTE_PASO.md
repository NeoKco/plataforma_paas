# SIGUIENTE_PASO

## Prioridad vigente

- mover la prioridad al siguiente bloque central fuera de DLQ, ya con `Provisioning/DLQ broker-only` cerrado después de su última matriz visible

## Decisión previa obligatoria

- ¿qué decisión define el camino siguiente?
  - decidir cuál será el siguiente bloque central a retomar ahora que `Provisioning/DLQ` ya no es prioridad activa

## Próximo paso correcto

- volver al roadmap central y seleccionar el siguiente frente fuera de DLQ
- definir si ese siguiente frente será endurecimiento transversal de `platform-core` fuera de DLQ o reanudación de un módulo funcional abierto
- preparar ese siguiente frente con el mismo estándar:
  - definición clara del alcance
  - corte visible o técnico concreto
  - validación `repo`
  - si aplica, validación `staging/production`

## Si el escenario principal falla

- si el roadmap central no deja claro el siguiente bloque, hacer primero una pasada corta de priorización antes de escribir código
- si reaparece una necesidad operativa real de DLQ, reabrirlo como incidencia o corte explícito, no como continuación por inercia

## Condición de cierre de la próxima iteración

- la próxima iteración debe dejar seleccionado y arrancado el siguiente bloque central fuera de DLQ, con estado y handoff actualizados y sin reabrir DLQ por defecto
