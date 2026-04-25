# Products Module

Documentación canónica del módulo `products`.

Nombre funcional visible:

- `Catálogo de productos`

Estado actual:

- módulo tenant independiente ya operativo en repo y runtime
- concentra:
  - catálogo técnico-comercial reusable
  - scraping/ingesta asistida
  - extracción por URL
  - corridas batch
  - revisión previa a publicación
- otros módulos lo consumen, pero no lo poseen:
  - `crm`
  - futuros `projects`

Objetivo del módulo:

- mantener un catálogo vivo de productos y servicios
- usar scraping y más adelante IA para traer/normalizar información actualizada
- dejar una base reusable para cotizaciones, proyectos y otros dominios sin amarrarla a CRM

## Alcance actual

El módulo hoy incluye:

- catálogo de productos y servicios con:
  - `sku`
  - tipo `product/service`
  - precio unitario base
  - descripción
  - características técnicas/comerciales
- ingesta asistida con:
  - borradores manuales
  - extracción por URL
  - corridas batch por URLs
  - normalización mínima previa
  - descarte y reapertura
  - aprobación al catálogo central
- resumen operativo con métricas de catálogo e ingesta

Queda fuera por ahora:

- conectores multi-fuente más ricos
- tracking histórico de precios por fuente

Ya quedó incluido además:

- deduplicación sugerida entre borradores y catálogo
- scoring heurístico por:
  - `SKU`
  - nombre
  - marca
  - URL/referencia externa
- enriquecimiento controlado del borrador:
  - normalización heurística base
  - uso opcional de la API IA existente si el entorno runtime la configura
- deduplicación accionable sobre catálogo ya publicado:
  - `Actualizar existente`
  - `Vincular existente`
- extracción técnica más profunda desde texto y scraping para atributos útiles en cotizaciones y proyectos:
  - `Potencia`
  - `Voltaje`
  - `Corriente`
  - `Capacidad`
  - `Presión`
  - `Temperatura`
  - `Peso`
  - `Dimensiones`
  - `Modelo`
