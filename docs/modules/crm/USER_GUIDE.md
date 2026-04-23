# CRM User Guide

Guía operativa del módulo `crm` (`CRM comercial`) para usuarios tenant y soporte funcional.

## Para qué sirve

Este módulo cubre el frente comercial del tenant:

- mantener catálogo reusable de productos y servicios
- registrar oportunidades comerciales
- trabajar el pipeline en kanban
- guardar contactos, notas, actividades y adjuntos por oportunidad
- cerrar oportunidades como `won` o `lost`
- crear plantillas comerciales reutilizables
- emitir cotizaciones estructuradas ligadas a clientes, oportunidades y catálogo

Base esperada:

- `crm` usa clientes de `business-core`
- no crea su propia tabla de clientes ni duplica identidad comercial

## Vistas disponibles

- `Resumen`
  - métricas rápidas del frente comercial
  - oportunidades recientes
  - cotizaciones recientes
- `Oportunidades`
  - tabla operativa
  - kanban por etapa
  - detalle comercial de la oportunidad
- `Histórico`
  - oportunidades cerradas (`won/lost`)
- `Cotizaciones`
  - propuestas con líneas libres, secciones y plantilla base opcional
- `Plantillas`
  - bases comerciales reutilizables para futuras propuestas
- `Productos`
  - catálogo reusable de productos/servicios con características

## Flujo operativo sugerido

1. crear o validar el cliente en `Core de negocio`
2. cargar productos o servicios reutilizables en `Productos`
3. si el tipo de propuesta se repite, crear una `Plantilla`
4. abrir una `Oportunidad`
5. usar contactos, notas, actividades y adjuntos para seguir la negociación
6. si ya hay propuesta, crear la `Cotización`
7. cerrar la oportunidad como `won` o `lost` cuando corresponda
8. revisar el resultado luego en `Histórico`

## Cómo usar cada frente

### Productos

Úsalo para mantener el catálogo comercial/técnico base.

Cada producto o servicio puede llevar:

- `SKU`
- nombre
- tipo
- unidad
- precio unitario
- descripción
- características

Las características sirven para:

- dejar ficha técnica rápida
- reutilizar vocabulario comercial
- diferenciar equipos o packs similares

### Oportunidades

Aquí vive el pipeline.

Cada oportunidad puede tener:

- cliente
- etapa
- valor esperado
- probabilidad
- cierre esperado
- canal de origen
- resumen
- próximo paso

Además, dentro del detalle puedes manejar:

- contactos comerciales
- notas
- actividades
- adjuntos
- historial de cambios de etapa

### Histórico

Muestra oportunidades ya cerradas.

Úsalo para:

- revisar negocios ganados o perdidos
- auditar motivos de cierre
- leer cierres recientes del equipo comercial

### Plantillas

Sirven para acelerar propuestas repetitivas.

Cada plantilla permite:

- crear secciones
- cargar ítems base
- usar productos del catálogo
- dejar ítems libres cuando haga falta

### Cotizaciones

Cada cotización puede usar:

- cliente
- oportunidad opcional
- plantilla opcional
- líneas libres
- secciones estructuradas
- descuento
- impuesto
- resumen
- notas

La vista previa económica recalcula:

- subtotal
- total
- cantidad de líneas libres
- cantidad de secciones
- cantidad de ítems estructurados

## Qué no hace todavía

Por ahora este módulo no incluye:

- render visual avanzado de cotizaciones
- PDF comercial final
- workflow formal de aprobación
- scraping de catálogo
- IA comercial local

## Dependencias visibles

- si no hay clientes en `business-core`, no habrá a quién ligar oportunidades o cotizaciones
- si no hay productos, igual puedes cotizar usando líneas manuales
- las plantillas no reemplazan el catálogo: lo aceleran

## Criterio de soporte

Si el usuario reporta que no ve el módulo:

- revisar que el tenant tenga habilitado el módulo `crm`
- revisar permisos tenant:
  - `tenant.crm.read`
  - `tenant.crm.manage`

Si reporta que no puede asociar un cliente:

- revisar que existan clientes activos en `business-core`

Si reporta que no puede usar una plantilla:

- revisar que la plantilla siga `Activa`
