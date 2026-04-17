# Finance Changelog

Resumen curado de hitos del módulo `finance`.

## 2026-04

### Incidente cerrado: adjuntos por transacción en runtime productivo

- se corrigió un incidente real en `ieris-ltda` donde subir adjuntos a transacciones devolvía `500 Internal Server Error`
- la causa no fue tenant-local ni frontend:
  - `production` seguía ejecutando un `settings.py` viejo en `/opt/platform_paas/backend`
  - ese runtime apuntaba a la ruta legacy bajo `apps/tenant_modules/finance/storage/attachments`
  - el repo ya estaba corregido hacia storage compartido
- se promovió el backend real desde repo a runtime y se redeployó en `staging` y `production`
- el storage efectivo de adjuntos queda declarado como:
  - [backend/storage/finance_attachments](/home/felipe/platform_paas/backend/storage/finance_attachments)
- validación real posterior:
  - upload HTTP sobre `POST /tenant/finance/transactions/{transaction_id}/attachments` -> `200 OK`
  - conteo de adjuntos en detalle de transacción -> actualizado correctamente
- lección operativa:
  - `repo != runtime`
  - un fix backend no se da por cerrado hasta promoverlo y redeployarlo en el ambiente afectado

## 2026-03

### Estructura y catálogos

- se consolidó la estructura modular backend/frontend de `finance`
- se agregaron seeds tenant para monedas, settings y catálogo default ampliado de categorías
- se incorporó `CLP` y formateo coherente según moneda base

### Núcleo transaccional

- se consolidó `finance_transactions` como núcleo real
- `/tenant/finance/entries` quedó como compatibilidad legacy
- se añadieron filtros, edición, favoritas, conciliación y operaciones batch
- se agregó anulación blanda con trazabilidad

### Adjuntos y storage

- se incorporaron adjuntos reales por transacción
- el frontend comprime imágenes antes de subir
- el storage final del módulo queda en [backend/storage/finance_attachments](/home/felipe/platform_paas/backend/storage/finance_attachments)

### Importación legacy

- se agregó importador offline para `egresos.csv`
- se soportó compresión previa de imágenes y carga idempotente de adjuntos/transacciones
- se consolidaron categorías operativas derivadas del dataset legacy

### Presupuestos, préstamos, planificación y reportes

- se cerró la primera versión operativa de `Presupuestos`
- se cerró la primera versión operativa de `Préstamos`
- se añadió `Planificación`
- se añadieron `Reportes` con comparativas, rankings y exportaciones

### Seguridad operativa y schema

- se reforzó el manejo controlado de schema incompleto
- se agregó self-service de sync de schema desde portal tenant
- se corrigieron migraciones tenant y se añadió reparación para columnas faltantes en `finance_transactions`

### CRUD seguro

- se habilitó `delete seguro` en cuentas, categorías, etiquetas, beneficiarios, personas, proyectos, monedas y tipos de cambio
- cuando existen referencias reales, el backend bloquea `delete` y obliga a operar con `desactivar`

### UX y frontend

- se añadieron ayudas contextuales tipo burbuja
- se ajustó el formateo monetario para respetar monedas sin decimales como `CLP`
- se mejoró la visualización de adjuntos dentro de acciones y detalle operacional
- `Cuentas`, `Categorías`, `Catálogos auxiliares` y `Configuración` pasan a alta/edición bajo demanda en modal, dejando el catálogo como lectura principal
- `Movimientos` pasa a `Registrar transacción` bajo demanda en modal, `Ver` abre detalle en modal y el panel fijo `Detalle operacional` sale de la pantalla principal
- `Presupuestos` pasa a `Nuevo presupuesto` bajo demanda en modal
- `Préstamos` pasa a `Nuevo préstamo` bajo demanda en modal
- se formalizó el [Estandar de botones CRUD](/home/felipe/platform_paas/docs/architecture/crud-button-standard.md) tomando `business-core` como referencia visual y operativa
- se corrigió un bug de horario en `Movimientos`: el formulario usaba `toISOString().slice(0, 16)` para `datetime-local`, adelantando la hora local al guardar; ahora `Transacciones` y `Configuración` convierten fecha/hora local con helper dedicado
- `Transacciones` y `Configuración` pasan a usar la zona horaria efectiva del tenant/usuario en vez de asumir solo la del navegador

### Integración futura con maintenance

- se fija documentalmente que la futura integración `maintenance` -> `finance` debe usar `finance_transactions.source_type/source_id` como enlace canónico, sin duplicar el núcleo contable dentro del módulo técnico
- el primer corte real de esa integración queda operativo desde `maintenance` con sincronización manual de ingreso/egreso por OT, manteniendo a `finance` como dueño del registro económico y a `maintenance` como dueño del costeo operativo
- se agrega soporte operativo para que cada tenant decida si ese puente sigue manual o pasa a `auto_on_close`; la política vive en `tenant_info` y mantiene a `finance` como dueño del registro económico

### E2E browser

- se incorporó stack Playwright base
- smoke `platform_admin` operativo
- smoke `tenant finance` revalidado usando `empresa-bootstrap`
- smoke `tenant finance` ampliado a creación, adjunto, anulación, conciliación, enforcement visible de límites, catálogos básicos (`accounts`, `categories`), configuración base (`currencies`, `exchange rates`, `settings`), presupuestos base (`create`, `clone`), plantillas/ajustes guiados de presupuestos, préstamos base (`create`, `payment`), batch/reversal de préstamos y lectura/exportación contable derivada
- se agregó un smoke específico para `Presupuestos` avanzados que valida `previous_month` con escala/redondeo y la acción guiada de desactivación sobre categorías enfocadas
- se agregó un smoke específico para `Préstamos` contables que valida pago simple + reversa, tabla derivada y exportaciones `CSV`/`JSON`
- se estabilizaron los smokes de préstamos corrigiendo locators y supuestos de UI para cronograma abierto, formulario simple vs batch y selección explícita de cuenta/nota/motivo de reversa
- se agregó un `tsconfig` local para `frontend/e2e` y soporte de `@types/node` para validar descargas de Playwright sin afectar el build del frontend
- no se registraron cambios funcionales de producto en esta ampliación de `Presupuestos`, porque el comportamiento ya existía en frontend/backend y el trabajo fue cerrar cobertura browser sobre capacidades ya operativas
- no se registraron cambios funcionales de producto en esta ampliación de `Préstamos`, porque el comportamiento ya existía en frontend/backend y el trabajo fue cerrar cobertura browser sobre capacidades ya operativas
- no se registraron cambios funcionales de producto en esta iteración porque la incidencia cerrada correspondía a fragilidad de automatización, no a un defecto del flujo real de préstamos
