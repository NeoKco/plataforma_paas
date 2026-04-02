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

El primer corte del modulo deberia permitir:

- ver mantenciones activas del periodo
- crear una mantencion nueva
- editar reprogramaciones y asignacion
- cerrar o anular una mantencion sin perder trazabilidad
- consultar historial por cliente
- consumir instalaciones o sitios del dominio base
- consumir equipos o activos del dominio base
- ver sincronizacion con agenda

## Lo que no entra en el primer corte

- `egresos`
- `CRM`
- `cotizaciones`
- expediente tecnico completo

## Flujo operativo esperado

1. seleccionar cliente
2. elegir instalacion o equipo intervenido
3. programar fecha, hora y duracion
4. asignar responsable
5. ejecutar la visita tecnica
6. cerrar la mantencion con resultado, observaciones y evidencia
7. consultar el historial del cliente

## Mejora funcional recomendada

La version PaaS deberia operar mejor que la actual con estas mejoras desde el inicio o muy temprano:

- una mantencion debe quedar ligada a una instalacion concreta cuando exista
- el estado no debe depender de borrar el registro activo
- debe existir una lectura de estados clara: `programada`, `confirmada`, `en ruta`, `en ejecucion`, `completada`, `anulada`
- el cliente deberia tener una linea de tiempo tecnica con instalaciones y mantenciones
- el tecnico deberia poder registrar observaciones de cierre de forma mas simple

## Roles recomendados

Roles operativos sugeridos para el modulo:

- administrador tenant
- coordinador operativo
- tecnico
- lectura/soporte

## Errores comunes que el modulo debe cubrir bien

- superposicion con agenda de otro trabajo
- falta de instalacion asociada cuando el cliente tiene varias
- tipo de equipo inexistente o desactivado
- cierre sin observacion tecnica minima
- intentos de borrar datos con historico asociado

## Relacion con otros modulos

- `finance` reemplaza el antiguo frente de egresos
- `business-core` deberia proveer cliente, empresa, contacto, sitio, grupo y tipo de tarea
- `calendar` debe mostrar ventanas de mantencion
- `projects` deberia reutilizar la misma base de clientes, sitios y responsables
- `iot` deberia reutilizar la misma base de sitios y activos
- `crm` y `cotizaciones` podran integrarse despues, pero no deben bloquear el primer corte
- `expediente tecnico` podra acoplarse luego como extension documental y de evidencias
