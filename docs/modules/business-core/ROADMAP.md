# Business Core Roadmap

Estado actual:

- `Wave 2 operativa para taxonomias compartidas`
- `Slice operativo de Duplicados ya visible en UI tenant`
- `Slice de assets y asset_types implementado`
- `Importador legacy endurecido para sanear texto visible`
- `Importador legacy revalidado en runtime sobre empresa-bootstrap`

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
- `Bootstrap default reforzado`: perfiles funcionales y tipos de tarea base ya pueden sembrarse automáticamente cuando el tenant habilita `core`
- `Bootstrap contractual publicado`: ese baseline ya quedó desplegado y validado operativamente en `staging`

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
- cerrar la primera ola de `organization addresses` para `Empresas` sin mezclarla con `sites` de clientes
- seguir endureciendo la nueva auditoria de duplicados con heuristicas de merge mas profundas y soporte posterior de consolidacion guiada completa, mas alla de la reasignacion operativa del corte actual

Estado actual del slice `Duplicados`:

- acceso visible desde `Core de negocio -> Duplicados`
- acceso rapido adicional desde `Resumen`
- sugerencia de ficha a conservar por grupo
- desactivacion segura
- consolidacion operativa con resumen previo del impacto
- historial visible reciente de consolidaciones
- cobertura actual para `organizations`, `clients`, `contacts`, `sites` e `installations`
- auditoría persistente ya visible para merges de `organizations`, `clients`, `contacts`, `sites` e `installations`
- `clients` ya cuenta además con ajuste manual previo y diff visible para `service_status` y `commercial_notes`
- `sites` ya cuenta además con ajuste manual previo y diff visible para dirección visible y notas de referencia
- `contacts` ya cuenta además con ajuste manual previo y diff visible por campo antes de consolidar
- `installations` ya cuenta además con ajuste manual previo y diff visible para identidad técnica y notas visibles antes de consolidar
- el historial visible ya aprovecha `diff_rows` y `selections` cuando existen para explicar cambios documentales relevantes sin depender solo del resumen plano

## Fase 4. Assets y adopcion

Estado:

- `En progreso`

Alcance:

- `assets`
- tipos de activo
- adopcion por `iot`

Pendiente documentado:

- `business_assets`
- `business_asset_types`
- `business_organization_addresses`

Completado recientemente:

- `business_asset_types`: tabla, API, vista administrativa y migracion tenant
- `business_assets`: tabla, API, vista administrativa y migracion tenant
- `business_organization_addresses`: primera ola de direccion propia para empresas/proveedores
- adopcion visible de `assets` por `maintenance`:
  - `Maintenance -> Instalaciones` ya puede abrir `Activos` con foco contextual del mismo sitio
  - `BusinessCoreAssetsPage` ya ofrece búsqueda contextual, filtro por estado, métricas visibles y retorno rápido a `Instalaciones`
  - el expediente técnico de instalación ya muestra resumen y CTA a inventario completo del sitio
- adopcion visible de `assets` fuera de `maintenance`:
  - `BusinessCoreClientDetailPage` ya resume activos por dirección/sitio dentro de la ficha del cliente
  - cada dirección ya expone conteo visible de activos, activos/inactivos y cantidad de tipos presentes
  - la ficha ya deja CTA `Activos sitio` hacia inventario filtrado del mismo sitio
  - `BusinessCoreOverviewPage` ya expone una señal rápida de inventario reusable en `Resumen`, con métricas vivas y top de sitios con activos visibles
  - `BusinessCoreClientsPage` ya muestra señal rápida de inventario por cliente, con conteo visible y CTA contextual al sitio con activos

## Riesgos a evitar

- meter clientes y empresas en `platform-core`
- dejar `maintenance` como dueño accidental de sitios o tipos de tarea
- modelar `iot` directo sobre tablas propias de sensores sin resolver antes sitio y activo

## Siguiente paso recomendado

- backlog transversal de mejoras sugeridas en [../improvements/README.md](/home/felipe/platform_paas/docs/modules/improvements/README.md)
- profundizar la adopcion de `assets` por `iot`
- endurecer el importador inicial desde `ieris_app`
- profundizar la adopcion visible de `assets` fuera de `maintenance`, reutilizando mejor contratos con `iot` o una lectura operacional todavía más rica sobre cartera/identidad
- profundizar la depuracion de duplicados hacia otras entidades para soportar consolidacion guiada/documental más allá del caso ya enriquecido de `organizations`, `clients`, `contacts`, `sites` e `installations`

## Backlog pendiente visible

- `work_group_members`: backend/frontend base listo
- `assets` y `asset_types`: completado
- importadores legacy desde `ieris_app`: primer corte listo, falta aplicacion y endurecimiento
- `organization addresses`: primera ola visible ya alineada con captura estructurada y salida operativa a mapa
- auditoria operativa de duplicados: UI ya lista para `organizations`, `clients`, `contacts`, `sites` e `installations`, con sugerencia de ficha a conservar, consolidacion operativa y desactivacion segura; falta merge/asimilacion profunda guiada
- historial visible de merges: listo para las consolidaciones operativas base del slice
- merge profundo de `organizations` y consolidacion documental de `contacts`, `sites` e `installations`: ya resuelve asimilacion guiada de múltiples clientes en conflicto, integra campos visibles base, permite selección manual por campo, expone diff final previo y registra una auditoria persistente del merge; falta criterio documental profundo y fusión manual asistida de identidad completa para el resto de las entidades
- integración con `projects`: pendiente
- integración con `iot`: pendiente

## Baseline sembrado por default

Cuando un tenant nuevo nace con `core` habilitado, o cuando un tenant activo gana `core` por cambio de plan sin reprovisionar la DB, el bootstrap ya puede asegurar:

- perfiles funcionales:
  - `tecnico`
  - `lider`
  - `administrativo`
  - `vendedor`
  - `otro`
  - `supervisor`
- tipos de tarea:
  - `mantencion`
  - `instalacion`
  - `tareas generales`
  - `ventas`
  - `administracion`
- compatibilidad base `task_type -> function_profiles` para que `maintenance` no parta sin taxonomía operativa mínima
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
- saneamiento visible reforzado:
  - notas/descripciones importadas ya limpian `legacy_*` antes de persistirse en `business-core` y `maintenance`
  - placeholders heredados visibles no deben quedar como lectura operativa final
  - la verificación post-import ya quedó alineada con la fuente real `empresa + clientes` para `organizations`
  - revalidación runtime 2026-04-20:
    - `staging` apply completa `10` `work_orders/status_logs/visits` históricos faltantes en `empresa-bootstrap`
    - `production` apply revalida saneamiento visible sobre `empresa-bootstrap` con `matches=true`
- `dry-run` validado:
  - fuente `kanban_db`
  - tenant destino `empresa-bootstrap`
- `--apply` ya ejecutado sobre `empresa-bootstrap`
- idempotencia ya verificada con segunda corrida `dry-run`
