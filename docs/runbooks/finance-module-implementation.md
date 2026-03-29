# Implementacion Modulo Finance

Este documento describe el primer modulo tenant funcional agregado sobre la base multi-tenant actual.

Desde el estado actual del proyecto, `finance` queda ademas declarado como:

- modulo base del SaaS
- modulo piloto para la convencion modular futura
- referencia tecnica para los siguientes modulos tenant

## Objetivo

Agregar un modulo pequeno pero real que reutilice:

- JWT tenant
- `get_tenant_db()`
- permisos tenant
- patron `router -> service -> repository`

## Alcance de esta primera version

El modulo `finance` permite:

- registrar movimientos financieros
- listar movimientos
- obtener un resumen simple

## Estado actual del roadmap maestro

El trabajo sobre `finance` ya arranco siguiendo el orden obligatorio del prompt maestro:

- `Lote 0` completado
- `Lote 1` completado
- `Lote 2` completado
- `Lote 3` completado
- `Lote 4` completado
- `Lote 5` completado

En esta fase quedaron listos:

- estructura backend del modulo bajo `backend/app/apps/tenant_modules/finance/`
- estructura frontend del modulo bajo `frontend/src/apps/tenant_portal/modules/finance/`
- router agregador del slice
- placeholders de vistas futuras sin romper la vista actual de movimientos
- documentacion tecnica y funcional inicial del modulo
- migracion tenant `0003_finance_catalogs`
- migracion tenant `0004_finance_seed_clp`
- catalogos base del modulo y seeds idempotentes
- `CLP` disponible como moneda semilla adicional
- modelos SQLAlchemy de catalogos base
- schemas backend por entidad
- repositories CRUD base por catalogo
- servicios backend por catalogo
- endpoints CRUD base para catalogos, settings y exchange rates
- endpoints de detalle y `reorder` para catalogos principales
- frontend operativo para cuentas, categorias, catalogos auxiliares y configuracion financiera
- `Categorías` ya permite elegir iconos semánticos controlados y mostrarlos en formulario/listado
- `Cuentas`, `Beneficiarios` y `Personas` ya reutilizan también iconos controlados en formulario/listado
- migracion tenant `0005_finance_transactions`
- tabla `finance_transactions` como nucleo real del modulo
- tablas auxiliares de tags, adjuntos y auditoria por transaccion
- backfill idempotente desde `finance_entries`
- compatibilidad legacy de `/tenant/finance/entries` sobre la nueva persistencia
- endpoints modernos `GET|POST /tenant/finance/transactions`
- endpoint `GET /tenant/finance/transactions/{transaction_id}` con auditoria reciente
- endpoint `GET /tenant/finance/account-balances`
- vista tenant real de transacciones sobre `finance_transactions`
- panel de detalle operacional por transaccion seleccionada
- carga, descarga y eliminacion de adjuntos operativos por transaccion desde el mismo panel de detalle
- compresion previa de imagenes en frontend para respaldos `jpg/png/webp`, manteniendo tambien soporte `pdf`
- anulacion blanda de transacciones desde la misma vista, sin borrado fisico y con auditoria conservada
- balances por cuenta visibles desde la UI tenant
- filtros operativos por tipo, cuenta, categoria, conciliacion y texto
- acciones rapidas para marcar favorita o conciliada una transaccion existente
- edicion completa de transacciones existentes usando el mismo contrato de escritura
- modo edicion en la pantalla principal de `Transacciones`, con cancelar y refresco del detalle sin colapsarlo
- filtro explicito por favoritas y mesa de trabajo basica con seleccion multiple
- acciones por lote para favoritas y conciliacion desde la tabla principal
- conciliacion guiada con nota opcional, confirmacion explicita y auditoria reciente enriquecida
- `Transacciones` ya admite filtro por `etiqueta` y muestra `tags` visibles en tabla y detalle operacional
- la conciliacion individual y batch ya persiste `reason_code` estructurado además de la nota operativa
- primera pantalla real de `Presupuestos` con lectura `presupuesto vs real`
- filtros de `Presupuestos` por tipo, estado derivado e inclusion de inactivos
- `Presupuestos` ya expone contadores por estado operativo (`sobre`, `dentro`, `sin uso`, `inactiva`)
- `Presupuestos` ya expone un bloque `Foco presupuestario` con categorias priorizadas por variacion y estado
- `Presupuestos` ya permite editar y activar/desactivar rápido desde el propio `Foco presupuestario`
- `Presupuestos` ya permite clonar presupuestos desde otro mes hacia el mes visible, con sobrescritura opcional
- `Presupuestos` ya permite aplicar ajustes guiados desde `Foco presupuestario`, por ejemplo alinear al real con margen o desactivar categorias sin uso
- `Presupuestos` ya permite aplicar plantillas operativas sobre el mes visible, incluyendo `mes anterior`, `mismo mes año anterior` y `promedio real 3 meses`
- primer slice real de `Préstamos` con cartera base, saldo pendiente y contraparte
- cronograma inicial de `Préstamos` con cuotas generadas, proximo vencimiento y detalle por préstamo
- pagos manuales sobre cuotas de `Préstamos`, con actualizacion de saldo pendiente y refresh del cronograma
- asignacion configurable del pago entre interes y capital por cuota
- tracking separado de capital pagado e interes pagado en el cronograma
- reversa parcial o total de abonos sobre cuotas de `Préstamos`, con devolucion del capital revertido al saldo del préstamo
- pagos y reversiones en lote sobre cuotas seleccionadas del mismo préstamo
- razones estructuradas de reversa sobre cuotas, tanto individual como batch
- enlace contable minimo de cuotas: cada pago o reversa genera una transaccion en `finance_transactions`
- `Préstamos` ya permite definir una cuenta origen por préstamo y reutilizarla al operar cuotas
- pagos y reversas de cuotas ya pueden usar cuenta origen explícita y el detalle del préstamo ya expone lectura contable derivada reciente
- esa lectura derivada de `Préstamos` ya resume pagos, reversas, conciliación y efecto neto base, además de exportar CSV/JSON desde la propia vista
- primera pantalla real de `Planificación` con calendario operativo, cuotas del mes y foco presupuestario
- primera pantalla real de `Reportes` con overview mensual consolidado
- `Reportes` ya incluye pulso diario de caja y ranking corto de desvíos presupuestarios
- `Reportes` ya incluye comparativa contra un mes elegido por el usuario y exportación CSV básica del overview
- `Reportes` ya incluye tendencia mensual corta de 6 meses dentro del mismo overview
- `Reportes` ya permite elegir horizonte de tendencia (`3`, `6` o `12` meses) y exportar JSON además de CSV
- `Reportes` ya permite foco analítico de movimientos (`todos`, `conciliados`, `pendientes`, `favoritas`, `ligados a préstamos`)
- `Reportes` ya permite foco presupuestario por tipo (`ingreso/egreso`) y por estado (`sobre`, `dentro`, `sin uso`, `inactiva`)
- `Reportes` ya incluye resumen del horizonte seleccionado con promedio, mejor/peor mes y delta contra el primer mes
- `Reportes` ya permite elegir explícitamente el mes contra el que se compara el overview, no solo el corte anterior
- `Reportes` ya compara también el horizonte visible completo contra un horizonte equivalente cerrado en el mes comparado
- `Reportes` ya agrega comparativa de acumulado anual (`enero -> mes`) contra el mes comparado
- `Reportes` ya permite releer top categorías con dimensión analítica `período | horizonte | acumulado anual`
- `Reportes` ya exporta CSV y JSON enriquecidos con comparativas, top categorías y resúmenes ejecutivos
- `Reportes` ya permite además comparar la lectura activa contra un rango arbitrario definido por `desde/hasta`
- `Reportes` ya permite rankear ingresos y egresos por dimensión analítica (`categoría`, `cuenta`, `proyecto`, `beneficiario`, `persona`)
- `Reportes` ya compara además la dimensión activa contra el período comparado para detectar entidades que ganan o pierden peso
- las transacciones ya persisten `tag_ids` de forma real en `finance_transaction_tags`
- `Reportes` ya permite además rankear por `etiqueta`
- manejo controlado de schema incompleto en vistas de `finance`, sin `500` crudo
- self-service de sincronizacion de estructura desde el propio `tenant_portal` para `tenant admin`, ahora como job visible y no como ejecucion inline
- el provisioning inicial ya deja encolado un follow-up `sync_tenant_schema` al cerrar `create_tenant_database`
- `platform` ya puede encolar sync masivo post-deploy sobre tenants activos con `POST /platform/tenants/schema-sync/bulk`
- existe ademas el script operativo `backend/app/scripts/enqueue_active_tenant_schema_sync.py` para la misma tarea
- el wrapper de release/verify backend ya dispara ese auto-sync post-deploy por defecto, dejando la operacion manual como respaldo operativo

## Estado de cierre funcional

`finance` ya puede tratarse como modulo funcionalmente cerrado dentro de la etapa actual del PaaS.

Checklist de cierre cubierto:

- catálogos, configuración y moneda base ya operativos
- transacciones modernas con filtros, edición, etiquetas, conciliación y auditoría reciente
- transacciones modernas con adjuntos operativos reales por boleta, factura o respaldo
- transacciones modernas con anulacion blanda y trazabilidad conservada para soporte
- presupuestos con lectura mensual, foco priorizado, clonación, ajustes guiados y plantillas operativas
- préstamos con cronograma, pagos y reversas individuales o batch, cuenta origen, lectura contable derivada y exportación
- planificación con overview operativo mensual, `spotlight` visual y chart de señales/foco
- reportes con comparativas, rankings, exportaciones enriquecidas, foco analítico por dimensión y charts reales para pulso, tendencia y desvíos
- base visual inicial del módulo ya sembrada con navegación iconográfica, bloques `spotlight` y componentes de charting liviano
- `Categorías` ya permite además distinguir visualmente cada rubro con iconos semánticos controlados
- `Cuentas` y catálogos auxiliares con campo `icon` ya reaprovechan esa misma base visual controlada
- manejo controlado de schema incompleto desde UI/API
- sincronización de schema tenant visible desde portal, follow-up post-provisioning y corrida masiva post-deploy ya integrada al wrapper de release

El módulo ya puede tratarse como cerrado también en su backlog opcional sugerido para el alcance actual. Lo que sigue pasa a trabajo transversal posterior o a una futura expansión de negocio, no a deuda pendiente del slice.

Pendiente posterior al cierre de `finance`:

- profundizar la adopcion del `design system` transversal ya iniciado en frontend usando `finance` como primer bloque real de migracion integral
- ese trabajo ya arranco con iconografia comun, `spotlight` generico, badges, layouts, formularios y wrappers de tabla reutilizables; `finance` ya empezó además la migracion de catalogos sobre esa base, incluyendo `Catálogos auxiliares`, y lo siguiente es expandirla al resto del producto
- cerrar una internacionalizacion transversal real del sistema, continuando desde el avance ya hecho dentro del propio `finance`

Estado del cierre ampliado:

- `Transacciones` ya incorpora selección asistida sobre el filtro visible para operar lotes por pendientes, préstamos, ingresos, egresos o visibles completos
- `Transacciones` ya incorpora además adjuntos reales con compresión previa de imágenes y soporte `jpg/png/webp/pdf`
- `Transacciones` ya incorpora además anulacion blanda para corregir errores sin perder historia operativa
- ya existe tooling real para preparar e importar CSV legacy de egresos con compresion offline de imagenes y carga idempotente sobre `finance_transactions`
- ese flujo deja perfil editable, CSV normalizado, staging de imagenes comprimidas y reporte de importacion para pruebas de volumen sobre tenants reales
- el almacenamiento real de adjuntos del módulo queda ahora dentro de `backend/app/apps/tenant_modules/finance/storage/attachments/`
- `Presupuestos` ya soporta plantillas operativas con escala porcentual y redondeo por múltiplo, además de clonación y ajuste guiado
- `Préstamos` ya devuelve lectura contable derivada más densa con contrapartida, tipo de préstamo, cuota asociada y efecto firmado en exportaciones/tabla
- `Reportes` y `Planificación` ya cierran con charts comparativos adicionales para lectura ejecutiva del período, horizonte y presión mensual

## Archivos principales

- `backend/app/apps/tenant_modules/finance/models/entry.py`
- `backend/app/apps/tenant_modules/finance/repositories/entry_repository.py`
- `backend/app/apps/tenant_modules/finance/services/transaction_service.py`
- `backend/app/apps/tenant_modules/finance/services/budget_service.py`
- `backend/app/apps/tenant_modules/finance/services/loan_service.py`
- `backend/app/apps/tenant_modules/finance/services/planning_service.py`
- `backend/app/apps/tenant_modules/finance/services/reports_service.py`
- `backend/app/apps/tenant_modules/finance/services/finance_service.py`
- `backend/app/apps/tenant_modules/finance/utils/imports.py`
- `backend/app/apps/tenant_modules/finance/schemas/__init__.py`
- `backend/app/apps/tenant_modules/finance/api/router.py`
- `backend/app/apps/tenant_modules/finance/api/transactions.py`
- `backend/app/apps/tenant_modules/finance/api/budgets.py`
- `backend/app/apps/tenant_modules/finance/api/loans.py`
- `backend/app/apps/tenant_modules/finance/api/planning.py`
- `backend/app/apps/tenant_modules/finance/api/reports.py`
- `backend/app/tests/test_tenant_finance_flow.py`
- `backend/app/tests/test_finance_budget_core.py`
- `backend/app/tests/test_finance_loan_core.py`
- `backend/app/tests/test_finance_planning_core.py`
- `backend/app/tests/test_finance_reports_core.py`
- `backend/app/scripts/import_finance_legacy_egresos.py`
- `frontend/src/apps/tenant_portal/modules/finance/routes.tsx`
- `frontend/src/apps/tenant_portal/modules/finance/pages/FinanceTransactionsPage.tsx`
- `frontend/src/apps/tenant_portal/modules/finance/pages/FinanceBudgetsPage.tsx`
- `frontend/src/apps/tenant_portal/modules/finance/pages/FinanceLoansPage.tsx`
- `frontend/src/apps/tenant_portal/modules/finance/pages/FinanceCalendarPage.tsx`
- `frontend/src/apps/tenant_portal/modules/finance/pages/FinanceReportsPage.tsx`
- `frontend/src/apps/tenant_portal/pages/finance/TenantFinancePageLegacy.tsx`

## Endpoints

- `GET /tenant/finance/entries`
- `POST /tenant/finance/entries`
- `GET /tenant/finance/summary`
- `POST /tenant/finance/transactions/{transaction_id}/attachments`
- `GET /tenant/finance/transactions/{transaction_id}/attachments/{attachment_id}/download`
- `DELETE /tenant/finance/transactions/{transaction_id}/attachments/{attachment_id}`
- `PATCH /tenant/finance/transactions/{transaction_id}/void`
- `GET|POST|PUT /tenant/finance/budgets`
- `GET|POST|PUT /tenant/finance/loans`
- `GET /tenant/finance/loans/{loan_id}`
- `PATCH /tenant/finance/loans/{loan_id}/installments/payment/batch`
- `PATCH /tenant/finance/loans/{loan_id}/installments/{installment_id}/payment`
- `PATCH /tenant/finance/loans/{loan_id}/installments/payment/reversal/batch`
- `PATCH /tenant/finance/loans/{loan_id}/installments/{installment_id}/payment/reversal`
- `GET /tenant/finance/planning/overview`
- `GET /tenant/finance/reports/overview`
- `GET /tenant/schema-status`
- `POST /tenant/sync-schema`
- `GET|POST|PUT|PATCH /tenant/finance/accounts`
- `GET|POST|PUT|PATCH /tenant/finance/categories`
- `GET|POST|PUT|PATCH /tenant/finance/beneficiaries`
- `GET|POST|PUT|PATCH /tenant/finance/people`
- `GET|POST|PUT|PATCH /tenant/finance/projects`
- `GET|POST|PUT|PATCH /tenant/finance/tags`
- `GET|POST|PUT|PATCH /tenant/finance/currencies`
- `GET|POST|PUT /tenant/finance/currencies/exchange-rates`
- `GET|POST|PUT|PATCH /tenant/finance/settings`
- `GET` detalle por entidad en catalogos principales
- `PATCH /reorder` donde aplica

## Permisos usados

El modulo se integra con permisos tenant finos:

- `tenant.finance.read`
- `tenant.finance.create`

Roles actuales:

- `admin`: lectura y creacion
- `manager`: lectura y creacion
- `operator`: solo lectura

## Modelo actual

La persistencia transicional del modulo queda asi:

- `finance_entries` se conserva como tabla minima legacy
- `finance_transactions` pasa a ser la tabla central real del modulo
- `finance_budgets` abre la primera capa de planificacion mensual del modulo
- `finance_reports` abre la primera lectura consolidada mensual del modulo
- `finance_loans` abre la primera capa de cartera de prestamos del modulo
- `finance_loan_installments` abre el primer cronograma versionado de cuotas por prestamo
- `reports/overview` ya consolida snapshot, top categorias, serie diaria y desvíos presupuestarios

Campos legacy principales:

- `movement_type`
- `concept`
- `amount`
- `category`
- `created_by_user_id`
- `created_at`

## Carga legacy de egresos

Existe un flujo operativo para convertir datasets legacy tipo `egresos.csv` al contrato actual del modulo:

- script: `backend/app/scripts/import_finance_legacy_egresos.py`
- perfil editable por defecto: `modulo finanzas/ejemplo/egresos_finance_profile.json`
- salida preparada: `modulo finanzas/ejemplo/egresos_finance_import.csv`
- staging de imagenes comprimidas: `modulo finanzas/ejemplo/imagenes_finance_preparadas/`
- reporte de corrida: `modulo finanzas/ejemplo/egresos_finance_import_report.json`

Ese importador:

- traduce `categoria_id` legacy a nombres de categoria del modulo actual
- prepara paths reales de adjuntos tomando el basename de `foto_path`
- comprime imagenes con `convert` cuando la herramienta esta disponible
- crea categorias faltantes de tipo `expense`
- importa transacciones con `source_type=legacy_csv_egresos` y `source_id=<legacy_id>` para mantener idempotencia
- adjunta boletas o facturas comprimidas a la transaccion creada
- copia el archivo final al storage real del módulo, por lo que luego se puede borrar el staging externo usado para preparar el dataset

Ejemplo de uso:

```bash
cd /home/felipe/platform_paas/backend
PYTHONPATH=/home/felipe/platform_paas/backend \
/home/felipe/platform_paas/platform_paas_venv/bin/python \
app/scripts/import_finance_legacy_egresos.py --apply --tenant-slug empresa-demo --actor-user-id 1
```

Campos base del nuevo nucleo:

- `transaction_type`
- `account_id`
- `target_account_id`
- `category_id`
- `beneficiary_id`
- `person_id`
- `project_id`
- `currency_id`
- `amount`
- `amount_in_base_currency`
- `exchange_rate`
- `description`
- `notes`
- `is_reconciled`
- `source_type`
- `source_id`

Campos base de presupuestos:

- `period_month`
- `category_id`
- `amount`
- `note`
- `is_active`

Campos base de préstamos:

- `name`
- `loan_type`
- `counterparty_name`
- `currency_id`
- `principal_amount`
- `current_balance`
- `interest_rate`
- `installments_count`
- `payment_frequency`
- `start_date`
- `due_date`
- `is_active`

## Validaciones actuales

- `movement_type` debe ser `income` o `expense`
- `amount` debe ser mayor que cero

## Estado actual de persistencia

El modulo ya tiene migracion versionada y soporte de sync para tenant DB existente.

En otras palabras:

- el patron del modulo ya esta armado
- la integracion HTTP y de servicio ya existe
- la persistencia fisica en DB se cubre por migracion tenant `0002_finance_entries`
- para tenants existentes aun debes ejecutar sync de esquema o la migracion correspondiente

## Por que este modulo queda como base

`Finance` ya no se interpreta solo como una demo funcional.

En la politica actual del proyecto, queda como:

- primer modulo real sobre la base tenant ya cerrada
- referencia para permisos, enforcement, migraciones y UI tenant
- modulo sobre el cual conviene probar el patron completo antes de abrir otros dominios

## Por que igual sirve este paso

Porque deja resuelto el esqueleto que van a seguir los modulos futuros:

- `condos`
- `iot`
- otros modulos de negocio

## Como cerrar el esquema en tenants existentes

La plataforma expone una ruta administrativa para sincronizar esquema sobre un tenant activo:

- `POST /platform/tenants/{tenant_id}/sync-schema`

Eso permite crear tablas nuevas, como `finance_entries`, sin reprovisionar el tenant completo.

Ademas, el propio `tenant_portal` ya permite a un `admin` del tenant:

- revisar el estado actual del esquema con `GET /tenant/schema-status`
- encolar la sincronizacion con `POST /tenant/sync-schema`
- ver el `latest_job` asociado y esperar el cierre desde la propia tarjeta de error del modulo
- disparar esa accion desde las vistas de `finance` cuando la API detecta schema incompleto, sin bloquear la UI en ejecucion inline

## Siguiente iteracion recomendable

`Lote 6` ya quedo abierto sobre un slice operativo mas completo:

1. pantalla tenant de transacciones sobre `finance_transactions`
2. balances por cuenta y detalle operacional con auditoria reciente
3. filtros operativos por tipo, cuenta, categoria, conciliacion y texto
4. toggles rapidos de favorito y conciliacion
5. edicion completa de transacciones existentes
6. mesa de trabajo basica para conciliacion/favoritos con seleccion multiple y acciones por lote
7. primera vista real de `Presupuestos` por mes y categoria, con comparacion presupuesto vs ejecucion
8. filtros de `Presupuestos` por tipo, estado e inactivos
9. primera vista real de `Préstamos` con cartera base y saldo pendiente
10. cronograma inicial de `Préstamos` con detalle por cuotas, proximo vencimiento y lectura de avance
11. pago manual sobre cuota, con recálculo del saldo pendiente del préstamo
12. asignacion configurable del pago entre interes y capital con tracking separado por cuota
13. reversa parcial o total de abonos sobre cuota, con ajuste inverso del saldo pendiente segun capital revertido
14. pagos y reversiones en lote sobre cuotas seleccionadas del mismo préstamo
15. motivos estructurados de reversa sobre cuotas, visibles en cronograma y persistidos en DB
16. enlace contable minimo desde cuotas hacia `finance_transactions` por `loan_id`, `source_type` y `source_id`
17. primera vista real de `Reportes` con overview mensual de transacciones, presupuestos y préstamos
18. primera vista real de `Planificación` con calendario operativo, cuotas del mes y foco presupuestario

Lo siguiente recomendable ahora es:

1. declarar `finance` como módulo base ya cerrado y usarlo como referencia para nuevos módulos tenant
2. seguir expandiendo el `design system` transversal del PaaS, aplicándolo primero sobre `finance`
3. atacar luego la internacionalización transversal real del frontend
4. tratar cualquier nueva evolución de `finance` como expansión posterior del dominio, no como deuda de cierre del módulo

## Convencion relacionada

La regla general para modulos nuevos ya quedo escrita en:

- [Convencion modular por slice](../architecture/module-slice-convention.md)
