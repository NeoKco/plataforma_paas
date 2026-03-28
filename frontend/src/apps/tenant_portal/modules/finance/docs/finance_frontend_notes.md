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
- la mesa de trabajo de `Transacciones` ya exige además un motivo estructurado de conciliacion y lo envia tanto en modo individual como batch
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
- esa misma pantalla ya resume la lectura contable derivada y permite exportarla en CSV/JSON desde el detalle del préstamo
- ya existe una pantalla real de `Planificación` con calendario operativo, cuotas del mes y foco presupuestario
- ya existe una pantalla real de `Reportes` con overview mensual consolidado
- esa misma pantalla de `Reportes` ya muestra pulso diario de caja y una tabla corta de desvíos presupuestarios
- esa misma pantalla ya compara el período visible contra un mes elegido y permite exportar CSV básico
- esa misma pantalla ya muestra además una tendencia corta de 6 meses para lectura reciente
- esa misma pantalla ya permite elegir horizonte `3/6/12 meses` y exportar JSON además de CSV
- esa misma pantalla ya permite releer el overview con foco `todos/conciliados/pendientes/favoritas/préstamos`
- esa misma pantalla ya permite además filtrar el bloque presupuestario por tipo y por estado
- esa misma pantalla ya resume el horizonte visible con promedio, mejor/peor mes y delta contra el primer mes
- esa misma pantalla ya permite elegir explícitamente el mes comparado sin quedar atada al mes anterior
- esa misma pantalla ya compara también el horizonte completo visible contra otro rango equivalente
- esa misma pantalla ya compara también el acumulado anual `enero -> mes` contra el período comparado
- esa misma pantalla ya permite releer top categorías por `período`, `horizonte` o `acumulado anual`
- esa misma pantalla ya exporta CSV y JSON enriquecidos con comparativas, top categorías y resúmenes ejecutivos
- esa misma pantalla ya compara además la dimensión activa contra el período comparado para detectar entidades que ganan o pierden peso
- esa misma pantalla ya permite además comparar la lectura activa contra un rango arbitrario `desde/hasta`
- esa misma pantalla ya permite además rankear por `categoría`, `cuenta`, `proyecto`, `beneficiario` o `persona`
- la pantalla de `Transacciones` ya permite asignar varias etiquetas al registrar o editar un movimiento
- la pantalla de `Transacciones` ya permite además filtrar por `Etiqueta` y releer esos `tags` como chips en tabla y detalle
- `Reportes` ya permite además rankear por `Etiqueta`
- cuando `finance` detecta schema incompleto, la UI ya explica para que sirve actualizar la estructura del modulo
- `tenant admin` ya puede disparar esa sincronizacion desde el mismo portal, ver el job asociado y esperar el cierre sin depender solo de `Platform Admin`
- `Cuentas`, `Categorías`, `Catálogos`, `Configuración`, `Transacciones`, `Presupuestos`, `Préstamos`, `Planificación` y `Reportes`, junto con formularios auxiliares, ya consumen `useLanguage` en la lectura principal y dejan de exponer enums crudos como `cash`, `bank`, `income` o `expense`
- `Configuración > Monedas` ya expone explícitamente cómo cambiar la moneda base del módulo y aclara que la base anterior se limpia automáticamente
- `Presupuestos`, `Planificación` y `Reportes` ya toman la moneda base activa para el formateo visual de montos
- `Préstamos` ya usa moneda base en resúmenes, pero mantiene `currency_code` del préstamo en tabla y cronograma
- `Presupuestos` ya permite clonar un mes origen y aplicar ajustes guiados desde `Foco presupuestario` sin bajar a la tabla completa
- `Presupuestos` ya permite además aplicar plantillas operativas al mes visible sin salir de la vista
- la navegación secundaria de `finance` ya usa iconografía semántica propia del módulo
- `Planificación` y `Reportes` ya exponen una primera capa visual con bloques `spotlight` y charts reales sin depender de una librería externa pesada
- esa misma base visual queda como semilla de la futura migración al `design system` transversal del PaaS
- el `design system` ya quedó además arrancado fuera del módulo con `AppIcon`, `AppSpotlight`, `AppBadge`, layouts reutilizables y primitives compartidas para `PageHeader`, `PanelCard` y `MetricCard`
- la navegación lateral de `platform_admin` y `tenant_portal` ya consume esa iconografía común como primera adopción transversal

Backlog posterior al cierre:
- seguir puliendo copy residual de exportaciones, confirmaciones y mensajes largos para lograr paridad completa `Español/Inglés`
- evaluar lotes mas inteligentes sobre el filtro activo o sobre reglas asistidas
- enriquecer `Presupuestos` con plantillas mas ricas o presets configurables por tenant, mas alla de editar/activar/desactivar, clonar entre meses, alinear al real y aplicar plantillas operativas base
- seguir endureciendo `Reportes` solo si luego se necesitan comparativas todavía más densas o exportaciones ejecutivas adicionales
- seguir endureciendo `Préstamos` con una lectura todavía más contable si luego hace falta mostrar contrapartida/categoría o exportaciones de soporte más densas
- consolidar la operación visible del auto-sync post-deploy ahora que `Provisioning` ya puede encolar sync masivo para tenants activos y el wrapper de release ya dispara la corrida por defecto
- densificar los charts ya presentes en `Reportes` o `Planificación` solo si luego hace falta una lectura visual más rica
