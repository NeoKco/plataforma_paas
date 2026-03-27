# Finance Business Rules

Reglas vigentes en el arranque:
- solo se admiten movimientos `income` y `expense`
- `amount` debe ser mayor que cero
- se respetan limites tenant:
  - `finance.entries`
  - `finance.entries.monthly`
  - `finance.entries.monthly.income`
  - `finance.entries.monthly.expense`

Reglas agregadas en `Lote 1`:
- la moneda base inicial del modulo queda sembrada como `USD`
- las categorias semilla se crean de forma idempotente
- los catalogos base nacen con `is_active` para privilegiar desactivacion sobre borrado
- los tipos de cuenta minimos quedan publicados en `finance_settings`

Reglas agregadas en `Lote 2`:
- los repositorios de catalogos filtran activos/inactivos de forma consistente
- la unicidad queda delegada a restricciones reales de base de datos, no a validaciones duplicadas en router
- `finance_categories` permite mismo nombre solo si cambia `category_type`
- `finance_currencies` mantiene unicidad por `code`

Reglas agregadas en `Lote 3`:
- las rutas CRUD de catalogos no contienen logica de negocio; solo traducen a servicios
- las cuentas exigen moneda existente y no permiten autoreferencia como cuenta padre
- las categorias exigen `category_type` y una categoria padre del mismo tipo
- beneficiarios, personas, proyectos y etiquetas validan nombres no vacios y unicidad legible antes de persistir
- los proyectos normalizan `code` en mayusculas y validan unicidad cuando existe
- la moneda base es unica: al marcar una nueva como base, la anterior se desmarca automaticamente
- no se puede desactivar la moneda base activa
- los tipos de cambio exigen par de monedas distinto, tasa mayor que cero y unicidad por par + fecha efectiva
- los settings validan `setting_key` y `setting_value` no vacios
- cuando un `commit()` falla, el repositorio hace `rollback()` para no dejar la sesion contaminada

Pendiente:
Reglas agregadas en `Lote 5`:
- el nucleo real del modulo se mueve a `finance_transactions`
- `transfer` exige cuenta destino y no permite misma cuenta origen/destino
- `income` y `expense` no aceptan `target_account_id`
- la transaccion exige `currency_id`
- si la moneda no es base, `exchange_rate` debe ser mayor que cero
- si la moneda es base, la transaccion congela `exchange_rate = 1`
- las cuentas origen/destino deben usar la misma moneda de la transaccion
- el balance por cuenta se calcula desde saldo inicial + ingresos - gastos +/- transferencias
- la API legacy `/entries` sigue viva, pero ya escribe auditoria y persiste sobre `finance_transactions`

Pendiente:
- validacion explicita de relaciones opcionales enriquecidas (`beneficiary`, `person`, `project`, `loan`)
- prestamos
- conciliacion operativa
- plantillas y programacion recurrente
