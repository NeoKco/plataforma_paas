# Finance Testing

Cobertura actual:
- rutas basicas de `finance`
- limites base del modulo
- integracion tenant existente
- migraciones tenant `0001`, `0002`, `0003` y `0004`
- idempotencia de seeds base del modulo
- seed idempotente de `CLP`
- repositories CRUD base de catalogos
- unicidad y activos/inactivos sobre catalogos clave
- validaciones de servicio para cuentas, categorias y moneda base
- wiring de rutas CRUD base para catalogos, settings y exchange rates
- rutas de detalle y `reorder` sobre catalogos principales
- validacion de frontend por build del slice de catalogos

Pendiente por lotes:
- pruebas de cuentas y transacciones enriquecidas con relaciones reales
- pruebas de transacciones complejas
- pruebas de reconciliacion y reportes
