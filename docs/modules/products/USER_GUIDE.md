# Products User Guide

Guía operativa del módulo `products` (`Catálogo de productos`) para usuarios tenant y soporte funcional.

## Qué resuelve hoy

`products` sirve para:

- mantener el catálogo reusable de productos y servicios
- capturar productos desde URLs o carga manual
- revisar borradores antes de publicarlos
- dejar base estable para cotizaciones y futuros proyectos

## Vistas principales

- `Resumen`
  lectura rápida de catálogo e ingesta
- `Catálogo`
  CRUD del catálogo base
- `Ingesta`
  captura manual, extracción por URL y corridas batch

## Flujo recomendado

1. capturar borradores en `Ingesta`
2. revisar y completar atributos
3. aprobar al catálogo central
4. reutilizar el producto desde `crm` u otros módulos consumidores

## Regla conceptual

`products` es un módulo base compartido.

No debe tratarse como:

- submódulo de `crm`
- lista interna de una sola cotización
- catálogo temporal de un proyecto puntual

