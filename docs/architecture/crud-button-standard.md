# Estandar de Botones CRUD

Este documento fija el estandar visual y operativo para botones CRUD en `platform_paas`.

La referencia base es la UX ya consolidada en `business-core`.

Debe leerse junto con:

- [Estandar de construccion de modulos](./module-build-standard.md)
- [Convencion modular por slice](./module-slice-convention.md)
- [UX operativa de platform admin](./platform-admin-operational-ux.md)

## Principio General

La vista principal debe priorizar lectura.

La creacion y la edicion no deben quedar desplegadas por defecto.

La regla oficial es:

- el usuario entra primero a leer
- luego decide crear, editar, ver o eliminar
- la accion abre modal, drawer o vista secundaria solo cuando la pide

## Boton Primario de Creacion

El boton de alta vive en el header superior derecho de la pantalla.

Reglas:

- estilo: `btn btn-primary`
- ubicacion: acciones del `PageHeader`
- apertura: modal o flujo bajo demanda
- nunca dejar el formulario abierto por defecto al lado de la tabla

### Naming

Usar nombre operativo y directo.

Ejemplos correctos:

- `Nuevo cliente`
- `Nueva cuenta`
- `Nuevo préstamo`
- `Nuevo presupuesto`
- `Nuevo usuario`
- `Nuevo tenant`
- `Registrar transacción`

Regla practica:

- usar `Nuevo/Nueva` para catalogos o entidades base
- usar `Registrar` para movimientos operativos o transaccionales

## Botones de Tabla

La columna de acciones debe usar una jerarquia consistente.

### Ver

- estilo: `btn btn-sm btn-outline-secondary`
- nombre: `Ver`
- comportamiento: abre detalle en modal o vista secundaria

### Editar

- estilo: `btn btn-sm btn-outline-primary`
- nombre: `Editar`
- comportamiento: abre formulario en modal o drawer

### Acciones operativas secundarias

Ejemplos:

- `Adjuntar`
- `Agendar`
- `Exportar`
- `Activar`
- `Desactivar`

Estilo recomendado:

- `btn btn-sm btn-outline-secondary`

Si la accion tiene semantica positiva clara, se puede usar:

- `btn btn-sm btn-outline-success`

## Botones de Riesgo

Ejemplos:

- `Eliminar`
- `Anular`
- `Revertir`

Reglas:

- estilo: `btn btn-sm btn-outline-danger`
- confirmar cuando la accion cambia estado sensible o elimina datos
- el backend debe validar reglas criticas aunque el boton exista

## Modales CRUD

### Alta principal

- usar modal ancho
- encabezado claro
- formulario por bloques o grillas
- evitar una sola columna infinita en escritorio

### Edicion puntual

- usar modal compacto o modal ancho segun densidad
- no duplicar campos tecnicos internos
- no exponer `legacy_*`, codigos internos o ids de importacion

### Lectura de detalle

- `Ver` debe mostrar lectura util, no otro formulario disfrazado
- si la vista tiene adjuntos, auditoria o acciones laterales, el detalle puede ser modal ancho

## Regla de CRUD Completo

Todo CRUD nuevo debe cerrar al menos:

- listado legible
- busqueda y filtros si el volumen lo justifica
- `Nuevo` bajo demanda
- `Editar` bajo demanda
- `Ver` cuando el dominio necesite ficha o trazabilidad
- `Eliminar` o `Desactivar` segun el riesgo funcional

## Errores a Evitar

- dejar formulario abierto por defecto encima de la tabla
- usar `Crear registro` como texto generico cuando el dominio pide nombre concreto
- mezclar `Ver` con `Editar`
- usar botones primarios para todo
- mostrar ids, codigos legacy o metadata tecnica en acciones comunes

## Patron Ya Aplicado

Este estandar ya se usa en:

- `business-core`
- `platform_admin` para `tenants` y `usuarios de plataforma`
- `tenant users`
- `finance` en `Movimientos`, `Presupuestos`, `Préstamos`, `Cuentas`, `Categorías`, `Catálogos auxiliares` y `Configuración`
