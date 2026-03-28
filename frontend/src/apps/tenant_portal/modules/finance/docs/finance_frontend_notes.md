# Finance Frontend Notes

`Lote 0` deja:
- rutas del módulo bajo `tenant_portal/modules/finance`
- placeholders de páginas futuras
- compatibilidad con `TenantFinancePage` mientras madura el slice

`Lote 1` no abre UI nueva:
- la prioridad fue dejar las migraciones base del modulo listas
- frontend sigue estable sobre la vista actual de movimientos

`Lote 2` tampoco abre UI nueva:
- la prioridad fue dejar modelos, schemas y repositories base sin romper la vista existente

`Lote 3` abre API, no pantallas:
- ya existen endpoints CRUD base para catalogos, settings y exchange rates
- ya existen tambien endpoints de detalle y `reorder` donde aplica
- `CLP` ya forma parte del seed inicial del modulo

`Lote 4` ya abre frontend de catalogos:
- `/tenant-portal/finance/accounts`
- `/tenant-portal/finance/categories`
- `/tenant-portal/finance/tools`
- `/tenant-portal/finance/settings`
- las pantallas consumen la API real del modulo
- la navegacion secundaria del slice ya queda activa
- los formularios reutilizan el contrato backend sin inventar otra capa de datos

`Lote 5` ya movio el nucleo backend a `finance_transactions` y `Lote 6` ya abrio su primera cara visible:
- la pantalla de `Transacciones` ya usa el contrato moderno
- `/tenant/finance/entries` se mantiene como compatibilidad legacy
- ya existe detalle operacional por transaccion y balances por cuenta
- ya existen filtros operativos y acciones rapidas de favorito/conciliacion
- ya existe modo edicion completo dentro de la misma pantalla de `Transacciones`
- ya existe seleccion multiple y lote basico para favoritas/conciliacion
- ya existe nota opcional y confirmacion explicita para conciliacion desde la mesa de trabajo
- ya existe una primera pantalla real de `Presupuestos`
- esa pantalla ya permite leer el mes actual o seleccionado, crear un presupuesto y editarlo
- la UI ya compara `presupuesto`, `ejecucion real`, `variacion` y `uso %` por categoria
- esa misma pantalla ya permite filtrar por tipo, estado derivado e inclusion de inactivos
- ya existe una primera pantalla real de `Préstamos`
- esa pantalla ya permite crear y editar cartera con saldo pendiente, contraparte, cuotas y frecuencia mensual
- esa misma pantalla ya permite abrir un panel de cronograma por préstamo con detalle de cuotas y próximo vencimiento
- esa misma pantalla ya permite aplicar abonos sobre una cuota del cronograma
- esa misma pantalla ya permite elegir modo de asignacion del abono entre interes y capital
- esa misma pantalla ya muestra capital pagado e interes pagado por cuota
- esa misma pantalla ya permite revertir parcial o totalmente un abono ya aplicado sobre una cuota
- esa misma pantalla ya permite seleccionar varias cuotas y operar pago o reversa en lote
- esa misma pantalla ya exige motivo estructurado al revertir y muestra ese motivo en el cronograma
- esa misma pantalla ya dispara el enlace contable minimo: pago/reversa crean transacciones enlazadas
- ya existe una pantalla real de `Planificación` con calendario operativo, cuotas del mes y foco presupuestario
- ya existe una pantalla real de `Reportes` con overview mensual consolidado
- esa misma pantalla de `Reportes` ya muestra pulso diario de caja y una tabla corta de desvíos presupuestarios
- esa misma pantalla ya compara el período visible contra el mes anterior y permite exportar CSV básico
- esa misma pantalla ya muestra además una tendencia corta de 6 meses para lectura reciente
- cuando `finance` detecta schema incompleto, la UI ya explica para que sirve actualizar la estructura del modulo
- `tenant admin` ya puede disparar esa sincronizacion desde el mismo portal, sin depender solo de `Platform Admin`

Pendiente inmediato:
- enriquecer la experiencia de conciliacion con motivos estructurados y mesas de trabajo mas guiadas
- evaluar lotes mas inteligentes sobre el filtro activo o sobre reglas asistidas
- endurecer `Presupuestos` con lectura agregada mas densa
- abrir exportaciones adicionales, comparativas multi-período más ricas y filtros analíticos en `Reportes`, ahora que ya existe tendencia base
- enriquecer el pago de cuotas de `Préstamos` con cuenta origen y lectura contable derivada antes de considerarlo un dominio cerrado
- mover la sincronizacion tenant-side a flujo asíncrono visible y no inline
- reducir este caso con auto-sync post-provisioning y post-deploy
