# Products Module

Documentación canónica del módulo `products`.

Nombre funcional visible:

- `Catálogo de productos`

Estado actual:

- módulo tenant independiente ya operativo en repo y runtime
- concentra:
  - importación completa del catálogo legacy de `ieris_app` hacia tenants del PaaS
  - catálogo técnico-comercial reusable
  - scraping/ingesta asistida
  - actualización viva por artículo desde URL
  - scheduler formal por tenant para `due_sources`
  - automatización gobernada por tenant para conectores vencidos
  - conectores runtime con perfil técnico explícito
  - validación operativa por conector
  - corridas batch de refresh con progreso
  - extracción por URL
  - corridas batch
  - conectores multi-fuente configurables
  - conectores específicos por proveedor con presets operativos
  - conector patrón profundizado para `mercadolibre`
  - extracción más dedicada también para `sodimac` y `easy`
  - sincronización automática real por conector
  - comparación multi-fuente por producto
  - historial de fuentes por producto
  - historial de eventos de precio por producto
  - galería comprimida por producto/servicio
  - revisión previa a publicación
- otros módulos lo consumen, pero no lo poseen:
  - `crm`
  - futuros `projects`

Objetivo del módulo:

- mantener un catálogo vivo de productos y servicios
- usar scraping genérico + IA como carril principal para traer/normalizar información actualizada desde cualquier URL utilizable
- refrescar artículos ya existentes desde sus fuentes activas o vencidas
- programar refresh por tenant desde conectores con política `due_sources`
- previsualizar y ejecutar conectores vencidos desde una superficie gobernada por tenant
- validar conectores antes de dejarlos como origen operativo
- dejar una base reusable para cotizaciones, proyectos y otros dominios sin amarrarla a CRM
- permitir migrar catálogos legacy completos sin perder:
  - productos
  - servicios
  - características
  - fotos
  - URLs fuente
  - historial base de precio

Regla base del módulo:

- `Ingesta > URL` es genérica por defecto
- el comportamiento normal esperado es:
  - scraping/preprocesado genérico
  - llamada IA backend-to-backend
  - postproceso estructurado
  - borrador revisable antes de publicar
- los conectores específicos por proveedor son una mejora adicional sobre ese carril base, no su reemplazo
- las fotos del catálogo no viven en `ingesta`:
  - pertenecen al artículo ya creado/publicado
  - se administran en `Catálogo`
  - el producto debe existir antes de cargar su galería

## Alcance actual

El módulo hoy incluye:

- catálogo de productos y servicios con:
  - `sku`
  - tipo `product/service`
  - precio unitario base
  - descripción
  - características técnicas/comerciales
  - miniatura visible de la foto principal en la tabla principal del catálogo
  - vista rápida al pinchar la miniatura, sin entrar a edición
  - galería de fotos comprimidas:
    - `webp`, `jpeg`, `png`
    - una foto principal por artículo
    - eliminación y reemplazo desde la ficha
- ingesta asistida con:
  - borradores manuales
  - extracción IA por URL
  - corrida asíncrona de una sola URL con apertura automática del borrador al terminar
  - corridas batch por URLs
  - selección opcional de conector
  - normalización mínima previa
  - descarte y reapertura
  - eliminación física de borradores no aprobados
  - aprobación al catálogo central
- conectores de fuente con:
  - nombre
  - proveedor lógico
  - perfil runtime del proveedor
  - tipo
  - estado activo/inactivo
  - modo de autenticación
  - referencia credencial
  - timeout
  - reintentos
  - backoff
  - modo de sincronización
  - estrategia de extracción
  - extracción IA gobernada por runtime
  - scheduler por tenant:
    - habilitado/no habilitado
    - frecuencia
    - batch limit
    - próxima corrida
    - último resultado
  - configuración operativa breve
  - validación del conector
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
  - ejecución manual gobernada por tenant sobre todos los conectores vencidos
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
- automatización gobernada con:
  - `GET /tenant/products/scheduler/overview`
  - `POST /tenant/products/scheduler/run-due`
  - runner cross-tenant:
    - `backend/app/scripts/run_products_refresh_scheduler.py`
    - `--dry-run`
    - `--json-output`
- trazabilidad visible de extracción:
  - badge `Extracción IA`
  - estrategia visible (`ai_full_generic`)
  - resumen visible en el borrador

Regla visual del catálogo:

- la tabla principal del catálogo no debe depender de descargar el archivo completo por cada fila
- la miniatura se resuelve por `preview` inline autenticado y carga perezosa por fila visible
- al pinchar la miniatura se abre una vista rápida del artículo:
  - foto principal
  - precio
  - descripción
  - características

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
- uso obligatorio del carril IA para `Ingesta > URL` y corridas batch por URL
- si falta `API_IA_URL` o `MANAGER_API_IA_KEY`, la extracción por URL falla de forma explícita en vez de caer silenciosamente al heurístico
- el pipeline IA ya quedó separado explícitamente en:
  - `ai_preprocessing_service.py`
  - `ai_client_service.py`
  - `ai_postprocessing_service.py`
- `generic_ai_extraction_service.py` ahora orquesta esas tres capas
- la configuración runtime de API IA ya se administra también desde:
  - `Platform Admin -> Configuración -> Integración API IA`
- la key ya no necesita editarse a mano en el host para la operación normal:
  - se ingresa desde consola
  - se persiste backend-side en `AI_RUNTIME_SECRETS_FILE`
  - el navegador solo vuelve a recibir estado + valor enmascarado
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
- perfil runtime visible por conector:
  - `generic_v1`
  - `mercadolibre_v1`
  - `sodimac_v1`
  - `easy_v1`
  - `json_feed_v1`
- validación visible por conector:
  - `last_validation_at`
  - `last_validation_status`
  - `last_validation_summary`
- endpoint operativo nuevo:
  - `POST /tenant/products/connectors/{connector_id}/validate`
- primer conector patrón profundizado:
  - `mercadolibre`
  - referencia externa desde URL
  - prioridad a JSON-LD + metadata + hints específicos
- importador legacy reusable:
  - `backend/app/scripts/import_ieris_products_catalog.py`
  - trae desde `ieris_app`:
    - `117` artículos legacy en el caso real de `ieris-ltda`
    - productos y servicios
    - `crm_product_characteristics`
    - `products_product_sources`
    - `products_price_history`
    - `products_product_images`
  - usa `external_reference=ieris:catalogo_items:<legacy_id>` como clave canónica de idempotencia
  - ya incorpora reconciliación de residuos de corridas previas cuando antes existió una consolidación accidental por nombre/URL
  - características extra como `Condición`, `Vendedor` y `Disponibilidad` cuando la fuente lo expone
- extracción proveedor reforzada además para:
  - `sodimac`
    - referencia externa
    - marca/modelo
    - vendedor/proveedor
    - nota de despacho cuando la fuente la expone
  - `easy`
    - referencia externa
    - marca/modelo
    - nota de unidad cuando la fuente la expone

## Automatización gobernada

El módulo ya no depende solo de ir conector por conector.

Ahora existe una vista tenant `Automatización` que:

- lista conectores vencidos para `due_sources`
- cuantifica cuántas fuentes vencidas tiene cada conector
- resume corridas recientes del scheduler
- permite ejecutar `Correr vencidos ahora` desde una sola superficie

La intención es dejar una operación más cercana al uso real de `ieris_app`:

- artículos vivos por URL
- refresh individual cuando hace falta
- refresh gobernado por tenant cuando hay backlog vencido
- runner cross-tenant cuando el entorno quiera institucionalizarlo vía cron/worker

## Cómo reconstruir este slice

Piezas canónicas de este cierre:

- migración tenant:
  - `backend/migrations/tenant/v0051_products_connector_runtime_profiles.py`
- migración tenant:
  - `backend/migrations/tenant/v0050_products_connector_scheduler_and_provider_profiles.py`
- scheduler cross-tenant:
  - `backend/app/scripts/run_products_refresh_scheduler.py`
- API tenant:
  - `backend/app/apps/tenant_modules/products/api/connectors.py`
  - `backend/app/apps/tenant_modules/products/api/scheduler.py`
- pipeline IA:
  - `backend/app/apps/tenant_modules/products/services/ai_preprocessing_service.py`
  - `backend/app/apps/tenant_modules/products/services/ai_client_service.py`
  - `backend/app/apps/tenant_modules/products/services/ai_postprocessing_service.py`
  - `backend/app/apps/tenant_modules/products/services/generic_ai_extraction_service.py`
- servicios:
  - `services/connector_service.py`
  - `services/connector_scheduler_service.py`
  - `services/connector_sync_service.py`
  - `services/connector_validation_service.py`
  - `services/refresh_run_service.py`
  - `services/ingestion_run_service.py`
- frontend:
  - `frontend/src/apps/tenant_portal/modules/products/pages/ProductsConnectorsPage.tsx`
  - `frontend/src/apps/tenant_portal/modules/products/pages/ProductsOverviewPage.tsx`
  - `frontend/src/apps/tenant_portal/modules/products/pages/ProductsAutomationPage.tsx`
  - `frontend/src/apps/tenant_portal/modules/products/services/productsService.ts`

Regla de recreación:

1. aplicar migraciones tenant `0050` y `0051`
2. exponer provider/scheduler/runtime profile en schemas + serializers
3. exponer ejecución manual del scheduler y validación del conector desde API
4. exponer overview gobernado de conectores vencidos por tenant
5. dejar runner cross-tenant para corridas automáticas, preview y salida JSON
6. publicar presets por proveedor, perfil runtime y `Automatización` en UI
7. profundizar el extractor de proveedores ya priorizados (`mercadolibre`, `sodimac`, `easy`)
8. validar repo
9. hacer backup PostgreSQL tenant previo antes de mutar `staging` o `production`

## Secretos de la API IA

`MANAGER_API_IA_KEY` no pertenece al tenant ni al frontend.

Debe vivir solo como secreto de runtime del backend:

- `development`:
  - `.env` local del repo o variables exportadas del proceso backend
- `staging`:
  - `/opt/platform_paas_staging/.env.staging`
- `production`:
  - `/opt/platform_paas/.env`

Variables esperadas:

- `API_IA_URL`
- `MANAGER_API_IA_KEY`
- `API_IA_MODEL_ID`
- `API_IA_MAX_TOKENS`
- `API_IA_TEMPERATURE`
- `API_IA_TIMEOUT`

No corresponde:

- hardcodear `MANAGER_API_IA_KEY` en código
- exponerlo al frontend
- guardarlo en tablas tenant
- guardarlo en `TENANT_SECRETS_FILE`
