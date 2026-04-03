# Business Core API Reference

Estado actual:

- backend activo para:
  - `organizations`
  - `clients`
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
- `POST /tenant/business-core/function-profiles`
- `GET /tenant/business-core/function-profiles/{function_profile_id}`
- `PUT /tenant/business-core/function-profiles/{function_profile_id}`
- `PATCH /tenant/business-core/function-profiles/{function_profile_id}/status`
- `DELETE /tenant/business-core/function-profiles/{function_profile_id}`
- `GET /tenant/business-core/work-groups`
- `POST /tenant/business-core/work-groups`
- `GET /tenant/business-core/work-groups/{work_group_id}`
- `PUT /tenant/business-core/work-groups/{work_group_id}`
- `PATCH /tenant/business-core/work-groups/{work_group_id}/status`
- `DELETE /tenant/business-core/work-groups/{work_group_id}`
- `GET /tenant/business-core/task-types`
- `POST /tenant/business-core/task-types`
- `GET /tenant/business-core/task-types/{task_type_id}`
- `PUT /tenant/business-core/task-types/{task_type_id}`
- `PATCH /tenant/business-core/task-types/{task_type_id}/status`
- `DELETE /tenant/business-core/task-types/{task_type_id}`

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

Notas de contrato:

- `site_code` sigue existiendo en el modelo por razones tecnicas, pero la UI normal del tenant no deberia exponerlo como editable.
- `reference_notes` debe reservarse para notas humanas visibles al usuario, no para ids o trazas legacy.

### Work group summary

Campos minimos de lectura:

- `id`
- `name`
- `group_kind`
- `member_count`
- `is_active`
