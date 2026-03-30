# Finance Admin Manual

Este documento irá consolidando:
- políticas del módulo
- permisos
- límites
- operaciones administrativas de tenant asociadas a finance

Estado actual:
- el módulo ya puede considerarse funcionalmente cerrado para operación base y soporte del tenant
- ya existen catálogos operativos para cuentas, categorías, beneficiarios, personas, proyectos, etiquetas, monedas, tipos de cambio y settings
- `CLP` queda sembrada como moneda disponible desde las migraciones base
- las pantallas actuales todavía asumen permisos simples `tenant.finance.read` y `tenant.finance.create`
- `finance_transactions` ya existe como núcleo real del módulo, con auditoría y adjuntos reales
- la pantalla principal de `Transacciones` ya usa el contrato moderno sobre `finance_transactions`
- esa pantalla ya muestra balances por cuenta y detalle operacional con auditoría reciente
- esa misma pantalla ya permite filtrar, editar, marcar favorita y conciliar transacciones existentes
- esa misma pantalla ya permite tambien seleccion multiple y acciones por lote para favoritas o conciliacion
- esa misma pantalla ya permite además selección asistida sobre el filtro visible para armar lotes por pendientes, préstamos, ingresos, egresos o visibles completos
- al abrir el detalle de una transacción ya se pueden cargar boletas, facturas o respaldos en `JPG/PNG/WEBP/PDF`
- las imágenes se comprimen antes de subirse y el backend valida un tope final de `5 MB` por archivo
- el mismo detalle ya permite descargar o eliminar adjuntos existentes
- para poblar tenants de prueba con volumen real ya existe ademas un importador offline de `egresos.csv` legacy con compresion de imagenes y carga idempotente
- ese flujo genera `egresos_finance_profile.json`, `egresos_finance_import.csv`, `imagenes_finance_preparadas/` y `egresos_finance_import_report.json` dentro de `modulo finanzas/ejemplo/`
- el importador crea categorias faltantes, carga egresos sobre `finance_transactions` y enlaza cada documento comprimido como adjunto de la transaccion correspondiente
- una vez importados, esos adjuntos ya no dependen de la carpeta externa de ejemplo: el storage real del módulo vive en `backend/app/apps/tenant_modules/finance/storage/attachments/`
- si una transacción se cargó por error, la vista ya ofrece `Anular` en vez de borrado físico
- esa anulación conserva auditoría, deja la fila disponible para soporte y la excluye de balances, listados activos, presupuestos y reportes
- las transacciones derivadas de cuotas de `Préstamos` no se anulan desde `Transacciones`; deben revertirse desde el propio préstamo
- `Cuentas`, `Categorías`, `Etiquetas`, `Beneficiarios`, `Personas`, `Proyectos`, `Monedas` y `Tipos de cambio` ya ofrecen `Eliminar` cuando el registro no tiene referencias; si el backend detecta uso real, bloquea la eliminación y la operación correcta pasa a ser `Desactivar`
- en `Monedas`, el borrado además exige que la fila no sea moneda base
- `Cuentas`, `Categorías`, `Catálogos` y `Configuración` ya muestran ayudas visibles en pantalla para aclarar cuándo conviene eliminar, desactivar o conservar histórico
- las operaciones de conciliacion ya aceptan `reason_code`, nota opcional y pasan por confirmacion explicita
- ya existe una pantalla operativa de `Presupuestos` con lectura mensual por categoria
- `Presupuestos` ya permite alta y edicion de montos, nota y estado activo, usando comparacion contra la ejecucion real del mes
- `Presupuestos` ya permite filtrar por tipo, estado derivado e inclusion de inactivos
- `Presupuestos` ya expone contadores operativos y un bloque de foco para priorizar categorias con mayor desvio o sin uso
- ese foco ya deja intervenir rapido con edicion o activacion/desactivacion sin bajar a la tabla completa
- `Presupuestos` ya permite clonar un periodo origen hacia el mes visible, con sobrescritura opcional de categorias ya existentes
- `Presupuestos` ya permite además aplicar ajustes guiados desde el foco, por ejemplo alinear al real con margen o desactivar categorias sin ejecución
- `Presupuestos` ya permite además aplicar plantillas operativas para sembrar el mes visible con base en histórico o meses comparables
- esas plantillas ya aceptan además escala porcentual y redondeo por múltiplo antes de persistir el seed
- ya existe una pantalla operativa de `Préstamos` con cartera por contraparte, capital, saldo, cuotas y moneda
- `Préstamos` ya expone un cronograma inicial por cuotas y ya permite aplicar o revertir pagos manuales sobre cuotas, con reparto configurable entre interés y capital
- el cronograma ya muestra capital pagado e interés pagado por cuota
- el cronograma ya permite además selección múltiple y operación batch de pago o reversa
- la reversa individual y batch ya exige motivo estructurado y lo deja visible en el cronograma
- cada pago o reversa de cuota ya genera además una transacción financiera enlazada al préstamo
- `Préstamos` ya permite definir una cuenta origen por préstamo y reutilizarla o sobrescribirla al operar cuotas
- el detalle del préstamo ya expone una lectura contable derivada reciente para soporte y revisión operativa
- esa lectura derivada ya incluye resumen operativo y exportación CSV/JSON desde la misma vista de detalle
- esa exportación ya incorpora además contrapartida, tipo de préstamo, cuota asociada y efecto firmado en moneda base
- `Planificación` ya ofrece una lectura mensual operativa cruzando días con movimiento, cuotas del mes y presión presupuestaria
- `Planificación` ya incorpora además un chart de presión mensual para cruzar presupuesto, real, balance y flujo esperado de préstamos
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
- `Reportes` ya compara además esa dimensión activa contra el período comparado para mostrar ganadores y perdedores por entidad
- `Reportes` ya resume además deltas ejecutivos de período, horizonte y acumulado anual en una vista comparativa adicional
- `Transacciones` ya permite además persistir varias etiquetas por movimiento
- `Transacciones` ya permite además filtrar por `Etiqueta` y mostrar chips visibles en tabla y detalle
- `Reportes` ya permite además rankear por `etiqueta`
- cuando el schema `finance` del tenant queda atrasado, el portal ya muestra explicación operativa y CTA para actualizar estructura
- `tenant admin` ya puede revisar estado y sincronizar estructura desde el propio portal, dejando el trabajo en cola y monitoreando el job sin depender solo de `Platform Admin`
- `Cuentas`, `Categorías`, `Catálogos`, `Configuración`, `Transacciones`, `Presupuestos`, `Préstamos`, `Planificación` y `Reportes`, junto con los formularios auxiliares visibles del slice, ya respetan el selector de idioma en la lectura principal y traducen etiquetas de dominio como tipo de cuenta o tipo de categoría
- la moneda base del módulo se gobierna desde `Finanzas > Configuración > Monedas`; al marcar una nueva base, la anterior se desactiva como base automáticamente
- el cambio de moneda base no reprocesa automáticamente histórico ya persistido en transacciones
- `Presupuestos`, `Planificación` y `Reportes` ya formatean los montos visibles con la moneda base activa del tenant
- `Préstamos` ya usa la moneda base en métricas agregadas, pero conserva la moneda propia del préstamo en filas y cronograma para no mezclar símbolos sobre importes nativos
- la compatibilidad legacy de `/entries` se mantiene para no romper integraciones antiguas mientras madura el resto del módulo
- `Planificación` y `Reportes` ya incorporan una primera capa visual con bloques destacados y charts livianos para lectura operativa
- la navegación secundaria del módulo ya usa iconografía semántica consistente entre vistas
- `Categorías` ya permite además asignar un icono semántico controlado por rubro, visible en formulario y catálogo
- `Cuentas`, `Beneficiarios` y `Personas` ya reaprovechan la misma convención de iconos controlados en formulario y tabla

Pendiente administrativo:
- seguir puliendo copy residual en exportaciones, confirmaciones, badges y mensajes largos para asegurar paridad completa entre `Español/Inglés`
- el backlog opcional sugerido del módulo ya quedó absorbido en el alcance actual; cualquier cambio adicional pasa a expansión nueva del dominio

Comando operativo de referencia para importar el ejemplo legacy:

```bash
cd /home/felipe/platform_paas/backend
PYTHONPATH=/home/felipe/platform_paas/backend \
/home/felipe/platform_paas/platform_paas_venv/bin/python \
app/scripts/import_finance_legacy_egresos.py --apply --tenant-slug empresa-demo --actor-user-id 1
```
