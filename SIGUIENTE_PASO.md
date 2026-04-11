# SIGUIENTE_PASO

## Prioridad vigente

- seguir con `platform-core hardening + E2E` dentro de `Provisioning/DLQ`, ya sobre una base donde la capacidad activa del entorno, el gating visible y el foco por familia DLQ quedaron cerrados

## Decisión previa obligatoria

- ¿qué decisión define el camino siguiente?
  - definir si el siguiente corte prioriza endurecimiento operativo del carril published broker-only
  - o si vuelve a profundización funcional broker-only dentro del panel DLQ
- la decisión recomendada hoy es:
  - seguir en `staging`
  - no tocar topología productiva todavía
  - encapsular primero el setup E2E publicado para no depender de pasos manuales con `/tmp/...env`

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
- abrir el siguiente corte sobre published broker-only con uno de estos focos:
  - helper/script/runbook corto para correr smokes broker-only publicados sobre `staging` sin rearmar manualmente `E2E_BACKEND_*`
  - o un siguiente slice funcional DLQ broker-only que reutilice las familias ya visibles
- validar primero en `staging`
- sólo después decidir si ese corte debe o no promocionarse a `production`

## Si el escenario principal falla

- si `staging` deja de correr con `dispatch backend = broker`, no avanzar en smokes broker-only y corregir primero el entorno
- si el siguiente corte sigue necesitando `E2E_BACKEND_ENV_FILE` temporal y no se encapsula en helper, dejarlo explícito como deuda operativa y no vender el flujo como trivial
- si aparece necesidad explícita de validar broker-only en `production`, abrir primero una iteración separada de topología y despliegue antes de tocar más UI

## Condición de cierre de la próxima iteración

- la próxima iteración debe cerrar con uno de estos resultados:
  - un helper/runbook published broker-only de `Provisioning/DLQ` implementado y validado
  - o un nuevo corte broker-only real adicional de `Provisioning/DLQ` implementado, validado y documentado
  - o un bloqueo real explícito, con la causa operativa y el siguiente movimiento correctivo ya escritos en el handoff
