# Business Core User Guide

Esta guia explica que deberia resolver el dominio base de negocio del tenant.

No es un modulo operativo final para el usuario comun. Es la base que permite que otros modulos funcionen con contexto compartido.

## Para que sirve

Sirve para centralizar:

- quienes son los clientes
- que empresas o proveedores existen
- quienes son los contactos
- en que sitios opera cada cliente
- que grupos o equipos internos trabajan
- que tipos de tarea existen
- que tipos de activo existen
- que activos instalados hay por sitio

## Que problema evita

Sin este dominio base, cada modulo termina creando sus propias versiones de:

- clientes
- contactos
- ubicaciones
- tecnicos o grupos
- taxonomias de trabajo

## Como leer Empresas vs Clientes

- `Empresas` muestra la empresa propia, proveedores y partners operativos.
- `Clientes` muestra la cartera cliente del tenant.
- una misma identidad base puede existir como `organization`, pero la vista `Empresas` no debe usarse para revisar la cartera comercial completa.
- por defecto, la pantalla `Empresas` excluye las organizaciones ya usadas como clientes para evitar mezclar ambas lecturas.
- en `Empresas`, la tabla operativa debe mostrar tambien el `contacto principal` con telefono y mail, para permitir lectura rapida sin abrir otros catalogos.
- el modal de `Empresas` debe permitir editar al menos el contacto principal junto con la contraparte, porque en operacion diaria esa lectura suele ir unida.
- la lectura principal del cliente deberia hacerse desde su ficha, no desde catalogos sueltos.
- `Direcciones` es el nombre visible para la entidad tecnica `site`.
- cada ficha de cliente debe consolidar identidad, contactos y direcciones, incluyendo acceso a Google Maps cuando exista direccion usable.
- la tabla de `Clientes` tambien debe permitir busqueda por nombre, RUT, contacto o direccion, para no obligar al usuario a cambiar de pantalla solo para ubicar una ficha.
- la ficha del cliente ya no deberia dejar `Activos` como un catálogo separado sin contexto: cada direccion puede resumir cuántos activos visibles tiene el sitio y dejar un CTA `Activos sitio`.
- cuando una ficha ya tiene direcciones y mantenimiento asociado, la lectura correcta deberia permitir revisar activos del mismo sitio sin perder el contexto del cliente.
- la tabla principal de `Clientes` tambien puede mostrar una señal rápida de inventario del cliente: cuántos activos visibles tiene y si existe al menos un sitio con inventario reusable.
- en la tabla de `Clientes`, la columna de contacto deberia avisar de forma breve cuando existe uno o mas contactos de respaldo, sin obligar a abrir de inmediato la ficha.
- el `codigo de direccion` no forma parte de la captura normal del usuario: es un identificador tecnico interno y no deberia editarse desde pantallas operativas.
- en la captura normal de direcciones no deberia pedirse `Nombre dirección` separado de `Dirección`; la UX correcta es pedir `Calle` y `Número`, y construir internamente el identificador tecnico si hace falta.
- si una direccion ya existe, el usuario deberia verla y editarla como direccion humana completa; no deberia enfrentarse a nombres tecnicos internos ni a tener que escribir la misma direccion dos veces.
- `Notas de referencia` si son visibles al usuario, asi que deben quedar para observaciones humanas del equipo y no para metadatos legacy o ids tecnicos.
- en la ficha del cliente, los formularios para agregar o editar contactos y direcciones deben abrirse solo cuando el usuario los pide; la lectura normal debe mostrar primero la informacion ya existente.
- el modal de `Nuevo cliente` o `Editar cliente` debe priorizar ancho util en escritorio, distribuyendo cliente, contacto principal y direccion en bloques laterales para evitar una experiencia demasiado alta o cansadora.
- la captura rapida del cliente deberia contemplar al menos `contacto principal` y `contacto secundario`, para no perder respaldo operativo si el primero no responde.
- el bloque `Cliente` del modal no deberia duplicar telefono o email como si fueran otro contacto; visualmente los datos de contacto deben vivir solo en `contacto principal` y `contacto secundario`.
- la captura base del cliente deberia permitir completar tambien `organización / razón social` y la direccion principal con `comuna`, `ciudad` y `región`, porque son datos utiles para busqueda y lectura diaria.
- en el resto de pantallas administrativas de `business-core`, el formulario de alta o edicion tampoco deberia aparecer desplegado por defecto; debe abrirse solo cuando el usuario pulse `Nuevo` o `Editar`.
- el campo `Orden` (`sort_order`) no deberia mostrarse en la captura normal del usuario; debe quedar interno con valor por defecto mientras no exista una necesidad real de reordenamiento manual.
- en perfiles funcionales, grupos y tipos de tarea, `Código` tambien debe quedar interno; el usuario no deberia verlo ni editarlo desde la UI normal.
- las descripciones visibles de taxonomias no deben arrastrar marcadores `legacy_*`; si el dato no fue escrito por el usuario, no debe mostrarse en captura ni lectura.
- lo mismo aplica para `Empresas`, `Clientes` y catálogos visibles de `Maintenance`: la operacion no debe mostrar marcadores `legacy_*` en notas, descripciones ni textos de apoyo.
- tampoco deberian mostrarse placeholders heredados como `Sin Mail`, `Sin Fono` o `Sin contacto` como si fueran datos validos de contacto.
- la portada `Resumen` del dominio ya puede mostrar ultimas altas reales de `Empresas` y `Clientes`; no deberia quedarse como una portada ciega si ya existe catalogo operativo detras.
- en `Resumen`, `Empresas` debe quedar acotado a las 2 ultimas altas visibles y `Clientes` a los 5 ultimos, mostrando nombre, RUT, contacto base y estado de servicio en vez de tarjetas vagas sin valor operativo.
- `Resumen` ya no deberia dejar `assets` fuera de escena: también puede mostrar cuántos activos visibles existen y qué sitios concentran inventario reusable hoy.
- desde `Resumen`, el operador ya debería poder saltar a `Activos sitio` o a la ficha del cliente sin reconstruir el contexto manualmente.
- en la ficha del cliente, `Mantenciones realizadas` no deberia leer la bandeja operativa abierta; debe mostrar solo trabajo cerrado de ese cliente, tomado desde historial tecnico, incluyendo estado final, responsable tecnico o grupo cuando exista, y la descripcion util de lo que ocurrio con el equipo.
- la direccion propia de una empresa o proveedor sigue siendo una necesidad real, pero conviene resolverla como parte del modelo y no como un campo suelto pegado al modal. Hasta que exista esa ola, el foco de `Empresas` debe ser identidad + contacto principal.
- si intentas registrar un cliente repetido, el control correcto no debe depender de la pantalla: la contraparte base no debe duplicarse y una misma organizacion no deberia tener mas de un cliente asociado.
- `Código cliente` tampoco deberia verse ni editarse en la captura normal; si existe, debe resolverse como identificador interno del sistema y no como dato operativo del usuario.
- un cliente con historial de mantenciones no deberia eliminarse; desde ese punto en adelante solo corresponde desactivarlo para no romper trazabilidad ni reportes.
- si aparece la pareja, un familiar o un tercero ligado al mismo domicilio o contexto operativo, no deberia crearse como cliente nuevo por defecto; primero debe revisarse si corresponde agregarlo como contacto del cliente existente.
- la captura de `Nuevo cliente` deberia advertir coincidencias fuertes por RUT, nombre, telefono, email o direccion y desviar al usuario hacia la ficha existente antes de duplicar la cartera.
- cuando ya existen duplicados en la base, la pantalla `Depuración` debe agrupar `Organizaciones`, `Clientes`, `Contactos`, `Direcciones` e `Instalaciones` por coincidencias exactas normalizadas, sugerir qué ficha conservar y mostrar dependencias visibles para ayudar a decidir qué ficha borrar, desactivar o consolidar sin romper historial.
- la vista `Activos` permite mantener el inventario instalado por sitio y `Tipos de activo` define la taxonomia reusable para ese inventario.
- cuando entras a `Activos` desde `Maintenance -> Instalaciones`, la vista puede abrir con foco contextual del mismo sitio y una búsqueda prellenada por nombre o serie de la instalación.
- ese foco no significa que exista todavía una relación rígida `instalación = activo`; por ahora sirve para revisar rápido el inventario reusable del mismo sitio antes de seguir operando en `maintenance`.
- dentro de `Activos`, la lectura operativa ahora debería permitir:
  - ver cuántos activos del sitio están visibles
  - separar activos e inactivos
  - ubicar por nombre, serie, código, fabricante o modelo
  - volver a `Instalaciones` del mismo sitio sin reconstruir el contexto manualmente
- dentro de la ficha del cliente, la lectura operativa ahora también debería permitir:
  - ver por cada dirección si ese sitio tiene activos visibles
  - distinguir rápido si no hay activos todavía
  - saltar al inventario filtrado del mismo sitio sin buscarlo de nuevo

Regla vigente:

- la coordinación operativa de una mantención o instalación la resuelve el `grupo` asignado y su líder
- no se usa un responsable separado por sitio o dirección

Eso genera:

- datos duplicados
- nombres inconsistentes
- reportes cruzados pobres
- integraciones fragiles entre modulos

## Depuracion de duplicados

La pantalla visible como `Duplicados` sirve para limpiar base existente cuando la prevencion de duplicados ya no alcanzo.

Donde esta:

- menu: `Tenant portal -> Core de negocio -> Duplicados`
- ruta directa: `/tenant-portal/business-core/duplicates`
- acceso rapido adicional: `Core de negocio -> Resumen -> Abrir duplicados`

Como reconocer que estas en el slice correcto:

- el menu superior muestra `Duplicados`
- la portada `Resumen` muestra una tarjeta `Limpieza de duplicados`
- cada grupo duplicado muestra un resumen previo de consolidacion antes del boton `Consolidar en sugerida`
- cuando el merge dejo evidencia documental, el historial reciente ya muestra tambien cambios relevantes `actual -> final` y si vinieron por sugerencia `auto` o por `ajuste manual`

Que veras dentro del slice:

- un bloque `Auditoría de duplicados`
- un bloque `Historial reciente de consolidaciones`
- filtros por texto y por tipo de entidad
- grupos de `Organizaciones duplicadas`
- grupos de `Clientes duplicados`
- grupos de `Contactos duplicados`
- grupos de `Direcciones duplicadas`
- grupos de `Instalaciones duplicadas`
- una ficha marcada como `Sugerida para conservar`
- resumen previo del impacto de consolidacion por grupo

Flujo recomendado:

1. abrir `Core de negocio -> Duplicados`
2. revisar la ficha marcada como `Sugerida para conservar`
3. si la duplicada no tiene dependencias, usar `Eliminar`
4. si la duplicada tiene historial que debe conservarse, usar `Desactivar`
5. si quieres dejar una sola ficha operativa, usar `Consolidar en sugerida`

Como decidir rapido:

- si una ficha esta vacia o sin uso, `Eliminar`
- si tiene historial pero no debe seguir operando, `Desactivar`
- si quieres concentrar la operacion en una sola ficha, `Consolidar en sugerida`
- si en `Organizaciones` quieres decidir manualmente el dato final por campo, usa `Ajuste manual previo`
- revisa luego `Diff final por campo` para validar el resultado exacto antes de consolidar
- en `Contactos`, el mismo patrón ya permite decidir por adelantado qué ficha aporta nombre, email, teléfono, rol y el flag de contacto principal
- en `Contactos`, revisa también `Diff final por campo` antes de consolidar si quieres dejar auditada la decisión visible y no solo el resultado automático
- en `Clientes`, ahora también puedes revisar y ajustar antes del merge el `estado servicio` y las `notas comerciales` de la ficha final
- en `Direcciones`, ahora también puedes revisar y ajustar antes del merge los datos visibles de ubicación y las `notas de referencia`
- en `Instalaciones`, ahora también puedes revisar y ajustar antes del merge la identidad técnica visible: `nombre`, `serie`, `fabricante`, `modelo`, `ubicación visible` y `notas técnicas`
- después del merge, revisa `Historial reciente de consolidaciones` si necesitas recordar rápido qué campos quedaron distintos y desde qué ficha se tomó el valor final

Que consolida hoy:

- `Organizaciones`: mueve `Contactos`, puede consolidar varios `Clientes` en una ficha sugerida, reasignar la ficha final, integrar datos visibles faltantes y deja inactivas las organizaciones origen
- `Clientes`: mueve `Contactos`, `Direcciones` y `OT`
- `Clientes`: además ya permite ajustar antes del merge qué ficha aporta `estado servicio` y `notas comerciales`, dejando ese diff en la auditoría persistente
- `Contactos`: integra email, teléfono o rol faltante, desactiva duplicados equivalentes y conserva una sola ficha sugerida dentro de la misma organización
- `Contactos`: además ya permite un ajuste manual previo por campo visible y deja ese diff dentro de la auditoría persistente del merge
- cuando el merge audit trae `diff_rows` y `selections`, el historial visible ya resume también campos documentados y ajustes manuales recientes
- `Direcciones`: mueve `Instalaciones` y `OT`
- `Direcciones`: además ya permite ajustar antes del merge qué ficha aporta dirección, comuna, ciudad, región, país y notas de referencia, dejando ese diff en la auditoría persistente
- `Instalaciones`: mueve `OT`
- `Instalaciones`: además ya permite ajustar antes del merge qué ficha aporta nombre visible, serie, fabricante, modelo, ubicación visible y notas técnicas, dejando ese diff en la auditoría persistente
- cada una de esas consolidaciones ya puede dejar rastro visible en `Historial reciente de consolidaciones`

Que no consolida todavia:

- `organizations` en su version profunda documental asistida por decision humana
- cuando hay varios `Clientes` en conflicto, la pantalla ahora intenta consolidarlos guiadamente antes de cerrar la fusión de la organización base; aun así, el criterio documental final sigue siendo operacional y no reemplaza revisión humana
- el ajuste manual actual permite elegir por campo visible qué organización aporta cada dato, pero no versiona decisiones ni agrega una justificación formal por campo
- el diff actual muestra cambio actual vs final por campo, y además cada merge de `organizations` deja un registro persistente de auditoría con ids origen, resumen y procedencia final de los campos visibles
- `contacts` ya suma un diff visible/manual por campo, pero todavía no fusiona identidad completa, notas libres ni relaciones externas más allá del corte actual
- `installations` ya suma un diff visible/manual por campo, pero todavía no fusiona fechas técnicas, garantía ni relaciones externas más allá del corte actual
- merge profundo de `contacts` mas alla de esa capa visible/documental asistida
- notas historicas libres
- fusion documental profunda entre fichas
- auditoría histórica completa de todos los merges de identidad; por ahora la persistencia formal ya cubre `organizations`, pero el resto de las entidades sigue en modo operativo

Nota operativa:

- cuando consolidas `Clientes`, los contactos reutilizables se mueven a la organización destino
- si un contacto ya existe en destino con identidad equivalente, el duplicado se desactiva
- las organizaciones origen siguen existiendo y deben revisarse manualmente

Señal importante:

- si no encuentras la pantalla, no esta dentro de `Clientes` ni dentro de `Direcciones`
- vive como slice propio dentro de `Core de negocio`

## Empresas y contrapartes

La vista `Empresas y contrapartes operativas` ya no captura dirección como una sola línea cruda.

Que cambia en este corte:

- la dirección visible se captura como `Calle` + `Número`
- desde ahí la vista deriva `address_line` antes de guardar
- si la contraparte ya tiene dirección visible, la tabla deja un acceso directo a `Google Maps`

Uso recomendado:

1. abrir `Core de negocio -> Empresas`
2. capturar `Calle`, `Número`, `Comuna`, `Ciudad` y `Región`
3. usar `Google Maps` desde la fila si quieres validar rápido ubicación o llegada operativa

## Lectura simple por modulo

`Maintenance` deberia leer desde aqui:

- cliente
- sitio
- contacto
- grupo tecnico
- tipo de tarea

`Projects` deberia leer desde aqui:

- cliente
- empresa
- contacto
- sitio
- responsables

`IoT` deberia leer desde aqui:

- cliente
- sitio
- equipo instalado
- responsable del sitio

## Regla operativa recomendada

Cuando aparezca una entidad que vaya a ser usada por mas de un modulo tenant, lo correcto es llevarla a `business-core` y no dejarla incrustada en el primer modulo que la use.
