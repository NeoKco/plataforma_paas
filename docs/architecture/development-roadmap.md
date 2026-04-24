# Roadmap de Desarrollo

Este documento propone una hoja de ruta completa para `platform_paas`, desde el arranque tecnico hasta una version operable y extensible en produccion.

No es solo una lista de deseos. La idea es que sirva como guia de ejecucion para developers y como referencia para saber:

- que ya esta hecho
- que esta parcialmente resuelto
- que deberia venir despues

## Como leer este roadmap

Cada etapa esta marcada con uno de estos estados:

- `Completado`: ya existe una base funcional implementada
- `En progreso`: existe una parte importante, pero faltan piezas para considerarlo cerrado
- `Pendiente`: aun no esta desarrollado o no esta endurecido

Estado global actual:

- para el alcance actual del roadmap base, todas las etapas `0` a `17` ya quedan `Completado`
- `En progreso` y `Pendiente` se mantienen como estados validos del documento para futuras ampliaciones, pero ya no describen deuda abierta del roadmap base actual

## Vision final

La app apunta a terminar en un estado donde exista:

- instalacion reproducible de plataforma
- control central de tenants y operaciones
- autenticacion y autorizacion robustas
- DB dedicada por tenant
- modulos tenant desacoplados y activables
- frontend para plataforma y tenant
- despliegue, observabilidad, backup y seguridad operativa
- gobernanza de implementacion y handoff repetible para developers e IAs

## Gobernanza transversal

Estado: `Completado`

Objetivo:

- fijar reglas comunes de implementacion, revision y cierre
- alinear estructura de carpetas, documentacion viva y baseline E2E
- dejar handoff repetible para otra IA sin depender de contexto informal

Resultado actual:

- existe una fuente canonica en [Gobernanza de implementacion](./implementation-governance.md)
- existe una [Matriz de ownership de datos](./data-ownership-matrix.md) como resumen operativo por dominio
- existe una [Plantilla oficial de spec por slice](./slice-spec-template.md) para abrir cambios relevantes sin improvisar alcance ni evidencia
- existe un set inicial de ADRs aceptados en [ADRs del proyecto](./adr/README.md) para congelar decisiones transversales ya cerradas
- existe un gate operativo de release en [check_release_governance.sh](../../deploy/check_release_governance.sh) respaldado por [check_memory_viva_sync.py](../../backend/app/scripts/check_memory_viva_sync.py)
- existe un runbook canónico de recuperación en [Respuesta a incidentes tenant](../runbooks/tenant-incident-response.md)
- la estructura por slice ya queda amarrada a backend, frontend, docs y E2E
- onboarding, indices y runbooks ya apuntan a ese marco comun
- `empresa-bootstrap` queda institucionalizado como tenant baseline para E2E browser tenant

Condicion de mantenimiento de este cierre:

- todo frente nuevo o endurecido debe seguir gobernanza de datos + `SRED` de forma transversal, no solo en módulos funcionales

## Prioridad de producto antes de nuevos modulos

Antes de abrir mas modulos de negocio, conviene dejar cerrada la base de plataforma que un operador esperaria como minima:

- crear tenants desde UI
- editar identidad basica de tenants
- archivar tenants como baja operativa segura
- filtrar y buscar tenants con comodidad
- gobernar su estado, billing, mantenimiento y limites desde una sola consola
- gobernar operadores de plataforma y leer actividad reciente sin depender solo de logs

La prioridad vigente del proyecto queda asi:

- primero cerrar completamente el bloque basico del tenant
- despues endurecerlo con regresion y validaciones operativas
- solo cuando ese ciclo quede robusto pasar a nuevos modulos de negocio

En este contexto, "bloque basico del tenant" significa:

- lifecycle completo: crear, editar, archivar, restaurar y borrar de forma segura
- provisioning entendible y recuperable
- acceso al `tenant_portal` solo cuando el tenant este realmente listo
- billing y politica de acceso consistentes
- usuarios tenant y limites base funcionando sin huecos de borde visibles
- auditoria y trazabilidad suficientes para soporte

La recomendacion actual es esta:

- no abrir `delete` fisico de tenants todavia
- tratar `archive` como la baja basica correcta
- dejar `slug` como identificador estable salvo que despues exista una politica formal de cambio
- no usar `restore` como mutacion informal de estados; ya existe como flujo explicito para tenants archivados

Secuencia siguiente ya redefinida para apertura formal:

- primero abrir `business-core` como dominio tenant transversal
- despues cerrar `maintenance` (`Mantenciones`) sobre esa base
- `egresos` no entra en esta linea porque su reemplazo en el PaaS ya es `finance`
- `projects` e `iot` deberian nacer luego reutilizando `business-core`, no duplicando clientes, sitios o equipos
- si la veta condominio se vuelve prioritaria, abrir `community-core` para residentes, unidades y visitas en vez de forzar esa semantica dentro de `business-core`

Pendiente corto de endurecimiento antes o en paralelo a nuevos modulos:

- smoke/E2E del lifecycle tenant completo hasta aparicion en `Histórico tenants` ya cubierto en backend sobre control DB + tenant DB de prueba, incluyendo create, provision, login tenant, archive, restore, deprovision, delete y validacion del archivo historico
- permisos finos de la vista historica ya congelados en pruebas para mantener `tenant-history` acotado a operacion central `superadmin`
- `tenant-history` ya expone filtros server-side y exportacion `CSV/JSON` para no depender solo de filtrado en memoria cuando el archivo crezca
- `Billing` y `Provisioning` ya permiten exportar snapshots operativos del estado visible para soporte y trazabilidad sin copiar filas manualmente desde la UI
- la superficie visible de `platform_admin` ya usa una matriz de acceso por rol centralizada para navegación, redirecciones y edición de usuarios de plataforma
- ya existe un stack E2E browser local con `Playwright` sobre `frontend/`, cubriendo login `platform_admin`, lifecycle tenant base (`create/archive/restore`), acceso rápido desde `Tenants` hacia `tenant_portal`, congelamiento visible de la matriz por rol para `admin` y `support` en `platform_admin`, workspace tenant de `Billing` con reconcile individual y batch sobre eventos persistidos, `Histórico tenants` con filtros/export y detalle del snapshot de retiro, visibilidad de jobs nuevos en `Provisioning`, ejecución manual de jobs `pending`, requeue de jobs `failed`, disparo de `schema auto-sync` y variantes broker-only de DLQ; junto a eso cubre `tenant_portal` para login condicionado por billing, enforcement visible de límites de usuarios activos, de cuota admin y de cuota mensual, de `finance`, de la precedencia entre `finance.entries` y `finance.entries.monthly`, del cupo mensual `finance.entries.monthly`, de los cupos mensuales por tipo `finance.entries.monthly.income` / `finance.entries.monthly.expense`, del mantenimiento básico de cuentas/categorías, de la configuración financiera base (`currencies`, `exchange rates`, `settings`), del flujo base de presupuestos, del flujo base de préstamos y del batch/reversal de préstamos, además de `finance` en creación, adjunto, anulación y conciliación; en la práctica el frente browser principal ya queda casi cerrado y solo debería ampliarse si aparecen nuevas regresiones funcionales o nuevos módulos
- recaptura visual del bloque tenant cuando la UX ya se considere estable
- la `Etapa 15` ya dejó migrados al contrato nuevo los 4 tenants activos de `staging` y `production`; la revisión repo-wide posterior ya confirma que el fallback residual por `plan_code` quedó suficientemente acotado y deja de ser foco activo principal

## Etapa 0. Base de Proyecto

Estado: `Completado`

Objetivo:

- definir estructura real del repositorio
- separar `backend`, `frontend`, `docs`, `infra`, `scripts`
- dejar la base para crecimiento modular

Resultado actual:

- la estructura principal ya esta consolidada
- `backend/app/apps`, `backend/app/common` y `backend/app/bootstrap` ya son la base real del proyecto

## Etapa 1. Instalacion de Plataforma

Estado: `Completado`

Objetivo:

- instalar la plataforma sin depender de pasos manuales dispersos
- crear `platform_control`
- escribir configuracion inicial

Resultado actual:

- existe instalador web
- se crea la DB de control
- se marca la plataforma como instalada

## Etapa 2. Control Central de Plataforma

Estado: `Completado`

Objetivo:

- administrar usuarios de plataforma
- crear tenants
- registrar jobs de provisionamiento

Resultado actual:

- existe `platform_users`
- existe login de plataforma
- existe creacion de tenants
- existen `provisioning_jobs`
- `platform_admin` ya permite listar usuarios de plataforma, darlos de alta, editar nombre y rol, activar o desactivar acceso, resetear contraseña inicial y borrar usuarios no criticos
- `platform_admin` ya expone `Actividad` para auditoria breve de accesos recientes de `platform` y `tenant`
- la politica vigente ya endurece `platform_users` para operar con un solo `superadmin` activo
- existe ya un rol `admin` intermedio para crear y gobernar usuarios `support` sin tocar la cuenta `superadmin`
- la consola ya diferencia mejor que puede ver cada rol: `superadmin` todo, `admin` usuarios y actividad, `support` alcance mas acotado
- el instalador ya crea la primera cuenta `superadmin` dentro de `platform_users`
- la recuperacion raiz ya no depende de seeds ni de acceso tecnico a base de datos, sino de una clave emitida al instalar

Nota de cierre practico:

- la base backend de control central ya esta
- el frontend ya cubre alta, edicion basica, archivo operativo y filtrado de tenants
- el frontend ya cubre tambien restauracion formal de tenants archivados con estado destino explicito
- el frontend ya cubre el ciclo basico de operadores de plataforma sobre `platform_users`
- la politica vigente ya deja `slug` estable, `archive` como baja operativa, `restore` explicito y `delete` fisico fuera del alcance actual

## Etapa 3. Provisionamiento Multi-Tenant

Estado: `Completado`

Objetivo:

- crear DB por tenant
- crear usuario tecnico PostgreSQL por tenant
- bootstrappear esquema base

Resultado actual:

- el provisioning materializa la DB tenant
- se crean tablas base, roles base y admin inicial
- el tenant pasa a `active`

## Etapa 4. Auth y Contexto por Scope

Estado: `Completado`

Objetivo:

- separar claramente `platform` y `tenant`
- emitir JWT con claims suficientes
- poblar contexto del request segun scope

Resultado actual:

- existen JWT `platform` y `tenant`
- el middleware comun resuelve ambos scopes
- las rutas `/platform/*` y `/tenant/*` ya se protegen por contexto

## Etapa 5. DB Tenant Dinamica por Request

Estado: `Completado`

Objetivo:

- leer `tenant_slug` desde el JWT
- resolver la DB tenant correcta
- entregar una sesion SQLAlchemy por request

Resultado actual:

- `get_tenant_db()` ya conecta cada request tenant con su DB
- el backend ya opera sobre `tenant_info` y `users` reales

## Etapa 6. Core Tenant Operable

Estado: `Completado`

Objetivo:

- exponer rutas protegidas tenant
- permitir operaciones reales basicas
- validar el patron `router -> service -> repository`

Resultado actual:

- existe CRUD basico de usuarios tenant
- existen schemas de request/response
- existe capa repository para `core`

## Etapa 7. Permisos Tenant Finos

Estado: `Completado`

Objetivo:

- dejar de depender solo de `role == admin`
- introducir permisos por accion

Resultado actual:

- existe un mapa simple de permisos por rol
- el CRUD tenant y el modulo `finance` ya usan permisos declarativos

## Etapa 8. Primer Modulo Tenant Real

Estado: `Completado`

Objetivo:

- validar que la base modular sirve para un caso de negocio real
- reutilizar DB tenant, permisos y patron por capas

Resultado actual:

- existe el modulo `finance` con modelo, repositorio, servicio, router y tests
- `finance` queda declarado como modulo base del SaaS y modulo piloto para los siguientes slices tenant
- el `Lote 0` del roadmap maestro de `finance` ya quedo ejecutado con estructura backend/frontend, router agregador y documentacion inicial
- el `Lote 1` ya dejo migraciones base del modulo para catalogos, configuracion y auditoria
- el `Lote 2` ya dejo modelos, schemas y repositories base para catalogos del modulo
- el `Lote 3` ya dejo servicios, endpoints CRUD base, endpoints de detalle y `reorder` para catalogos, settings y exchange rates
- el `Lote 4` ya dejo frontend operativo para cuentas, categorias, catalogos auxiliares y configuracion financiera
- `Categorías` ya permite además seleccionar iconos semánticos controlados y releerlos en formulario/listado
- `Cuentas` y catálogos auxiliares con `icon` ya consumen también selectores controlados y lectura visual consistente
- el `Lote 5` ya dejo `finance_transactions` como nucleo transaccional real, con backfill idempotente desde `finance_entries`
- el `Lote 6` ya abrio la primera vista moderna de transacciones sobre `finance_transactions`, con balances por cuenta, detalle operacional con auditoria reciente, filtros reales, edicion completa de transacciones existentes y una mesa de trabajo guiada para conciliacion/favoritos con seleccion multiple, nota, motivo estructurado y confirmacion
- ya existe una primera vista real de `Presupuestos` por mes y categoria con comparacion presupuesto vs ejecucion real
- `Presupuestos` ya muestra contadores por estado operativo y un foco priorizado de categorias que requieren atencion
- `Presupuestos` ya permite intervenir sobre esas categorias priorizadas con edicion y activacion/desactivacion rapida
- `Presupuestos` ya permite clonar un mes origen hacia otro mes destino con sobrescritura opcional por categoria
- `Presupuestos` ya permite aplicar ajustes guiados sobre categorias priorizadas, incluyendo alineacion al real con margen y desactivacion por falta de uso
- `Presupuestos` ya permite aplicar plantillas operativas sobre el mes destino, incluyendo mes anterior, mismo mes del año anterior y promedio real de 3 meses
- existe migracion tenant versionada para `finance_budgets`
- ya existe un slice real de `Préstamos` con cartera, saldo pendiente, filtros por tipo/estado, proximo vencimiento y cronograma por cuotas
- existe migracion tenant versionada para `finance_loans`
- existe migracion tenant versionada para `finance_loan_installments`
- existe migracion tenant versionada para `finance_loan_installment_payment_split`
- ya existe aplicacion de pagos sobre cuotas de `Préstamos`, con recálculo de saldo pendiente
- ya existe asignacion configurable del pago entre interes y capital, con tracking separado por cuota
- ya existe reversa parcial o total de esos pagos sobre cuotas
- ya existen pagos y reversiones en lote sobre cuotas seleccionadas del mismo préstamo
- ya existen razones estructuradas de reversa sobre cuotas, tanto individual como batch
- ya existe enlace contable minimo: cada pago o reversa de cuota genera una transaccion real enlazada al préstamo
- `Préstamos` ya permite definir cuenta origen por préstamo u operación de cuota
- `GET /tenant/finance/loans/{loan_id}` ya expone lectura contable derivada reciente enlazada al préstamo
- esa lectura derivada de `Préstamos` ya incluye resumen contable, efecto neto base y exportación operativa CSV/JSON desde la UI
- ya existe una primera vista real de `Planificación` con calendario operativo, cuotas del mes y foco presupuestario
- ya existe una primera vista real de `Reportes` con overview mensual de transacciones, presupuestos y préstamos
- `Reportes` ya muestra serie diaria de caja y desvíos presupuestarios priorizados dentro del mismo overview
- `Reportes` ya muestra comparativa contra un mes elegido y exportación CSV básica
- `Reportes` ya muestra tendencia mensual corta de 6 meses
- `Reportes` ya permite horizonte configurable `3/6/12` meses y exportación JSON base
- `Reportes` ya permite foco analítico de movimientos sobre el mismo overview
- `Reportes` ya permite foco presupuestario por tipo y estado
- `Reportes` ya resume el horizonte seleccionado con promedio, mejor/peor mes y delta vs primer mes
- `Reportes` ya permite elegir explícitamente el mes de comparación del overview
- `Reportes` ya compara además el horizonte visible completo contra otro horizonte equivalente
- `Reportes` ya compara además el acumulado anual `enero -> mes` contra el período comparado
- `Reportes` ya permite releer top categorías por dimensión analítica (`período`, `horizonte`, `acumulado anual`)
- `Reportes` ya exporta CSV y JSON enriquecidos con comparativas y cortes ejecutivos
- `Reportes` ya permite además comparar la lectura activa contra un rango arbitrario de meses
- `Reportes` ya permite además rankear por entidad operativa (`categoría`, `cuenta`, `proyecto`, `beneficiario`, `persona`)
- `Reportes` ya compara además la dimensión analítica activa contra el período comparado, mostrando ganadores/perdedores por entidad
- `finance_transactions` ya persiste `tag_ids` de forma real en `finance_transaction_tags`
- `Reportes` ya permite además rankear por `etiqueta`
- cuando el schema `finance` del tenant esta incompleto, esas vistas ya degradan a error controlado y no a `500`
- `tenant_portal` ya permite a `tenant admin` encolar y monitorear la sincronizacion de estructura desde el propio tenant, usando `provisioning_jobs` en vez de ejecucion inline
- el provisioning inicial ya deja encolado un follow-up `sync_tenant_schema` al cerrar `create_tenant_database`
- `platform` ya expone una operacion masiva para encolar `sync_tenant_schema` sobre tenants activos y existe un script operativo para usarla despues de deploy
- si `sync_tenant_schema` falla por `Tenant database configuration is incomplete`, el job queda en `failed` terminal para no reintentar sobre una DB sin provisioning completo
- `CLP` ya forma parte de las monedas semilla del modulo
- el modulo ya esta registrado en la app
- existe migracion tenant versionada para `finance_entries`
- existe migracion tenant versionada para `finance_transactions`, `finance_transaction_tags`, `finance_transaction_attachments` y `finance_transaction_audit`
- `finance` ya permite adjuntar boletas, facturas o respaldos por transaccion, con compresion previa de imagenes en frontend y descarga/eliminacion desde el detalle
- existen migraciones tenant versionadas `v0012_finance_transaction_voids` y `v0013_finance_transaction_voids_repair`; la segunda corrige tenants que hubieran quedado marcados en `0012` sin columnas fisicas, y la UI ya permite anular transacciones sin borrado fisico, conservando trazabilidad y excluyendolas de lecturas activas
- existe enforcement de `finance.entries`, `finance.entries.monthly`, cuotas segmentadas como `finance.entries.monthly.income`, `finance.entries.monthly.expense`, `core.users`, `core.users.active`, `core.users.monthly` y cuotas por rol como `core.users.admin` por plan, override tenant y billing grace
- existe visibilidad operativa de uso vs limite desde `tenant` y desde `platform`
- existe ya una vista generica de uso por modulo para preparar el mismo patron en futuros modulos
- `platform` ya expone un catalogo de capacidades backend para que frontend y soporte descubran estados, modulos y claves de cuota sin hardcodearlos
- ese catalogo ya incluye metadatos estructurados por cuota para que frontend no tenga que inferir labels, recursos o segmentaciones

Checklist de cierre funcional ya cubierto:

- catálogos, configuración, monedas y tipos de cambio operativos
- núcleo transaccional moderno con filtros, edición, etiquetas, conciliación individual y batch
- anulacion blanda de transacciones para corregir errores sin perder auditoria
- `Presupuestos` con lectura mensual, foco priorizado, clonación, ajustes guiados y plantillas operativas
- `Préstamos` con cronograma, pagos/reversas, batch, cuenta origen, lectura contable derivada y exportación
- `Planificación` con lectura operativa mensual
- `Reportes` con overview consolidado, comparativas, rankings y exportaciones enriquecidas
- manejo controlado de schema incompleto y self-service tenant-side para sincronización
- auto-sync post-provisioning y post-deploy ya integrado al flujo operativo

Backlog opcional post-cierre:

- el backlog opcional sugerido del propio módulo ya quedó absorbido en el alcance actual: `Transacciones` cerró lotes asistidos, `Presupuestos` cerró plantillas enriquecidas, `Préstamos` cerró exportación/lectura contable más densa y `Reportes` + `Planificación` cerraron comparativas/charts adicionales
- cualquier nueva evolución de `finance` desde este punto pasa a tratarse como expansión de negocio nueva, no como pendiente del cierre del módulo
- la base visual local de `finance` ya quedó sembrada con iconografia semantica, bloques `spotlight` y charts livianos; el pendiente ya no es esa capa inicial, sino elevarla a sistema transversal del PaaS
- consolidar `finance` como referencia formal para los modulos siguientes antes de abrir otro dominio grande
- el trabajo transversal de `design system` ya quedó aplicado sobre el frontend visible con iconografia común, `spotlight` genérico, badges, layouts, formularios y wrappers de tabla reutilizables; `finance` ya sirve como bloque de referencia, `Overview`/`Users` ya comparten esa base y `platform_admin` ya la absorbió en `Dashboard`, `Actividad`, `Usuarios de plataforma`, `Tenants`, `Histórico tenants`, `Provisioning`, `Billing`, `Configuración`, login, recuperación raíz e instalador
- dejar, tambien como trabajo transversal posterior, mantenimiento editorial de la internacionalizacion real del sistema; la superficie visible principal, los helpers compartidos y los formularios densos principales ya respetan el idioma activo, y lo que resta baja a ayudas largas puntuales, microcopy secundario y nuevas pantallas que aparezcan fuera del alcance actual

## Etapa 9. Calidad Tecnica Base

Estado: `Completado`

Objetivo:

- tener regresion controlada
- congelar comportamiento importante con pruebas
- preparar un ciclo de cambio seguro

Resultado actual:

- existen suites unitarias para `tenant`, `tenant finance` y `platform`
- existen suites de integracion sobre SQLite temporal para `tenant` y `platform`
- existen smoke tests HTTP sobre endpoints y middleware criticos
- existen suites preparadas para integracion sobre PostgreSQL temporal por configuracion
- existe una base comun de fixtures y builders reutilizables para tests en `backend/app/tests/fixtures.py`
- existe un runner unificado de pruebas backend para el equipo en `backend/app/scripts/run_backend_tests.py`
- existe un workflow base de CI en `.github/workflows/backend-tests.yml` usando PostgreSQL temporal
- el runner backend ya soporta subsets por dominio (`auth`, `tenant`, `finance`, `provisioning`, `platform`) para regresion mas rapida
- existe un helper local repetible en `scripts/dev/run_local_backend_baseline.sh` alineado con esa baseline
- ya quedo corregido el riesgo de parseo incorrecto de credenciales PostgreSQL con caracteres reservados usando builders seguros de URL
- el backend ya reaplica migraciones de control al startup cuando la plataforma esta instalada, para evitar desalineacion entre modelo y esquema tras cambios de `platform_control`
- la política actual de ramas protegidas ya queda formalizada sobre el check:
  - `Backend Tests / backend-tests`
- los subsets manuales ya quedan documentados como revalidación puntual y no como reemplazo del gate principal
- los datos de prueba ya no dependen solo de stubs mínimos:
  - `fixtures.py` ya cubre builders para contexto contractual tenant
  - `fixtures.py` ya cubre builders para `subscription_items`
  - `fixtures.py` ya cubre builders para `social_community_groups`
  - existe cobertura explícita en `backend/app/tests/test_fixtures.py`

Resultado de cierre:

- la regresión backend ya queda controlada con runner unificado, CI reproducible y política explícita de check obligatorio
- la estrategia de datos de prueba ya queda más rica y reutilizable para slices contractuales y sociales recientes
- la `Etapa 9` deja de ser frente activo principal para el alcance actual

## Etapa 10. Migraciones y Bootstrap Evolutivo

Estado: `Completado`

Objetivo:

- dejar de depender de creacion manual o bootstrap puntual de tablas nuevas
- versionar cambios de esquema en `platform_control` y en DB tenant

Entregables esperados:

- migraciones de control DB
- migraciones tenant core
- migraciones por modulo tenant
- estrategia de upgrade por tenant

Resultado actual:

- el bootstrap tenant ya crea tambien tablas de modulos registrados como `finance`
- existe una operacion administrativa de sync de esquema tenant para bases ya provisionadas
- existen migraciones versionadas base para `control` y `tenant`
- `Tenants` ya deja leer la version de esquema aplicada por tenant, la ultima version disponible, la cantidad de migraciones pendientes y la ultima sincronizacion registrada
- `platform_control.tenants` ya guarda trazabilidad minima del esquema tenant con `tenant_schema_version` y `tenant_schema_synced_at`
- el runtime ya opera con cadena versionada real:
  - `control` hasta `v0029_auth_audit_observability_fields`
  - `tenant` hasta `v0039_social_community_groups`
- la estrategia formal de upgrade ya queda documentada:
  - migraciones tenant en una cadena global compartida, no ramas paralelas por modulo
  - repairs y backfills como migraciones o tooling forward-only, no parches manuales invisibles
  - `sync-schema` como camino administrativo normal para tenants existentes
  - verificacion post-deploy y convergencia tenant como cierre operativo minimo
- la politica de downgrade ya queda cerrada:
  - no existe downgrade destructivo in-place como camino normal
  - rollback de codigo no revierte datos
  - si una migracion falla, la recuperacion es forward-only o via restore drill documentado
  - desactivar un modulo por contrato no elimina ni rebaja su esquema tenant

Resultado de cierre:

- la PaaS ya no depende de bootstrap puntual ni de `create_all()` como camino normal de evolucion estructural
- la estrategia por modulo y la politica de downgrade/recovery ya quedan formalizadas y alineadas al runtime actual
- `Etapa 10` deja de ser frente activo principal para el alcance actual

## Etapa 11. Secretos y Seguridad Operativa

Estado: `Completado`

Objetivo:

- endurecer manejo de secretos y credenciales
- sacar decisiones temporales de desarrollo

Entregables esperados:

- almacenamiento seguro de passwords DB tenant
- rotacion de secretos
- politicas de credenciales iniciales
- revocacion o renovacion de tokens

Resultado actual:

- existe validacion de secretos inseguros en runtime para produccion
- las passwords bootstrap tenant de demo o demasiado cortas ya quedan prohibidas en `production`
- el password tecnico tenant se resuelve por env var dinamica, no por `if/elif`
- el provisioning persiste el secreto tenant en `.env` y `os.environ`
- los logs dejan de mostrar el password completo de la DB tenant
- los JWT ahora validan `iss`, `aud`, `jti` y `token_type`, con audiencias separadas para `platform` y `tenant`
- ya existe refresh token rotatorio y revocacion basica de sesion en `platform_control`
- ya existe auditoria basica de eventos de autenticacion en `platform_control`
- el equipo ya tiene documentado que las passwords bootstrap tenant de ejemplo solo son aceptables para baseline local o pruebas
- `Settings` ya puede leer la postura de seguridad de runtime sin exponer secretos, solo hallazgos y readiness para produccion
- ya existe rotacion formal de credenciales tecnicas tenant con validacion del nuevo acceso y rollback al secreto anterior si la prueba falla
- `GET /platform/security-posture` y `Settings` ya dejan visible además:
  - archivo runtime efectivo de secretos tenant
  - si ese carril queda separado del `.env` legacy
  - si el backend puede leerlo y escribirlo
- `production_ready` ya cae si `TENANT_SECRETS_FILE` sigue mezclado con el `.env` principal
- ya existe sincronizacion formal por tenant y por lote sobre el carril runtime-only:
  - `POST /platform/tenants/{tenant_id}/sync-db-runtime-secret`
  - `POST /platform/security-posture/sync-runtime-secrets`
- ya existe rotacion formal por tenant y por lote sobre el carril runtime-only:
  - `POST /platform/tenants/{tenant_id}/rotate-db-credentials`
  - `POST /platform/security-posture/rotate-db-credentials`
- ya existe una lectura previa formal del plan operativo:
  - `GET /platform/security-posture/runtime-secret-plan`
- la consola ya puede gobernar campañas batch por:
  - inclusion explicita
  - exclusion explicita
- el rescate legacy desde `/.env` ya queda aislado en tooling controlado y no vuelve al camino normal de consola
- ya existe persistencia y auditoria formal de campañas centralizadas:
  - `tenant_runtime_secret_campaigns`
  - `tenant_runtime_secret_campaign_items`
  - `GET /platform/security-posture/runtime-secret-campaigns`

Backlog opcional posterior:

- secret manager real
- politicas mas ricas de distribucion de credenciales
- sesion multi-dispositivo mas rica y auditoriable

## Punto actual recomendado

Hoy el proyecto ya no esta parado en el backend temprano.

La lectura practica actual es esta:

- el bloque basico de plataforma ya quedo mayormente cerrado:
  - instalador
  - ciclo de cuenta raiz
  - usuarios de plataforma
  - tenants
  - provisioning
  - billing operativo
  - actividad
  - settings
- `business-core`, `maintenance`, `finance`, `Provisioning/DLQ`, `Etapa 15`, `Etapa 11` y `Etapa 12` ya quedaron suficientemente institucionalizados para el alcance actual
- el siguiente frente formal recomendado pasa a ser `Etapa 13. Frontend de Plataforma y Tenant`
- los huecos mas probables ya no son de ausencia de feature, sino de endurecimiento, trazabilidad y consistencia operativa

## Etapa 12. Auditoria y Observabilidad

Estado: `Completado`

Objetivo:

- saber que pasa en la app y quien hizo que

Entregables esperados:

- auditoria de autenticacion
- auditoria de operaciones administrativas
- base para trazabilidad de eventos operativos
- observabilidad tecnica minima

Resultado actual:

- existe auditoria persistente para `login`, `refresh` y `logout` en `platform` y `tenant`
- los eventos viven en `platform_control.auth_audit_events`
- existe `request_id` por request y logging estructurado basico de requests HTTP
- existe manejo centralizado de errores con payload uniforme y `request_id`
- `auth_audit_events` ya expone tambien:
  - `request_id`
  - `request_path`
  - `request_method`
- `platform_admin > Actividad` ya permite filtrar por:
  - `scope`
  - `outcome`
  - `event_type`
  - `tenant_slug`
  - `request_id`
  - `actor_email` y `event_type` de cambios tenant
- la tabla visible ya mezcla:
  - autenticacion
  - rechazos `401/403` relevantes fuera de `/auth`
  - operaciones administrativas relevantes
  - cambios tenant recientes
- los rechazos `401/403` sobre `/platform/*` y `/tenant/*` fuera de auth ya quedan auditados con:
  - correlacion por `request_id`
  - path
  - method
  - scope
  - tenant si aplica
- existe historial operativo de snapshots, trazas de ciclo y alertas para `provisioning`
- existe una salida externa minima via textfile Prometheus para estado y alertas de `provisioning`

Resultado de cierre:

- soporte ya puede correlacionar accesos, rechazos y cambios administrativos usando la misma vista corta
- la auditoria visible ya no depende solo de logins/logout; cubre tambien denegaciones operativas relevantes
- la observabilidad tecnica minima queda cerrada para el alcance actual con:
  - `request_id` transversal
  - errores HTTP uniformes
  - auditoria persistente enriquecida
  - trazabilidad de `provisioning`
  - healthchecks y evidencia operativa ya institucionalizados

Pendiente deliberado fuera de esta etapa:

- exportaciones avanzadas, rangos de fecha ricos y analitica mas profunda quedan como evolucion posterior, no como deuda de cierre de `Etapa 12`

## Etapa 13. Frontend de Plataforma y Tenant

Estado: `Completado`

Objetivo:

- dejar de depender de `curl` para operacion normal

Frentes principales:

- app de instalacion
- panel de plataforma
- portal tenant

Resultado actual:

- existe instalador visual funcional
- existe `platform_admin` usable con `Dashboard`, `Tenants`, `Provisioning`, `Billing` y `Settings`
- existe `tenant_portal` usable con login, resumen, usuarios y finanzas
- ya existe una capa comun de manejo de errores, sesion, labels y estados vacios para no depender de respuestas crudas de API
- `GET /platform/capabilities` y `/tenant/info` ya exponen `ui_label_catalog` como fuente de verdad visible para:
  - modulos
  - tipos de tenant
  - estados
  - ciclos billing
  - scopes
  - eventos de policy/auth
  - changed fields y claves de limites
- `platform_admin -> Tenants`, `platform_admin -> Actividad` y `tenant_portal -> Resumen tecnico` ya consumen ese catalogo backend-driven y dejan de depender de heuristicas frontend para la lectura principal
- el ultimo borde visible de UX/labels ya no depende de `curl` ni de interpretar codigos internos para operar el bloque central

Resultado de cierre:

- el frontend principal de plataforma y tenant ya queda suficientemente cerrado para el alcance actual
- la lectura principal del bloque central ya no expone codigos internos como superficie normal de operacion
- los labels visibles criticos ya quedan backend-driven y consistentes entre consola y portal tenant
- staging y production ya quedaron redeployados/publicados con este cierre

## Etapa 14. Modulos de Negocio Reales

Estado: `Completado`

Objetivo:

- convertir la base PaaS en producto util por dominio

Orden sugerido:

1. tomar `finance` como modulo base ya cerrado y referencia para los siguientes slices
2. abrir `crm` comercial como primer bloque de expansión post-cierre
3. cerrar `taskops` como segundo módulo transversal de operación interna
4. luego `condos`
5. despues `iot`

La razon de este orden es simple:

- `finance` es pequeno y transversal
- `condos` agrega casos de negocio mas visibles
- `iot` sube bastante la complejidad tecnica

Resultado actual:

- `finance` ya no es solo una idea: existe modulo backend funcional, migraciones, enforcement de limites, vistas tenant y visibilidad operativa desde plataforma
- ya existen pruebas manuales y runbooks guiados sobre `finance`, billing y efectos de limites en el portal tenant
- `tenant_portal` ya corrigio el cambio de idioma en `Overview`, `Users`, login y el borde legacy de finanzas; `platform_admin` ya absorbio la misma capa en guards, installer, login, recovery, `Dashboard`, `Actividad`, `Settings`, `Usuarios de plataforma`, `Histórico tenants`, `Billing`, `Provisioning` y la lectura principal de `Tenants`, y el frontend ya dejo resuelto el warning de bundle principal grande con code-splitting por ruta
- `finance` ya puede tratarse como modulo cerrado en su alcance actual para preparar trabajo transversal posterior y habilitar la construcción de nuevos módulos tenant
- `business-core` ya quedó operable como dominio transversal real:
  - empresas / contraparte base
  - clientes
  - grupos sociales
  - organizaciones, sitios, contactos, assets y duplicados
- `maintenance` ya quedó operable como dominio real encima de esa base:
  - work orders
  - historial
  - reportes
  - instalaciones
  - costos, visitas y sincronización con finanzas
- la expansión posterior ya quedó iniciada con `crm`:
  - productos con características
  - oportunidades abiertas e históricas
  - contactos, notas, actividades y adjuntos comerciales
  - plantillas reutilizables
  - cotizaciones estructuradas
  - resumen comercial completo
- `taskops` ya quedó cerrado para su alcance operativo actual:
  - tareas internas con referencias cruzadas a cliente, oportunidad y OT
  - kanban por estado
  - histórico cerrado
  - comentarios
  - adjuntos con descarga
  - trazabilidad de cambios de estado
  - resumen operativo visible

Resultado de cierre:

- la PaaS ya no es solo base técnica: ya opera módulos de negocio reales y visibles
- `finance`, `business-core`, `maintenance`, `crm` y `taskops` ya cubren el cierre del alcance base de producto por dominio
- módulos como `condos` o `iot` pasan a tratarse como expansión posterior, no como deuda del cierre base de la `Etapa 14`

## Etapa 15. Registro y Activacion de Modulos

Estado: `Completado`

Objetivo:

- habilitar o deshabilitar modulos por tenant
- preparar billing y planes

Entregables esperados:

- catalogo de modulos
- activacion por tenant
- dependencias entre modulos
- limites por plan

Resultado actual:

- la consola ya consume el catálogo comercial vigente desde `base_plan_catalog` + `module_subscription_catalog`; el catálogo legacy por `plan_code` ya queda como superficie condicional
- ya existe `plan_modules` como catálogo explícito de módulos declarados por backend
- ya existe `module_dependency_catalog` como catálogo explícito de dependencias entre módulos declarado por backend
- `platform_admin > Configuración` ya expone una primera lectura formal del catálogo de planes y módulos
- `platform_admin > Tenants > Plan y módulos` ya deja explícito que la activación tenant-side ocurre por plan y no por toggles sueltos
- el mismo bloque ya muestra módulos y límites por módulo del plan seleccionado antes de aplicar el cambio
- `platform_admin > Configuración` ya expone `Dependencias entre módulos`
- `platform_admin > Tenants > Plan y módulos` ya muestra si el plan cubre o no las dependencias requeridas antes de aplicar cambios
- `platform_control` ya tiene el primer corte técnico del modelo nuevo:
  - catálogo persistente de `Plan Base`
  - catálogo persistente de módulos arrendables
  - catálogo persistente de precios/ciclos por módulo
  - suscripción global por tenant
  - items de suscripción por módulo
- `GET /platform/capabilities` ya expone además:
  - `subscription_activation_model`
  - `subscription_billing_cycles`
  - `base_plan_catalog`
  - `module_subscription_catalog`
- la migración de control ya quedó aplicada en `staging` y `production` para backfillear una suscripción base por tenant con `finance` incluido
- `Configuración` y `Tenants > Plan y módulos` ya quedaron adaptados al modelo visible `Plan Base + add-ons`:
  - `Configuración` ya expone:
    - `Planes base`
    - `Módulos arrendables`
    - `Ciclos comerciales`
    - `Política efectiva actual por plan`
  - `Tenants > Plan y módulos` ya expone:
    - `Plan Base aprobado`
    - add-ons visibles
    - ciclos comerciales visibles
    - dependencias ya cubiertas o no
    - lectura explícita de activación efectiva desde suscripciones tenant con fallback legacy por `plan_code`
- `Tenants > Plan y módulos` ya deja también contratación formal:
  - `Contrato comercial tenant` opera sobre `tenant_subscriptions` y `tenant_subscription_items`
  - `Baseline legacy por plan_code` queda como compatibilidad temporal
  - la vista ya separa `Plan Base`, add-ons arrendados y dependencias técnicas auto-resueltas
- el primer corte técnico del modelo nuevo ya quedó promovido a `staging` y `production`
- el cálculo de activación técnica efectiva desde suscripciones tenant ya quedó implementado con fallback legacy por `plan_code`
- la política comercial ya da un paso más:
  - `billing`, `grace` y `suspensión` ya se evalúan primero desde `tenant_subscriptions`
  - los eventos de billing ya proyectan estado/fechas sobre la suscripción cuando existe
  - el fallback legacy de módulos ya no se aplica a tenants con contrato ya gestionado en el modelo nuevo
- el baseline técnico de cuotas/límites ya también da el siguiente paso:
  - tenants gestionados por contrato ya resuelven `read/write rate limits`, módulos base habilitados y `module_limits` desde `tenant_subscriptions` + `base_plan_catalog`
  - `plan_code` queda solo como compatibilidad para tenants legacy todavía no recontratados
  - `Configuración` ya expone el baseline resuelto del `Plan Base` con:
    - `compatibility_policy_code`
    - `read_requests_per_minute`
    - `write_requests_per_minute`
    - `module_limits`
  - `Tenants > Plan y módulos` ya deja visible:
    - `Modelo contractual`
    - `Fuente baseline`
    - si el tenant sigue legacy o ya está gestionado por contrato
- separar el estado visible entre:
  - incluido por `Plan Base`
  - arrendado por suscripción
  - efectivamente habilitado
- la lectura visible final del contrato ya quedó cerrada en `Tenants > Plan y módulos`:
  - `Estado contractual`
  - `Ciclo vigente`
  - `Gracia contractual`
  - `Co-termination`
  - próxima renovación y fin de período actual
  - estado por item con ciclo, prorrateo y fechas de renovación / término
- los 4 tenants activos de `staging` y `production` ya quedaron gestionados por contrato y sin `plan_code` activo
- el carril normal de alta, bootstrap, billing, cuotas y activación efectiva ya no depende de `plan_code`

Resultado de cierre:

- la activación modular ya queda gobernada por `Plan Base + add-ons` sobre `tenant_subscriptions` y `tenant_subscription_items`
- el fallback legacy por `plan_code` queda suficientemente acotado a compatibilidad explícita y rescate legacy real
- la lectura contractual visible ya cubre baseline, add-ons, estado, gracia, co-terminación, prorrateo y activación efectiva
- `Etapa 15` deja de ser frente activo principal para el alcance actual

Decisión formal cerrada:

- no se seguirá con `plan-driven puro` como modelo final
- tampoco se abrirán `overrides` libres por tenant como solución principal
- la dirección aprobada es `Plan Base + módulos arrendables por suscripción`

Referencia:

- [TENANT_MODULE_SUBSCRIPTION_MODEL.md](/home/felipe/platform_paas/docs/modules/platform-core/TENANT_MODULE_SUBSCRIPTION_MODEL.md)

## Etapa 16. Infraestructura y Operacion Real

Estado: `Completado`

Objetivo:

- pasar de entorno de desarrollo a operacion confiable

Entregables esperados:

- despliegue reproducible en Debian
- backups
- restauracion
- nginx / systemd / docker si aplica
- estrategia de entornos

Resultado actual:

- existe una base operativa para Debian con `systemd`, `nginx`, `.env` de produccion ejemplo y script de deploy
- existe documentacion inicial de despliegue backend en `docs/deploy/backend-debian.md`
- existe una base inicial de backup y restore para `platform_control` con scripts y timer `systemd`
- existe una base inicial de backup y restore para tenants usando `platform_control` como fuente de resolucion
- existe una plantilla inicial de HTTPS real en `nginx` con documentacion para Debian
- existe una base inicial para renovacion automatizada de certificados con `certbot` y `systemd`
- existen plantillas iniciales separadas para `development`, `staging` y `production`
- existe validacion previa de variables criticas de entorno y wrappers de deploy para `staging` y `production`
- existe un workflow manual base de deploy y un script de rollback por ref git
- existe verificacion post-deploy base integrada al flujo de release backend
- existe una base inicial para sincronizar backups hacia almacenamiento externo
- existe una base inicial de restore drill para `platform_control` sobre una DB temporal
- existe una base inicial de restore drill para tenants sobre DBs temporales
- existe un checklist base de aceptacion operativa y recoleccion minima de evidencia
- existe una base inicial de worker para `provisioning_jobs` pendientes fuera del request HTTP
- existe evidencia repetible por release con:
  - preflight
  - post-deploy verification
  - smoke base
  - snapshot JSON de convergencia tenant
  - recoleccion estructurada en `operational_evidence/`
- existe rollback operativo por ref git del repo fuente sin depender de que `/opt/...` sea checkout git
- existe estrategia de entornos ya materializada en el mini PC actual:
  - `development`
  - `staging`
  - `production`
- existe aislamiento operativo real entre `staging` y `production` en rutas, puertos, frontend publicado y árboles runtime distintos
- existe publicación reproducible de frontend estático por ambiente con validación `check_frontend_static_readiness.sh`
- existe base operativa de HTTPS y certificados renovables en el entorno final

Cierre formal:

- para el alcance actual del roadmap base, la infraestructura y operación real ya dejan de ser deuda de cierre
- mejoras futuras como CD más sofisticado, certificados aún más automatizados o aislamiento más fuerte entre hosts pasan a ser endurecimiento adicional, no bloqueo del cierre

## Etapa 17. Escalado y Hardening Final

Estado: `Completado`

Objetivo:

- operar mas tenants y mas modulos con menos riesgo

Entregables esperados:

- tuning de conexiones
- colas o workers para tareas largas
- limites y protecciones
- politicas de mantenimiento tenant

## Prioridades estructurales ya absorbidas

Las prioridades que guiaron este cierre ya quedaron absorbidas en la base actual:

1. ciclo básico de tenants operable y visible
2. frontend y documentación consolidados como capa operativa estable
3. calidad técnica y automatización suficientes para no depender solo de prueba manual
4. catálogos y labels críticos expuestos por backend
5. instalador, onboarding y flujo diario suficientemente claros
6. base contractual, de seguridad y de observabilidad ya institucionalizada antes de abrir nuevos frentes

Resultado actual:

- existe configuracion base de pool para `platform_control` y DBs tenant
- existe una fabrica comun de engines PostgreSQL para evitar configuracion duplicada
- existe una base inicial de worker para `provisioning_jobs`
- existe un comando CLI para correr el worker una vez o en modo polling
- existe una suite de pruebas especifica para el worker
- existe base documental y operativa con `systemd` para ejecutar el worker fuera de HTTP
- existe reintento con backoff exponencial simple para `provisioning_jobs`
- el worker ya no se detiene por el fallo de un job individual
- existe lock de proceso para evitar ejecucion concurrente del worker
- el lock puede separarse por `job_type` para habilitar workers por carga
- existe umbral maximo de fallos por ciclo para cortar throughput riesgoso
- existe logging estructurado basico por job y por ciclo del worker
- existe mantenimiento tenant con ventana programable y razon operativa
- existe mantenimiento tenant configurable por scope de modulo y modo de acceso
- existe una vista agregada de `provisioning_jobs` por tenant para seguimiento operativo rapido
- existe tambien una vista agregada por tenant y `job_type`
- existe historial operativo basico de metricas de `provisioning` por tenant dentro de `platform_control`
- existe una salida externa minima via Prometheus textfile para el resumen actual de `provisioning`
- existe una base de perfiles de worker para asignar `job_type` de forma estable
- existen wrappers y plantillas `systemd` para operar workers por perfil
- existe un instalador para materializar timers `systemd` con cadencia distinta por perfil
- existe una politica base de prioridad por `job_type` para ordenar el despacho del worker
- existe una cuota base por `job_type` dentro del ciclo para aplicar backpressure simple cuando una sola carga empieza a dominar el backlog
- existe una regla base para elevar dinamicamente esa cuota cuando el backlog observado de un `job_type` supera un umbral
- existe tambien una politica base de cuota por clase de tenant usando `tenant_type` como criterio operativo
- existe una regla base para elevar dinamicamente esa cuota por clase cuando el backlog observado de esa clase supera un umbral
- existe tambien una politica base de prioridad por clase de tenant para aproximar SLA operativo sin salir aun de este worker simple
- existe tambien una politica base de envejecimiento de backlog para reducir starvation de jobs antiguos dentro del ciclo
- existe ya una estrategia de orden compuesta y auditable por job para que el criterio del ciclo no dependa de pasos aislados dificiles de leer
- existe ya persistencia de trazas resumidas del ciclo del worker, correlacionadas por `capture_key` con los snapshots historicos por tenant
- existe ya una capa minima de alertas operativas calculadas sobre snapshots y trazas persistidos
- existe ya persistencia basica del historial de alertas operativas de provisioning
- existe ya una salida externa minima enriquecida que expone tambien alertas activas en el textfile Prometheus
- existe ya una capa de dispatch desacoplada con backend real `database` o `broker`
- existen ya cuotas base por tenant para lecturas y escrituras de API, con opcion distribuida sobre Redis
- existen ya overrides persistidos por tenant para cuotas `read/write`, operables desde `platform`
- existe ya resolución contractual de cuotas, módulos habilitados y límites por módulo desde:
  - `tenant_subscriptions`
  - `tenant_subscription_items`
  - `base_plan_catalog`
- el fallback `plan_code` ya queda acotado solo a compatibilidad legacy explícita y deja de ser baseline normal
- existe ya un estado minimo de billing por tenant con efecto automatico sobre login, refresh y runtime
- existe ya una politica efectiva de acceso tenant que consolida `status` manual y billing en una sola salida operativa
- el login tenant ya traduce mejor bloqueos comunes de lifecycle y billing para no depender de mensajes crudos del backend
- billing grace ya puede degradar automaticamente cuotas y modulos mientras el tenant siga operativo
- existe ya historial persistido de cambios de politica tenant para trazabilidad operativa
- existe ya una base de sincronizacion idempotente de eventos de billing por tenant
- existe ya un primer adaptador de proveedor y una ruta webhook para Stripe con validacion de firma tipo Stripe
- el tenant ya puede persistir identidad externa de billing para desacoplar la resolucion del webhook respecto de `tenant_slug`
- `platform` ya puede administrar esa identidad externa de billing y usarla como via preferente de resolucion frente a eventos del proveedor
- existe ya reconciliacion administrativa desde eventos de billing persistidos para corregir drift operativo
- los eventos de billing ya dejan una clasificacion operativa minima (`applied`, `duplicate`, `ignored`, `reconciled`) para soporte y trazabilidad
- el historial de billing ya puede filtrarse y reconciliarse en lote desde `platform`, mejorando la operacion manual antes de integrar un modulo de billing mas rico
- existe ya una vista agregada del historial de billing por `provider`, `event_type` y `processing_result`
- existe tambien una vista global de billing cross-tenant para soporte ejecutivo y operacion diaria
- existe ya una capa minima de alertas operativas sobre billing usando umbrales simples por `duplicate`, `ignored` y volumen total por proveedor
- esas alertas de billing ya pueden persistirse y consultarse historicamente desde `platform`
- el lifecycle tenant ya soporta cambios operativos de `status` con bloqueo explicito de login, refresh y runtime para tenants no activos
- el backend `broker` ya cuenta con DLQ Redis y requeue operativo puntual, en lote y diferido
- existe ya retencion opcional por tiempo sobre la DLQ Redis para evitar crecimiento indefinido
- existe ya replay administrativo por patron de error usando `error_contains`
- `provisioning_jobs` ya cuenta con `error_code` estable para filtrar y operar la DLQ sin depender solo de texto libre
- las alertas operativas de provisioning ya pueden reflejar repeticion de fallos por `error_code`
- existe ya una vista agregada de metricas por `error_code` para lectura operativa rapida
- existe ya enforcement contractual de módulos y límites desde suscripciones tenant, no solo desde `plan_code`
- existe ya rate limiting tenant con backend distribuido opcional en Redis
- existe ya billing state con degradación automática sobre login, refresh y runtime
- existe ya historial y alertas operativas persistidas tanto para `provisioning` como para `billing`

Cierre formal:

- para el alcance actual de la PaaS base, el hardening y escalado final ya cuentan con una base suficientemente operable y visible
- profundizaciones futuras como más throughput distribuido, observabilidad externa más rica, SLA más fino o políticas más complejas de mantenimiento quedan como evolución posterior, no como deuda abierta del roadmap base

## Punto actual recomendado

El roadmap base actual ya queda formalmente cerrado.

Interpretacion practica:

- la columna vertebral ya existe
- el backend ya es operable y testeable
- la operacion real ya tiene deploy, rollback, backups, restore drills, evidencia y hardening suficiente para el alcance actual
- ya existe una capa base de visibilidad operativa para `provisioning_jobs` por tenant
- esa visibilidad ya puede abrirse por `job_type`
- ya existe tambien un historial operativo basico para esas metricas
- ya existe ademas un historial resumido de ciclos del worker para entender por que el scheduler despacho como despacho
- ya existe una capa minima de alertas consultables sobre esos datos persistidos
- ya existe tambien historial persistido de esas alertas para soporte y analisis operativo
- ya existe una salida externa minima para exponer el resumen actual sin depender de la API
- esa salida externa ya no expone solo backlog y estados, sino tambien alertas activas agregadas
- ya existe una base de cuotas por tenant en la API protegida
- el worker y la creacion de jobs ya no dependen directamente del mecanismo `database`; ese detalle quedo detras de un dispatch backend
- el worker ya puede filtrarse por `job_type`, dejando una base real para separar cargas
- esa separacion ya puede expresarse tambien con perfiles nombrados
- esa operacion ya tiene una base reproducible con wrapper y unidad instanciada
- ya puede ademas bajarse a unidades concretas con `OnCalendar` distinto por perfil
- ya existe un criterio base para decidir que `job_type` sale antes en cada ciclo
- ya existe tambien un criterio base para limitar cuanto de cada `job_type` entra a un ciclo antes de procesarse
- ese criterio ya puede ajustarse dinamicamente segun backlog observado por `job_type`
- ese mismo criterio ya puede aplicarse tambien a la clase de tenant asociada al job
- ya existe ademas una prioridad base por clase de tenant para decidir quien compite mejor por el ciclo
- ya existe tambien una regla simple para adelantar jobs demasiado antiguos aunque no sean del tipo o clase preferente
- ese orden ahora ya se materializa como score compuesto visible en el resumen del ciclo
- ese ciclo ya deja ademas una traza persistida correlacionable con los snapshots por tenant mediante `capture_key`
- los siguientes frentes ya son decision de expansion o de endurecimiento extra, no de cierre base:
  - nuevos modulos reales
  - stack externa de observabilidad
  - infraestructura mas distribuida
  - politicas comerciales u operativas mas avanzadas

## Criterio de cierre del backend base

Con las Etapas 16 y 17 ya formalmente `Completado`, el backend base puede considerarse suficientemente cerrado para pasar a expansion o endurecimiento adicional sin arrastrar deuda estructural del roadmap maestro.

La interpretacion correcta es esta:

- `Completado` no significa "sin mejoras posibles"
- significa que las mejoras futuras ya no bloquean la operacion real del alcance actual
- y que el siguiente paso puede elegirse por estrategia de producto, no por deuda estructural pendiente

Documento de referencia para esta decision:

- `docs/architecture/backend-closure-status.md`

## Orden sugerido desde hoy

Si el equipo quiere avanzar con buen retorno tecnico, el orden recomendado es:

1. considerar cerrado el roadmap base actual
2. tratar `crm` y `taskops` como módulos ya cerrados para su alcance actual
3. después elegir el siguiente frente de expansion o endurecimiento extra
4. abrir ese frente nuevo con spec, ownership y evidencia desde el inicio
5. ajustar backend/frontend solo cuando ese frente nuevo descubra un hueco real de contrato o uso
6. no reabrir etapas base ya cerradas salvo evidencia nueva

## Regla para developers

Antes de abrir una etapa nueva, revisar si la anterior esta realmente cerrada en estos cuatro planos:

- codigo
- pruebas
- documentacion
- operacion

Si uno de esos cuatro queda atras, la plataforma empieza a crecer con deuda estructural.
