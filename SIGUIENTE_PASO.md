# SIGUIENTE_PASO

## Última actualización

- fecha: 2026-04-07
- prioridad vigente: preparar y ejecutar salida real a producción si ya existe host objetivo

## Objetivo del próximo paso

No abrir más trabajo difuso.

El siguiente paso correcto es mover el proyecto desde estado "listo para salir" a estado "publicado y validado en terreno".

## Decisión previa obligatoria

Antes de seguir, la siguiente IA debe responder explícitamente una pregunta:

### ¿Ya existe un host productivo real listo para recibir el deploy?

Solo hay dos respuestas válidas:

- sí
- no

No seguir con ambigüedad.

## Árbol de decisión rápido

### Si la respuesta es `sí`

Entonces el trabajo prioritario es:

1. preflight backend
2. preflight frontend
3. cutover
4. smoke corto de terreno
5. actualización de estado post-producción

### Si la respuesta es `no`

Entonces el trabajo prioritario es:

1. no simular deploy productivo desde este workspace
2. dejar paquete operativo para el host real o
3. retomar backlog residual explícito

## Prioridad inmediata

### 1. Preparar host productivo real

Debe existir un host con esta base:

- `/opt/platform_paas`
- checkout funcional del repo
- virtualenv operativo
- PostgreSQL listo
- `nginx` listo
- `systemd` listo

### 2. Preparar `.env` productivo final

Debe existir:

- `/opt/platform_paas/.env`

Y debe pasar el gate productivo real.

### 3. Ejecutar preflight backend

Correr:

- `deploy/check_backend_release_readiness.sh`

Hasta quedar con cero fallos.

### 4. Ejecutar build y preflight frontend

Correr:

- `deploy/build_frontend.sh`
- `deploy/check_frontend_static_readiness.sh`

Con la URL real de API.

### 5. Ejecutar cutover

Seguir:

- `docs/deploy/production-cutover-checklist.md`

## Orden exacto recomendado

1. leer `PROJECT_CONTEXT.md`
2. leer `ESTADO_ACTUAL.md`
3. leer `REGLAS_IMPLEMENTACION.md`
4. preparar servidor real
5. preparar `.env` productivo
6. correr preflight backend
7. desplegar backend
8. construir frontend con `VITE_API_BASE_URL` real
9. publicar frontend con `nginx`
10. correr smoke corto de terreno
11. actualizar `ESTADO_ACTUAL.md` con resultado real del deploy

## Si todavía no hay servidor productivo

Entonces no corresponde seguir tocando producción como si pudiera cerrarse desde este workspace.

En ese caso, el siguiente paso útil pasa a ser solo uno de estos dos:

### Opción A. Preparar release packet para operador

Dejar listo un paquete claro con:

- pasos exactos
- dominios esperados
- valores de variables necesarias
- checklists de ejecución
- criterios de aceptación

### Opción B. Retomar backlog residual no bloqueante

Solo si producción queda explícitamente pausada.

El backlog residual más lógico para retomar sería:

1. `BusinessCoreDuplicatesPage.tsx`
2. `MaintenanceDueItemsPage.tsx`
3. `MaintenanceOverviewPage.tsx`
4. remanentes editoriales en catálogos `business-core`

## Qué debe actualizar la próxima IA al cerrar

Si completa producción real:

- actualizar `ESTADO_ACTUAL.md`
- reescribir este archivo con nuevo siguiente paso post-producción
- dejar evidencia documental del cutover real

Si no completa producción real:

- declarar bloqueo exacto
- actualizar `ESTADO_ACTUAL.md`
- dejar este archivo apuntando al paso siguiente verdadero, no al deseado

## Qué debe hacer otra IA al retomar

Antes de escribir código, debe decidir primero cuál de estas dos situaciones es la real:

### Escenario 1. Ya existe host productivo

Entonces debe priorizar deploy, preflight y cutover.

### Escenario 2. No existe host productivo todavía

Entonces no debe simular producción; debe dejar listo el paquete operativo o volver al backlog residual explícito.

## Regla de cierre de la próxima iteración

La próxima iteración debe terminar con una de estas dos salidas claras:

### Salida A

- producción realmente ejecutada y validada

### Salida B

- producción todavía no ejecutada, pero con contexto, checklist y estado actualizados sin ambigüedad

No cerrar la próxima iteración con un estado intermedio confuso.

## Regla práctica final

Si la próxima IA no sabe en los primeros minutos si debe desplegar o volver al backlog residual, entonces primero debe actualizar el estado antes de tocar código.

Y si una iteración importante cambia el estado real del proyecto, estos archivos raíz también deben actualizarse antes de cerrar esa iteración.

## Señal de que ya se puede reemplazar este archivo

Este archivo debería reescribirse cuando:

- exista confirmación de host productivo real
- el siguiente paso deje de ser producción
- se complete el cutover y el foco pase a estabilización post-terreno
