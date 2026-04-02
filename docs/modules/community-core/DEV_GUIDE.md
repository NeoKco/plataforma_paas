# Community Core Dev Guide

`community-core` es un dominio vertical.

No debe vivir en:

- `platform-core`
- `business-core`

porque esos dominios deben mantenerse mas genericos.

## Cuando corresponde abrirlo

Conviene abrir `community-core` cuando:

- la veta de condominios ya es trabajo real
- existe necesidad de manejar residentes y visitas como primera clase
- futuros modulos dependeran de unidades y comunidades

## Entidades recomendadas

Primer bloque:

- `community_sites`
- `community_sectors`
- `community_units`
- `community_residents`
- `community_resident_unit_links`
- `community_visitors`
- `community_visit_authorizations`
- `community_resident_vehicles`

Segundo bloque:

- `community_staff`
- `community_common_areas`
- `community_reservations`
- `community_packages`

## Relacion con IoT

Para `iot` hay dos opciones sanas:

1. si IoT sera transversal a varios verticales:
   abrir un dominio adicional como `asset-core` o `iot-core-lite`
   para:
   - dispositivos
   - gateways
   - sensores
   - activos monitoreables
   - relaciones activo-sitio

2. si IoT sera primero residencial:
   apoyar el modulo sobre:
   - `community_units`
   - `community_sites`
   - activos enlazados a unidad o zona comun

Mi recomendacion actual:

- no meter telemetria en `business-core`
- no meter residentes ni visitas en `business-core`
- si IoT va en serio, probablemente necesitaras un `asset-core` mas adelante

## Regla para abrir un nuevo core

Un core nuevo se justifica cuando:

- representa un dominio reutilizable
- sera usado por dos o mas modulos
- no calza bien en los cores existentes
- mezclarlo produciria ruido conceptual o tablas forzadas

Ejemplos validos:

- `business-core`
- `community-core`
- `asset-core`

Ejemplos que no conviene abrir como core:

- una sola pantalla
- un catalogo exclusivo de un modulo
- una variacion muy especifica de una sola industria si nadie mas lo reutiliza
