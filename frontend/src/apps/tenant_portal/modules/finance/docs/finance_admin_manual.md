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
- ya existe una pantalla operativa de `Préstamos` con cartera por contraparte, capital, saldo, cuotas y moneda
- `Préstamos` ya expone un cronograma inicial por cuotas y ya permite aplicar o revertir pagos manuales sobre cuotas, con reparto configurable entre interés y capital
- el cronograma ya muestra capital pagado e interés pagado por cuota
- el cronograma ya permite además selección múltiple y operación batch de pago o reversa
- la reversa individual y batch ya exige motivo estructurado y lo deja visible en el cronograma
- cada pago o reversa de cuota ya genera además una transacción financiera enlazada al préstamo
- `Planificación` ya ofrece una lectura mensual operativa cruzando días con movimiento, cuotas del mes y presión presupuestaria
- `Reportes` ya ofrece un overview mensual con lectura cruzada de transacciones, presupuestos y préstamos
- `Reportes` ya agrega serie diaria de caja y un corte corto de categorías con mayor desvío presupuestario
- `Reportes` ya agrega comparativa contra el mes anterior y exportación CSV básica desde la propia vista
- cuando el schema `finance` del tenant queda atrasado, el portal ya muestra explicación operativa y CTA para actualizar estructura
- `tenant admin` ya puede revisar estado y sincronizar estructura desde el propio portal, sin depender solo de `Platform Admin`
- la compatibilidad legacy de `/entries` se mantiene para no romper integraciones antiguas mientras madura el resto del módulo
