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
- la lectura principal del cliente deberia hacerse desde su ficha, no desde catalogos sueltos.
- `Direcciones` es el nombre visible para la entidad tecnica `site`.
- cada ficha de cliente debe consolidar identidad, contactos y direcciones, incluyendo acceso a Google Maps cuando exista direccion usable.
- la tabla de `Clientes` tambien debe permitir busqueda por nombre, RUT, contacto o direccion, para no obligar al usuario a cambiar de pantalla solo para ubicar una ficha.
- el `codigo de direccion` no forma parte de la captura normal del usuario: es un identificador tecnico interno y no deberia editarse desde pantallas operativas.
- `Notas de referencia` si son visibles al usuario, asi que deben quedar para observaciones humanas del equipo y no para metadatos legacy o ids tecnicos.

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
