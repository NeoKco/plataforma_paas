# SIGUIENTE_PASO

## Prioridad vigente

- seguir con `platform-core hardening + E2E` dentro de `Provisioning/DLQ`, ya sobre una base donde la capacidad activa del entorno, el gating visible, el foco por familia y el helper published broker-only de `staging` quedaron cerrados

## Decisión previa obligatoria

- ¿qué decisión define el camino siguiente?
  - definir cuál será el siguiente slice funcional broker-only dentro del panel DLQ
  - sin reabrir ya el helper ni la topología
- la decisión recomendada hoy es:
  - seguir en `staging`
  - no tocar topología productiva todavía
  - reutilizar el helper recién cerrado como carril de validación

## Próximo paso correcto

- asumir cerrados estos subfrentes:
  - `Nuevo tenant`
  - portabilidad tenant dual
  - salto `Tenants -> Provisioning`
  - `Investigar en DLQ`
  - observabilidad visible
- `requeue guiado`
- capacidad activa de `dispatch backend`
- gating visible de la superficie `Operación DLQ`
- `familias DLQ visibles`
- helper published broker-only de `staging`
- abrir el siguiente slice funcional DLQ broker-only que reutilice la base ya visible y el helper ya cerrado
- validar primero en `staging`
- sólo después decidir si ese corte debe o no promocionarse a `production`

## Si el escenario principal falla

- si `staging` deja de correr con `dispatch backend = broker`, no avanzar en smokes broker-only y corregir primero el entorno
- si el siguiente corte requiere seeds nuevos o más complejos, extender el helper o documentar el nuevo setup sin romper el flujo corto ya cerrado
- si aparece necesidad explícita de validar broker-only en `production`, abrir primero una iteración separada de topología y despliegue antes de tocar más UI

## Condición de cierre de la próxima iteración

- la próxima iteración debe cerrar con uno de estos resultados:
  - un nuevo corte broker-only real adicional de `Provisioning/DLQ` implementado, validado y documentado
  - o un bloqueo real explícito, con la causa operativa y el siguiente movimiento correctivo ya escritos en el handoff
