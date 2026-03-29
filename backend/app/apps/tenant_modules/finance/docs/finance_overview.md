# Finance Overview

Estado actual:
- `finance` queda definido como modulo base del SaaS.
- este modulo actua como piloto para la convencion modular futura.
- el arranque actual ya cubre `Lote 0`, `Lote 1`, `Lote 2`, `Lote 3`, `Lote 4`, `Lote 5` y el cierre funcional del tramo operativo de `Lote 6` del plan maestro.

Alcance de esta fase:
- estructura backend y frontend del modulo
- ruta tenant estable y compatible con la pantalla actual
- documentacion tecnica y funcional inicial
- preservacion del flujo minimo ya existente de movimientos
- migraciones base de catalogos y configuracion
- seeds idempotentes iniciales para moneda, categorias y settings
- seed idempotente adicional para `CLP`
- modelos SQLAlchemy de catalogos base
- schemas backend por entidad
- repositories CRUD base por catalogo
- servicios backend por catalogo
- endpoints CRUD base para catalogos y configuracion
- pantallas frontend operativas para cuentas, categorias, catalogos auxiliares y configuracion financiera
- nucleo transaccional real en `finance_transactions`
- backfill idempotente desde `finance_entries`
- auditoria y adjuntos reales para transacciones
- compatibilidad legacy: `/tenant/finance/entries` sigue operando, pero ya persiste sobre `finance_transactions`
- endpoints modernos de transacciones, balances por cuenta y detalle con auditoria
- pantalla tenant operativa sobre `finance_transactions`
- filtros operativos y toggles rapidos de favorito/conciliacion
- edicion completa de transacciones existentes sobre el mismo contrato moderno
- mesa de trabajo basica con seleccion multiple y acciones por lote para favoritas/conciliacion
- nota opcional y confirmacion explicita para operaciones de conciliacion
- primera pantalla real de `Presupuestos` con lectura mensual por categoria
- comparacion `presupuesto vs ejecucion real` usando el mismo nucleo de transacciones
- contrato backend propio para crear, listar y editar presupuestos mensuales
- filtros de `Presupuestos` por tipo, estado derivado e inclusion de inactivos
- primer slice real de `Préstamos` con cartera básica, saldo pendiente y contraparte
- contrato backend propio para crear, listar y editar préstamos
- cronograma inicial de `Préstamos` con cuotas generadas, detalle por préstamo y próximo vencimiento
- pagos manuales sobre cuotas con actualización del saldo pendiente
- asignación configurable del pago entre interés y capital
- tracking por cuota de capital pagado e interés pagado
- reversa parcial o total de abonos sobre cuotas
- pagos y reversiones en lote sobre cuotas seleccionadas del mismo préstamo
- razones estructuradas de reversa sobre cuotas
- enlace contable minimo: pagos y reversas de cuotas ya generan transacciones reales enlazadas al préstamo
- primera vista real de `Planificación` con lectura mensual de flujo, vencimientos y foco presupuestario
- primera vista real de `Reportes` con overview mensual consolidado
- `Reportes` ya muestra pulso diario de caja y desvíos presupuestarios priorizados dentro del mismo overview
- `Reportes` ya agrega comparativa contra un mes elegido y exportación CSV básica desde el portal
- `Reportes` ya agrega una tendencia mensual corta de 6 meses para lectura reciente
- `Reportes` ya permite ajustar la tendencia a `3`, `6` o `12` meses y exportar JSON base
- `Reportes` ya permite foco analítico de movimientos para releer el mismo overview
- `Reportes` ya permite además releer el bloque presupuestario por tipo y por estado
- `Reportes` ya resume el horizonte con promedio, mejor/peor mes y delta contra el primer mes
- `Reportes` ya permite elegir explícitamente el mes contra el que comparar el overview
- `Reportes` ya compara también el horizonte completo visible contra otro horizonte equivalente
- `Reportes` ya compara también el acumulado anual `enero -> mes` contra el período comparado
- `Reportes` ya permite releer top categorías por dimensión analítica (`período`, `horizonte`, `acumulado anual`)
- `Reportes` ya exporta CSV y JSON enriquecidos con comparativas, top categorías y resúmenes ejecutivos
- `Reportes` ya permite además comparar la lectura activa contra un rango arbitrario definido manualmente
- `Reportes` ya permite además rankear por entidad operativa (`categoría`, `cuenta`, `proyecto`, `beneficiario`, `persona`)
- las transacciones ya persisten tags reales en `finance_transaction_tags`
- `Reportes` ya permite además rankear por `etiqueta`

Estado ampliado del cierre:
- `Transacciones` ya permite adjuntar boletas, facturas u otros respaldos por transacción en `jpg/png/webp/pdf`
- las imagenes pueden comprimirse desde el frontend antes de subirlas para no inflar almacenamiento ni tráfico
- el detalle de transacción ya permite descargar o eliminar esos adjuntos
- `Transacciones` ya permite además anular un movimiento sin borrado fisico, conservando trazabilidad para soporte y auditoria
- las transacciones anuladas salen de balances, listados activos, presupuestos y reportes
