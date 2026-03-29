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

## Vision final

La app apunta a terminar en un estado donde exista:

- instalacion reproducible de plataforma
- control central de tenants y operaciones
- autenticacion y autorizacion robustas
- DB dedicada por tenant
- modulos tenant desacoplados y activables
- frontend para plataforma y tenant
- despliegue, observabilidad, backup y seguridad operativa

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

Pendiente corto de endurecimiento antes o en paralelo a nuevos modulos:

- smoke/E2E del lifecycle tenant completo hasta aparicion en `Histórico tenants` ya cubierto en backend sobre control DB + tenant DB de prueba, incluyendo create, provision, login tenant, archive, restore, deprovision, delete y validacion del archivo historico
- permisos finos de la vista historica ya congelados en pruebas para mantener `tenant-history` acotado a operacion central `superadmin`
- `tenant-history` ya expone filtros server-side y exportacion `CSV/JSON` para no depender solo de filtrado en memoria cuando el archivo crezca
- `Billing` y `Provisioning` ya permiten exportar snapshots operativos del estado visible para soporte y trazabilidad sin copiar filas manualmente desde la UI
- la superficie visible de `platform_admin` ya usa una matriz de acceso por rol centralizada para navegación, redirecciones y edición de usuarios de plataforma
- dejar como trabajo posterior un stack E2E browser para desarrollo local, idealmente sobre flujos `platform_admin` y `tenant_portal`, sin mezclarlo con la regresion backend ya cubierta
- recaptura visual del bloque tenant cuando la UX ya se considere estable

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
- `CLP` ya forma parte de las monedas semilla del modulo
- el modulo ya esta registrado en la app
- existe migracion tenant versionada para `finance_entries`
- existe migracion tenant versionada para `finance_transactions`, `finance_transaction_tags`, `finance_transaction_attachments` y `finance_transaction_audit`
- existe enforcement de `finance.entries`, `finance.entries.monthly`, cuotas segmentadas como `finance.entries.monthly.income`, `finance.entries.monthly.expense`, `core.users`, `core.users.active`, `core.users.monthly` y cuotas por rol como `core.users.admin` por plan, override tenant y billing grace
- existe visibilidad operativa de uso vs limite desde `tenant` y desde `platform`
- existe ya una vista generica de uso por modulo para preparar el mismo patron en futuros modulos
- `platform` ya expone un catalogo de capacidades backend para que frontend y soporte descubran estados, modulos y claves de cuota sin hardcodearlos
- ese catalogo ya incluye metadatos estructurados por cuota para que frontend no tenga que inferir labels, recursos o segmentaciones

Checklist de cierre funcional ya cubierto:

- catálogos, configuración, monedas y tipos de cambio operativos
- núcleo transaccional moderno con filtros, edición, etiquetas, conciliación individual y batch
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

Estado: `En progreso`

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
- ya quedo corregido el riesgo de parseo incorrecto de credenciales PostgreSQL con caracteres reservados usando builders seguros de URL
- el backend ya reaplica migraciones de control al startup cuando la plataforma esta instalada, para evitar desalineacion entre modelo y esquema tras cambios de `platform_control`

Falta para cerrarlo:

- endurecer la politica del workflow en ramas protegidas
- ampliar la estrategia de datos de prueba hacia casos mas ricos de negocio

## Etapa 10. Migraciones y Bootstrap Evolutivo

Estado: `En progreso`

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

Falta para cerrarlo:

- estrategia mas rica por modulo y posibles downgrades

## Etapa 11. Secretos y Seguridad Operativa

Estado: `En progreso`

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

Falta para cerrarlo:

- secret manager real
- rotacion centralizada de secretos fuera de `.env`
- politicas de distribucion de credenciales
- sesion multi-dispositivo mas rica y auditoriable

## Punto actual recomendado

Hoy el proyecto ya no esta parado en el backend temprano.

El punto actual real esta entre:

- `Etapa 16`: operacion backend bastante avanzada
- `Etapa 17`: hardening final y politicas de escalado en progreso claro

La lectura practica es esta:

- la base backend ya no necesita mas refactor estructural inmediato
- el equipo ya tiene testing, migraciones, operacion base y observabilidad minima
- lo que queda mas claro ahora es cerrar backend avanzado antes de abrir fuerte frontend o mas modulos

Lectura de producto a este punto:

- el bloque basico de plataforma ya quedo mayormente cerrado:
  - instalador
  - ciclo de cuenta raiz
  - usuarios de plataforma
  - tenants
  - provisioning
  - billing operativo
  - actividad
  - settings
- los huecos mas probables ya no son de ausencia de feature, sino de endurecimiento, politicas finas y consistencia operativa

## Etapa 12. Auditoria y Observabilidad

Estado: `En progreso`

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
- existe historial operativo de snapshots, trazas de ciclo y alertas para `provisioning`
- existe una salida externa minima via textfile Prometheus para estado y alertas de `provisioning`

Falta para cerrarlo:

- cubrir rechazos del middleware y eventos sospechosos
- cubrir operaciones administrativas relevantes
- agregar correlacion y consultas utiles para soporte
- ampliar observabilidad tecnica mas alla de auth y errores HTTP

- auditoria de acciones criticas
- logging estructurado
- metricas y health checks mas completos
- trazabilidad de provisioning y operaciones tenant

## Etapa 13. Frontend de Plataforma y Tenant

Estado: `En progreso`

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

Falta para cerrarlo:

- refinamiento final de UX y labels
- catalogos mas ricos desde backend para reducir codigos internos visibles
- automatizacion y cobertura final de algunos bordes operativos

## Etapa 14. Modulos de Negocio Reales

Estado: `En progreso`

Objetivo:

- convertir la base PaaS en producto util por dominio

Orden sugerido:

1. tomar `finance` como modulo base ya cerrado y referencia para los siguientes slices
2. luego `condos`
3. despues `iot`

La razon de este orden es simple:

- `finance` es pequeno y transversal
- `condos` agrega casos de negocio mas visibles
- `iot` sube bastante la complejidad tecnica

Resultado actual:

- `finance` ya no es solo una idea: existe modulo backend funcional, migraciones, enforcement de limites, vistas tenant y visibilidad operativa desde plataforma
- ya existen pruebas manuales y runbooks guiados sobre `finance`, billing y efectos de limites en el portal tenant
- `tenant_portal` ya corrigio el cambio de idioma en `Overview`, `Users`, login y el borde legacy de finanzas; `platform_admin` ya absorbio la misma capa en guards, installer, login, recovery, `Dashboard`, `Actividad`, `Settings`, `Usuarios de plataforma`, `Histórico tenants`, `Billing`, `Provisioning` y la lectura principal de `Tenants`, y el frontend ya dejo resuelto el warning de bundle principal grande con code-splitting por ruta
- `finance` ya puede tratarse como modulo cerrado en su alcance actual para preparar trabajo transversal posterior y habilitar la construcción de nuevos módulos tenant

Falta para cerrarlo:

- decidir el siguiente modulo real despues de `finance`
- tratar el `design system` transversal como base ya aplicada sobre el frontend visible y usar `finance` como referencia formal para los siguientes módulos, no como experimento todavía abierto
- seguir cerrando la internacionalizacion transversal fuera de `finance`, ya no sobre la capa visible principal sino sobre copy secundario, ayudas largas y formularios administrativos densos que todavia mezclan idioma o siguen localmente hardcodeados

## Etapa 15. Registro y Activacion de Modulos

Estado: `Pendiente`

Objetivo:

- habilitar o deshabilitar modulos por tenant
- preparar billing y planes

Entregables esperados:

- catalogo de modulos
- activacion por tenant
- dependencias entre modulos
- limites por plan

## Etapa 16. Infraestructura y Operacion Real

Estado: `En progreso`

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

Falta para cerrarlo:

- criterios de aceptacion mas ricos por modulo y evidencia mas estructurada
- emision automatizada y validada de certificados en el entorno final
- aislamiento operativo mas fuerte entre entornos
- pipeline o CD mas robusto para despliegues y rollback

## Etapa 17. Escalado y Hardening Final

Estado: `En progreso`

Objetivo:

- operar mas tenants y mas modulos con menos riesgo

Entregables esperados:

- tuning de conexiones
- colas o workers para tareas largas
- limites y protecciones
- politicas de mantenimiento tenant

## Prioridades inmediatas

Mirando el estado real del proyecto, lo mas conveniente ahora es:

1. cerrar el ciclo basico de tenants como entidad central de plataforma: alta, edicion basica, archivo y operacion diaria
2. consolidar frontend y documentacion como capa operativa estable, no como prototipo temporal
3. endurecer calidad tecnica y automatizacion para depender menos de prueba manual repetitiva
4. mejorar catalogos y labels expuestos por backend para que frontend deje de traducir tantos codigos internos por su cuenta
5. dejar instalador, onboarding y flujo diario suficientemente claros para que el arranque del proyecto no requiera reconstruir contexto
6. solo despues de lo anterior, volver a abrir con fuerza el siguiente bloque de modulos

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
- existe ya resolucion de cuotas por `plan_code`, con prioridad intermedia entre override tenant y configuracion global
- existe ya resolucion de modulos habilitados por `plan_code`, con enforcement central en middleware tenant
- existe ya una primera resolucion de limites de uso por modulo desde `plan_code`, con enforcement inicial sobre `finance.entries`, `finance.entries.monthly`, cuotas segmentadas por tipo de movimiento, `core.users`, `core.users.active`, `core.users.monthly` y cuotas por rol
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

Falta para cerrarlo:

- politicas de mantenimiento tenant aun mas ricas por permisos o tipos de operacion especificos
- limites de concurrencia y throughput mas finos por tipo de job
- automatizar y endurecer la separacion de workers por tipo de carga si el volumen crece
- enriquecer el backend `broker` con politicas de recuperacion mas ricas, reintentos administrativos y posible DLQ secundaria
- alertas mas ricas o reglas mas sofisticadas sobre las trazas y snapshots persistidos
- salida a stack externa mas rica que el textfile actual

## Punto actual recomendado

El proyecto hoy esta aproximadamente entre:

- Etapa 16
- Etapa 17

Interpretacion practica:

- la columna vertebral ya existe
- el backend ya es operable y testeable
- lo correcto ahora es cerrar hardening final y operacion avanzada
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
- no conviene abrir muchos modulos nuevos hasta estabilizar este tramo

## Criterio de cierre del backend base

Aunque las Etapas 16 y 17 siguen formalmente `En progreso`, el backend base ya puede considerarse suficientemente cerrado para empezar frontend.

La interpretacion correcta es esta:

- `En progreso` ya no significa "backend inmaduro"
- significa que aun existen mejoras futuras posibles en operacion avanzada, billing y escalado
- pero esas mejoras ya no bloquean la construccion del frontend

Documento de referencia para esta decision:

- `docs/architecture/backend-closure-status.md`

## Orden sugerido desde hoy

Si el equipo quiere avanzar con buen retorno tecnico, el orden recomendado es:

1. considerar cerrado el backend base actual
2. abrir frontend de plataforma
3. ajustar backend solo cuando el frontend descubra un hueco real de contrato o uso
4. despues abrir frontend tenant
5. recien luego retomar ampliaciones grandes de modulos o hardening avanzado adicional

## Regla para developers

Antes de abrir una etapa nueva, revisar si la anterior esta realmente cerrada en estos cuatro planos:

- codigo
- pruebas
- documentacion
- operacion

Si uno de esos cuatro queda atras, la plataforma empieza a crecer con deuda estructural.
