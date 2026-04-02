# Business Core API Reference

Todavia no existe API implementada para `business-core`.

Referencia objetivo de primer corte:

- `GET /tenant/business-core/clients`
- `POST /tenant/business-core/clients`
- `PATCH /tenant/business-core/clients/{client_id}`
- `GET /tenant/business-core/organizations`
- `GET /tenant/business-core/contacts`
- `GET /tenant/business-core/sites`
- `GET /tenant/business-core/function-profiles`
- `GET /tenant/business-core/work-groups`
- `GET /tenant/business-core/task-types`

Referencia objetivo de segundo corte:

- `GET /tenant/business-core/assets`
- `POST /tenant/business-core/assets`
- `PATCH /tenant/business-core/assets/{asset_id}`

Regla de diseño:

- las APIs de modulos funcionales deben referenciar ids del `business-core`
- no deben inventar sus propias tablas paralelas para cliente, sitio o responsable
