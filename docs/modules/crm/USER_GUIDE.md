# CRM User Guide

Guía operativa del módulo `crm` (`CRM comercial`) para usuarios tenant y soporte funcional.

## Para qué sirve

Este módulo cubre el frente comercial base que faltaba en el PaaS:

- mantener un catálogo simple de productos y servicios
- registrar oportunidades comerciales
- emitir cotizaciones internas ligadas a clientes y catálogo

Base esperada:

- `crm` usa clientes de `business-core`
- no crea su propia tabla de clientes ni duplica identidad comercial

## Vistas del primer corte

- `Resumen`
  - métricas rápidas de productos activos, oportunidades, cotizaciones, pipeline y monto cotizado
- `Oportunidades`
  - pipeline comercial inicial
- `Cotizaciones`
  - propuestas comerciales con líneas
- `Productos`
  - catálogo reusable de productos/servicios

## Flujo operativo sugerido

1. crear o validar el cliente en `Core de negocio`
2. cargar productos o servicios reutilizables en `Productos`
3. abrir una `Oportunidad`
4. si ya hay propuesta, crear la `Cotización`
5. usar la cotización como base para el siguiente slice comercial

## Qué entra en este primer corte

- catálogo simple con `producto` o `servicio`
- oportunidades con:
  - etapa
  - valor esperado
  - probabilidad
  - cierre esperado
  - resumen
  - próximo paso
- cotizaciones con:
  - cliente
  - oportunidad opcional
  - número
  - vigencia
  - descuento
  - impuesto
  - líneas con producto o ítem manual

## Qué no entra todavía

- notas CRM por oportunidad
- actividades comerciales
- comentarios colaborativos
- archivos y adjuntos
- aprobación formal
- render o PDF de cotización
- plantillas visuales

## Regla UX vigente

- lectura primero
- captura bajo demanda
- catálogo visible en tabla y formulario lateral
- no se expone complejidad innecesaria de pipeline avanzada en este primer corte

## Dependencias visibles

- si no hay clientes en `business-core`, no habrá a quién ligar oportunidades o cotizaciones
- si no hay productos, igual puedes cotizar usando líneas manuales

## Criterio de soporte

Si el usuario reporta que no ve el módulo:

- revisar que el tenant tenga habilitado el módulo `crm`
- revisar permisos tenant:
  - `tenant.crm.read`
  - `tenant.crm.manage`
