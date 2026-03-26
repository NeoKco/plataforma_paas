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

Pendiente:
- reglas por cuentas
- reglas por prestamos
- conciliacion
- plantillas y programacion recurrente
