# Finance DB

Estado actual:
- existe `finance_entries` como tabla minima operativa
- existe `0003_finance_catalogs` como migracion base de catalogos del modulo
- existe `0004_finance_seed_clp` como seed adicional de moneda
- existe `0005_finance_transactions` como migracion del nucleo transaccional real
- existe `0006_finance_budgets` como migracion base de presupuestos mensuales

Objetivo contractual:
- ampliar el esquema tenant del modulo segun el roadmap maestro
- agregar migraciones ordenadas, indices y documentacion por tabla

Tablas base ya creadas en `Lote 1`:

- `finance_accounts`
- `finance_categories`
- `finance_beneficiaries`
- `finance_people`
- `finance_projects`
- `finance_tags`
- `finance_currencies`
- `finance_exchange_rates`
- `finance_settings`
- `finance_activity_logs`
- `finance_transactions`
- `finance_transaction_tags`
- `finance_transaction_attachments`
- `finance_transaction_audit`
- `finance_budgets`

## Seeds idempotentes iniciales

- moneda base `USD`
- moneda secundaria `CLP`
- categorias:
  - `General Income`
  - `General Expense`
  - `Transfer`
- settings:
  - `base_currency_code`
  - `account_types_catalog`

## Finalidad de cada tabla

### `finance_accounts`
- cuentas financieras del tenant
- preparadas para saldo inicial, tipo de cuenta, moneda y jerarquia simple

### `finance_categories`
- categorias jerarquicas base para gastos, ingresos y transferencias

### `finance_beneficiaries`
- catalogo de beneficiarios o terceros

### `finance_people`
- catalogo de personas o miembros relacionados con movimientos

### `finance_projects`
- agrupacion por proyecto para transacciones y reportes

### `finance_tags`
- etiquetas simples multiuso

### `finance_currencies`
- monedas habilitadas y moneda base del modulo

### `finance_exchange_rates`
- historial de tipos de cambio por par de monedas y fecha efectiva

### `finance_settings`
- configuracion base del modulo mientras no existan tablas mas especificas

### `finance_activity_logs`
- auditoria interna del modulo para eventos de negocio futuros

### `finance_transactions`
- tabla central real del modulo para ingresos, gastos y transferencias
- preparada para enlazar cuentas, categorias, terceros, proyectos, moneda y auditoria
- conserva compatibilidad con `finance_entries` mediante backfill y API legacy

### `finance_transaction_tags`
- relacion N:M entre transacciones y etiquetas

### `finance_transaction_attachments`
- adjuntos base por transaccion

### `finance_transaction_audit`
- auditoria propia del ciclo de vida de la transaccion

### `finance_budgets`
- presupuesto mensual por categoria
- preparado para comparar monto presupuestado contra ejecucion real del mes
- base para planificacion, alertas de desvio y reportes posteriores

## Reglas estructurales de esta fase

- indices por `is_active`, `sort_order` y `created_at` donde aplica
- unicidad por tenant DB en nombres/codigos donde aporta consistencia
- seeds preparados para re-ejecucion segura

Pendiente siguiente:
- endurecer filtros/estados de presupuestos y lectura por tipo
- prestamos, planificacion y reportes
