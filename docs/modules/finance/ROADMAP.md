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
- smoke browser ampliado sobre presupuestos con plantillas y ajustes guiados
- smoke browser ampliado sobre préstamos con lectura contable derivada y exportaciones

## Cerrado

- modelo modular backend/frontend
- compatibilidad legacy sobre `finance_transactions`
- seeds y migraciones tenant del dominio
- bootstrap tenant con catálogo financiero inicial por vertical (`empresa` vs `condominio/hogar`)
- bootstrap tenant reforzado para sembrar baseline financiero también cuando el tenant habilita `core` o `finance` por contrato
- validación operativa en `staging` con tenants nuevos reales del baseline contractual:
  - `CLP` como base efectiva
  - coexistencia de `Casa - ...` y `Empresa - ...`
  - orden dominante según `tenant_type`
- self-service de sync de schema
- categorías default ampliadas
- manejo de moneda base y formateo de montos
- moneda base default `CLP` para tenants nuevos o tenants sin uso financiero todavía
- catálogo default mixto:
  - ingresos/egresos operativos compartidos
  - familias clasificadas `Casa - ...`
  - familias clasificadas `Empresa - ...`
- ayudas contextuales en UI
- importador idempotente con compresión de imágenes
- E2E browser base revalidado con `empresa-bootstrap`
- E2E browser de `finance` validado para creación, adjunto, anulación, conciliación, límites visibles, mantenimiento de cuentas/categorías, configuración financiera base (`currencies`, `exchange rates`, `settings`), flujo base de presupuestos, plantillas y ajustes guiados de presupuestos, flujo base de préstamos, batch/reversal de préstamos y lectura contable derivada con exportaciones

## Próximo nivel recomendado

- backlog transversal de mejoras sugeridas en [../improvements/README.md](/home/felipe/platform_paas/docs/modules/improvements/README.md)
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

## Nota operativa

El puente `maintenance -> finance` ya existe en primer corte:

- sync manual por OT
- política tenant `manual` o `auto_on_close`
- enlace a transacciones de ingreso/egreso desde el costeo real

El siguiente trabajo sobre esa frontera ya no es “crear la integración”, sino endurecer autollenado, defaults y ergonomía de cierre.
