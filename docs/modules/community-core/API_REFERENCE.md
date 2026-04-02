# Community Core API Reference

Todavia no existe API implementada para `community-core`.

Referencia objetivo de primer corte:

- `GET /tenant/community-core/sites`
- `GET /tenant/community-core/units`
- `GET /tenant/community-core/residents`
- `POST /tenant/community-core/residents`
- `GET /tenant/community-core/visits`
- `POST /tenant/community-core/visit-authorizations`
- `GET /tenant/community-core/vehicles`

Regla de diseño:

- los modulos de visitas o acceso deben leer ids de unidad, residente y autorizacion desde `community-core`
- no conviene duplicar estas entidades dentro del modulo operativo que las consuma
