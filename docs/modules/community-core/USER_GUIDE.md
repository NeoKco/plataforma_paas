# Community Core User Guide

`community-core` define la base funcional para condominios.

No es necesariamente un modulo operativo visible por si solo. Su valor es dar un modelo consistente a todo lo que depende de:

- residentes
- unidades
- visitas
- vehiculos
- comunidad

## Para que sirve

Sirve para centralizar:

- quien vive en cada unidad
- que visitas estan autorizadas
- que vehiculos pertenecen a residentes
- que comunidad o torre corresponde a cada unidad

## Que evita

Evita que cada modulo cree su propia version de:

- residente
- visita
- departamento o casa
- patente o vehiculo

Eso mejora:

- control de accesos
- reportes
- trazabilidad
- integraciones futuras

## Relacion con otros dominios

- `business-core` puede seguir representando personas, organizaciones y sitios genericos
- `community-core` agrega semantica residencial especifica
- `iot` residencial deberia reutilizar unidad, comunidad y activo
