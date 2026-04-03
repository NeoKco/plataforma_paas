# Estandar de Construccion de Modulos

Este documento fija el estandar practico para abrir, desarrollar y cerrar modulos nuevos en `platform_paas`.

La idea no es solo crear codigo que funcione. El modulo debe quedar:

- entendible
- mantenible
- testeable
- documentado
- consistente con la UX y la arquitectura ya establecidas

Debe leerse junto con:

- [Convencion modular por slice](./module-slice-convention.md)
- [Estandar de botones CRUD](./crud-button-standard.md)
- [UX operativa de platform admin](./platform-admin-operational-ux.md)
- [Roadmap de frontend](./frontend-roadmap.md)

## Principios Base

Todo modulo nuevo debe nacer como una unidad vertical completa, no como una sola pantalla ni como una tabla aislada.

Eso significa que el modulo debe pensarse desde el inicio como:

- dominio funcional
- modelo de datos
- permisos
- API
- frontend
- pruebas
- documentacion

## Punto de Partida Obligatorio

Antes de escribir codigo, el modulo debe tener al menos:

- objetivo funcional claro
- alcance del primer corte
- entidades base y relaciones
- reglas de negocio visibles
- dependencias con otros cores o modulos
- documentos canonicos en `docs/modules/<modulo>/`

El set documental minimo es:

- `README.md`
- `USER_GUIDE.md`
- `DEV_GUIDE.md`
- `ROADMAP.md`
- `CHANGELOG.md`
- `API_REFERENCE.md` cuando aplique

## Estructura Esperada

### Backend

Un modulo tenant real debe cerrar al menos:

- `models/`
- `repositories/`
- `services/`
- `api/`
- `schemas/` o `schemas.py`
- permisos cuando corresponda
- migraciones tenant
- pruebas backend

### Frontend

Un modulo real debe cerrar al menos:

- `pages/`
- componentes propios del dominio
- `services/`
- `types.ts` si hace falta
- estilos propios si el modulo lo requiere
- navegacion integrada

## Estandar de CRUD

Todo CRUD nuevo debe respetar estas reglas.

### Lectura Primero

La vista principal debe priorizar lectura y operacion.

No se debe abrir el formulario de alta por defecto.

La regla oficial es:

- la tabla o lista va primero
- el alta se abre solo bajo demanda
- la edicion se abre solo bajo demanda

### Alta Bajo Demanda

La creacion debe abrirse desde un boton explicito:

- `Nuevo`
- `Nueva cuenta`
- `Nuevo usuario`
- `Nuevo tenant`

No se deben dejar formularios desplegados de forma permanente encima o al lado del catalogo salvo que exista una razon operativa fuerte.

### Edicion Bajo Demanda

La edicion debe resolverse en:

- modal
- drawer
- vista secundaria

Segun densidad del formulario.

Pero no debe invadir la vista principal mientras el usuario no la haya pedido.

### Eliminacion Segura

Las acciones de borrado deben:

- vivir en la columna de acciones o en el bloque de detalle
- tener confirmacion cuando el riesgo lo justifique
- aplicar protecciones backend contra escenarios invalidos

Ejemplos:

- no permitir borrar el ultimo administrador activo
- no permitir borrar al usuario actual
- no permitir eliminar entidades con dependencias criticas sin control

### Duplicados

Todo CRUD debe proteger duplicados en backend.

La UI puede ayudar, pero no es la ultima barrera.

La validacion debe cubrir:

- nombre normalizado
- identificadores formales como `RUT` o `Tax ID`
- relaciones unicas de negocio
- combinaciones de campos cuando el dominio lo requiera

## Regla de Datos Visibles

La UI no debe exponer datos tecnicos internos al usuario comun.

No deben quedar visibles o editables sin necesidad:

- `legacy_*`
- codigos internos
- `site_code`
- `client_code`
- `sort_order`
- identificadores de importacion

Si esos datos existen por integracion o migracion, deben quedar:

- internos
- sanitizados
- fuera del formulario comun

## Regla de Modales

Los modales deben seguir este criterio:

- modal ancho para captura principal
- modal compacto para edicion puntual
- lectura primero, captura despues

Ademas:

- en escritorio deben aprovechar ancho y no crecer de forma inutil en altura
- en moviles deben caer bien a una sola columna
- los formularios largos deben usar grillas o bloques, no una sola torre infinita

## Regla de Maquetacion

Las pantallas deben sentirse armonicas y operables.

Eso implica:

- no dejar columnas vacias despues de mover formularios a modal
- no mezclar catalogo y formulario fijo si ya existe alta bajo demanda
- usar tarjetas de resumen solo cuando agregan lectura real
- evitar tecnicismos en textos visibles

La pregunta de control debe ser:

- si el usuario entra solo a leer, la pantalla debe seguir siendo clara

## Regla de Lenguaje

El lenguaje visible debe ser operativo y humano.

No conviene exponer:

- nombres tecnicos de tabla
- conceptos internos del importador
- metadatos legacy
- etiquetas que dupliquen el mismo dato

Ejemplo:

- pedir `Calle` y `Numero`
- no pedir `Nombre direccion` y `Direccion` si el usuario termina escribiendo lo mismo dos veces

## Regla de Resumenes

Las pantallas `Resumen` no deben ser portadas ciegas si ya existe dato operativo.

Cuando el dominio ya tenga catalogo o actividad real, el resumen debe mostrar:

- metricas utiles
- ultimas altas
- actividad reciente
- atajos utiles

Pero debe ser acotado:

- pocas tarjetas
- pocas filas
- lectura clara

## Regla de Migracion e Importacion

Cuando un modulo nazca desde una app previa o datos legacy:

- la fuente vieja es referencia y origen de migracion
- no debe quedar como dependencia runtime normal

Ademas:

- los importadores deben ser idempotentes
- deben reparar datos legacy si detectan mappings antiguos incorrectos
- no deben volver a escribir metadatos visibles que el usuario no puso

## Regla de Pruebas

Cada modulo debe cerrar pruebas segun riesgo.

Minimo esperado:

- pruebas backend de servicios y rutas
- validacion de migraciones si el modulo agrega esquema
- `build` frontend sin errores

Cuando el flujo sea sensible u operativo:

- smoke E2E real

## Regla de Documentacion Viva

Toda vez que cambie el comportamiento visible de un modulo, hay que actualizar de inmediato:

- `USER_GUIDE.md`
- `DEV_GUIDE.md`
- `ROADMAP.md` si cambia el estado del modulo
- `CHANGELOG.md`

Si el cambio fija una regla transversal, tambien debe actualizarse `docs/architecture/`.

## Definicion de Modulo Bien Cerrado

Un modulo se puede considerar razonablemente cerrado para su primer corte cuando tiene:

- modelo de datos
- API operativa
- frontend usable
- validaciones de negocio
- protecciones de seguridad basicas
- pruebas
- documentacion
- criterio UX consistente con el resto de la plataforma

## Regla Hacia Adelante

Desde este punto del proyecto, cualquier modulo nuevo debe nacer siguiendo este documento.

No se considera aceptable abrir un modulo:

- solo con frontend
- solo con tablas
- con formularios permanentes que entorpezcan la lectura
- con codigos tecnicos editables por el usuario comun
- sin documentacion canonica
