# Business Core Roadmap

Estado actual:

- `Diseno inicial del dominio completado`

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

- `En progreso`

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

- `Completado en ola 1 para organizations, clients, contacts y sites`

Alcance:

- endpoints tenant
- permisos declarativos
- frontend tenant base para catalogos
- inactivacion segura y relaciones protegidas

## Fase 3. Integracion con modulos

Estado:

- `Pendiente`

Alcance:

- `maintenance` consume `business-core`
- `projects` nace sobre `business-core`
- `iot` reusa `sites` y `assets`

## Fase 4. Assets y responsables

Estado:

- `Pendiente`

Alcance:

- `assets`
- tipos de activo
- responsables por sitio
- adopcion por `iot`

## Riesgos a evitar

- meter clientes y empresas en `platform-core`
- dejar `maintenance` como dueño accidental de sitios o tipos de tarea
- modelar `iot` directo sobre tablas propias de sensores sin resolver antes sitio y activo

## Siguiente paso recomendado

- abrir el slice real de `business-core`
- empezar por `organizations`, `clients`, `contacts` y `sites`
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
