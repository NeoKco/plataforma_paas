# Community Core

Documentacion canonica del dominio vertical para condominios y comunidades residenciales.

Nombre funcional visible sugerido:

- `Core residencial`

Objetivo:

- resolver entidades propias de condominios que no conviene contaminar dentro de `business-core`
- servir como base para control de residentes, visitas, unidades, vehiculos y operacion residencial
- permitir que modulos como `visits`, `iot` residencial o `maintenance` residencial reutilicen el mismo dominio

Nota importante:

- `community-core` no reemplaza `business-core`
- `business-core` sigue siendo la base transversal generica
- `community-core` cubre la veta vertical de condominios

## Alcance inicial recomendado

Primer corte del dominio:

- comunidades o condominios
- torres, bloques o sectores
- unidades residenciales
- residentes
- relaciones residente-unidad
- visitas
- autorizaciones de visita
- vehiculos de residentes

Alcance recomendado despues:

- personal de conserjeria
- proveedores frecuentes
- encomiendas
- espacios comunes y reservas

## Modulos que dependen de este dominio

- `visits`
- `iot` residencial
- `maintenance` cuando opere sobre comunidades
- `reservations` si se abre mas adelante
- `packages` si se abre mas adelante

## Mapa de documentos

- [USER_GUIDE.md](/home/felipe/platform_paas/docs/modules/community-core/USER_GUIDE.md)
- [DEV_GUIDE.md](/home/felipe/platform_paas/docs/modules/community-core/DEV_GUIDE.md)
- [API_REFERENCE.md](/home/felipe/platform_paas/docs/modules/community-core/API_REFERENCE.md)
- [ROADMAP.md](/home/felipe/platform_paas/docs/modules/community-core/ROADMAP.md)
- [CHANGELOG.md](/home/felipe/platform_paas/docs/modules/community-core/CHANGELOG.md)
