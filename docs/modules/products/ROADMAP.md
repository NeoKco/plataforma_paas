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

## Backlog posterior al cierre

1. conectores multi-fuente más ricos
2. historial de precios por fuente y vigencia
3. normalización/categorización más profunda
4. deduplicación con merge sugerido o actualización del existente
5. enriquecimiento IA más profundo con atributos técnicos especializados

## Siguiente slice recomendado

- profundizar `products` con:
  - deduplicación accionable:
    - fusionar
    - actualizar existente
    - descartar como repetido
  - enriquecimiento IA más profundo sobre atributos técnicos y clasificación
  - mejor soporte para productos reutilizables en cotizaciones y proyectos
- mantener la regla de dominio:
  - `products` sigue siendo módulo independiente
  - `crm` y futuros módulos como `projects` consumen el catálogo, pero no lo renombran ni lo absorben
