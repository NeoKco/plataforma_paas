# Products User Guide

Guía operativa del módulo `products` (`Catálogo de productos`) para usuarios tenant y soporte funcional.

## Qué resuelve hoy

`products` sirve para:

- mantener el catálogo reusable de productos y servicios
- capturar productos desde URLs o carga manual
- revisar borradores antes de publicarlos
- mantener fuentes vigentes por producto
- registrar y revisar historial de precios
- configurar conectores de ingesta
- dejar base estable para cotizaciones y futuros proyectos

## Vistas principales

- `Resumen`
  lectura rápida de catálogo e ingesta
- `Catálogo`
  CRUD del catálogo base
- `Ingesta`
  captura manual, extracción por URL y corridas batch
- `Fuentes/precios`
  fuentes activas por producto e historial de eventos de precio
- `Conectores`
  perfiles de origen para la ingesta

## Qué agrega este cierre

En `Ingesta`, cada borrador ya puede mostrar:

- posibles duplicados contra catálogo o contra otros borradores
- puntaje de similitud
- razón principal de la coincidencia
- estado de enriquecimiento
- disponibilidad del carril IA

Además, el operador ya puede usar:

- `Enriquecer`
  normaliza y mejora el borrador antes de aprobarlo
- `Actualizar existente`
  aplica el borrador sobre un producto ya existente del catálogo cuando la coincidencia sugerida es correcta
- `Vincular existente`
  marca el borrador como resuelto contra un producto existente sin modificar el catálogo
- `Aprobar`
  publica el producto al catálogo final
- `Descartar` / `Reabrir`
  controla el carril revisable sin borrar historial operativo

## Fuentes y precios

`Fuentes/precios` sirve para:

- revisar desde dónde se obtuvo el producto
- registrar proveedor, URL y referencia externa
- guardar precio referencial o vigente
- dejar trazabilidad manual cuando el scraping no cubre toda la información

Flujo recomendado:

1. capturar o enriquecer un borrador en `Ingesta`
2. aprobarlo al catálogo
3. revisar en `Fuentes/precios` si quedó asociada la fuente correcta
4. registrar un nuevo evento de precio si necesitas dejar un valor más actualizado o más formal

## Conectores

`Conectores` sirve para mantener perfiles operativos de origen.

Cada conector puede representar, por ejemplo:

- un proveedor
- un marketplace
- un sitio técnico recurrente
- una familia de scraping/manual ingest

Uso recomendado:

1. crear conectores antes de iniciar corridas batch relevantes
2. elegir el conector al crear borradores o corridas por URL
3. usar ese contexto luego para leer fuente/precio y revisar calidad de captura

## Flujo recomendado

1. capturar borradores en `Ingesta`
2. usar `Enriquecer` para normalizar y extraer atributos técnicos/comerciales
3. si aparece coincidencia fuerte con catálogo:
   - usar `Actualizar existente` cuando el borrador trae mejor información
   - usar `Vincular existente` cuando solo quieres resolver el duplicado
4. aprobar al catálogo central solo si el producto realmente es nuevo
5. reutilizar el producto desde `crm` u otros módulos consumidores

## Enriquecimiento técnico actual

El enriquecimiento ya intenta completar o normalizar:

- marca
- categoría
- origen
- potencia
- voltaje
- corriente
- capacidad
- presión
- temperatura
- peso
- dimensiones
- modelo

## Regla conceptual

`products` es un módulo base compartido.

No debe tratarse como:

- submódulo de `crm`
- lista interna de una sola cotización
- catálogo temporal de un proyecto puntual
