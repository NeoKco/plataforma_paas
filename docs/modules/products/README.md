# Products Module

Documentación canónica del módulo `products`.

Nombre funcional visible:

- `Catálogo de productos`

Estado actual:

- módulo tenant independiente ya operativo en repo y runtime
- concentra:
  - catálogo técnico-comercial reusable
  - scraping/ingesta asistida
  - actualización viva por artículo desde URL
  - scheduler formal por tenant para `due_sources`
  - corridas batch de refresh con progreso
  - extracción por URL
  - corridas batch
  - conectores multi-fuente configurables
  - conectores específicos por proveedor con presets operativos
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
- refrescar artículos ya existentes desde sus fuentes activas o vencidas
- programar refresh por tenant desde conectores con política `due_sources`
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
  - proveedor lógico
  - tipo
  - estado activo/inactivo
  - modo de sincronización
  - estrategia de extracción
  - enriquecimiento IA opcional
  - scheduler por tenant:
    - habilitado/no habilitado
    - frecuencia
    - batch limit
    - próxima corrida
    - último resultado
  - configuración operativa breve
  - métricas de uso visibles
- comparación multi-fuente con:
  - mejor referencia sugerida
  - precio recomendado
  - brecha entre precios observados
  - ranking visible de fuentes por producto
- actualización viva con:
  - `Actualizar ahora` por artículo
  - corridas batch por alcance:
    - `due_sources`
    - `active_sources`
    - `selected_products`
  - historial de corridas
  - estado de salud por artículo
  - ejecución programable por conector para fuentes vencidas
- fuentes por producto con:
  - URL/ref externa
  - proveedor
  - moneda
  - precio más reciente
  - vigencia
  - estado de sincronización
  - modo de refresh
  - política de merge
  - prompt adicional por fuente
  - próximo refresh
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
- extracción estructurada priorizando JSON-LD cuando la fuente lo expone
- presets visibles por proveedor:
  - `generic`
  - `mercadolibre`
  - `sodimac`
  - `easy`
  - `json_feed`

## Cómo reconstruir este slice

Piezas canónicas de este cierre:

- migración tenant:
  - `backend/migrations/tenant/v0050_products_connector_scheduler_and_provider_profiles.py`
- scheduler cross-tenant:
  - `backend/app/scripts/run_products_refresh_scheduler.py`
- API tenant:
  - `backend/app/apps/tenant_modules/products/api/connectors.py`
- servicios:
  - `services/connector_service.py`
  - `services/connector_scheduler_service.py`
  - `services/connector_sync_service.py`
  - `services/refresh_run_service.py`
  - `services/ingestion_run_service.py`
- frontend:
  - `frontend/src/apps/tenant_portal/modules/products/pages/ProductsConnectorsPage.tsx`
  - `frontend/src/apps/tenant_portal/modules/products/pages/ProductsOverviewPage.tsx`
  - `frontend/src/apps/tenant_portal/modules/products/services/productsService.ts`

Regla de recreación:

1. aplicar migración tenant `0050`
2. exponer provider/scheduler en schemas + serializers
3. exponer ejecución manual del scheduler desde API
4. dejar runner cross-tenant para corridas automáticas
5. publicar presets por proveedor en UI
6. validar repo
7. hacer backup PostgreSQL tenant previo antes de mutar `staging` o `production`
