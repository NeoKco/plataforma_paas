# Business Core Changelog

- Se corrigio la lectura de `Empresas` para excluir por defecto las organizaciones ya usadas como clientes y evitar mezclar cartera comercial con contrapartes operativas.
- Se agrego la ficha de cliente y se renombro la lectura visible de `sites` a `Direcciones`, dejando a Google Maps como salida operativa desde cada direccion.
- La ficha del cliente ahora permite alta, edicion y eliminacion basica de contactos y direcciones sin salir de la misma vista.
- La vista principal de `Clientes` se rehizo para dejar una sola alta desde la esquina superior derecha, mostrar contacto y direccion junto al cliente y permitir busqueda por nombre, RUT, contacto o direccion.
- Se deja `site_code` como identificador tecnico interno, ocultandolo de las pantallas operativas para que no se edite como si fuera un dato de negocio.
- Se corrige el importador legacy para que `reference_notes` no muestre `legacy_client_id` ni otros marcadores tecnicos visibles al usuario.
- La ficha del cliente deja de mostrar formularios abiertos por defecto para contactos y direcciones; ahora esas altas y ediciones se abren solo bajo demanda en modal.

## 2026-04-02

- se crea la documentacion canonica inicial de `business-core`
- se declara como dominio tenant transversal previo a `maintenance`
- se deja explicita su relacion con `projects` e `iot`
- se define la matriz de migracion desde `ieris_app`
- se abre el scaffold inicial del modulo en backend y frontend
- se versiona la primera migracion tenant con `organizations`, `clients`, `contacts` y `sites`
- Se implemento la primera ola backend de `business-core` con CRUD y rutas para `organizations` y `clients`.
- Se agregaron modelos ORM, repositories, services y pruebas de rutas para el primer slice real del dominio compartido.
- Se completo la ola 1 backend con CRUD y rutas para `contacts` y `sites`.
- Se conecto el frontend tenant de `organizations`, `clients`, `contacts` y `sites` contra las APIs reales del modulo.
- Se versiona `0017_business_core_taxonomy` con `function_profiles`, `work_groups` y `task_types`.
- Se implementa la ola 1B backend/frontend para taxonomias compartidas.
- Se deja explicito que membresias de grupos quedan para una ola posterior.
- Se deja el backlog pendiente visible en la documentacion para no perder `assets`, `site_responsibles`, `work_group_members` e integraciones con modulos.
- se agrega el importador inicial [import_ieris_business_core_maintenance.py](/home/felipe/platform_paas/backend/app/scripts/import_ieris_business_core_maintenance.py) para poblar `business-core` desde la BD legacy de `ieris_app`
- se deja explicito que `user_groups` sigue pendiente hasta abrir `business_work_group_members`
- se valida el `dry-run` del importador contra `kanban_db` y el tenant `empresa-bootstrap`
- se ejecuta el importador real sobre `empresa-bootstrap` y se valida idempotencia en segunda corrida
- se agrega un smoke E2E tenant para validar visibilidad real en UI de datos importados de `business-core` sobre `empresa-bootstrap`
