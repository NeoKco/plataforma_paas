# finance_codex_tareas_ejecucion.md

# Plan de ejecución atómico para Codex
## Módulo `finance` tipo Alzex para `platform_paas`

> Este archivo complementa a `roadmap_modulo_finance_alzex_codex_detallado.md`.
>
> Su objetivo es dividir la construcción del módulo en **tareas atómicas, ejecutables y verificables** para que Codex pueda avanzar por bloques pequeños, sin desordenar el proyecto.
>
> Regla principal: **seguir la arquitectura real actual del proyecto** y documentar todo lo que se implemente.

---

# 1. Instrucciones operativas para Codex

## 1.1 Objetivo
Construir el módulo `finance` para tenant portal, replicando funcionalmente Alzex Finance Pro, pero en arquitectura web multi-tenant moderna.

## 1.2 Reglas obligatorias
- No inventar otra estructura de carpetas.
- No mover ni reescribir módulos ajenos sin necesidad.
- No romper autenticación tenant actual.
- No mezclar lógica de negocio en routers.
- No dejar endpoints sin validación ni documentación.
- No dejar tablas sin migración, índice o documentación mínima.
- Cada lote debe cerrar con:
  - código
  - pruebas mínimas
  - documentación dev
  - documentación usuario
  - checklist de validación

## 1.3 Orden obligatorio de trabajo
Codex debe ejecutar los lotes en este orden:

1. Preparación del módulo
2. Migraciones base
3. Catálogos base
4. Cuentas
5. Transacciones
6. Etiquetas y relaciones
7. Archivos adjuntos
8. Plantillas y planificador
9. Préstamos
10. Presupuestos
11. Reconciliación
12. Reportes y dashboard
13. Frontend por vistas
14. Permisos finos
15. Auditoría
16. Importación / exportación
17. Documentación final
18. Endurecimiento y pruebas finales

---

# 2. Estructura objetivo de archivos

## 2.1 Backend

```text
backend/app/apps/tenant_modules/finance/
├── __init__.py
├── module.py
├── constants.py
├── enums.py
├── dependencies.py
├── docs/
│   ├── finance_overview.md
│   ├── finance_permissions.md
│   ├── finance_api.md
│   ├── finance_db.md
│   ├── finance_business_rules.md
│   └── finance_testing.md
├── api/
│   ├── __init__.py
│   ├── router.py
│   ├── accounts.py
│   ├── transactions.py
│   ├── categories.py
│   ├── beneficiaries.py
│   ├── people.py
│   ├── projects.py
│   ├── tags.py
│   ├── loans.py
│   ├── budgets.py
│   ├── templates.py
│   ├── schedules.py
│   ├── reports.py
│   ├── dashboard.py
│   ├── currencies.py
│   ├── reconciliation.py
│   ├── attachments.py
│   ├── filters.py
│   ├── import_export.py
│   └── settings.py
├── schemas/
│   ├── __init__.py
│   ├── common.py
│   ├── account.py
│   ├── transaction.py
│   ├── category.py
│   ├── beneficiary.py
│   ├── person.py
│   ├── project.py
│   ├── tag.py
│   ├── loan.py
│   ├── budget.py
│   ├── template.py
│   ├── schedule.py
│   ├── report.py
│   ├── currency.py
│   ├── reconciliation.py
│   ├── attachment.py
│   ├── filter.py
│   └── settings.py
├── models/
│   ├── __init__.py
│   ├── account.py
│   ├── transaction.py
│   ├── category.py
│   ├── beneficiary.py
│   ├── person.py
│   ├── project.py
│   ├── tag.py
│   ├── loan.py
│   ├── budget.py
│   ├── template.py
│   ├── schedule.py
│   ├── currency.py
│   ├── exchange_rate.py
│   ├── reconciliation.py
│   ├── attachment.py
│   ├── filter.py
│   ├── activity_log.py
│   └── settings.py
├── repositories/
│   ├── __init__.py
│   ├── account_repository.py
│   ├── transaction_repository.py
│   ├── category_repository.py
│   ├── beneficiary_repository.py
│   ├── person_repository.py
│   ├── project_repository.py
│   ├── tag_repository.py
│   ├── loan_repository.py
│   ├── budget_repository.py
│   ├── template_repository.py
│   ├── schedule_repository.py
│   ├── currency_repository.py
│   ├── exchange_rate_repository.py
│   ├── reconciliation_repository.py
│   ├── attachment_repository.py
│   ├── filter_repository.py
│   ├── activity_log_repository.py
│   └── settings_repository.py
├── services/
│   ├── __init__.py
│   ├── account_service.py
│   ├── transaction_service.py
│   ├── category_service.py
│   ├── beneficiary_service.py
│   ├── person_service.py
│   ├── project_service.py
│   ├── tag_service.py
│   ├── loan_service.py
│   ├── budget_service.py
│   ├── template_service.py
│   ├── schedule_service.py
│   ├── currency_service.py
│   ├── exchange_rate_service.py
│   ├── reconciliation_service.py
│   ├── attachment_service.py
│   ├── filter_service.py
│   ├── report_service.py
│   ├── dashboard_service.py
│   ├── settings_service.py
│   ├── activity_log_service.py
│   └── import_export_service.py
├── policies/
│   ├── __init__.py
│   └── finance_permissions.py
├── utils/
│   ├── money.py
│   ├── dates.py
│   ├── filters.py
│   ├── reports.py
│   ├── exports.py
│   ├── imports.py
│   └── attachments.py
└── tests/
    ├── unit/
    ├── integration/
    └── smoke/
```

## 2.2 Frontend

```text
frontend/src/apps/tenant_portal/modules/finance/
├── index.jsx
├── routes.jsx
├── docs/
│   ├── finance_user_manual.md
│   ├── finance_admin_manual.md
│   └── finance_frontend_notes.md
├── services/
│   ├── accountsService.js
│   ├── transactionsService.js
│   ├── categoriesService.js
│   ├── beneficiariesService.js
│   ├── peopleService.js
│   ├── projectsService.js
│   ├── tagsService.js
│   ├── loansService.js
│   ├── budgetsService.js
│   ├── templatesService.js
│   ├── schedulesService.js
│   ├── reportsService.js
│   ├── dashboardService.js
│   ├── currenciesService.js
│   ├── reconciliationService.js
│   ├── attachmentsService.js
│   ├── filtersService.js
│   ├── importExportService.js
│   └── settingsService.js
├── hooks/
│   ├── useFinancePermissions.js
│   ├── useTransactionFilters.js
│   ├── useDashboardSummary.js
│   └── useFinanceCatalogs.js
├── components/
│   ├── common/
│   ├── accounts/
│   ├── transactions/
│   ├── categories/
│   ├── loans/
│   ├── budgets/
│   ├── reports/
│   ├── dashboard/
│   ├── reconciliation/
│   ├── settings/
│   └── import_export/
├── pages/
│   ├── FinanceDashboardPage.jsx
│   ├── FinanceAccountsPage.jsx
│   ├── FinanceTransactionsPage.jsx
│   ├── FinanceCategoriesPage.jsx
│   ├── FinanceCalendarPage.jsx
│   ├── FinanceReportsPage.jsx
│   ├── FinanceProfitLossPage.jsx
│   ├── FinanceLoansPage.jsx
│   ├── FinanceBudgetsPage.jsx
│   ├── FinanceSettingsPage.jsx
│   └── FinanceToolsPage.jsx
├── forms/
│   ├── AccountForm.jsx
│   ├── TransactionForm.jsx
│   ├── CategoryForm.jsx
│   ├── BeneficiaryForm.jsx
│   ├── PersonForm.jsx
│   ├── ProjectForm.jsx
│   ├── TagForm.jsx
│   ├── LoanForm.jsx
│   ├── BudgetForm.jsx
│   ├── TemplateForm.jsx
│   ├── ScheduleForm.jsx
│   ├── ReconciliationForm.jsx
│   ├── FilterForm.jsx
│   └── CurrencyForm.jsx
├── utils/
│   ├── formatMoney.js
│   ├── formatDate.js
│   ├── reportMappers.js
│   └── financeConstants.js
└── styles/
    └── finance.css
```

---

# 3. Lotes de implementación

# Lote 0 — Preparación

## Objetivo
Crear la base del módulo sin funcionalidad de negocio aún.

## Tareas
- Crear carpetas backend del módulo `finance`.
- Crear carpetas frontend del módulo `finance`.
- Crear archivo `module.py` para registrar el módulo.
- Crear `router.py` agregador backend.
- Crear `routes.jsx` del frontend.
- Registrar el módulo en navegación tenant si el proyecto ya tiene registro modular.
- Crear documentación inicial:
  - `finance_overview.md`
  - `finance_api.md`
  - `finance_db.md`
  - `finance_user_manual.md`

## Entregables
- estructura de archivos creada
- módulo visible en proyecto
- docs iniciales vacías pero estructuradas

## Validación
- backend levanta
- frontend compila
- ruta del módulo responde aunque sea placeholder

---

# Lote 1 — Migraciones base

## Objetivo
Crear tablas base y catálogos estructurales.

## Tareas
Crear migraciones para:

- finance_accounts
- finance_categories
- finance_beneficiaries
- finance_people
- finance_projects
- finance_tags
- finance_currencies
- finance_exchange_rates
- finance_settings
- finance_activity_logs

## Requisitos SQL
- PK UUID o entero según convención actual del proyecto
- timestamps
- soft delete si el proyecto ya lo usa
- índices por `is_active`, `sort_order`, `created_at` cuando aplique
- unicidad por tenant donde corresponda

## Seeds
- moneda base por defecto
- categorías semilla mínimas
- tipos de cuenta mínimos

## Documentación
- agregar tabla por tabla en `finance_db.md`
- explicar finalidad de cada catálogo

## Validación
- migraciones corren en tenant DB nueva
- migraciones corren sobre tenant existente sin romper
- seeds idempotentes

---

# Lote 2 — Schemas y modelos base

## Objetivo
Crear modelos, schemas y repositorios de catálogos.

## Tareas
- Modelos SQLAlchemy o la capa usada realmente en el proyecto
- Schemas Pydantic o la validación que ya use el backend
- Repositories CRUD base para:
  - accounts
  - categories
  - beneficiaries
  - people
  - projects
  - tags
  - currencies
  - exchange_rates
  - settings

## Validación
- tests unitarios básicos por repository
- validación de unicidad
- validación de activos/inactivos

---

# Lote 3 — API de catálogos

## Objetivo
Exponer CRUD de catálogos.

## Tareas
Crear endpoints:

- `/finance/accounts`
- `/finance/categories`
- `/finance/beneficiaries`
- `/finance/people`
- `/finance/projects`
- `/finance/tags`
- `/finance/currencies`
- `/finance/exchange-rates`
- `/finance/settings`

Operaciones:
- list
- get detail
- create
- update
- activate/deactivate
- reorder cuando aplique

## Reglas
- no eliminar registros usados por transacciones
- en vez de borrar, desactivar
- validar moneda base única
- validar jerarquía correcta de categorías

## Documentación
- actualizar `finance_api.md`
- agregar ejemplos request/response

## Validación
- smoke tests HTTP por endpoint
- permisos básicos funcionando

---

# Lote 4 — Frontend de catálogos

## Objetivo
Crear pantallas CRUD de catálogos.

## Tareas
Crear páginas y formularios:
- cuentas
- categorías
- beneficiarios
- personas
- proyectos
- etiquetas
- monedas
- configuración básica

## Requisitos UI
- tablas claras
- modal o drawer de creación
- filtros rápidos
- búsqueda
- activar/desactivar
- jerarquía visible para categorías

## Validación
- navegación funcional
- create/edit/list working
- mensajes de error útiles

---

# Lote 5 — Tabla de transacciones y relaciones

## Objetivo
Crear núcleo real del módulo.

## Migraciones
- finance_transactions
- finance_transaction_tags
- finance_transaction_attachments
- finance_transaction_audit
- columnas opcionales:
  - alt_date
  - discount_amount
  - amortization_months
  - is_reconciled
  - is_template_origin
  - favorite_flag

## Relaciones mínimas
- account_id origen
- target_account_id opcional
- category_id opcional
- beneficiary_id opcional
- person_id opcional
- project_id opcional
- currency_id
- loan_id opcional

## Reglas
- transfer debe usar dos cuentas válidas distintas
- ingreso no puede tener cuenta destino separada salvo diseño específico
- gasto descuenta saldo
- ingreso suma saldo
- transferencia mueve entre cuentas sin alterar balance consolidado
- no permitir moneda nula
- usar tipo de cambio congelado en transacción si la moneda no es base

## Validación
- pruebas unitarias del servicio de transacciones
- pruebas de integridad de saldos

---

# Lote 6 — Servicio de transacciones

## Objetivo
Codificar la lógica de negocio de ingresos, gastos y transferencias.

## Tareas
Crear:
- `transaction_service.py`
- reglas de creación
- reglas de edición
- duplicación
- anulación lógica si procede
- listados con filtros
- agrupaciones
- búsqueda textual

## Filtros mínimos
- fecha desde/hasta
- cuenta
- categoría
- beneficiario
- persona
- proyecto
- etiqueta
- tipo
- reconciliado
- monto mínimo/máximo
- texto libre

## Agrupaciones mínimas
- por día
- por mes
- por cuenta
- por categoría
- por beneficiario
- por proyecto

## Validación
- pruebas unitarias por cada tipo de transacción
- pruebas de edge cases
- documentación de reglas en `finance_business_rules.md`

---

# Lote 7 — API y frontend de transacciones

## Objetivo
Completar experiencia principal tipo Alzex.

## Backend
Endpoints:
- list
- detail
- create
- update
- duplicate
- delete/deactivate
- summary
- grouped
- search

## Frontend
Crear:
- `FinanceTransactionsPage.jsx`
- `TransactionForm.jsx`
- grilla de transacciones
- barra de filtros
- agrupación configurable
- búsqueda
- panel de detalle

## Requisitos UI importantes
- soportar ingreso / gasto / transferencia
- campos condicionales por tipo
- tags múltiples
- notas extensas
- selector de archivos
- campos avanzados colapsables

## Validación
- flujo completo manual
- CRUD completo funcional
- filtros persistentes en URL o estado si el proyecto ya usa patrón similar

---

# Lote 8 — Adjuntos

## Objetivo
Agregar soporte web correcto a archivos.

## Tareas
- definir storage path por tenant y módulo
- subir adjuntos
- listar adjuntos
- descargar adjuntos
- desvincular adjuntos
- metadatos: filename, mime_type, size_bytes, uploaded_by

## Reglas
- validar tamaño máximo
- validar tipos permitidos
- no exponer rutas absolutas del servidor

## Documentación
- `attachments` en `finance_api.md`
- manual de usuario sobre carga de comprobantes

## Validación
- upload/download real
- asociación a transacción

---

# Lote 9 — Plantillas y favoritos

## Objetivo
Replicar experiencia de plantillas de Alzex.

## Tareas
Crear tablas:
- finance_transaction_templates

Implementar:
- crear plantilla desde cero
- crear plantilla desde transacción existente
- marcar favorita
- usar plantilla para precargar formulario

## Campos
- nombre
- tipo
- valores por defecto
- cuenta por defecto
- categoría por defecto
- beneficiario por defecto
- etiquetas por defecto
- nota por defecto
- activo

## Validación
- crear desde transacción
- usar plantilla en nueva transacción

---

# Lote 10 — Planificador / recurrentes

## Objetivo
Construir transacciones programadas.

## Migraciones
- finance_schedules
- finance_schedule_runs

## Tareas
Implementar:
- frecuencia diaria/semanal/mensual
- intervalo
- fecha inicio
- fecha fin opcional
- próxima ejecución
- auto-create on run
- registro de ejecuciones

## Importante
Si aún no existe infra de jobs definitiva, dejar servicio listo y documentar:
- ejecución manual
- ejecución futura por worker

## Frontend
- lista de planificaciones
- formulario de creación
- activar/desactivar
- ejecutar manualmente

## Validación
- schedule genera transacción real
- no duplica ejecución ya registrada

---

# Lote 11 — Préstamos

## Objetivo
Replicar módulo de loans/debts.

## Migraciones
- finance_loans
- finance_loan_payments

## Tareas
Casos:
- dinero prestado
- dinero recibido

Implementar:
- creación préstamo
- registrar pago parcial
- calcular saldo pendiente
- progreso pagado
- lista de reembolsos

## Frontend
- `FinanceLoansPage.jsx`
- `LoanForm.jsx`
- detalle con historial de pagos

## Validación
- cálculos correctos
- relación con transacciones si el diseño lo usa

---

# Lote 12 — Presupuestos

## Objetivo
Construir comparación presupuesto vs gasto real.

## Migraciones
- finance_budgets
- finance_budget_lines
- finance_budget_periods

## Tareas
- presupuesto por categoría
- por periodo mensual inicialmente
- comparación real vs planificado
- resumen por mes

## Frontend
- `FinanceBudgetsPage.jsx`
- tabla mensual comparativa
- formulario de presupuesto

## Validación
- cálculo correcto por categoría y mes
- documentación para usuario

---

# Lote 13 — Reconciliación

## Objetivo
Agregar conciliación de cuentas.

## Migraciones
- finance_reconciliations
- finance_reconciliation_lines

## Tareas
- iniciar reconciliación por cuenta
- definir saldo esperado
- marcar transacciones conciliadas
- cerrar reconciliación
- diferencias detectadas

## Reglas
- no reconciliar cuentas inactivas
- no cerrar conciliación con inconsistencia si política lo impide

## Frontend
- `FinanceReconciliationPage`
- wizard o formulario simple

## Validación
- estado reconciliado visible en transacciones
- cierre correcto

---

# Lote 14 — Filtros guardados

## Objetivo
Replicar filtros reutilizables.

## Migraciones
- finance_saved_filters

## Tareas
- guardar configuración de filtro
- listar filtros
- aplicar filtro
- actualizar filtro
- eliminar/desactivar filtro

## Validación
- filtros se reaplican correctamente
- frontend conserva configuración

---

# Lote 15 — Dashboard y reportes

## Objetivo
Construir capa analítica.

## Backend
Implementar servicios:
- resumen general
- ingresos vs gastos por periodo
- por categoría
- por beneficiario
- por proyecto
- por cuenta
- profit & loss
- calendario financiero

## Frontend
Crear páginas:
- `FinanceDashboardPage.jsx`
- `FinanceReportsPage.jsx`
- `FinanceProfitLossPage.jsx`
- `FinanceCalendarPage.jsx`

## Requisitos
- filtros por periodo
- tarjetas KPI
- tablas resumen
- gráficos simples si el frontend actual ya usa charting
- no introducir librerías innecesarias si ya existe una en el proyecto

## Validación
- consistencia con transacciones reales
- documentación de fórmulas

---

# Lote 16 — Permisos finos

## Objetivo
Ajustar seguridad por módulo.

## Tareas
Definir permisos como mínimo:
- finance.view
- finance.accounts.manage
- finance.transactions.view
- finance.transactions.create
- finance.transactions.update
- finance.transactions.delete
- finance.categories.manage
- finance.loans.manage
- finance.budgets.manage
- finance.reports.view
- finance.settings.manage
- finance.import_export.manage

## Validación
- proteger endpoints
- ocultar acciones en frontend según permiso
- documentar matriz de permisos

---

# Lote 17 — Auditoría del módulo

## Objetivo
Tener rastreo útil de acciones.

## Tareas
Registrar eventos:
- create/update/deactivate de catálogos
- create/update/delete de transacciones
- ejecución de schedules
- import/export
- cambios de settings
- reconciliaciones

## Campos
- actor_user_id
- entity_type
- entity_id
- action
- summary
- metadata_json
- created_at

## Validación
- activity log consultable
- no guardar secretos

---

# Lote 18 — Importación y exportación

## Objetivo
Agregar utilidades de datos.

## Exportación mínima
- CSV transacciones
- CSV cuentas
- formato simple de reportes
- QIF opcional si se decide soportarlo

## Importación mínima
- CSV transacciones
- CSV cuentas o saldos iniciales si es útil

## Requisitos
- validación previa
- preview antes de importar
- reporte de errores
- importación idempotente donde sea posible

## Validación
- archivos de prueba
- documentación formato esperado

---

# Lote 19 — Settings del módulo

## Objetivo
Replicar ajustes visibles tipo Alzex.

## Tareas
Agregar configuración:
- moneda base
- primer día de semana
- mostrar transacciones no conciliadas
- usar tasas históricas
- configuración de adjuntos
- preferencias UI del módulo si aplica

## Validación
- settings leídos desde frontend
- impacto real en cálculos y vistas

---

# Lote 20 — Documentación obligatoria

## Objetivo
No cerrar ningún lote sin docs.

## Documentación de desarrollador
Archivos mínimos:
- `finance_overview.md`
- `finance_api.md`
- `finance_db.md`
- `finance_permissions.md`
- `finance_business_rules.md`
- `finance_testing.md`
- `finance_frontend_notes.md`

## Documentación de usuario
Archivos mínimos:
- `finance_user_manual.md`
- `finance_admin_manual.md`

## Contenido obligatorio por cada pantalla
- para qué sirve
- cómo se usa
- campos
- ejemplos
- errores comunes
- permisos necesarios

## Validación
- no dejar secciones vacías
- actualizar docs por lote implementado

---

# Lote 21 — Pruebas finales y endurecimiento

## Objetivo
Cerrar el módulo con calidad mínima.

## Backend
- tests unitarios de servicios críticos
- tests integración de endpoints clave
- tests smoke del módulo

## Frontend
- validación manual guiada
- checklist por pantalla
- test UI si ya existe framework en el proyecto

## Checklist final
- migraciones limpias
- seeds idempotentes
- endpoints documentados
- permisos aplicados
- frontend usable
- errores controlados
- docs completas

---

# 4. Lista de tablas objetivo

```text
finance_accounts
finance_categories
finance_beneficiaries
finance_people
finance_projects
finance_tags
finance_currencies
finance_exchange_rates
finance_transactions
finance_transaction_tags
finance_transaction_attachments
finance_transaction_templates
finance_schedules
finance_schedule_runs
finance_loans
finance_loan_payments
finance_budgets
finance_budget_lines
finance_budget_periods
finance_reconciliations
finance_reconciliation_lines
finance_saved_filters
finance_activity_logs
finance_settings
```

---

# 5. Lista de páginas objetivo

```text
FinanceDashboardPage
FinanceAccountsPage
FinanceTransactionsPage
FinanceCategoriesPage
FinanceCalendarPage
FinanceReportsPage
FinanceProfitLossPage
FinanceLoansPage
FinanceBudgetsPage
FinanceSettingsPage
FinanceToolsPage
```

---

# 6. Lista de formularios objetivo

```text
AccountForm
TransactionForm
CategoryForm
BeneficiaryForm
PersonForm
ProjectForm
TagForm
LoanForm
BudgetForm
TemplateForm
ScheduleForm
ReconciliationForm
FilterForm
CurrencyForm
```

---

# 7. Definición de terminado por lote

Un lote se considera terminado solo si incluye:

- código backend
- código frontend si corresponde
- migraciones si corresponde
- tests mínimos
- documentación dev
- documentación usuario
- breve changelog del lote
- lista de pendientes del siguiente lote

---

# 8. Prompt operativo corto para Codex

Usa este archivo junto al roadmap maestro.

## Prompt

Implementa el módulo `finance` siguiendo estrictamente:
- `roadmap_modulo_finance_alzex_codex_detallado.md`
- `finance_codex_tareas_ejecucion.md`

Reglas:
- respeta la arquitectura real actual del proyecto
- no inventes otra estructura
- trabaja por lotes en el orden indicado
- no cierres un lote sin documentación y pruebas mínimas
- documenta todo a nivel usuario y desarrollador
- deja código limpio, modular y mantenible
- usa patrón router -> service -> repository
- integra permisos tenant existentes
- no rompas funcionalidades actuales

Empieza por el Lote 0 y Lote 1.
Al finalizar cada lote, entrega:
1. resumen de archivos creados/modificados
2. migraciones creadas
3. endpoints creados
4. pruebas agregadas
5. documentación agregada
6. pendientes del siguiente lote
