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
- reglas por cuentas
- reglas por prestamos
- conciliacion
- plantillas y programacion recurrente
