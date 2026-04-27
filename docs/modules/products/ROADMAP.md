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
- importación legacy completa desde `ieris_app`
- conectores multi-fuente configurables
- presets de conectores por proveedor
- perfiles runtime por proveedor
- validación operativa por conector
- actualización viva por artículo
- scheduler formal por tenant para `due_sources`
- automatización gobernada por tenant para `due_sources`
- corridas batch de refresh con progreso
- fuentes persistidas por producto
- historial de eventos de precio
- galería comprimida por producto/servicio
- aprobación al catálogo central
- descarte y reapertura
- eliminación física de borradores no aprobados
- deduplicación sugerida entre borradores y catálogo
- enriquecimiento controlado de borradores con heurística + IA opcional
- extracción IA genérica como carril principal para URL y batch
- fotos comprimidas por artículo con imagen principal
- reconciliación idempotente de catálogo legacy por `legacy_id`

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
- eliminación visible de borradores basura desde `Ingesta` sin tocar aprobados
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
- migración `0051_products_connector_runtime_profiles`
- conectores ya muestran y persisten además:
  - `provider_profile`
  - `auth_mode`
  - `auth_reference`
  - `request_timeout_seconds`
  - `retry_limit`
  - `retry_backoff_seconds`
  - `last_validation_at`
  - `last_validation_status`
  - `last_validation_summary`
- validación explícita desde:
  - `POST /tenant/products/connectors/{connector_id}/validate`
- primer conector patrón profundizado:
  - `mercadolibre`
  - referencia externa desde URL
  - prioridad a JSON-LD + metadata + hints
  - características extra operativas
- automatización gobernada ya publicada:
  - vista tenant `Automatización`
  - `GET /tenant/products/scheduler/overview`
  - `POST /tenant/products/scheduler/run-due`
  - runner cross-tenant con:
    - `--dry-run`
    - `--json-output`
- extracción reforzada además para:
  - `sodimac`
  - `easy`
- pipeline genérico alineado a `ieris_app` para URL y lote:
  - scraping/preprocesado
  - prompt técnico
  - llamada `/analyze`
  - postproceso estructurado
  - error explícito si la IA no está configurada
  - timeout largo para capturas lentas
  - preferencia por el título principal de la página para evitar arrastrar subtítulos/leyendas al nombre del producto
  - extracción rápida por URL convertida a corrida asíncrona con progreso visible y apertura automática del borrador
- trazabilidad visible de IA en el borrador (`Extracción IA`, estrategia y resumen)
- import de `ieris_app` validado sobre `ieris-ltda` con cierre exacto:
  - `117 products`
  - `647 characteristics`
  - `117 sources`
  - `117 price_history`
  - `117 images`

## Backlog posterior al cierre

1. conectores específicos por proveedor/fuente con autenticación propietaria más profunda
2. scheduler automático gobernado por worker/cron del entorno ya institucionalizado fuera del runner manual
3. comparación multi-moneda/unidad más profunda
4. trazabilidad/versionado más rico de atributos técnicos por fuente
5. integración más profunda del catálogo con `projects`
6. scheduler con campañas/historial operativo más rico si el runner actual deja de bastar

## Siguiente slice recomendado

- `products` ya puede considerarse cerrado para su alcance actual
- abrir `projects` como consumidor fuerte del catálogo `products`
- si se mantiene foco en `products`, priorizar solo como profundización opcional:
  - scheduler automático gobernado por entorno
  - conectores concretos por marketplace/proveedor con autenticación propia
  - mejor conciliación de moneda/unidad
  - versionado más rico de atributos por fuente
- mantener la regla de dominio:
  - `products` sigue siendo módulo independiente
  - `crm` y futuros módulos como `projects` consumen el catálogo, pero no lo renombran ni lo absorben
