# Finance Changelog

Resumen curado de hitos del módulo `finance`.

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
- el storage final del módulo quedó en [attachments](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/storage/attachments)

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

### E2E browser

- se incorporó stack Playwright base
- smoke `platform_admin` operativo
- smoke `tenant finance` revalidado usando `empresa-bootstrap`
- smoke `tenant finance` ampliado a creación, adjunto, anulación, conciliación, enforcement visible de límites, catálogos básicos (`accounts`, `categories`), configuración base (`currencies`, `exchange rates`, `settings`), presupuestos base (`create`, `clone`), plantillas/ajustes guiados de presupuestos, préstamos base (`create`, `payment`) y batch/reversal de préstamos
- se agregó un smoke específico para `Presupuestos` avanzados que valida `previous_month` con escala/redondeo y la acción guiada de desactivación sobre categorías enfocadas
- se estabilizaron los smokes de préstamos corrigiendo locators y supuestos de UI para cronograma abierto, formulario simple vs batch y selección explícita de cuenta/nota/motivo de reversa
- no se registraron cambios funcionales de producto en esta ampliación de `Presupuestos`, porque el comportamiento ya existía en frontend/backend y el trabajo fue cerrar cobertura browser sobre capacidades ya operativas
- no se registraron cambios funcionales de producto en esta iteración porque la incidencia cerrada correspondía a fragilidad de automatización, no a un defecto del flujo real de préstamos
