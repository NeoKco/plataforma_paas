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
- `Presupuestos` ya expone contadores operativos y un bloque de foco para priorizar categorias con mayor desvio o sin uso
- ese foco ya deja intervenir rapido con edicion o activacion/desactivacion sin bajar a la tabla completa
- ya existe una pantalla operativa de `Préstamos` con cartera por contraparte, capital, saldo, cuotas y moneda
- `Préstamos` ya expone un cronograma inicial por cuotas y ya permite aplicar o revertir pagos manuales sobre cuotas, con reparto configurable entre interés y capital
- el cronograma ya muestra capital pagado e interés pagado por cuota
- el cronograma ya permite además selección múltiple y operación batch de pago o reversa
- la reversa individual y batch ya exige motivo estructurado y lo deja visible en el cronograma
- cada pago o reversa de cuota ya genera además una transacción financiera enlazada al préstamo
- `Préstamos` ya permite definir una cuenta origen por préstamo y reutilizarla o sobrescribirla al operar cuotas
- el detalle del préstamo ya expone una lectura contable derivada reciente para soporte y revisión operativa
- `Planificación` ya ofrece una lectura mensual operativa cruzando días con movimiento, cuotas del mes y presión presupuestaria
- `Reportes` ya ofrece un overview mensual con lectura cruzada de transacciones, presupuestos y préstamos
- `Reportes` ya agrega serie diaria de caja y un corte corto de categorías con mayor desvío presupuestario
- `Reportes` ya agrega comparativa contra un mes elegido y exportación CSV básica desde la propia vista
- `Reportes` ya agrega una tendencia corta de 6 meses para comparar el período en contexto
- `Reportes` ya permite además cambiar el horizonte a `3/6/12` meses y exportar JSON base para soporte
- `Reportes` ya permite además filtrar el overview por foco de movimientos para soporte operativo
- `Reportes` ya permite además releer el bloque presupuestario por tipo y por estado para revisión rápida
- `Reportes` ya resume el horizonte seleccionado con promedio, mejor/peor mes y delta vs el primer mes
- `Reportes` ya permite además elegir explícitamente el mes comparado desde la misma vista
- `Reportes` ya compara también el horizonte visible completo contra otro rango equivalente para lectura ejecutiva
- `Reportes` ya compara también el acumulado anual `enero -> mes` contra el período comparado
- `Reportes` ya permite además releer top categorías con dimensión analítica `período | horizonte | acumulado anual`
- `Reportes` ya exporta CSV y JSON enriquecidos con comparativas y bloques ejecutivos para soporte
- `Reportes` ya permite además contrastar la lectura activa contra un rango arbitrario manual
- `Reportes` ya permite además rankear por entidad operativa (`categoría`, `cuenta`, `proyecto`, `beneficiario`, `persona`)
- `Transacciones` ya permite además persistir varias etiquetas por movimiento
- `Reportes` ya permite además rankear por `etiqueta`
- cuando el schema `finance` del tenant queda atrasado, el portal ya muestra explicación operativa y CTA para actualizar estructura
- `tenant admin` ya puede revisar estado y sincronizar estructura desde el propio portal, sin depender solo de `Platform Admin`
- `Cuentas`, `Categorías`, `Catálogos`, `Configuración`, `Transacciones`, `Presupuestos`, `Préstamos`, `Planificación` y `Reportes`, junto con los formularios auxiliares visibles del slice, ya respetan el selector de idioma en la lectura principal y traducen etiquetas de dominio como tipo de cuenta o tipo de categoría
- la moneda base del módulo se gobierna desde `Finanzas > Configuración > Monedas`; al marcar una nueva base, la anterior se desactiva como base automáticamente
- el cambio de moneda base no reprocesa automáticamente histórico ya persistido en transacciones
- `Presupuestos`, `Planificación` y `Reportes` ya formatean los montos visibles con la moneda base activa del tenant
- `Préstamos` ya usa la moneda base en métricas agregadas, pero conserva la moneda propia del préstamo en filas y cronograma para no mezclar símbolos sobre importes nativos
- la compatibilidad legacy de `/entries` se mantiene para no romper integraciones antiguas mientras madura el resto del módulo

Pendiente administrativo:
- cerrar auditoría fina de copy residual en exportaciones, confirmaciones, badges y mensajes largos para asegurar paridad completa entre `Español/Inglés`
