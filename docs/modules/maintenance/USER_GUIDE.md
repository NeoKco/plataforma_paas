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

- ver ordenes de trabajo activas y cerradas
- crear una orden nueva
- editar una orden aun no cerrada
- cambiar estado a `en curso`, `completada` o `anulada` sin perder trazabilidad
- mantener catalogo de tipos de equipo
- mantener instalaciones tecnicas ligadas a sitios del dominio base
- consumir clientes y sitios desde `business-core`
- consultar historial tecnico de ordenes cerradas con cambios de estado y visitas registradas
- programar visitas técnicas ligadas a órdenes de trabajo
- abrir `Mantenciones` desde la ficha del cliente con cliente y dirección ya preseleccionados

## Lo que no entra en el primer corte

- `egresos`
- `CRM`
- `cotizaciones`
- expediente tecnico completo
- agenda integrada
- historial enriquecido por visitas
- evidencias y checklist
- agenda visual con conflictos y reprogramación rica

## Flujo operativo esperado

1. seleccionar cliente
2. elegir sitio
3. elegir instalacion si corresponde
4. programar fecha y hora
5. crear la orden con prioridad y contexto tecnico
6. cambiar estado a `en curso` cuando el trabajo arranca
7. completar o anular la orden dejando observacion o motivo
8. programar o corregir visitas desde agenda técnica
9. revisar despues el historial tecnico con sus cambios de estado y visitas

Tambien deberia funcionar asi:

1. buscar cliente en `Core de negocio`
2. abrir su ficha
3. revisar direccion, contactos e instalaciones asociadas
4. saltar a `Mantenciones` con el contexto del cliente ya cargado

## Mejora funcional recomendada

La version PaaS ya mejora a la actual en estos puntos y todavia tiene mejoras pendientes:

- una mantencion debe quedar ligada a una instalacion concreta cuando exista
- el estado no debe depender de borrar el registro activo
- hoy ya existe una lectura clara de `programada`, `en curso`, `completada` y `anulada`
- sigue pendiente una linea de tiempo tecnica por cliente
- sigue pendiente un flujo mas simple de visitas, evidencias y cierre en terreno

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
