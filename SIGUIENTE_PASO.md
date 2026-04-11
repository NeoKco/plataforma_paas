# SIGUIENTE_PASO

## Prioridad vigente

- seguir con `platform-core hardening + E2E` dentro de `Provisioning/DLQ`, ya sobre una base donde la capacidad activa del entorno y el gating visible del panel DLQ quedaron cerrados

## Decisión previa obligatoria

- ¿qué decisión define el camino siguiente?
  - definir si el siguiente corte será una profundización broker-only real en `staging`
  - o si existe una necesidad explícita de llevar también `production` a `dispatch backend = broker`
- la decisión recomendada hoy es:
  - seguir en `staging`
  - no tocar topología productiva todavía

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
- abrir el siguiente corte broker-only real dentro de `Provisioning/DLQ`
- priorizar un subfrente que agregue valor operativo real sin mover infraestructura base
- validar primero en `staging`
- sólo después decidir si ese corte debe o no promocionarse a `production`

## Si el escenario principal falla

- si `staging` deja de correr con `dispatch backend = broker`, no avanzar en smokes broker-only y corregir primero el entorno
- si el siguiente corte exige broker real pero la semilla E2E no logra preparar datos DLQ, documentar el bloqueo y no maquillar el cierre
- si aparece necesidad explícita de validar broker-only en `production`, abrir primero una iteración separada de topología y despliegue antes de tocar más UI

## Condición de cierre de la próxima iteración

- la próxima iteración debe cerrar con uno de estos resultados:
  - un nuevo corte broker-only real de `Provisioning/DLQ` implementado, validado y documentado
  - o un bloqueo real explícito, con la causa operativa y el siguiente movimiento correctivo ya escritos en el handoff
