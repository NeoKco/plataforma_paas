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
- `GET /tenant/business-core/site-responsibles`
- `POST /tenant/business-core/site-responsibles`
- `PUT /tenant/business-core/site-responsibles/{responsible_id}`
- `DELETE /tenant/business-core/site-responsibles/{responsible_id}`
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

## Flujos operativos frontend ya soportados

Sin abrir endpoints nuevos, la UI tenant ya soporta estos flujos sobre contratos existentes:

- auditoria de duplicados de `organizations`, `clients`, `contacts`, `sites` e `installations`
- sugerencia de ficha a conservar por grupo duplicado
- borrado seguro cuando la ficha no tiene dependencias visibles
- desactivacion segura cuando la ficha ya tiene historial operativo
- consolidacion operativa hacia la ficha sugerida reutilizando `PUT` y `PATCH status` existentes
- resumen previo de consolidacion por grupo antes de ejecutar la accion
- registro persistente de auditoria para merges de `organizations` con diff final y procedencia por campo

Ruta frontend tenant visible:

- `/tenant-portal/business-core/duplicates`
- acceso UI: `Tenant portal -> Core de negocio -> Duplicados`
- acceso rapido adicional: `Tenant portal -> Core de negocio -> Resumen -> Abrir duplicados`
- la pantalla muestra ademas un resumen previo de consolidacion por grupo usando datos ya cargados de `clients`, `contacts`, `sites`, `installations` y `work_orders`
- el merge de `organizations` escribe ademas un ledger persistente en `/tenant/business-core/merge-audits`

Ledger de merges disponible:

- `POST /tenant/business-core/merge-audits`
- `GET /tenant/business-core/merge-audits`

Dependencias que hoy revisa esa auditoria:

- `sites` por `client`
- `installations` por `site`
- `work_orders` por `client`, `site` e `installation`

Limite actual del flujo:

- la consolidacion actual mueve referencias operativas y luego desactiva origenes
- aun no fusiona `contacts`, notas humanas o historiales textuales en una sola ficha final, aunque el merge de `organizations` ya queda trazado en el ledger persistente

Reasignaciones actuales por tipo:

- duplicado de `organization` -> mueve `contacts`, puede consolidar multiples `clients` en una ficha sugerida, integrar campos documentales visibles, reasignar la ficha final y luego desactiva origenes
- la selección manual por campo de `organization` vive hoy en frontend y reutiliza `PUT /tenant/business-core/organizations/{organization_id}` para persistir la ficha final consolidada
- el diff previo por campo también vive en frontend y se calcula sobre datasets ya cargados, sin abrir endpoints nuevos
- duplicado de `client` -> mueve `contacts`, `sites` y `work_orders`
- duplicado de `contact` -> conserva la mejor ficha visible, integra email/telefono/rol faltantes y desactiva equivalentes dentro de la misma `organization`
- duplicado de `site` -> mueve `installations` y `work_orders`
- duplicado de `installation` -> mueve `work_orders`
- cada merge de `organization` persiste un payload con `source_ids`, `summary`, `selections` y `diff_rows`

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

Notas de contrato:

- `client_code` puede seguir apareciendo en respuestas o integraciones tecnicas, pero no debe considerarse editable desde la UI operativa del tenant.
- la capa de servicio lo preserva o lo genera internamente para evitar mutaciones manuales o valores legacy visibles en la captura normal.

### Site summary

Campos minimos de lectura:

- `id`
- `client_id`
- `client_name`
- `name`
- `site_code`
- `commune`
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
