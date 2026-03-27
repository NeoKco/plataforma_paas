# Finance Testing

Cobertura actual:
- rutas basicas de `finance`
- limites base del modulo
- integracion tenant existente
- migraciones tenant `0001`, `0002`, `0003`, `0004`, `0005` y `0006`
- migracion tenant `0007_finance_loans`
- migracion tenant `0008_finance_loan_installments`
- migracion tenant `0009_finance_loan_installment_payment_split`
- migracion tenant `0010_finance_loan_installment_reversal_reason`
- idempotencia de seeds base del modulo
- seed idempotente de `CLP`
- repositories CRUD base de catalogos
- unicidad y activos/inactivos sobre catalogos clave
- validaciones de servicio para cuentas, categorias y moneda base
- wiring de rutas CRUD base para catalogos, settings y exchange rates
- rutas de detalle y `reorder` sobre catalogos principales
- validacion de frontend por build del slice de catalogos
- backfill de `finance_entries` hacia `finance_transactions`
- reglas base del core transaccional:
  - transferencias con cuentas distintas
  - moneda no base con `exchange_rate`
  - integridad de balances por cuenta
- integracion SQLite real del balance por cuentas
- core de presupuestos por categoria y mes, incluyendo comparacion `presupuesto vs real`
- core de prestamos con resumen de cartera, filtros por tipo/estado y generacion de cronograma mensual
- aplicacion de pagos sobre cuotas de prestamos y recálculo de saldo pendiente
- asignacion avanzada del pago entre capital e interes
- reversa parcial o total de pagos sobre cuotas
- pagos y reversiones en lote sobre cuotas de prestamos
- validacion de `reversal_reason_code` en reversas individuales y batch
- enlace contable minimo desde cuotas hacia `finance_transactions`
- reportes overview con agregados mensuales de transacciones, presupuestos y préstamos
- integracion PostgreSQL real manteniendo compatibilidad legacy de `/entries`

Pendiente por lotes:
- pruebas de reconciliacion mas guiada y lotes asistidos
- pruebas de lectura mas rica de presupuestos
- pruebas mas ricas del enlace contable de cuotas de prestamos con cuenta origen y lectura derivada
- pruebas de reportes
