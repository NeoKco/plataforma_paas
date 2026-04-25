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
  - conectores multi-fuente configurables
  - sincronización automática real por conector
  - comparación multi-fuente por producto
  - historial de fuentes por producto
  - historial de eventos de precio por producto
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
  - selección opcional de conector
  - normalización mínima previa
  - descarte y reapertura
  - aprobación al catálogo central
- conectores de fuente con:
  - nombre
  - tipo
  - estado activo/inactivo
  - modo de sincronización
  - estrategia de extracción
  - enriquecimiento IA opcional
  - configuración operativa breve
  - métricas de uso visibles
- comparación multi-fuente con:
  - mejor referencia sugerida
  - precio recomendado
  - brecha entre precios observados
  - ranking visible de fuentes por producto
- fuentes por producto con:
  - URL/ref externa
  - proveedor
  - moneda
  - precio más reciente
  - vigencia
  - estado de sincronización
  - último intento
  - último error visible
- historial de precio con:
  - monto
  - moneda
  - fecha efectiva
  - observación
  - fuente asociada cuando aplica
- resumen operativo con métricas de catálogo e ingesta

Queda fuera por ahora:

- conectores específicos por marketplace/proveedor con autenticación propietaria
- versionado más profundo de atributos técnicos por fuente
- conciliación automática avanzada entre múltiples monedas y unidades

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
- persistencia automática de fuente/precio al aprobar o vincular borradores
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
