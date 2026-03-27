# Finance Testing

Cobertura actual:
- rutas basicas de `finance`
- limites base del modulo
- integracion tenant existente
- migraciones tenant `0001`, `0002`, `0003`, `0004`, `0005` y `0006`
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
- integracion PostgreSQL real manteniendo compatibilidad legacy de `/entries`

Pendiente por lotes:
- pruebas de reconciliacion mas guiada y lotes asistidos
- pruebas de filtros/estados de presupuestos
- pruebas de prestamos y reportes
