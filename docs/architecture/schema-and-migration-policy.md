# Política de Esquema y Migraciones

Esta política define cómo deben cerrarse cambios que afectan estructura de datos en `platform_paas`.

Aplica a:

- `backend/migrations/control/`
- `backend/migrations/tenant/`
- seeds y defaults que dependan de migraciones
- backfills y repairs necesarios para tenants existentes

## Regla madre

Un cambio estructural no se considera cerrado solo porque:

- exista la migración en repo
- pase en tenant nuevo
- haya corrido en local

Debe quedar resuelto en:

- migración versionada
- entorno afectado
- tenants existentes afectados
- documentación y runbook

## Qué requiere un cambio de esquema

Todo cambio de esquema debe evaluar explícitamente:

- migración control o tenant
- backfill
- seed/default nuevo
- convergencia tenant
- impacto en imports/exports
- impacto en E2E y datos demo

## Reglas operativas

### 1. Nada estructural sin migración versionada

Si cambia:

- tabla
- columna
- índice
- constraint
- relación

debe existir migración versionada.

### 2. Nada estructural se cierra sin tenants viejos

Si el cambio afecta tenant DB:

- no basta probar en tenant nuevo
- hay que correr o planificar convergencia para tenants existentes

### 3. Seed y migración no son lo mismo

- la migración cambia estructura
- el seed/default rellena catálogo o configuración

No mezclar ambos conceptos.

### 4. Backfill explícito

Si el cambio requiere poblar datos existentes:

- dejar script o job de backfill
- documentar criterio de aplicación
- documentar evidencia de ejecución

### 5. Recovery y rollback

Toda migración relevante debe considerar:

- qué pasa si falla a mitad de camino
- si el rollback es posible o si el recovery es forward-only

### 6. Cadena tenant por módulo

- la cadena tenant es global y acumulativa
- los módulos nuevos no crean ramas paralelas de migración
- una dependencia nueva entre módulos debe resolverse por orden de la cadena y documentación, no por ejecuciones manuales ad hoc
- desactivar un módulo por contrato no implica borrar ni degradar su esquema

### 7. Política de downgrade

- no existe downgrade destructivo in-place como camino normal
- rollback de código no revierte datos ni migraciones ya aplicadas
- si una migración queda mal aplicada, la corrección debe entrar como:
  - nueva migración reparadora
  - o tooling explícito de convergencia / restore
- no se reescriben migraciones históricas ya promovidas a runtime

## Cierre mínimo

No cerrar un cambio estructural sin:

- migración creada
- evidencia de ejecución
- convergencia tenant cuando aplique
- runbook actualizado si cambia la operación
- changelog del módulo o de `platform-core`
