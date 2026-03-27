# Finance Admin Manual

Este documento irá consolidando:
- políticas del módulo
- permisos
- límites
- operaciones administrativas de tenant asociadas a finance

Estado actual:
- ya existen catálogos operativos para cuentas, categorías, beneficiarios, personas, proyectos, etiquetas, monedas, tipos de cambio y settings
- `CLP` queda sembrada como moneda disponible desde las migraciones base
- las pantallas actuales todavía asumen permisos simples `tenant.finance.read` y `tenant.finance.create`
- `finance_transactions` ya existe como núcleo real del módulo, con auditoría y adjuntos base
- la pantalla principal de `Transacciones` ya usa el contrato moderno sobre `finance_transactions`
- esa pantalla ya muestra balances por cuenta y detalle operacional con auditoría reciente
- esa misma pantalla ya permite filtrar, editar, marcar favorita y conciliar transacciones existentes
- esa misma pantalla ya permite tambien seleccion multiple y acciones por lote para favoritas o conciliacion
- las operaciones de conciliacion ya aceptan nota opcional y pasan por confirmacion explicita
- ya existe una pantalla operativa de `Presupuestos` con lectura mensual por categoria
- `Presupuestos` ya permite alta y edicion de montos, nota y estado activo, usando comparacion contra la ejecucion real del mes
- `Presupuestos` ya permite filtrar por tipo, estado derivado e inclusion de inactivos
- ya existe una pantalla operativa de `Préstamos` con cartera base por contraparte, capital, saldo y moneda
- `Préstamos` todavia no modela cuotas ni amortizacion detallada; este primer slice solo abre cartera y saldo
- la compatibilidad legacy de `/entries` se mantiene para no romper integraciones antiguas mientras madura el resto del módulo
