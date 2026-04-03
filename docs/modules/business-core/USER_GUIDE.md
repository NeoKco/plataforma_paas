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
- la direccion propia de una empresa o proveedor sigue siendo una necesidad real, pero conviene resolverla como parte del modelo y no como un campo suelto pegado al modal. Hasta que exista esa ola, el foco de `Empresas` debe ser identidad + contacto principal.
- si intentas registrar un cliente repetido, el control correcto no debe depender de la pantalla: la contraparte base no debe duplicarse y una misma organizacion no deberia tener mas de un cliente asociado.

Eso genera:

- datos duplicados
- nombres inconsistentes
- reportes cruzados pobres
- integraciones fragiles entre modulos

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
