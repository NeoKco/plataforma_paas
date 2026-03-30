# Finance DB

Estado actual:
- existe `finance_entries` como tabla minima operativa
- existe `0003_finance_catalogs` como migracion base de catalogos del modulo
- existe `0004_finance_seed_clp` como seed adicional de moneda
- existe `0005_finance_transactions` como migracion del nucleo transaccional real
- existe `0006_finance_budgets` como migracion base de presupuestos mensuales
- existe `0007_finance_loans` como migracion base de cartera de prestamos
- existe `0008_finance_loan_installments` como migracion de cronograma y cuotas
- existe `0009_finance_loan_installment_payment_split` como migracion de split capital/interes pagado por cuota
- existe `0010_finance_loan_installment_reversal_reason` como migracion del motivo estructurado de reversa por cuota
- existe `0011_finance_loan_source_account` como migracion de cuenta origen opcional por prestamo
- existe `0012_finance_transaction_voids` como migracion de anulacion blanda para transacciones
- existe `0013_finance_transaction_voids_repair` como migracion reparadora para tenants que hubieran quedado marcados en `0012` sin columnas fisicas
- existe `0014_finance_default_category_catalog` como migracion reparadora y expansiva del catalogo default de categorias

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
- `finance_loans`
- `finance_loan_installments`

## Seeds idempotentes iniciales

- moneda base `USD`
- moneda secundaria `CLP`
- catalogo default de categorias:
  - ingresos: `Ingreso General`, `Sueldo`, `Ventas`, `Honorarios y servicios`, `Reembolso`, `Intereses y rendimientos`, `Otros ingresos`
  - egresos: `Egreso General`, `Gastos menores`, `Transporte y ruta`, `Herramientas e insumos`, `Materiales de proyecto`, `Combustible`, `Publicidad impresa`, `Mantencion vehicular`, `Impuestos`, `Internet y telefonia`, `Alimentacion`, `TAG y peajes`, `Salud`, `Hipotecario`, `Ocio y salidas`, `Electricidad`, `Agua`, `Gas`, `Vestuario`, `Regalos`, `Credito de consumo`, `Credito camioneta`, `Deporte`, `Estacionamiento`, `Educacion`, `Seguros`, `Mascotas`, `Cuidado personal`
  - transferencias: `Transferencia interna`, `Deposito entre cuentas`, `Ajuste de saldo`
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
- ya conserva tambien `is_voided`, `voided_at`, `void_reason` y `voided_by_user_id` para anular movimientos sin borrado fisico
- las lecturas activas del modulo excluyen esas transacciones anuladas, pero la fila sigue disponible para detalle y soporte

### `finance_transaction_tags`
- relacion N:M entre transacciones y etiquetas

### `finance_transaction_attachments`
- adjuntos reales por transaccion
- pensado para respaldos operativos como boletas, facturas o PDFs de soporte
- conserva `file_name`, `storage_key`, `content_type`, `file_size`, `notes` y `uploaded_by_user_id`

### `finance_transaction_audit`
- auditoria propia del ciclo de vida de la transaccion

### `finance_budgets`
- presupuesto mensual por categoria
- preparado para comparar monto presupuestado contra ejecucion real del mes
- base para planificacion, alertas de desvio y reportes posteriores
- ya alimenta contadores por estado operativo y bloques de foco presupuestario en la capa de servicio

### `finance_loans`
- cartera base de prestamos prestados o recibidos
- conserva contraparte, capital inicial, saldo pendiente, moneda y fechas clave
- ya incluye `installments_count` y `payment_frequency` para generar un cronograma base
- ya incluye `account_id` opcional para fijar la cuenta origen del préstamo

### `finance_loan_installments`
- cuotas generadas por prestamo con numero, vencimiento y montos de capital/interes
- conserva avance de pago simple por cuota y estado derivado (`pending`, `partial`, `overdue`, `paid`)
- ya soporta abonos manuales por cuota
- ya conserva `paid_principal_amount` y `paid_interest_amount` para separar capital e interes pagado
- ya soporta asignacion del pago por `interest_first`, `principal_first` o `proportional`
- ya soporta reversa parcial o total de esos abonos
- ya conserva `reversal_reason_code` para reversas estructuradas
- ya enlaza pagos y reversas de cuotas con `finance_transactions` por `loan_id`, `source_type` y `source_id`
- esos enlaces ya usan `account_id` real cuando la operación o el préstamo define cuenta origen

## Reglas estructurales de esta fase

- indices por `is_active`, `sort_order` y `created_at` donde aplica
- unicidad por tenant DB en nombres/codigos donde aporta consistencia
- seeds preparados para re-ejecucion segura

Pendiente siguiente:
- cualquier evolucion adicional sobre `finance` ya pasa a expansion nueva del dominio, no a pendiente estructural del cierre actual
