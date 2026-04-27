# Products User Guide

Guía operativa del módulo `products` (`Catálogo de productos`) para usuarios tenant y soporte funcional.

## Qué resuelve hoy

`products` sirve para:

- mantener el catálogo reusable de productos y servicios
- capturar productos desde URLs o carga manual
- capturar productos desde cualquier URL usando scraping genérico + IA
- revisar borradores antes de publicarlos
- mantener fuentes vigentes por producto
- registrar y revisar historial de precios
- configurar conectores de ingesta
- validar conectores antes de usarlos como origen estable
- programar conectores para refresh tenant automático
- revisar y ejecutar conectores vencidos desde una superficie de automatización gobernada
- refrescar artículos ya existentes desde sus URLs fuente
- correr campañas batch de actualización con progreso
- dejar base estable para cotizaciones y futuros proyectos

## Vistas principales

- `Resumen`
  lectura rápida de catálogo e ingesta
- `Catálogo`
  CRUD del catálogo base
- `Ingesta`
  captura manual, extracción IA por URL y corridas batch
- `Fuentes/precios`
  fuentes activas por producto e historial de eventos de precio
- `Conectores`
  perfiles de origen para la ingesta
- `Actualizaciones`
  refresh vivo por artículo y corridas batch
- `Comparación`
  lectura multi-fuente por producto con precio recomendado
- `Automatización`
  conectores vencidos, corridas recientes del scheduler y ejecución `run-due` por tenant

## Qué agrega este cierre

En `Ingesta`, cada borrador ya puede mostrar:

- posibles duplicados contra catálogo o contra otros borradores
- puntaje de similitud
- razón principal de la coincidencia
- estado de enriquecimiento
- disponibilidad del carril IA

Regla operativa nueva para `Ingesta > URL`:

- el carril normal ahora usa IA como primer camino, no como mejora opcional
- si el runtime no tiene `API_IA_URL` o `MANAGER_API_IA_KEY`, la extracción debe fallar con mensaje explícito
- si la IA tarda, la extracción puede tomar varios minutos antes de devolver el borrador

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
- un proveedor concreto con preset técnico visible
- un proveedor con perfil runtime técnico validable, por ejemplo `mercadolibre_v1`

Uso recomendado:

1. crear conectores antes de iniciar corridas batch relevantes
2. elegir el conector al crear borradores o corridas por URL
3. usar ese contexto luego para leer fuente/precio y revisar calidad de captura

Ahora cada conector también puede definir:

- `Proveedor`
  preset operativo para lectura específica por fuente, por ejemplo:
  - `Mercado Libre`
  - `Sodimac`
  - `Easy`
  - `Feed JSON`

- `Modo sync`
  `manual` o `connector_sync`
- `Perfil runtime`
  perfil técnico que identifica cómo se comporta el conector en runtime
- `Autenticación`
  hoy puede quedar en `Sin auth`, `Bearer token` o `Basic`
- `Referencia credencial`
  campo para apuntar a la credencial si el proveedor requiere autenticación propia
- `Estrategia fetch`
  `HTML genérico`, `HTML proveedor`, `Feed JSON` o `HTML + IA`
- `Timeout request`
  cuánto espera el conector antes de considerar fallida la lectura
- `Reintentos`
  cuántas veces vuelve a intentar antes de marcar error
- `Backoff`
  pausa corta entre intentos
- `Enriquecimiento IA`
  activa el enriquecimiento al sincronizar fuentes persistidas
- `Scheduler tenant`
  habilita corridas automáticas por tenant sobre `due_sources`
- `Frecuencia scheduler`
  - `hourly`
  - `daily`
  - `weekly`
- `Límite scheduler`
  controla cuántas fuentes vencidas puede lanzar el conector por corrida programada

Si el conector está en `connector_sync`, la vista permite ejecutar `Sincronizar` y refrescar:

- precio más reciente
- estado de sync de cada fuente
- error visible cuando la extracción falla
- historial de precio cuando cambia el valor capturado

Si además el conector tiene `Scheduler tenant`, la vista permite:

- ver próxima corrida programada
- ver último estado del scheduler
- lanzar `Correr scheduler` manualmente sin esperar la ejecución automática
- lanzar `Validar` para probar el conector contra `base_url` o su fuente activa más reciente

La validación muestra:

- estado:
  - `validated`
  - `warning`
  - `error`
- último timestamp de validación
- resumen corto de lo detectado
- preview resumido cuando la extracción fue exitosa

Uso recomendado del scheduler:

1. dejar solo conectores realmente operativos con `Scheduler tenant`
2. usar `daily` para sitios HTML normales
3. usar `hourly` solo para fuentes más estables o feeds JSON
4. mantener un `batch limit` prudente para no saturar scraping ni IA
5. usar `Automatización` para confirmar qué conectores están vencidos antes de lanzar una corrida amplia

Uso recomendado del validador:

1. crear o editar el conector
2. dejar `base_url` si quieres validar una URL patrón
3. pulsar `Validar`
4. revisar si detectó:
   - nombre
   - SKU/referencia
   - precio
   - moneda
   - cantidad de características
5. recién después dejar el conector como referencia operativa para refresh

## Comparación multi-fuente

`Comparación` sirve para:

- revisar qué productos ya tienen dos o más fuentes útiles
- ver cuál fuente queda recomendada
- comparar brecha de precios antes de cotizar
- detectar fuentes activas pero con sync degradado

Lectura principal:

- `Cobertura`
  cuántas fuentes activas vs totales tiene el producto
- `Mejor referencia`
  precio recomendado y razón operativa
- `Brecha`
  diferencia entre precio menor y mayor visibles
- `Fuentes`
  ranking corto de conectores/fuentes por producto

## Actualización viva

`Actualizaciones` ya no trabaja con borradores nuevos, sino con artículos ya existentes del catálogo.

Sirve para:

- refrescar un artículo puntual desde su URL fuente
- correr actualización batch de artículos vencidos
- correr actualización batch de todas las fuentes activas
- ver el progreso de cada corrida
- distinguir artículos sanos, vencidos o con error

Cada fuente ahora puede definir:

- `Modo refresh`
  - `manual`
  - `daily`
  - `weekly`
  - `monthly`
- `Merge policy`
  - `price_only`
  - `safe_merge`
  - `overwrite_catalog`
- `Prompt adicional IA`
  instrucción corta para orientar mejor la extracción desde esa URL/fuente

Lectura operativa:

- `price_only`
  actualiza precio y trazabilidad, sin reescribir el catálogo más allá del valor económico
- `safe_merge`
  actualiza precio y completa campos vacíos o características nuevas sin pisar a ciegas
- `overwrite_catalog`
  permite que la fuente vuelva a empujar nombre, SKU, descripción, unidad y características

Flujo recomendado:

1. dejar al menos una fuente activa con URL por artículo
2. definir `Modo refresh` y `Merge policy`
3. usar `Actualizar ahora` cuando quieras revisar un artículo puntual
4. usar `Actualizar vencidos` como rutina operativa
5. revisar artículos `stale` o `error` antes de cotizar si dependen de precio vigente

## Scheduler formal por tenant

Este módulo ya soporta un carril formal para `due_sources`:

- cada tenant programa sus conectores dentro de su propia DB
- el runner central solo inspecciona tenants activos con módulo `products`
- por conector se ejecutan corridas batch de refresh sobre fuentes vencidas
- el resultado queda visible en:
  - `Conectores`
  - `Actualizaciones`
  - `Resumen`

Eso permite mantener vigente el catálogo sin depender solo de corridas manuales.

## Automatización gobernada

`Automatización` resume el carril `due_sources` a nivel tenant.

Sirve para:

- ver cuántos conectores tienen fuentes vencidas
- ver cuántas fuentes vencidas arrastra cada conector
- revisar corridas recientes del scheduler
- ejecutar `Correr vencidos ahora` sin ir conector por conector

Flujo recomendado:

1. validar primero que los conectores relevantes estén sanos
2. entrar a `Automatización`
3. revisar conectores vencidos y volumen de `due_sources`
4. ejecutar `Correr vencidos ahora`
5. revisar:
   - resultado reciente por conector
   - corridas recientes
   - artículos que queden en `error` o `stale`

## Conector patrón actual: Mercado Libre

Antes de esa capa, la regla normal del módulo sigue siendo esta:

- si pegas una URL en `Ingesta`, el sistema debe intentar capturarla con el carril genérico IA
- ese carril no depende de que exista un conector dedicado para ese proveedor
- el token IA no se pide en la UI:
  - vive en backend runtime
  - se usa server-to-server con `MANAGER_API_IA_KEY`

Y ahora la captura rápida por URL ya no se comporta como request opaca:

- al iniciar la extracción se crea una corrida asíncrona de una sola URL
- la UI muestra progreso
- al terminar, abre automáticamente el borrador generado
- el borrador deja visible si la captura pasó por IA y qué estrategia usó

El primer conector específico profundizado es `Mercado Libre`.

Hoy ese preset ya hace mejor lectura que el scraping genérico porque:

- prioriza JSON-LD si la publicación lo expone
- rescata referencia externa desde la URL del artículo
- detecta mejor:
  - nombre
  - precio
  - moneda
  - categoría
  - marca
  - SKU/referencia
- intenta agregar características útiles como:
  - `Condición`
  - `Vendedor`
  - `Disponibilidad`
  - `Despacho`

Además, `Sodimac` y `Easy` ya no quedan como presets solo visuales:

- `Sodimac`
  - prioriza mejores pistas para referencia externa, marca, modelo y nota de despacho
- `Easy`
  - prioriza mejores pistas para referencia externa, marca, modelo y nota de unidad

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
