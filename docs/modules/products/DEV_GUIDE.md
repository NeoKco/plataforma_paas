# Products Dev Guide

## Alcance del módulo

`products` es el dominio independiente de catálogo técnico-comercial e ingesta.

Responsabilidades:

- catálogo reusable de productos/servicios
- scraping/ingesta asistida
- actualización viva por artículo desde sus fuentes
- corridas batch con progreso para refresh del catálogo
- revisión previa a publicación
- base de consumo para `crm` y futuros `projects`

## Estructura principal

- backend:
  - `backend/app/apps/tenant_modules/products`
- frontend:
  - `frontend/src/apps/tenant_portal/modules/products`

## Contratos públicos

Rutas públicas del módulo:

- `/tenant/products/overview`
- `/tenant/products/catalog`
- `/tenant/products/ingestion/*`
- `/tenant/products/sources`
- `/tenant/products/price-history`
- `/tenant/products/connectors`
- `/tenant/products/refresh-runs`
- `/tenant/products/comparisons`

Permisos:

- `tenant.products.read`
- `tenant.products.manage`

## Persistencia

En este corte, la superficie pública ya quedó desacoplada y el módulo es independiente a nivel contractual, de rutas, UI y permisos.

Nota de implementación:

- la persistencia física sigue reutilizando la capa ya validada de catálogo/ingesta que originalmente nació dentro de `crm`
- eso evita un rename destructivo inmediato y deja lista una migración física posterior si se decide separar tablas

Esa compatibilidad interna no cambia la regla pública:

- `products` es el dueño funcional del catálogo e ingesta
- `crm` solo consume ese catálogo

En este slice el módulo también pasa a ser dueño funcional de:

- conectores de ingesta
- fuentes por producto
- eventos de precio por producto

## Slice nuevo ya cerrado

La ingesta ahora ya expone:

- análisis de duplicados en runtime sobre:
  - catálogo publicado
  - otros borradores
- endpoint de enriquecimiento por borrador
- endpoint de resolución accionable contra catálogo:
  - `POST /tenant/products/ingestion/drafts/{draft_id}/resolve-duplicate`
- fallback heurístico seguro si la API IA no está configurada o falla
- extracción técnica más profunda desde texto libre y scraping:
  - `Potencia`
  - `Voltaje`
  - `Corriente`
  - `Capacidad`
  - `Presión`
  - `Temperatura`
  - `Peso`
  - `Dimensiones`
  - `Modelo`

La resolución accionable hoy soporta:

- `update_existing`
  actualiza el producto ya publicado con la mejor información del borrador y lo vincula como resuelto
- `link_existing`
  resuelve el borrador contra un producto ya publicado sin modificar el catálogo

Además, este cierre suma:

- conectores multi-fuente persistidos
- metadatos de automatización por conector:
  - `sync_mode`
  - `fetch_strategy`
  - `run_ai_enrichment`
  - `last_sync_summary`
- borradores y corridas con `connector_id`
- persistencia automática de fuentes y eventos de precio al aprobar o vincular borradores
- sincronización automática runtime por conector:
  - `POST /tenant/products/connectors/{connector_id}/sync`
- comparación multi-fuente por producto:
  - `GET /tenant/products/comparisons`
- actualización viva del catálogo:
  - `POST /tenant/products/catalog/{product_id}/refresh`
  - `GET /tenant/products/refresh-runs`
  - `POST /tenant/products/refresh-runs`
  - `POST /tenant/products/refresh-runs/{run_id}/cancel`
- estado de sync por fuente:
  - `sync_status`
  - `last_sync_attempt_at`
  - `last_sync_error`
- metadatos de refresh por fuente:
  - `refresh_mode`
  - `refresh_merge_policy`
  - `refresh_prompt`
  - `next_refresh_at`
  - `last_refresh_success_at`
- CRUD visible de conectores
- CRUD visible de fuentes manuales
- registro manual de eventos de precio
- overview con:
  - fuentes recientes
  - precios recientes
  - conectores recientes
  - comparaciones recientes
  - corridas recientes de refresh

Variables runtime compatibles con el carril IA existente:

- `API_IA_URL`
- `MANAGER_API_IA_KEY`
- `API_IA_MODEL_ID`
- `API_IA_MAX_TOKENS`
- `API_IA_TEMPERATURE`
- `API_IA_TIMEOUT`

Regla de implementación:

- `products` sigue siendo dueño funcional del catálogo e ingesta
- la persistencia interna reutilizada no cambia el contrato público del módulo
- la actualización viva ya no debe tratarse como “enriquecimiento accesorio”; es el carril que mantiene vigente el catálogo consumido por cotizaciones y futuros proyectos

## Criterio de evolución

Las siguientes profundizaciones deben abrirse aquí:

- conectores específicos por marketplace/proveedor con autenticación propietaria
- comparación multi-moneda/unidad más profunda
- mejor reutilización del catálogo en `projects`
- clasificación/categorización más profunda por IA
- versionado más rico de atributos técnicos por fuente
