# Business Core Roadmap

Estado actual:

- `Descubrimiento y definicion inicial`

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

- `Pendiente`

Alcance:

- empresas
- clientes
- contactos
- sitios
- perfiles funcionales
- grupos de trabajo
- tipos de tarea

## Fase 2. CRUD y permisos base

Estado:

- `Pendiente`

Alcance:

- endpoints tenant
- permisos declarativos
- frontend tenant base para catalogos

## Fase 3. Integracion con modulos

Estado:

- `Pendiente`

Alcance:

- `maintenance` consume `business-core`
- `projects` nace sobre `business-core`
- `iot` reusa `sites` y `assets`

## Riesgos a evitar

- meter clientes y empresas en `platform-core`
- dejar `maintenance` como dueño accidental de sitios o tipos de tarea
- modelar `iot` directo sobre tablas propias de sensores sin resolver antes sitio y activo

## Siguiente paso recomendado

- convertir `business-core` en el siguiente slice tenant antes de seguir con `maintenance`
