# Maintenance User Guide

Guia operativa del modulo `maintenance` (`Mantenciones`) para usuarios tenant y soporte funcional.

## Para que sirve

El modulo se define para controlar el trabajo tecnico recurrente sobre clientes, equipos e instalaciones:

- programar mantenciones
- asignarlas a tecnicos o equipos
- registrar intervenciones sobre sitios o instalaciones del cliente
- cerrar trabajo realizado con trazabilidad
- consultar historico tecnico por cliente

Base esperada:

- `maintenance` deberia leer cliente, sitio, contactos y grupos desde `business-core`

## Problemas del sistema fuente que se quieren corregir

La version actual de `ieris_app` resuelve la operacion base, pero tiene limites que conviene mejorar al migrar:

- la mantencion activa se elimina al completarse y se mueve a historico
- la mantencion no queda claramente asociada a una instalacion concreta
- el listado mezcla demasiada informacion en una tabla compacta
- falta un flujo mas claro para tecnicos en terreno
- la frontera con agenda, tareas y expediente tecnico no esta suficientemente ordenada

## Alcance funcional del primer corte en PaaS

El primer corte del modulo ya permite:

- crear programaciones base de mantención periódica
- ver una bandeja `Pendientes` con mantenciones por vencer o vencidas que entraron en ventana automáticamente
- registrar estado de contacto desde `Pendientes`
- posponer un pendiente a una nueva fecha visible
- agendar una mantención desde `Pendientes` y convertirla en orden de trabajo real
- abrir la ficha del cliente desde `Pendientes` para revisar datos y coordinar antes de agendar
- ver solo mantenciones abiertas en la bandeja `Mantenciones`
- ver mantenciones realizadas o anuladas en `Historial`
- `Historial` ahora separa `Mantenciones realizadas` y `Mantenciones anuladas`, para no mezclar trabajo ejecutado con trabajo cancelado.
- leer la bandeja por cliente, direccion e instalacion
- ordenar operativamente por fecha y hora de trabajo mas reciente
- abrir `Ver ficha` desde `Mantenciones` o `Historial` para revisar una orden completa sin salir de la lectura principal
- en `Historial`, filtrar por `Grupo responsable` y `Técnico responsable` para revisar cierres por equipo o persona sin perder la lectura de cliente y sitio
- en la tabla y en la ficha histórica se ve el responsable como grupo + usuario para coordinar rápido la trazabilidad del cierre
- en este módulo, `Grupo responsable` no es un permiso ni un rol del sistema: es el equipo técnico asignado a la OT, y `Técnico responsable` es la persona concreta que quedó dentro de ese equipo
- si un cierre no aparece al filtrar por un responsable, normalmente significa que la OT se cerró con otra asignación, o que quedó sin responsable guardado en esa ventana
- abrir `Visitas` desde `Mantenciones` para coordinar ventanas programadas, ejecución real y responsables por salida a terreno
- cuando la documentación o la UI diga `responsables`, entenderlo como `grupo responsable` + `líder` o técnico asignado; no existe un responsable separado por sitio o dirección
- ver `Tipo de tarea` y `Perfil funcional` dentro de `Mantenciones`, `Historial` y `Ver ficha` cuando la OT quedó vinculada a programación preventiva y a una asignación formal del grupo
- al elegir `Grupo responsable`, la lista de `Técnico responsable` se acota a miembros activos y vigentes de ese grupo
- esa misma restricción visual también aplica cuando creas o reprogramas desde `Agenda`
- si la mantención viene desde una programación preventiva con `Tipo de tarea`, solo podrás elegir técnicos cuyo miembro del grupo tenga `Perfil funcional` declarado; la misma regla aplica al agendar desde `Pendientes` y al coordinar `Visitas`
- si además en `Business Core -> Tipos de tarea` marcas `Perfiles compatibles`, la asignación se reduce solo a esos perfiles compatibles
- en `Business Core -> Taxonomías` puedes revisar la matriz completa de compatibilidad entre `Tipos de tarea` y `Perfiles funcionales` para auditar rápidamente qué combinaciones quedaron abiertas o restringidas
- la matriz también informa cobertura real por membresías activas del grupo, ayudando a detectar `Tipos de tarea` sin cobertura y `Perfiles funcionales` sin presencia operativa
- crear una orden nueva
- editar una orden aun no cerrada
- cambiar estado a `en curso`, `completada` o `anulada` sin perder trazabilidad
- abrir `Costos` desde una mantención abierta para registrar costo estimado, costo real, cobro y sincronización manual a Finanzas
- dentro de `Costos` puedes reutilizar cualquier `Plantilla de costeo de mantención` activa ya creada previamente
- ahora también existe la vista `Plantillas` dentro de `Mantenciones` para administrar esas plantillas sin depender de `Pendientes` o de una OT puntual
- esa plantilla luego puede elegirse y aplicarse tanto al `Costeo estimado` como al `Costo real`
- el `Monto cobrado` no se pisa con la plantilla; queda manual para respetar el cierre comercial real
- por ahora el módulo no deja una marca explícita de "plantilla aplicada al cierre" dentro del histórico económico final; ese refinamiento queda pendiente
- abrir `Ver costos` desde `Historial` para revisar en modo solo lectura el cierre económico ya congelado de una orden cerrada
- abrir `Checklist` desde una mantención abierta para registrar checklist técnico, observación de cierre y evidencias del trabajo ejecutado
- abrir `Ver checklist` desde `Historial` para consultar ese cierre técnico en modo solo lectura
- registrar detalle por líneas dentro de `Costos y cobro`, para que el resumen se derive automáticamente cuando quieras bajar a mano de obra, traslado, materiales, servicios externos o indirectos
- definir en `Nueva programación` un costeo estimado por defecto con varias líneas de materiales, servicios, mano de obra, traslado e indirectos
- guardar y reutilizar `Plantillas de costeo de mantención` dentro de `Nueva programación`, sin salir del módulo ni depender de catálogos compartidos
- editar, archivar o reactivar esas `Plantillas de costeo de mantención` desde la misma vista operativa
- ver cuántas programaciones preventivas quedaron vinculadas a cada plantilla de costeo
- hacer que una OT agendada desde `Pendientes` nazca ya con ese costeo estimado precargado
- definir en `Resumen` si el tenant deja el puente con `Finanzas` en modo manual o lo automatiza al cerrar
- sacar automaticamente de la bandeja activa una orden al completarla o anularla
- mantener catalogo de tipos de equipo
- mantener instalaciones tecnicas ligadas a sitios del dominio base
- consumir clientes y sitios desde `business-core`
- consultar historial tecnico de ordenes cerradas con cambios de estado y visitas registradas
- corregir desde `Historial` solo descripcion, notas de cierre o motivo de anulacion
- ver una agenda visual mensual de mantenciones abiertas
- crear mantenciones desde la agenda visual
- abrir `Mantenciones` desde la ficha del cliente con cliente y dirección ya preseleccionados
- abrir altas y ediciones desde modal bajo demanda, dejando catálogo y lectura como primer plano
- ver en `Resumen` las ultimas 5 mantenciones realizadas con datos de cliente, direccion y fecha
- abrir `Expediente` desde `Instalaciones` para revisar un puente técnico liviano del activo con snapshot, próxima atención y último cierre reutilizando checklist/evidencias
- abrir `Reportes` para revisar cierres del período, cobertura técnica, trazabilidad de visitas y activos sin servicio reciente

## Lo que no entra en el primer corte

- `egresos`
- `CRM`
- `cotizaciones`
- expediente tecnico completo
- vistas de visita más finas por terreno
- reprogramación de terreno más avanzada con ventanas operativas

## Flujo operativo esperado

1. seleccionar cliente
2. si el cliente requiere mantención recurrente, crear su programación base en `Pendientes`
3. cuando entre en ventana, aparecerá automáticamente en la bandeja preventiva
4. agendar desde `Pendientes` o crear una orden manual en `Mantenciones`
5. elegir direccion del cliente
6. elegir instalacion real
7. programar fecha y hora
8. crear la orden con prioridad y contexto tecnico
9. cambiar estado a `en curso` cuando el trabajo arranca
10. completar o anular la orden dejando observacion o motivo
11. al cerrar, la orden deja de verse en `Mantenciones`
12. revisar despues el historial tecnico con sus cambios de estado y visitas
13. usar `Agenda` para ver visualmente el trabajo abierto del mes y crear nuevas mantenciones desde una fecha

Tambien deberia funcionar asi:

1. buscar cliente en `Core de negocio`
2. abrir su ficha
3. revisar direccion, contactos e instalaciones asociadas
4. saltar a `Mantenciones` con el contexto del cliente ya cargado

Lectura funcional de cada vista:

- `Resumen`: tablero corto con abiertas y ultimas 5 realizadas
  - también muestra la política tenant `Sincronización automática a finanzas`
- `Pendientes`: bandeja automática de mantenciones por gestionar, visible cuando el cliente ya entró en ventana de vencimiento
  - `Nueva programación` sigue el mismo patrón visual, jerarquía de lectura y modal de `Nueva mantención`
  - `Nueva programación` ya permite precargar `Costeo estimado por defecto` para que la OT programada no parta vacía
  - la misma pantalla ya permite aplicar o guardar `Plantillas de costeo de mantención` para reutilizar estructuras de costo frecuentes del equipo técnico
  - ahora también permite editar, archivar/reactivar y revisar cuántas programaciones usan cada plantilla
  - `Próxima mantención` se sugiere automáticamente si existe una mantención cerrada este año en historial
  - la sugerencia toma primero la misma instalación y, si no hay cierre útil, cae a la misma dirección
  - cuando existe cierre este año, se propone el mismo día y mes para el próximo año
  - en ese mismo caso, también se propone frecuencia anual como punto de partida
  - la misma pantalla agrega una lectura agrupada por organización para coordinar mejor varias contrapartes sin depender de memoria
  - desde la tabla puedes abrir `Ver cliente`, `Contactar`, `Posponer` o `Agendar`
  - también aparece un reporte de instalaciones activas sin plan preventivo para abrir `Crear plan` con el contexto ya cargado
- `Mantenciones`: solo trabajo abierto (`scheduled` / `in_progress`)
  - cada fila ya permite abrir `Ver ficha`
  - cada fila ya permite abrir `Visitas`
  - `Visitas` ahora muestra una lectura rápida de abiertas/en curso/completadas, alertas por visitas sin responsable y atajos para copiar la ventana/responsables de la OT o marcar salida/cierre
  - además ordena la secuencia de terreno y deja crear `seguimiento` desde una visita previa para no reconstruir ventana ni responsables desde cero
  - si editas una visita programada, también puedes reencadenar automáticamente las siguientes visitas programadas para mover toda la secuencia sin recalcular una por una
  - cada fila ya permite abrir `Costos`
  - cada fila ya permite abrir `Checklist`
  - cada fila ya permite abrir `Reprogramar` para cambiar slot o responsables sin perder trazabilidad
  - el costeo se maneja en modal, igual que la captura principal del módulo
  - `Costos` ya permite resumen manual o detalle por líneas
  - `Costeo estimado` ahora puede cargar cualquier plantilla activa del módulo y luego editar margen, notas o líneas antes de guardar
  - `Costo real y cobro` ahora copia los valores de la plantilla al resumen real, sin dejarlo amarrado a la plantilla; después puedes ajustar traslado, materiales, cobro o agregar líneas manuales si quieres más detalle
- `Instalaciones`: parque instalado por cliente y direccion
- `Instalaciones`:
  - cada fila ya permite abrir `Expediente`
  - ese expediente no reemplaza al futuro módulo documental; sirve como lectura técnica rápida del activo usando su historial real de mantenciones
- `Historial`: trabajo ya realizado o anulado
  - cada tarjeta ya permite abrir `Ver ficha`, `Ver costos`, `Ver checklist` y `Editar cierre`
  - `Ver costos` es solo lectura; el histórico no se edita desde el flujo normal
  - `Ver checklist` también es solo lectura y deja visible la trazabilidad técnica del cierre
  - desde `Ver ficha` también se puede abrir `Editar cierre` sin volver a la tarjeta principal
- `Agenda`: calendario visual del trabajo abierto
  - ahora marca conflictos visibles cuando dos mantenciones abiertas comparten horario y recurso técnico/instalación
  - si aun así intentas guardar un cruce real, el backend lo rechaza para evitar doble asignación en el mismo slot
  - también permite filtrar la agenda mensual por grupo responsable o técnico responsable
  - al abrir una mantención desde la agenda, puedes usar `Reprogramar` y dejar un motivo visible en historial técnico
  - en esa reprogramación puedes mover también la primera visita abierta para dejar alineada la ventana principal de terreno
  - la modal ahora además muestra qué ventana se sincronizará y cuáles visitas abiertas quedarán pendientes para coordinación fina en `Visitas`
- `Reportes`: lectura analítica operativa del módulo
  - permite filtrar por mes y tipo de equipo
  - resume cierres completados/anulados del período
  - muestra cobertura de observación útil de cierre, trazabilidad de visitas y cobertura preventiva
  - detecta instalaciones activas sin servicio reciente ni OT abierta

Lectura de la ficha de mantención:

- resume cliente, dirección, instalación, responsables, prioridad y estado actual
- agrega snapshots de próxima ventana en terreno, última ejecución y grupos que ya tocaron la OT
- expone fechas clave de creación, programación, cierre y última actualización
- carga `Cambios y eventos` y `Visitas asociadas` bajo demanda para no recargar la bandeja principal
- si la OT sigue abierta, desde la ficha puedes saltar a `Costos` o `Checklist`
- si la OT sigue abierta, desde la ficha también puedes abrir `Visitas` para coordinar o corregir ventanas de terreno
- si la OT ya está en `Historial`, desde la ficha puedes abrir `Editar cierre`

Regla UX operativa:

- la lectura del catálogo debe verse primero
- altas y ediciones no deberían quedar desplegadas por defecto
- la captura se abre solo cuando el usuario pide `Nuevo` o `Editar`
- los identificadores `legacy_*` o referencias externas internas no deben verse ni editarse en la captura normal
- si falta cliente, direccion o instalacion, el modal debe informar la dependencia faltante antes de permitir agendar
- el usuario no debe ver referencias `legacy_*` como datos operativos
- una mantencion cerrada no debe seguir apareciendo editable en la bandeja activa
- en historial solo deberian poder corregirse descripcion o cierre, no reprogramar fecha/hora
- el cierre económico histórico debe consultarse en solo lectura; cualquier ajuste excepcional futuro debe quedar como acción separada y auditada
- la sincronización a `Finanzas` es manual y controlada:
  - primero se registra costo real
  - luego se eligen cuenta, categoría y moneda
  - recién entonces se genera o actualiza el ingreso/egreso financiero
- el formulario `Sincronizar a finanzas` ya parte precargado con la configuración por defecto definida en `Resumen`
- la `Fecha contable` ya no se edita manualmente desde la modal; el backend usa siempre la hora real de cierre de la OT y, si aún no está cerrada, el momento real en que se ejecuta la sync manual
- si el tenant activa `Automática al cerrar` en `Resumen`:
  - la OT completada intenta generar ingreso/egreso usando las cuentas, categorías, moneda y toggles por defecto del tenant
  - el modal `Costos` avisa si falta alguna configuración activa en `Resumen` para que el cierre no salga sin el puente esperado a `Finanzas`
  - en ese modo, el botón de sync queda como respaldo para reintentar o corregir la sincronización si cambió la configuración o si el primer intento no pudo completarse
- si la OT nace desde una programación preventiva con costeo default:
  - `Costeo estimado` ya se abre precargado con sus líneas base
  - el operador puede ajustar ese estimado antes de ejecutar la mantención real
- si el equipo técnico repite siempre la misma estructura de estimate:
  - puede guardarla como `Plantilla de costeo de mantención`
  - luego puede aplicarla en nuevas programaciones o en el modal `Costos` de cualquier OT sin reconstruir material, servicio, mano de obra o margen desde cero
  - también puede archivarla cuando deje de usarse, sin perder la referencia de programaciones ya vinculadas
- si la OT necesita trazabilidad de terreno:
  - `Checklist` permite marcar el cumplimiento técnico base
  - cada ítem puede dejar una nota corta
  - la observación de cierre queda estandarizada en el mismo modal
  - también se pueden adjuntar PDFs o imágenes como evidencia del trabajo ejecutado
  - en móvil, la modal ahora agrega `Acciones rápidas en terreno` para saltar directo a cierre, checklist o evidencias
  - también resume avance del checklist y cantidad de adjuntos ya registrados
  - al adjuntar evidencia desde un dispositivo compatible, el selector puede ofrecer cámara o galería
- si necesitas revisar rápidamente el contexto técnico de un activo sin abrir todavía un expediente documental completo:
  - entra a `Instalaciones`
  - abre `Expediente`
  - revisa snapshot del activo, próximas/últimas mantenciones y el último cierre técnico reutilizado desde la OT más reciente

## Mejora funcional recomendada

La version PaaS ya mejora a la actual en estos puntos y todavia tiene mejoras pendientes:

- una mantencion debe quedar ligada a una instalacion concreta cuando exista
- la pantalla debe mostrar el cliente por nombre humano y no por codigos internos
- el estado no debe depender de borrar el registro activo
- la bandeja diaria debe mostrar solo trabajo pendiente
- hoy ya existe una lectura clara de `programada`, `en curso`, `completada` y `anulada`
- sigue pendiente una linea de tiempo tecnica por cliente
- el flujo base de evidencias y cierre en terreno ya tiene un primer corte móvil; siguen pendientes escenarios más avanzados de captura y operación offline

## Roles recomendados

Roles operativos sugeridos para el modulo:

- administrador tenant
- coordinador operativo
- tecnico
- lectura/soporte

## Errores comunes que el modulo debe cubrir bien

- superposicion con agenda de otro trabajo
  - la vista ya avisa cruces visibles cuando coinciden instalación, grupo o técnico en el mismo horario
- falta de instalacion asociada cuando el cliente tiene varias
- tipo de equipo inexistente o desactivado
- cierre o anulacion sin observacion util para el equipo
- intentos de borrar datos con historico asociado

## Relacion con otros modulos

- `finance` reemplaza el antiguo frente de egresos
- `business-core` deberia proveer cliente, empresa, contacto, sitio, grupo y tipo de tarea
- `calendar` debe mostrar ventanas de mantencion
- `projects` deberia reutilizar la misma base de clientes, sitios y responsables
- `iot` deberia reutilizar la misma base de sitios y activos
- `crm` y `cotizaciones` podran integrarse despues, pero no deben bloquear el primer corte
- `expediente tecnico` podra acoplarse luego como extension documental y de evidencias
