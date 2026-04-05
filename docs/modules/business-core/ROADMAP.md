# Business Core Roadmap

Estado actual:

- `Wave 2 operativa para taxonomias compartidas`
- `Slice operativo de Duplicados ya visible en UI tenant`

Prioridad:

- alta

Motivo:

- `maintenance` depende de este dominio para quedar bien modelado
- `projects` e `iot` se beneficiaran directamente de esta base
- abrir modulos operativos sin este dominio aumentaria duplicacion y deuda

## Fase 0. Definicion del dominio

Estado:

- `Completado`

Entregables:

- nombre del dominio
- frontera con `platform-core`
- lista inicial de entidades compartidas

## Fase 1. Modelo base tenant

Estado:

- `Completado en olas 1A y 1B`

Alcance:

- empresas
- clientes
- contactos
- sitios
- perfiles funcionales
- grupos de trabajo
- tipos de tarea

Subfases recomendadas:

- `1A`: organizaciones, clientes, contactos, sitios
- `1B`: perfiles funcionales, grupos de trabajo, tipos de tarea

## Fase 2. CRUD y permisos base

Estado:

- `Completado en olas 1A y 1B`

Alcance:

- endpoints tenant
- permisos declarativos
- frontend tenant base para catalogos
- inactivacion segura y relaciones protegidas

## Fase 3. Integracion con modulos

Estado:

- `En progreso`

Alcance:

- `maintenance` consume `business-core`
- `projects` nace sobre `business-core`
- `iot` reusa `sites` y `assets`

Pendiente inmediato dentro de esta fase:

- profundizar filtros y agenda de `maintenance` por `work_groups` y `tenant_users`
- enriquecer snapshot historico por responsable usando membresias reales
- definir los siguientes contratos frontend/backend de integracion
- abrir una ola de `organization addresses` si `Empresas` necesita capturar direccion propia de proveedor/partner sin mezclarla con `sites` de clientes
- seguir endureciendo la nueva auditoria de duplicados con heuristicas de merge mas profundas y soporte posterior de consolidacion guiada completa, mas alla de la reasignacion operativa del corte actual

Estado actual del slice `Duplicados`:

- acceso visible desde `Core de negocio -> Duplicados`
- acceso rapido adicional desde `Resumen`
- sugerencia de ficha a conservar por grupo
- desactivacion segura
- consolidacion operativa con resumen previo del impacto
- cobertura actual para `organizations`, `clients`, `contacts`, `sites` e `installations`

## Fase 4. Assets y responsables

Estado:

- `Pendiente`

Alcance:

- `assets`
- tipos de activo
- responsables por sitio
- adopcion por `iot`

Pendiente documentado:

- `business_site_responsibles`
- `business_assets`
- `business_asset_types`

## Riesgos a evitar

- meter clientes y empresas en `platform-core`
- dejar `maintenance` como dueño accidental de sitios o tipos de tarea
- modelar `iot` directo sobre tablas propias de sensores sin resolver antes sitio y activo

## Siguiente paso recomendado

- cerrar la siguiente ola de integracion con `maintenance` sobre responsables reales
- abrir `site_responsibles`
- endurecer el importador inicial desde `ieris_app`
- profundizar la depuracion de duplicados para soportar consolidacion profunda de entidades y no solo reasignacion operativa + desactivacion segura

## Backlog pendiente visible

- `work_group_members`: backend/frontend base listo
- `site_responsibles`: pendiente
- `assets` y `asset_types`: pendiente
- importadores legacy desde `ieris_app`: primer corte listo, falta aplicacion y endurecimiento
- auditoria operativa de duplicados: UI ya lista para `organizations`, `clients`, `contacts`, `sites` e `installations`, con sugerencia de ficha a conservar, consolidacion operativa y desactivacion segura; falta merge/asimilacion profunda guiada
- merge profundo de `organizations` y consolidacion documental de `contacts`: primer corte operativo listo, falta asimilacion guiada completa de múltiples clientes en conflicto
- integración con `projects`: pendiente
- integración con `iot`: pendiente
## Estado actual
- `wave 1 backend` completo:
  - `organizations`: backend CRUD listo
  - `clients`: backend CRUD listo
  - `contacts`: backend CRUD listo
  - `sites`: backend CRUD listo
- `wave 1 frontend` completo:
  - `organizations`: vista tenant operativa
  - `clients`: vista tenant operativa
  - `contacts`: vista tenant operativa
  - `sites`: vista tenant operativa
- `wave 2 backend` completo:
  - `function_profiles`: backend CRUD listo
  - `work_groups`: backend CRUD listo
  - `task_types`: backend CRUD listo
- `wave 2 frontend` completo:
  - `function_profiles`: vista tenant operativa
  - `work_groups`: vista tenant operativa
  - `task_types`: vista tenant operativa
- `wave 2.5 memberships` completo:
  - `business_work_group_members`: migracion tenant lista
  - CRUD tenant listo
  - conteo de miembros visible en `work_groups`
  - gestion de `Miembros` disponible por grupo
- `importador legacy` inicial listo:
  - `organizations`
  - `clients`
  - `contacts`
  - `sites`
  - `function_profiles`
  - `work_groups`
  - `task_types`
- `dry-run` validado:
  - fuente `kanban_db`
  - tenant destino `empresa-bootstrap`
- `--apply` ya ejecutado sobre `empresa-bootstrap`
- idempotencia ya verificada con segunda corrida `dry-run`
