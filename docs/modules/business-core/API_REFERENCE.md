# Business Core API Reference

Estado actual:

- backend activo para:
  - `organizations`
  - `clients`
- pendiente para:
  - `contacts`
  - `sites`
  - `function_profiles`
  - `work_groups`
  - `task_types`

## Endpoints implementados

- `GET /tenant/business-core/clients`
- `POST /tenant/business-core/clients`
- `GET /tenant/business-core/clients/{client_id}`
- `PUT /tenant/business-core/clients/{client_id}`
- `PATCH /tenant/business-core/clients/{client_id}/status`
- `DELETE /tenant/business-core/clients/{client_id}`
- `GET /tenant/business-core/organizations`
- `POST /tenant/business-core/organizations`
- `GET /tenant/business-core/organizations/{organization_id}`
- `PUT /tenant/business-core/organizations/{organization_id}`
- `PATCH /tenant/business-core/organizations/{organization_id}/status`
- `DELETE /tenant/business-core/organizations/{organization_id}`

## Endpoints objetivo del siguiente corte

- `GET /tenant/business-core/contacts`
- `POST /tenant/business-core/contacts`
- `GET /tenant/business-core/contacts/{contact_id}`
- `PUT /tenant/business-core/contacts/{contact_id}`
- `PATCH /tenant/business-core/contacts/{contact_id}/status`
- `DELETE /tenant/business-core/contacts/{contact_id}`
- `GET /tenant/business-core/sites`
- `POST /tenant/business-core/sites`
- `GET /tenant/business-core/sites/{site_id}`
- `PUT /tenant/business-core/sites/{site_id}`
- `PATCH /tenant/business-core/sites/{site_id}/status`
- `DELETE /tenant/business-core/sites/{site_id}`
- `GET /tenant/business-core/function-profiles`
- `GET /tenant/business-core/work-groups`
- `GET /tenant/business-core/task-types`

## Segundo corte sugerido

- `GET /tenant/business-core/assets`
- `POST /tenant/business-core/assets`
- `PATCH /tenant/business-core/assets/{asset_id}`

Regla de diseño:

- las APIs de modulos funcionales deben referenciar ids del `business-core`
- no deben inventar sus propias tablas paralelas para cliente, sitio o responsable

## Contratos minimos sugeridos

### Client summary

Campos minimos de lectura:

- `id`
- `organization_id`
- `organization_name`
- `client_code`
- `service_status`
- `is_active`

### Site summary

Campos minimos de lectura:

- `id`
- `client_id`
- `client_name`
- `name`
- `site_code`
- `city`
- `region`
- `is_active`

### Work group summary

Campos minimos de lectura:

- `id`
- `name`
- `group_kind`
- `member_count`
- `is_active`
