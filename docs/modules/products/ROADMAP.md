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
- presets de conectores por proveedor
- actualización viva por artículo
- scheduler formal por tenant para `due_sources`
- corridas batch de refresh con progreso
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
- sincronización automática real por conector sobre fuentes persistidas
- vista `Comparación` con recomendación multi-fuente por producto
- overview con comparaciones recientes y métricas de productos multi-fuente
- vista `Actualizaciones` con:
  - `Actualizar ahora`
  - `Actualizar vencidos`
  - `Actualizar activos`
  - historial de corridas batch
- metadatos de refresh por fuente:
  - `refresh_mode`
  - `refresh_merge_policy`
  - `refresh_prompt`
  - `next_refresh_at`
  - `last_refresh_success_at`
- merge controlado de scraping sobre catálogo:
  - `price_only`
  - `safe_merge`
  - `overwrite_catalog`
- publicación y validación runtime de este slice en `staging` y `production`
- actualización viva ya publicada y validada en `staging` y `production` con:
  - backup PostgreSQL tenant previo por carril
  - backup adicional explícito de `ieris-ltda` en `production`
  - convergencia tenant `0049_products_live_refresh`
  - readiness final en verde
- migración `0050_products_connector_scheduler_and_provider_profiles`
- conectores ya muestran y persisten:
  - `provider_key`
  - `schedule_enabled`
  - `schedule_frequency`
  - `schedule_batch_limit`
  - `next_scheduled_run_at`
  - `last_schedule_status`
- runner formal cross-tenant disponible:
  - `backend/app/scripts/run_products_refresh_scheduler.py`

## Backlog posterior al cierre

1. conectores específicos por proveedor/fuente con autenticación propietaria
2. comparación multi-moneda/unidad más profunda
3. trazabilidad/versionado más rico de atributos técnicos por fuente
4. integración más profunda del catálogo con `projects`
5. scheduler con campañas/historial operativo más rico si el runner actual deja de bastar

## Siguiente slice recomendado

- abrir `projects` como consumidor fuerte del catálogo `products`
- si se mantiene foco en `products`, priorizar:
  - conectores concretos por marketplace/proveedor con autenticación propia
  - mejor conciliación de moneda/unidad
  - versionado más rico de atributos por fuente
- mantener la regla de dominio:
  - `products` sigue siendo módulo independiente
  - `crm` y futuros módulos como `projects` consumen el catálogo, pero no lo renombran ni lo absorben
