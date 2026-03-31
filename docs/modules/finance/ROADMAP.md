# Finance Roadmap

Estado del módulo `finance`.

## Estado actual

`finance` está funcionalmente cerrado para el alcance actual del PaaS.

Ya cubre:

- catálogos y configuración
- transacciones modernas
- adjuntos y auditoría
- conciliación, favoritas y operaciones batch
- presupuestos
- préstamos
- planificación
- reportes
- importación legacy
- storage propio del módulo
- `delete seguro` en catálogos
- smoke browser base en plataforma y tenant

## Cerrado

- modelo modular backend/frontend
- compatibilidad legacy sobre `finance_transactions`
- seeds y migraciones tenant del dominio
- self-service de sync de schema
- categorías default ampliadas
- manejo de moneda base y formateo de montos
- ayudas contextuales en UI
- importador idempotente con compresión de imágenes
- E2E browser base revalidado con `empresa-bootstrap`
- E2E browser de `finance` validado para creación, adjunto, anulación, conciliación, límites visibles, mantenimiento de cuentas/categorías, configuración financiera base (`currencies`, `exchange rates`, `settings`), flujo base de presupuestos, flujo base de préstamos y batch/reversal de préstamos

## Próximo nivel recomendado

- ampliar E2E de `finance` para:
  - ajustes guiados y plantillas de presupuestos
  - exportaciones y lectura contable derivada de préstamos
- seguir la migración transversal del frontend al `design system`
- terminar de pulir copy residual `es/en`
- crear más specs browser sobre provisioning y recorridos tenant completos

## Deuda técnica visible

- falta una capa de changelog más disciplinada por versión/release
- todavía hay documentación detallada repartida entre backend/frontend/docs, aunque ya existe índice canónico
- el smoke browser cubre el flujo principal, pero aún no cubre regresiones más finas del módulo

## No prioritario ahora

- multi-browser E2E
- borrado físico de transacciones
- recalculo automático de histórico por cambio de moneda base

## Criterio para considerar una nueva expansión

Desde este punto, cualquier trabajo adicional de dominio en `finance` debe tratarse como:

- nueva capacidad del módulo
- hardening transversal
- automatización adicional

No como deuda del cierre base.
