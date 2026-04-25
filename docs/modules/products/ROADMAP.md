# Products Roadmap

Estado del módulo `products`.

## Estado actual

`products` ya quedó operativo para su alcance base actual.

El módulo ya cubre:

- catálogo reusable de productos y servicios
- características técnicas/comerciales
- ingesta asistida con borradores manuales
- extracción rápida por URL
- corridas batch por múltiples URLs
- conectores multi-fuente configurables
- fuentes persistidas por producto
- historial de eventos de precio
- aprobación al catálogo central
- descarte y reapertura
- deduplicación sugerida entre borradores y catálogo
- enriquecimiento controlado de borradores con heurística + IA opcional

## Cerrado en el alcance actual

- módulo tenant backend/frontend creado y funcional
- visibilidad propia en sidebar tenant
- permisos tenant propios
- add-on contractual `products`
- integración visible con `crm`
- documentación canónica completa del módulo
- publicación y validación runtime en `staging` y `production`
- scoring heurístico visible por `SKU`, nombre, marca y referencias
- enriquecimiento por borrador visible en `Products > Ingesta`
- deduplicación accionable contra catálogo publicado:
  - `Actualizar existente`
  - `Vincular existente`
- extracción técnica más profunda para atributos útiles en cotizaciones y proyectos
- vista `Fuentes/precios`
- vista `Conectores`
- persistencia automática de fuente/precio al aprobar o vincular borradores
- overview con métricas y lecturas recientes de:
  - fuentes
  - precios
  - conectores

## Backlog posterior al cierre

1. conectores automáticos reales por proveedor/fuente
2. comparación y recomendación de mejor precio vigente entre múltiples fuentes
3. normalización/categorización más profunda
4. trazabilidad/versionado más rico de atributos técnicos por fuente
5. integración más profunda del catálogo con `projects`

## Siguiente slice recomendado

- profundizar `products` con:
  - conectores automáticos reales
  - comparación multi-fuente
  - mejor soporte para consumo del catálogo en cotizaciones y proyectos
- mantener la regla de dominio:
  - `products` sigue siendo módulo independiente
  - `crm` y futuros módulos como `projects` consumen el catálogo, pero no lo renombran ni lo absorben
