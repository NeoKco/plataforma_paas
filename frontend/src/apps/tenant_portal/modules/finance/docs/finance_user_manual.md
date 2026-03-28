# Finance User Manual

Estado actual:
- módulo base del SaaS en arranque
- pantalla vigente de transacciones ya montada sobre el núcleo moderno
- vistas operativas de cuentas, categorías, catálogos auxiliares y configuración financiera
- la vista principal ya permite crear, filtrar y editar transacciones, además de revisar balances y auditoría reciente
- la vista principal ya permite también seleccionar varias transacciones y operar favoritas o conciliación por lote
- la conciliación ya puede dejar nota operativa y exige confirmación antes de aplicar el cambio
- la vista `Presupuestos` ya permite cargar un monto mensual por categoría y compararlo contra la ejecución real del mes
- la vista `Presupuestos` ya permite además filtrar por tipo, estado derivado e inactivos
- la vista `Préstamos` ya permite registrar cartera prestada o recibida, definir cuotas base y revisar el cronograma generado
- la vista `Préstamos` ya permite además aplicar abonos sobre una cuota del cronograma
- la vista `Préstamos` ya permite elegir cómo se reparte ese abono entre interés y capital
- la vista `Préstamos` ya permite además revertir parcial o totalmente un abono aplicado a una cuota
- la vista `Préstamos` ya permite además seleccionar varias cuotas y aplicar pago o reversa en lote
- al revertir un abono, la vista ahora exige elegir un motivo estructurado y lo deja visible por cuota
- cada pago o reversa de cuota ya deja además una transacción financiera enlazada al préstamo
- la vista `Planificación` ya permite revisar días con señal operativa, cuotas por vencer y foco presupuestario del mes
- la vista `Reportes` ya permite revisar el consolidado mensual de transacciones, presupuestos y cartera
- la vista `Reportes` ya permite además revisar el pulso diario de caja y los principales desvíos presupuestarios del mes
- la vista `Reportes` ya permite comparar contra un mes elegido y exportar un CSV básico del overview
- la vista `Reportes` ya permite además revisar una tendencia reciente de 6 meses
- la vista `Reportes` ya permite elegir tendencia de `3`, `6` o `12` meses y exportar JSON base
- la vista `Reportes` ya permite además enfocar el análisis en conciliados, pendientes, favoritas o movimientos ligados a préstamos
- la vista `Reportes` ya permite además filtrar el resumen de presupuestos por tipo y por estado
- la vista `Reportes` ya resume el horizonte con promedio, mejor/peor mes y delta contra el primer mes
- la vista `Reportes` ya permite elegir explícitamente el mes usado para la comparativa
- la vista `Reportes` ya compara también el horizonte completo visible contra otro rango equivalente
- la vista `Reportes` ya compara también el acumulado anual `enero -> mes` contra el período comparado
- la vista `Reportes` ya permite releer top categorías por `período`, `horizonte` o `acumulado anual`
- la vista `Reportes` ya exporta CSV y JSON enriquecidos con comparativas y bloques ejecutivos
- la vista `Reportes` ya permite además comparar la lectura activa contra un rango manual `desde/hasta`
- la vista `Reportes` ya permite además rankear por `categoría`, `cuenta`, `proyecto`, `beneficiario` o `persona`
- la vista `Transacciones` ya permite asignar varias etiquetas al crear o editar un movimiento
- la vista `Reportes` ya permite además rankear por `etiqueta`
- si una vista nueva del modulo detecta que faltan tablas o cambios de estructura, ahora explica el problema en pantalla
- si eres `admin` del tenant, ahora puedes usar `Actualizar estructura del módulo` desde el propio portal para aplicar migraciones pendientes
- `Cuentas`, `Categorías`, `Catálogos`, `Configuración`, `Presupuestos` y `Planificación`, junto con los formularios auxiliares visibles del slice, ya respetan el selector `Español/Inglés` sin mostrar valores internos crudos como `cash`, `income` o `expense`
- para cambiar la moneda base, entra a `Finanzas > Configuración > Monedas`, edita o crea la moneda deseada y marca `Moneda base`; la base anterior se desmarca automáticamente
- cambiar la moneda base no recalcula automáticamente transacciones históricas ya persistidas; esas mantienen su `exchange_rate` y `amount_in_base_currency` originales
- `Presupuestos`, `Planificación` y `Reportes` ya leen la moneda base activa del tenant al mostrar montos visibles
- en `Préstamos`, los resúmenes agregados ya usan la moneda base del tenant, mientras que el detalle de cada préstamo y su cronograma siguen mostrando la moneda propia del préstamo
- el contrato legacy `/entries` sigue existiendo solo como compatibilidad de backend

Pantallas disponibles:
- `Transacciones`
- `Presupuestos`
- `Préstamos`
- `Planificación`
- `Reportes`
- `Cuentas`
- `Categorías`
- `Catálogos`
- `Configuración`

Pendiente visible:
- las pantallas grandes de `Transacciones`, `Préstamos` y `Reportes` todavía requieren una pasada completa de internacionalización para que todo el copy cambie íntegramente entre español e inglés
