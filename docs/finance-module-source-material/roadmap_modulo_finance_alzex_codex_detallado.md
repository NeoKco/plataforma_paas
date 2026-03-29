# Roadmap maestro ultra detallado para construir un módulo `finance` tipo Alzex Finance en `platform_paas`

> Documento maestro para entregar a Codex.
>
> Objetivo: construir un módulo financiero para tenant portal que replique lo más fielmente posible las funciones visibles analizadas de **Alzex Finance Pro**, adaptadas a una arquitectura web multi-tenant moderna, mantenible, documentada y preparada para crecer hacia ERP/contabilidad.
>
> Este documento debe usarse como **contrato de implementación**. Codex debe seguirlo sin inventar otra arquitectura y sin romper la estructura actual del proyecto.

---

## 1. Objetivo general

Construir un módulo `finance` dentro de `platform_paas` que incluya, como mínimo:

- dashboard financiero
- cuentas
- transacciones de ingreso, gasto y transferencia
- categorías jerárquicas
- beneficiarios
- miembros de familia o personas
- proyectos
- etiquetas
- préstamos / créditos y reembolsos
- presupuestos
- planificador de transacciones recurrentes
- plantillas de transacción
- filtros guardados
- calendario financiero
- reportes
- profit & loss
- monedas y tipos de cambio
- reconciliación
- archivos adjuntos
- activity log del módulo
- permisos por módulo
- documentación funcional y técnica completa

El resultado final debe sentirse **funcionalmente muy cercano a Alzex**, pero implementado con criterios correctos para SaaS multi-tenant.

---

## 2. Restricciones obligatorias para Codex

### 2.1 No inventar otra arquitectura

Debe respetarse la estructura real del proyecto del usuario:

```text
backend/app/apps/{installer,platform_control,provisioning,tenant_modules}
backend/app/common
backend/app/bootstrap
frontend/src/apps
```

El módulo debe integrarse en la arquitectura real actual, idealmente bajo algo como:

```text
backend/app/apps/tenant_modules/finance
frontend/src/apps/tenant_portal/modules/finance
```

Si la ruta exacta del frontend ya usa otra convención del proyecto, adaptarse a esa convención, **sin crear una estructura paralela inventada**.

### 2.2 No romper lo existente

Debe integrarse con lo ya implementado:

- JWT tenant scope
- middleware tenant actual
- resolución de DB tenant por request
- permisos tenant ya existentes
- convenciones router -> service -> repository
- estructura de migraciones del proyecto
- estilos y componentes del frontend ya usados

### 2.3 Todo debe quedar documentado

Por cada bloque implementado, Codex debe dejar documentación para:

- usuario final
- desarrollador
- API
- base de datos
- permisos
- reglas de negocio
- pruebas
- decisiones técnicas relevantes

### 2.4 Replicar Alzex, pero diseñar mejor

Replicar comportamiento visible de Alzex, pero con mejoras estructurales:

- web multi-tenant real
- auditoría persistente
- archivos adjuntos correctos en web
- permisos finos por módulo
- base preparada para evolución hacia doble entrada contable
- frontend modular y mantenible
- tests mínimos desde el inicio

---

## 3. Alcance funcional objetivo

## 3.1 Dashboard / Resumen

Debe mostrar:

- saldo total consolidado
- saldo por cuenta
- préstamos activos y total pendiente
- resumen por moneda
- periodo activo
- accesos rápidos a transacciones, cuentas, presupuestos y reportes
- indicadores de ingresos, gastos y balance del periodo

## 3.2 Cuentas

Debe permitir:

- crear cuenta
- editar cuenta
- desactivar / ocultar cuenta
- ocultar saldo si se desea
- definir saldo inicial
- definir moneda
- definir tipo de cuenta
- definir cuenta padre opcional
- icono
- favorita
- orden de visualización
- fecha de apertura opcional

Tipos mínimos de cuenta:

- efectivo
- banco
- tarjeta
- ahorro
- inversión
- crédito
- otra

## 3.3 Transacciones

Tipos:

- ingreso
- gasto
- transferencia

Campos funcionales mínimos:

- cuenta origen
- cuenta destino para transferencia
- monto
- moneda
- tipo de cambio aplicado si corresponde
- fecha y hora
- fecha alternativa opcional
- categoría
- beneficiario
- miembro de familia / persona
- proyecto
- etiquetas múltiples
- préstamo o crédito relacionado opcional
- descuento opcional
- amortización opcional en meses
- descripción corta
- nota extensa
- estado reconciliado o no
- favorita / plantilla
- archivos adjuntos

Funciones mínimas:

- crear
- editar
- eliminar lógico si aplica o eliminación controlada
- duplicar
- convertir en plantilla si aplica
- filtros
- agrupaciones
- búsqueda
- vista tabular
- detalle

## 3.4 Categorías

- árbol jerárquico
- categoría padre
- tipo: gasto / ingreso / ambos
- icono
- color opcional
- orden
- activa / inactiva
- nota

## 3.5 Beneficiarios

- CRUD completo
- nombre
- icono opcional
- nota
- activo / inactivo

## 3.6 Miembros de familia / personas

- CRUD completo
- nombre
- icono opcional
- nota
- activo / inactivo

## 3.7 Proyectos

- CRUD completo
- nombre
- código opcional
- nota
- activo / inactivo

## 3.8 Etiquetas

- CRUD completo
- nombre único por tenant
- color opcional
- activo / inactivo
- multi-selección en transacciones

## 3.9 Préstamos / créditos

Dos casos principales:

- dinero prestado a un tercero
- dinero recibido de un tercero

Debe soportar:

- monto principal
- moneda
- cuenta relacionada
- beneficiario opcional
- persona opcional
- proyecto opcional
- interés opcional
- fecha inicio
- fecha vencimiento opcional
- pagos parciales / reembolsos
- saldo pendiente
- progreso de pago
- estado
- nota

## 3.10 Presupuestos

Debe soportar:

- presupuesto de gasto o ingreso
- monto objetivo
- moneda
- rango de fechas
- categoría opcional
- proyecto opcional
- persona opcional
- beneficiario opcional
- filtro asociado opcional
- cálculo de ejecutado vs presupuestado

## 3.11 Planificador y plantillas

Planificador:

- reglas recurrentes diarias, semanales, mensuales, anuales o cada N días
- fecha inicio
- fecha fin opcional
- próxima ejecución
- activa / inactiva
- generación automática o sugerida según diseño elegido

Plantillas:

- reutilización de datos frecuentes de transacción
- marcadas como favoritas
- aplicables manualmente
- base para planificador

## 3.12 Filtros guardados

Debe permitir guardar filtros de vistas de transacciones/reportes usando combinaciones como:

- cuentas
- categorías
- proyectos
- beneficiarios
- personas
- etiquetas
- fechas
- tipo de transacción
- reconciliado o no

## 3.13 Calendario financiero

- vista mensual
- transacciones por día
- total diario
- navegación por periodo
- opcionalmente planificación futura

## 3.14 Reportes

Reportes mínimos:

- ingresos por categoría
- gastos por categoría
- gastos por beneficiario
- gastos por proyecto
- gastos por persona
- transacciones por cuenta
- balance por periodo
- profit & loss
- comparativo por meses
- por etiquetas

## 3.15 Monedas y tipos de cambio

- catálogo de monedas
- moneda base del tenant o del módulo
- tipos de cambio manuales
- soporte para tasa histórica si se desea
- cálculo correcto en reportes consolidados

## 3.16 Reconciliación

- marcar transacciones como reconciliadas
- fecha de conciliación
- referencia opcional
- vista de pendientes por cuenta
- resumen reconciliado vs no reconciliado

## 3.17 Activity log

Registrar eventos del módulo:

- creación, edición y eliminación de entidades
- cambios relevantes en tasas, presupuestos, préstamos y reconciliaciones
- usuario actor
- timestamp
- entidad afectada
- payload resumido o diff si se implementa

---

## 4. Diferencias entre Alzex desktop y la versión SaaS a construir

Se debe replicar la experiencia de negocio, pero no copiar literalmente decisiones de desktop local.

### Lo que sí debe replicarse

- lógica de cuentas
- estructura de transacciones
- dimensiones analíticas
- préstamos
- presupuestos
- plantillas y planificador
- filtros guardados
- reportes y profit & loss
- reconciliación
- monedas

### Lo que debe adaptarse a SaaS

- sincronización se reemplaza por persistencia servidor + API
- archivos locales se reemplazan por adjuntos web
- usuarios locales se reemplazan por usuarios tenant + permisos
- base `.afd` se reemplaza por PostgreSQL tenant
- activity log debe ser persistente en DB
- seguridad debe seguir JWT + permisos

---

## 5. Diseño técnico obligatorio

## 5.1 Estructura backend sugerida

```text
backend/
└── app/
    └── apps/
        └── tenant_modules/
            └── finance/
                ├── __init__.py
                ├── module.py
                ├── api/
                │   ├── __init__.py
                │   ├── router.py
                │   ├── accounts.py
                │   ├── transactions.py
                │   ├── categories.py
                │   ├── beneficiaries.py
                │   ├── family_members.py
                │   ├── projects.py
                │   ├── tags.py
                │   ├── loans.py
                │   ├── budgets.py
                │   ├── planners.py
                │   ├── templates.py
                │   ├── filters.py
                │   ├── reports.py
                │   ├── dashboard.py
                │   ├── calendar.py
                │   ├── currencies.py
                │   ├── exchange_rates.py
                │   ├── reconciliation.py
                │   ├── attachments.py
                │   ├── activity_log.py
                │   └── settings.py
                ├── schemas/
                │   ├── accounts.py
                │   ├── transactions.py
                │   ├── categories.py
                │   ├── beneficiaries.py
                │   ├── family_members.py
                │   ├── projects.py
                │   ├── tags.py
                │   ├── loans.py
                │   ├── budgets.py
                │   ├── planners.py
                │   ├── templates.py
                │   ├── filters.py
                │   ├── reports.py
                │   ├── currencies.py
                │   ├── exchange_rates.py
                │   ├── reconciliation.py
                │   └── common.py
                ├── services/
                │   ├── accounts_service.py
                │   ├── transactions_service.py
                │   ├── categories_service.py
                │   ├── beneficiaries_service.py
                │   ├── family_members_service.py
                │   ├── projects_service.py
                │   ├── tags_service.py
                │   ├── loans_service.py
                │   ├── budgets_service.py
                │   ├── planners_service.py
                │   ├── templates_service.py
                │   ├── filters_service.py
                │   ├── reports_service.py
                │   ├── dashboard_service.py
                │   ├── calendar_service.py
                │   ├── currencies_service.py
                │   ├── exchange_rates_service.py
                │   ├── reconciliation_service.py
                │   ├── attachments_service.py
                │   ├── activity_log_service.py
                │   └── finance_audit_service.py
                ├── repositories/
                │   ├── accounts_repository.py
                │   ├── transactions_repository.py
                │   ├── categories_repository.py
                │   ├── beneficiaries_repository.py
                │   ├── family_members_repository.py
                │   ├── projects_repository.py
                │   ├── tags_repository.py
                │   ├── loans_repository.py
                │   ├── budgets_repository.py
                │   ├── planners_repository.py
                │   ├── templates_repository.py
                │   ├── filters_repository.py
                │   ├── reports_repository.py
                │   ├── dashboard_repository.py
                │   ├── currencies_repository.py
                │   ├── exchange_rates_repository.py
                │   ├── reconciliation_repository.py
                │   ├── attachments_repository.py
                │   └── activity_log_repository.py
                ├── models/
                │   ├── accounts.py
                │   ├── transactions.py
                │   ├── categories.py
                │   ├── beneficiaries.py
                │   ├── family_members.py
                │   ├── projects.py
                │   ├── tags.py
                │   ├── loans.py
                │   ├── budgets.py
                │   ├── planners.py
                │   ├── templates.py
                │   ├── filters.py
                │   ├── currencies.py
                │   ├── exchange_rates.py
                │   ├── reconciliation.py
                │   ├── attachments.py
                │   └── activity_log.py
                ├── domain/
                │   ├── enums.py
                │   ├── constants.py
                │   ├── permissions.py
                │   └── rules.py
                ├── docs/
                │   ├── user/
                │   └── developer/
                └── tests/
                    ├── unit/
                    ├── integration/
                    └── api/
```

## 5.2 Estructura frontend sugerida

```text
frontend/
└── src/
    └── apps/
        └── tenant_portal/
            └── modules/
                └── finance/
                    ├── index.ts
                    ├── routes.tsx
                    ├── pages/
                    │   ├── FinanceDashboardPage.tsx
                    │   ├── AccountsPage.tsx
                    │   ├── TransactionsPage.tsx
                    │   ├── CategoriesPage.tsx
                    │   ├── BeneficiariesPage.tsx
                    │   ├── FamilyMembersPage.tsx
                    │   ├── ProjectsPage.tsx
                    │   ├── TagsPage.tsx
                    │   ├── LoansPage.tsx
                    │   ├── BudgetsPage.tsx
                    │   ├── PlannerPage.tsx
                    │   ├── TemplatesPage.tsx
                    │   ├── FiltersPage.tsx
                    │   ├── ReportsPage.tsx
                    │   ├── ProfitLossPage.tsx
                    │   ├── CalendarPage.tsx
                    │   ├── CurrenciesPage.tsx
                    │   ├── ExchangeRatesPage.tsx
                    │   ├── ReconciliationPage.tsx
                    │   ├── ActivityLogPage.tsx
                    │   └── SettingsPage.tsx
                    ├── components/
                    │   ├── accounts/
                    │   ├── transactions/
                    │   ├── categories/
                    │   ├── beneficiaries/
                    │   ├── family_members/
                    │   ├── projects/
                    │   ├── tags/
                    │   ├── loans/
                    │   ├── budgets/
                    │   ├── planner/
                    │   ├── templates/
                    │   ├── filters/
                    │   ├── reports/
                    │   ├── dashboard/
                    │   ├── calendar/
                    │   ├── currencies/
                    │   ├── reconciliation/
                    │   ├── activity_log/
                    │   └── shared/
                    ├── forms/
                    ├── hooks/
                    ├── services/
                    ├── store/
                    ├── types/
                    ├── utils/
                    ├── constants/
                    ├── docs/
                    │   ├── user/
                    │   └── developer/
                    └── tests/
                        ├── unit/
                        └── integration/
```

---

## 6. Base de datos del módulo `finance`

Todas las tablas viven en la DB tenant.

### 6.1 Reglas generales de diseño SQL

- usar convención consistente de nombres snake_case
- usar `uuid` o `bigint` según convención actual del proyecto; preferir la convención ya elegida en `platform_paas`
- todas las tablas deben incluir `created_at`, `updated_at`
- usar `is_active` cuando la entidad requiera desactivación sin borrado real
- usar `deleted_at` solo si el proyecto ya usa soft delete de forma consistente
- índices en claves foráneas y campos de búsqueda frecuentes
- unicidad por tenant implícita, porque cada tenant tiene su propia DB

## 6.2 Tablas núcleo

### `finance_accounts`

Campos sugeridos:

- id
- name
- code opcional
- type
- currency_code
- parent_account_id nullable
- opening_balance numeric(18,2)
- opening_balance_date nullable
- current_balance_cache numeric(18,2) opcional
- icon nullable
- color nullable
- sort_order default 0
- is_favorite default false
- hide_balance default false
- is_visible default true
- notes nullable
- created_by nullable
- updated_by nullable
- created_at
- updated_at

Índices:

- idx_finance_accounts_name
- idx_finance_accounts_type
- idx_finance_accounts_parent

Constraints:

- uq_finance_accounts_name opcional si el negocio lo permite
- chk_opening_balance_non_null sensible
- fk_parent_account_self

### `finance_categories`

- id
- name
- type enum: expense/income/both
- parent_category_id nullable
- icon nullable
- color nullable
- sort_order
- is_active
- notes nullable
- created_by nullable
- updated_by nullable
- created_at
- updated_at

Índices:

- idx_finance_categories_name
- idx_finance_categories_parent
- idx_finance_categories_type

Constraint sugerido:

- uq_finance_categories_parent_name

### `finance_beneficiaries`

- id
- name
- icon nullable
- contact_info nullable
- notes nullable
- is_active
- created_by nullable
- updated_by nullable
- created_at
- updated_at

### `finance_family_members`

- id
- name
- relation_type nullable
- icon nullable
- notes nullable
- is_active
- created_by nullable
- updated_by nullable
- created_at
- updated_at

### `finance_projects`

- id
- name
- code nullable
- notes nullable
- is_active
- created_by nullable
- updated_by nullable
- created_at
- updated_at

### `finance_tags`

- id
- name
- color nullable
- is_active
- created_by nullable
- updated_by nullable
- created_at
- updated_at

Constraint sugerido:

- uq_finance_tags_name

### `finance_transactions`

- id
- transaction_type enum: expense/income/transfer
- account_id nullable
- destination_account_id nullable
- category_id nullable
- beneficiary_id nullable
- family_member_id nullable
- project_id nullable
- related_loan_id nullable
- currency_code
- amount numeric(18,2)
- amount_in_base_currency numeric(18,6) opcional pero recomendable
- exchange_rate numeric(18,6) nullable
- discount_amount numeric(18,2) default 0
- amortization_months int nullable
- transaction_at timestamp
- alternative_date date nullable
- description varchar(255)
- notes text nullable
- is_favorite default false
- is_reconciled default false
- reconciled_at timestamp nullable
- planner_id nullable
- template_id nullable
- source_type nullable
- source_id nullable
- created_by nullable
- updated_by nullable
- created_at
- updated_at

Índices:

- idx_finance_transactions_type
- idx_finance_transactions_account
- idx_finance_transactions_dest_account
- idx_finance_transactions_category
- idx_finance_transactions_beneficiary
- idx_finance_transactions_family_member
- idx_finance_transactions_project
- idx_finance_transactions_loan
- idx_finance_transactions_reconciled
- idx_finance_transactions_transaction_at

Constraints:

- chk_amount_positive
- chk_transfer_destination_required
- chk_transfer_account_diff
- chk_non_transfer_no_destination

### `finance_transaction_tags`

Tabla pivote many-to-many.

- transaction_id
- tag_id
- created_at

PK compuesta:

- pk_finance_transaction_tags (transaction_id, tag_id)

Índices:

- idx_finance_transaction_tags_tag

### `finance_attachments`

- id
- entity_type enum: transaction/loan/budget/account/other
- entity_id
- file_name
- stored_name o storage_key
- content_type
- file_size
- storage_provider nullable
- notes nullable
- uploaded_by nullable
- created_at

Índices:

- idx_finance_attachments_entity

## 6.3 Préstamos

### `finance_loans`

- id
- loan_type enum: borrowed/lent
- name
- account_id nullable
- currency_code
- principal_amount numeric(18,2)
- interest_rate numeric(10,4) nullable
- interest_period enum nullable
- start_date date
- due_date date nullable
- beneficiary_id nullable
- family_member_id nullable
- project_id nullable
- category_id nullable
- total_expected_amount numeric(18,2) nullable
- total_paid_amount numeric(18,2) default 0
- outstanding_amount numeric(18,2) default 0
- status enum: active/closed/defaulted/cancelled
- notes nullable
- created_by nullable
- updated_by nullable
- created_at
- updated_at

Índices:

- idx_finance_loans_type
- idx_finance_loans_status
- idx_finance_loans_account

### `finance_loan_payments`

- id
- loan_id
- transaction_id nullable
- payment_date timestamp
- amount numeric(18,2)
- currency_code
- exchange_rate nullable
- notes nullable
- created_by nullable
- created_at

Índices:

- idx_finance_loan_payments_loan
- idx_finance_loan_payments_date

## 6.4 Presupuestos

### `finance_budgets`

- id
- name
- budget_type enum: expense/income
- currency_code
- amount numeric(18,2)
- start_date date
- end_date date
- category_id nullable
- project_id nullable
- beneficiary_id nullable
- family_member_id nullable
- saved_filter_id nullable
- carry_over default false
- notes nullable
- is_active default true
- created_by nullable
- updated_by nullable
- created_at
- updated_at

Índices:

- idx_finance_budgets_type
- idx_finance_budgets_period
- idx_finance_budgets_category

## 6.5 Planificador y plantillas

### `finance_templates`

- id
- name
- transaction_type
- account_id nullable
- destination_account_id nullable
- category_id nullable
- beneficiary_id nullable
- family_member_id nullable
- project_id nullable
- currency_code
- default_amount numeric(18,2) nullable
- default_discount_amount numeric(18,2) nullable
- amortization_months nullable
- description nullable
- notes nullable
- is_favorite default false
- is_active default true
- created_by nullable
- updated_by nullable
- created_at
- updated_at

### `finance_template_tags`

- template_id
- tag_id
- created_at

PK compuesta.

### `finance_planners`

- id
- name
- template_id nullable
- transaction_type
- account_id nullable
- destination_account_id nullable
- category_id nullable
- beneficiary_id nullable
- family_member_id nullable
- project_id nullable
- currency_code
- amount numeric(18,2) nullable
- discount_amount numeric(18,2) nullable
- frequency enum: daily/weekly/monthly/yearly/every_n_days
- interval_value int default 1
- starts_on date
- ends_on date nullable
- next_run_at timestamp nullable
- last_run_at timestamp nullable
- auto_create default false
- is_active default true
- notes nullable
- created_by nullable
- updated_by nullable
- created_at
- updated_at

### `finance_planner_tags`

- planner_id
- tag_id
- created_at

PK compuesta.

## 6.6 Filtros guardados y ajustes

### `finance_saved_filters`

- id
- name
- target_view enum: transactions/reports/loans/budgets/other
- filter_payload jsonb
- is_default default false
- created_by nullable
- updated_by nullable
- created_at
- updated_at

Índice:

- gin sobre filter_payload si se ve útil y el proyecto ya lo tolera

### `finance_settings`

- id
- base_currency_code
- use_historical_rates default false
- include_unreconciled_in_summary default true
- default_start_of_week nullable
- ui_preferences jsonb nullable
- created_at
- updated_at

## 6.7 Monedas y tipos de cambio

### `finance_currencies`

- code pk varchar(10)
- name
- symbol nullable
- decimal_places default 2
- is_base default false
- is_active default true
- created_at
- updated_at

### `finance_exchange_rates`

- id
- base_currency_code
- quote_currency_code
- rate_date date
- rate numeric(18,6)
- source nullable
- created_by nullable
- created_at

Constraint sugerido:

- uq_exchange_rate_pair_date (base_currency_code, quote_currency_code, rate_date)

## 6.8 Reconciliación

### `finance_reconciliations`

- id
- account_id
- started_at timestamp
- ended_at nullable
- closing_balance numeric(18,2) nullable
- reference nullable
- notes nullable
- created_by nullable
- created_at
- updated_at

### `finance_reconciliation_items`

- id
- reconciliation_id
- transaction_id
- matched_at timestamp
- note nullable
- created_at

Constraint sugerido:

- uq_reconciliation_transaction (reconciliation_id, transaction_id)

## 6.9 Auditoría

### `finance_activity_log`

- id
- entity_type
- entity_id
- action
- actor_user_id nullable
- summary
- old_values jsonb nullable
- new_values jsonb nullable
- metadata jsonb nullable
- created_at

Índices:

- idx_finance_activity_log_entity
- idx_finance_activity_log_actor
- idx_finance_activity_log_created_at

---

## 7. Relaciones clave entre tablas

- `finance_accounts.parent_account_id -> finance_accounts.id`
- `finance_categories.parent_category_id -> finance_categories.id`
- `finance_transactions.account_id -> finance_accounts.id`
- `finance_transactions.destination_account_id -> finance_accounts.id`
- `finance_transactions.category_id -> finance_categories.id`
- `finance_transactions.beneficiary_id -> finance_beneficiaries.id`
- `finance_transactions.family_member_id -> finance_family_members.id`
- `finance_transactions.project_id -> finance_projects.id`
- `finance_transactions.related_loan_id -> finance_loans.id`
- `finance_transaction_tags.transaction_id -> finance_transactions.id`
- `finance_transaction_tags.tag_id -> finance_tags.id`
- `finance_loan_payments.loan_id -> finance_loans.id`
- `finance_loan_payments.transaction_id -> finance_transactions.id`
- `finance_budgets.category_id -> finance_categories.id`
- `finance_budgets.project_id -> finance_projects.id`
- `finance_budgets.beneficiary_id -> finance_beneficiaries.id`
- `finance_budgets.family_member_id -> finance_family_members.id`
- `finance_budgets.saved_filter_id -> finance_saved_filters.id`
- `finance_templates.account_id -> finance_accounts.id`
- `finance_templates.destination_account_id -> finance_accounts.id`
- `finance_templates.category_id -> finance_categories.id`
- `finance_templates.beneficiary_id -> finance_beneficiaries.id`
- `finance_templates.family_member_id -> finance_family_members.id`
- `finance_templates.project_id -> finance_projects.id`
- `finance_template_tags.template_id -> finance_templates.id`
- `finance_template_tags.tag_id -> finance_tags.id`
- `finance_planners.template_id -> finance_templates.id`
- `finance_planner_tags.planner_id -> finance_planners.id`
- `finance_planner_tags.tag_id -> finance_tags.id`
- `finance_exchange_rates.base_currency_code -> finance_currencies.code`
- `finance_exchange_rates.quote_currency_code -> finance_currencies.code`
- `finance_reconciliations.account_id -> finance_accounts.id`
- `finance_reconciliation_items.reconciliation_id -> finance_reconciliations.id`
- `finance_reconciliation_items.transaction_id -> finance_transactions.id`

---

## 8. Orden recomendado de migraciones

### Migración 001

- finance_currencies
- finance_settings

### Migración 002

- finance_accounts
- finance_categories
- finance_beneficiaries
- finance_family_members
- finance_projects
- finance_tags

### Migración 003

- finance_loans
- finance_saved_filters
- finance_templates
- finance_template_tags
- finance_planners
- finance_planner_tags

### Migración 004

- finance_transactions
- finance_transaction_tags
- finance_attachments

### Migración 005

- finance_loan_payments
- finance_budgets
- finance_exchange_rates

### Migración 006

- finance_reconciliations
- finance_reconciliation_items
- finance_activity_log

### Migración 007 opcional

- vistas materializadas, funciones SQL, índices avanzados, seeds extra

---

## 9. Seeds mínimos obligatorios

Codex debe crear seeds o bootstrap iniciales para el tenant nuevo del módulo `finance`.

### Monedas mínimas

- CLP
- USD
- EUR

### Categorías mínimas de gasto

- Alimentación
- Transporte
- Vivienda
- Servicios
- Salud
- Educación
- Entretenimiento
- Otros gastos

### Categorías mínimas de ingreso

- Sueldo
- Honorarios
- Ventas
- Reembolso
- Otros ingresos

### Tipos sugeridos en catálogos si se usan tablas auxiliares o enums

- account types
- transaction types
- budget types
- loan types
- interest periods
- planner frequencies

### Configuración inicial mínima

- base currency = CLP o la moneda definida por tenant
- include_unreconciled_in_summary = true
- use_historical_rates = false

---

## 10. Endpoints mínimos API

Se deben montar bajo un prefijo consistente, por ejemplo:

```text
/tenant/finance
```

### Accounts

- `GET /tenant/finance/accounts`
- `POST /tenant/finance/accounts`
- `GET /tenant/finance/accounts/{id}`
- `PUT /tenant/finance/accounts/{id}`
- `PATCH /tenant/finance/accounts/{id}/visibility`
- `PATCH /tenant/finance/accounts/{id}/favorite`

### Categories

- `GET /tenant/finance/categories`
- `POST /tenant/finance/categories`
- `GET /tenant/finance/categories/tree`
- `PUT /tenant/finance/categories/{id}`

### Beneficiaries

- `GET /tenant/finance/beneficiaries`
- `POST /tenant/finance/beneficiaries`
- `PUT /tenant/finance/beneficiaries/{id}`

### Family members

- `GET /tenant/finance/family-members`
- `POST /tenant/finance/family-members`
- `PUT /tenant/finance/family-members/{id}`

### Projects

- `GET /tenant/finance/projects`
- `POST /tenant/finance/projects`
- `PUT /tenant/finance/projects/{id}`

### Tags

- `GET /tenant/finance/tags`
- `POST /tenant/finance/tags`
- `PUT /tenant/finance/tags/{id}`

### Transactions

- `GET /tenant/finance/transactions`
- `POST /tenant/finance/transactions`
- `GET /tenant/finance/transactions/{id}`
- `PUT /tenant/finance/transactions/{id}`
- `DELETE /tenant/finance/transactions/{id}`
- `POST /tenant/finance/transactions/{id}/duplicate`
- `POST /tenant/finance/transactions/{id}/reconcile`
- `POST /tenant/finance/transactions/{id}/unreconcile`

### Loans

- `GET /tenant/finance/loans`
- `POST /tenant/finance/loans`
- `GET /tenant/finance/loans/{id}`
- `PUT /tenant/finance/loans/{id}`
- `POST /tenant/finance/loans/{id}/payments`

### Budgets

- `GET /tenant/finance/budgets`
- `POST /tenant/finance/budgets`
- `GET /tenant/finance/budgets/{id}`
- `PUT /tenant/finance/budgets/{id}`

### Templates

- `GET /tenant/finance/templates`
- `POST /tenant/finance/templates`
- `PUT /tenant/finance/templates/{id}`

### Planners

- `GET /tenant/finance/planners`
- `POST /tenant/finance/planners`
- `PUT /tenant/finance/planners/{id}`
- `POST /tenant/finance/planners/{id}/run-now`

### Saved filters

- `GET /tenant/finance/filters`
- `POST /tenant/finance/filters`
- `PUT /tenant/finance/filters/{id}`
- `DELETE /tenant/finance/filters/{id}`

### Reports and dashboard

- `GET /tenant/finance/dashboard/summary`
- `GET /tenant/finance/reports/expenses-by-category`
- `GET /tenant/finance/reports/income-by-category`
- `GET /tenant/finance/reports/by-beneficiary`
- `GET /tenant/finance/reports/by-project`
- `GET /tenant/finance/reports/by-family-member`
- `GET /tenant/finance/reports/profit-loss`
- `GET /tenant/finance/calendar`

### Currencies and exchange rates

- `GET /tenant/finance/currencies`
- `POST /tenant/finance/currencies`
- `GET /tenant/finance/exchange-rates`
- `POST /tenant/finance/exchange-rates`

### Reconciliation

- `GET /tenant/finance/reconciliation/accounts/{account_id}`
- `POST /tenant/finance/reconciliation`
- `POST /tenant/finance/reconciliation/{id}/items`
- `POST /tenant/finance/reconciliation/{id}/close`

### Attachments

- `POST /tenant/finance/attachments/upload`
- `GET /tenant/finance/attachments/{id}`
- `DELETE /tenant/finance/attachments/{id}`

### Activity log

- `GET /tenant/finance/activity-log`

### Settings

- `GET /tenant/finance/settings`
- `PUT /tenant/finance/settings`

---

## 11. Permisos sugeridos del módulo

Definir permisos granulares compatibles con el sistema actual del tenant.

Permisos sugeridos:

- `finance.dashboard.view`
- `finance.accounts.view`
- `finance.accounts.create`
- `finance.accounts.update`
- `finance.accounts.delete`
- `finance.transactions.view`
- `finance.transactions.create`
- `finance.transactions.update`
- `finance.transactions.delete`
- `finance.categories.manage`
- `finance.beneficiaries.manage`
- `finance.family_members.manage`
- `finance.projects.manage`
- `finance.tags.manage`
- `finance.loans.view`
- `finance.loans.manage`
- `finance.budgets.view`
- `finance.budgets.manage`
- `finance.planners.manage`
- `finance.templates.manage`
- `finance.filters.manage`
- `finance.reports.view`
- `finance.currencies.manage`
- `finance.exchange_rates.manage`
- `finance.reconciliation.manage`
- `finance.attachments.manage`
- `finance.activity_log.view`
- `finance.settings.manage`

Roles mínimos sugeridos:

- finance_admin
- finance_manager
- finance_operator
- finance_viewer

---

## 12. Reglas de negocio obligatorias

### 12.1 Cuentas

- no permitir borrar una cuenta con movimientos sin estrategia controlada
- la moneda de una cuenta no debe cambiarse libremente si ya tiene transacciones, salvo migración controlada
- una cuenta no puede ser su propio padre

### 12.2 Transacciones

- `amount` siempre positivo; el signo lo define `transaction_type`
- transferencia requiere cuenta origen y destino distintas
- ingreso no debe exigir cuenta destino separada
- gasto no debe exigir cuenta destino
- si hay tags, deben existir y estar activas salvo política explícita distinta
- si hay categoría/proyecto/beneficiario/persona, deben existir
- si hay moneda distinta de la base, se debe definir la tasa aplicable o resolverla por fecha según settings
- al crear/editar/eliminar transacción debe recalcularse saldo derivado o cache si se usa cache
- toda mutación relevante debe registrar activity log

### 12.3 Tipos de cambio

- no debe existir duplicado por par de monedas y fecha
- si `use_historical_rates` está activo, reportes del pasado deben usar la tasa histórica correspondiente

### 12.4 Presupuestos

- no permitir rango inválido de fechas
- el ejecutado debe calcularse por filtros consistentes con el presupuesto

### 12.5 Planificador

- no ejecutar reglas inactivas
- `next_run_at` debe recalcularse tras cada ejecución
- si `auto_create = false`, puede usarse solo como sugerencia visual o disparo manual según implementación

### 12.6 Reconciliación

- una transacción reconciliada debe poder desreconciliarse según permisos
- si existe `finance_reconciliation_items`, evitar duplicar una misma transacción dentro de la misma conciliación

### 12.7 Auditoría

- cada create/update/delete importante debe quedar en `finance_activity_log`
- se debe guardar actor, entidad, acción, timestamp y resumen

---

## 13. UX esperada en frontend

- navegación clara tipo módulo financiero
- tablas con filtros y búsqueda
- formularios modales o páginas laterales coherentes con el resto del portal
- vista de transacciones con densidad razonable
- soporte para agrupación y filtros guardados
- dashboard limpio y útil
- reportes con tablas y gráficos si el proyecto ya usa librerías compatibles
- estados de carga, error y vacío bien resueltos
- evitar sobrecargar la primera entrega con exceso visual; priorizar funcionalidad y claridad

---

## 14. Documentación obligatoria

## 14.1 Documentación para usuario

Debe generarse, como mínimo:

- cómo entrar al módulo financiero
- cómo crear cuentas
- cómo registrar ingresos, gastos y transferencias
- cómo usar categorías, beneficiarios, personas, proyectos y etiquetas
- cómo registrar préstamos y pagos
- cómo usar presupuestos
- cómo usar plantillas y planificador
- cómo usar filtros guardados
- cómo conciliar movimientos
- cómo interpretar dashboard y reportes
- cómo manejar monedas y tipos de cambio
- FAQ básica

Formato recomendado:

- markdown en `docs/user/`
- idealmente una guía por submódulo

## 14.2 Documentación para desarrollador

Debe generarse, como mínimo:

- arquitectura del módulo
- mapa de carpetas
- endpoints
- schemas
- reglas de negocio por servicio
- diseño de base de datos
- relaciones entre tablas
- orden de migraciones
- seeds iniciales
- permisos
- decisiones técnicas y trade-offs
- cómo correr pruebas

Formato recomendado:

- markdown en `docs/developer/`

## 14.3 Documentación inline

- docstrings en servicios críticos
- comentarios cortos solo cuando agreguen valor real
- evitar comentar obviedades

---

## 15. Pruebas mínimas obligatorias

## 15.1 Backend

Unit e integration tests para:

- creación de cuenta
- creación de categoría jerárquica
- creación de transacción de gasto
- creación de transacción de ingreso
- creación de transferencia válida
- rechazo de transferencia a misma cuenta
- asignación de tags
- creación de préstamo
- registro de pago de préstamo
- cálculo básico de presupuesto
- guardado de filtro
- creación de plantilla
- creación de planificador
- registro de reconciliación
- inserción de activity log

## 15.2 Frontend

- render de páginas principales sin crash
- flujo básico de lista + formulario de cuentas
- flujo básico de lista + formulario de transacciones
- visualización básica de dashboard
- validación visual mínima de formularios críticos

---

## 16. Roadmap por lotes de implementación para Codex

> Esta sección manda sobre el resto a nivel operativo. Codex debe construir el módulo por **lotes cerrados**, dejando cada lote funcional, probado y documentado antes de pasar al siguiente.

## Lote 0 - Preparación y encaje con la arquitectura real

### Objetivo

Preparar el terreno sin romper nada ya existente.

### Trabajo obligatorio

- inspeccionar la estructura real actual del proyecto
- ubicar el lugar exacto donde deben vivir backend y frontend del módulo finance
- verificar cómo se registran módulos tenant hoy
- verificar cómo se montan routers tenant hoy
- verificar convenciones de modelos, migraciones y tests ya existentes
- verificar cómo se resuelven permisos tenant hoy
- verificar cómo se documenta el proyecto actualmente

### Entregables

- documento `finance/docs/developer/00-contexto-y-decisiones.md`
- árbol real final de carpetas a usar
- lista de dependencias existentes a reutilizar
- lista de dependencias nuevas mínimas si hacen falta

### Criterio de aceptación

- Codex no ha inventado una estructura paralela
- el módulo puede enchufarse al proyecto sin ambigüedad

### Documentación obligatoria del lote

- contexto técnico
- decisiones iniciales
- supuestos explícitos

---

## Lote 1 - Migraciones y modelos núcleo

### Objetivo

Dejar lista la base del módulo en DB y modelos backend.

### Trabajo obligatorio

Crear migraciones y modelos para:

- finance_currencies
- finance_settings
- finance_accounts
- finance_categories
- finance_beneficiaries
- finance_family_members
- finance_projects
- finance_tags
- finance_loans
- finance_saved_filters
- finance_templates
- finance_template_tags
- finance_planners
- finance_planner_tags
- finance_transactions
- finance_transaction_tags
- finance_attachments
- finance_loan_payments
- finance_budgets
- finance_exchange_rates
- finance_reconciliations
- finance_reconciliation_items
- finance_activity_log

### Entregables

- migraciones
- modelos
- enums
- seeds mínimos
- documentación de tablas

### Pruebas mínimas

- migraciones corren en tenant limpio
- seeds se aplican sin error
- relaciones principales quedan válidas

### Criterio de aceptación

- DB completa del módulo creada
- sin errores de FK, índices ni constraints básicos

### Documentación obligatoria del lote

- `01-db-overview.md`
- `02-db-relaciones.md`
- `03-db-migraciones.md`

---

## Lote 2 - Backend de catálogos base

### Objetivo

Construir CRUD backend de entidades base que alimentan transacciones.

### Trabajo obligatorio

Implementar backend de:

- accounts
- categories
- beneficiaries
- family_members
- projects
- tags
- currencies
- exchange_rates
- settings

Por cada una:

- schemas request/response
- repository
- service
- router
- permisos
- activity log en mutaciones relevantes

### Entregables

- endpoints funcionando
- validaciones
- errores consistentes
- documentación API

### Pruebas mínimas

- create/list/get/update por entidad principal
- validación de unicidad y reglas jerárquicas

### Criterio de aceptación

- frontend ya podría consumir los catálogos
- datos base quedan administrables por API

### Documentación obligatoria del lote

- `api-catalogos.md`
- `reglas-catalogos.md`

---

## Lote 3 - Frontend de catálogos base

### Objetivo

Construir interfaces de gestión de catálogos.

### Trabajo obligatorio

Páginas y componentes para:

- cuentas
- categorías
- beneficiarios
- personas
- proyectos
- etiquetas
- monedas
- tipos de cambio
- settings del módulo

### Requisitos UX

- tablas con búsqueda
- formularios reutilizables
- validaciones visuales
- confirmaciones donde corresponda
- manejo de estados vacíos

### Entregables

- páginas listas
- hooks
- servicios API
- tipos frontend

### Pruebas mínimas

- render de páginas
- submit básico de formularios principales

### Criterio de aceptación

- un usuario con permisos puede administrar los catálogos desde UI

### Documentación obligatoria del lote

- guía de usuario de catálogos
- guía de desarrollador de componentes usados

---

## Lote 4 - Núcleo de transacciones

### Objetivo

Construir el corazón del módulo.

### Trabajo obligatorio backend

- CRUD de transacciones
- duplicar transacción
- asignación de tags
- manejo de transferencia
- validación de reglas de negocio
- soporte de adjuntos
- reconciliar / desreconciliar transacción
- registrar activity log

### Trabajo obligatorio frontend

- lista de transacciones
- filtros básicos
- búsqueda
- formulario completo de gasto
- formulario completo de ingreso
- formulario completo de transferencia
- visualización de etiquetas y dimensiones analíticas
- carga de adjuntos

### Criterio de aceptación funcional

Un usuario debe poder:

- crear cuentas
- crear catálogos
- registrar ingresos, gastos y transferencias
- verlas listadas
- editarlas
- duplicarlas
- filtrarlas

### Pruebas mínimas

- create/update/delete de transacción
- transferencia válida e inválida
- tags persistidos
- reconciliación básica

### Documentación obligatoria del lote

- guía de uso de transacciones
- reglas de negocio detalladas de transacciones
- ejemplo de payloads API

---

## Lote 5 - Dashboard, calendario y reportes base

### Objetivo

Volver el módulo útil analíticamente.

### Trabajo obligatorio backend

- summary dashboard
- reportes por categoría
- reportes por beneficiario
- reportes por proyecto
- reportes por persona
- profit & loss básico
- calendario por periodo

### Trabajo obligatorio frontend

- dashboard principal
- página de reportes
- página de profit & loss
- página de calendario

### Requisitos

- filtros por fechas
- filtros por cuenta y moneda cuando aplique
- tablas claras
- gráficos solo si el proyecto ya tiene una librería compatible; si no, primero tabla + KPIs

### Criterio de aceptación

- el usuario puede analizar el periodo y ver consolidación básica

### Documentación obligatoria del lote

- guía de interpretación de dashboard
- guía de reportes disponibles

---

## Lote 6 - Préstamos y presupuestos

### Objetivo

Cubrir la capa financiera avanzada observada en Alzex.

### Trabajo obligatorio backend

- CRUD de préstamos
- pagos / reembolsos de préstamos
- cálculo de saldo pendiente
- CRUD de presupuestos
- cálculo ejecutado vs planificado

### Trabajo obligatorio frontend

- página de préstamos
- formulario de préstamo
- detalle de pagos
- página de presupuestos
- formulario de presupuesto
- indicadores de progreso

### Criterio de aceptación

- el usuario puede llevar deudas/préstamos y presupuestos operativos

### Documentación obligatoria del lote

- guía de préstamos
- guía de presupuestos
- reglas de cálculo

---

## Lote 7 - Plantillas, planificador y filtros guardados

### Objetivo

Replicar la productividad de Alzex.

### Trabajo obligatorio backend

- CRUD de plantillas
- CRUD de planificadores
- cálculo de próxima ejecución
- `run-now` o ejecución manual
- CRUD de filtros guardados

### Trabajo obligatorio frontend

- página de plantillas
- página de planificador
- página de filtros guardados
- posibilidad de aplicar plantilla a una nueva transacción
- posibilidad de aplicar filtro guardado en lista/reportes

### Criterio de aceptación

- el usuario puede reutilizar transacciones y automatizar recurrencias

### Documentación obligatoria del lote

- guía de plantillas
- guía de planificador
- guía de filtros guardados

---

## Lote 8 - Reconciliación, activity log, monedas e import/export

### Objetivo

Cerrar funciones avanzadas y administrativas del módulo.

### Trabajo obligatorio backend

- conciliaciones por cuenta
- cierre de conciliación
- consulta de activity log
- administración de tipos de cambio más sólida
- export básico CSV/QIF si se implementa
- import básico CSV si se implementa en esta fase

### Trabajo obligatorio frontend

- página de reconciliación
- página de activity log
- UX básica de export/import

### Criterio de aceptación

- el módulo ya cubre casi toda la superficie funcional observada en Alzex

### Documentación obligatoria del lote

- guía de reconciliación
- guía de activity log
- guía de import/export

---

## Lote 9 - Endurecimiento, documentación final y pruebas completas

### Objetivo

Cerrar el módulo de forma profesional.

### Trabajo obligatorio

- revisar consistencia de permisos
- revisar errores API
- revisar estados vacíos y loading en frontend
- ampliar tests backend y frontend
- limpiar deuda técnica fácil
- completar documentación de usuario y desarrollador
- dejar checklist final

### Entregables

- documentación completa
- suite mínima de pruebas estable
- checklist final de instalación/uso/desarrollo
- changelog inicial del módulo

### Criterio de aceptación

- un desarrollador nuevo puede entender el módulo
- un usuario nuevo puede usar el módulo con la documentación
- el módulo puede evolucionar sin reescribirse completo

---

## 17. Lista exacta de documentación que Codex debe dejar al terminar

### En backend `finance/docs/developer/`

- 00-contexto-y-decisiones.md
- 01-db-overview.md
- 02-db-relaciones.md
- 03-db-migraciones.md
- 04-endpoints-api.md
- 05-reglas-de-negocio.md
- 06-permisos.md
- 07-pruebas.md
- 08-roadmap-ejecutado.md

### En frontend `finance/docs/user/`

- 01-introduccion.md
- 02-cuentas.md
- 03-transacciones.md
- 04-categorias-beneficiarios-personas-proyectos-tags.md
- 05-reportes-y-dashboard.md
- 06-prestamos.md
- 07-presupuestos.md
- 08-plantillas-y-planificador.md
- 09-reconciliacion.md
- 10-monedas-y-tipos-de-cambio.md
- 11-filtros-guardados.md
- 12-preguntas-frecuentes.md

### Documentos raíz recomendados del módulo

- README.md
- CHANGELOG.md
- IMPLEMENTATION_STATUS.md

---

## 18. Checklist de aceptación final

El módulo se considera exitoso si:

- respeta la arquitectura real de `platform_paas`
- funciona en DB tenant
- expone endpoints consistentes
- tiene UI funcional para las piezas clave
- replica de forma razonable la experiencia de Alzex
- está documentado para usuario y desarrollador
- tiene tests mínimos útiles
- queda preparado para futura evolución a contabilidad formal

---

## 19. Instrucción final para Codex

Construir este módulo en bloques pequeños y seguros.

No intentar hacerlo todo de una sola vez.

Trabajar **lote por lote**, y en cada lote:

1. crear migraciones/modelos si corresponde
2. implementar repositorios
3. implementar servicios
4. implementar routers
5. implementar frontend
6. escribir pruebas mínimas
7. escribir documentación de usuario y desarrollador
8. dejar estado de avance explícito

No avanzar al siguiente lote sin dejar el anterior en estado funcional, legible y documentado.

---

## 20. Prompt operativo base para pegarle a Codex

```text
Quiero que construyas un módulo `finance` dentro de mi proyecto `platform_paas`, respetando estrictamente la arquitectura real existente del proyecto y sin inventar otra estructura.

Debes basarte en el documento `roadmap_modulo_finance_alzex_codex_detallado.md` como contrato de implementación.

Objetivo: replicar lo más fielmente posible el comportamiento funcional de Alzex Finance Pro, adaptado a SaaS multi-tenant.

Reglas obligatorias:
- no romper la arquitectura actual
- no crear una estructura paralela inventada
- usar el patrón real actual router -> service -> repository
- trabajar lote por lote según el roadmap
- documentar todo lo que implementes a nivel usuario y desarrollador
- crear pruebas mínimas por cada bloque funcional
- dejar comentarios y docstrings solo donde agreguen valor real
- priorizar legibilidad, mantenibilidad y coherencia con el proyecto existente

Empieza por el Lote 0 y el Lote 1. Antes de crear archivos, inspecciona la estructura actual y adapta el módulo a ella.
```

---

## 21. Sugerencias extra para mejorar respecto a Alzex

No son obligatorias en la primera versión, pero deben dejarse preparadas cuando sea razonable:

- futura capa de `ledger` y `entries` para doble entrada contable
- centros de costo
- clientes / proveedores formales
- facturas y pagos enlazados
- dashboard exportable
- automatización con jobs reales del sistema
- reglas de aprobación para ciertos movimientos
- vistas materializadas para reportes pesados

---

## 22. Recomendación práctica final

Para maximizar la utilidad con Codex, trabajar en este orden real:

1. Lote 0
2. Lote 1
3. Lote 2
4. Lote 4
5. Lote 3
6. Lote 5
7. Lote 6
8. Lote 7
9. Lote 8
10. Lote 9

Motivo:

- primero se asegura base y backend
- luego el núcleo de transacciones
- después las pantallas principales
- al final las capas avanzadas y endurecimiento

