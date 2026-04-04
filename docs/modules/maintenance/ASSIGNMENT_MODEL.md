# Maintenance Assignment Model

Modelo canónico para asignar mantenciones a grupos y usuarios, tomando como referencia la operacion real de `ieris_app` pero mejorando su estructura para el PaaS.

## Objetivo

Resolver esta necesidad operativa real:

- un usuario tenant puede tener `perfil funcional`
- un usuario tenant puede pertenecer a uno o mas `grupos`
- una mantencion puede asignarse a un `grupo`
- una mantencion o visita puede terminar asignada a un `usuario` concreto

En el PaaS esto no deberia resolverse con texto libre ni mezclando permisos del sistema con roles funcionales.

Estado actual:

- `business_work_group_members` ya existe como tabla y CRUD tenant
- `maintenance_work_orders` ya usa `assigned_work_group_id`
- `maintenance_visits` ya usa `assigned_work_group_id`
- la UI de `Mantenciones` y `Agenda` ya permite asignar `grupo` y `usuario`
- `assigned_group_label` queda como compatibilidad temporal para legacy/importacion

## Regla conceptual base

- `tenant user` define quien puede entrar al tenant
- `function profile` define que hace esa persona en la operacion
- `work group` define a que equipo pertenece
- `maintenance work order` define a quien se planifica el trabajo
- `maintenance visit` define quien ejecuta realmente el trabajo en terreno

Resumen corto:

- el `grupo` planifica
- el `usuario` ejecuta
- el `perfil funcional` clasifica y habilita

## Diferencia entre permiso, perfil y grupo

No deberian confundirse estas capas:

- `role` del usuario tenant
  permiso de sistema
  ejemplos: `administrador`, `operador`
- `function_profile`
  rol funcional de negocio
  ejemplos: `tecnico`, `lider tecnico`, `secretaria`, `supervisor`
- `work_group`
  equipo operativo
  ejemplos: `sst norte`, `mantenciones 1`, `instalaciones`

`function_profile` no reemplaza permisos.

`work_group` no reemplaza `function_profile`.

## Modelo recomendado

### 1. Tenant users

Tabla ya existente:

- `tenant_users`

Deberia seguir siendo dueña de:

- identidad de acceso
- email
- estado
- zona horaria
- rol de sistema

No deberia intentar absorber toda la operacion de grupos dentro de la misma tabla.

### 2. Function profiles

Tabla ya existente:

- `business_function_profiles`

Uso recomendado:

- describir la funcion operativa principal del usuario
- filtrar a quien se le puede asignar cierto tipo de trabajo
- enriquecer lectura de agenda y mantenciones

Ejemplos:

- `tecnico`
- `lider tecnico`
- `supervisor`
- `secretaria`
- `vendedor`

### 3. Work groups

Tabla ya existente:

- `business_work_groups`

Uso recomendado:

- representar equipos reutilizables entre `maintenance`, `projects` e incluso `iot`
- permitir agenda por grupo
- permitir carga de trabajo por grupo

### 4. Membership real

Tabla ya abierta:

- `business_work_group_members`

Campos recomendados:

- `id`
- `group_id`
- `tenant_user_id`
- `function_profile_id`
- `is_primary`
- `is_lead`
- `is_active`
- `starts_at`
- `ends_at`
- `notes`

Reglas recomendadas:

- un usuario puede pertenecer a varios grupos
- uno de esos grupos puede ser `principal`
- la membresia puede guardar `function_profile_id`
- la membresia puede marcar `lider`

## Donde vive la asignacion en mantenciones

### Nivel 1. Orden de trabajo

Tabla:

- `maintenance_work_orders`

Campos recomendados:

- `assigned_work_group_id`
- `assigned_tenant_user_id`
- `requested_function_profile_id`

Uso:

- representa la planificacion del trabajo
- permite decir que la orden le corresponde a un grupo
- permite dejar un tecnico concreto si ya esta definido

### Nivel 2. Visita tecnica

Tabla:

- `maintenance_visits`

Campos recomendados:

- `assigned_work_group_id`
- `assigned_tenant_user_id`

Uso:

- representa quien ejecuta realmente la salida a terreno
- una orden puede tener varias visitas
- cada visita puede cambiar de tecnico o grupo sin romper el historico de la orden

## Regla operativa recomendada

Casos esperados:

- si solo sabes que equipo ira
  asignas `grupo`
- si ya sabes quien ira
  asignas `usuario`
- si conoces ambos
  asignas `grupo` a la orden y `usuario` a la visita

Resultado:

- la orden conserva contexto de planificacion
- la visita conserva contexto de ejecucion real
- el historial queda mas confiable

## Lo que no conviene hacer

- no usar `assigned_group_label` como solucion final
- no usar `function_profile` como sustituto de `grupo`
- no dejar una mantencion cerrada sin snapshot de responsable
- no mezclar permisos de sistema con perfil funcional

`assigned_group_label` puede mantenerse solo como compatibilidad temporal para datos importados o transicion.

## UX recomendada

### Usuarios tenant

Cada usuario deberia poder mostrar:

- nombre
- email
- rol de sistema
- perfil funcional principal
- grupo principal
- grupos adicionales

### Nueva mantencion

La captura deberia poder resolver:

- cliente
- direccion
- instalacion
- tipo de tarea
- grupo responsable
- tecnico responsable opcional

### Agenda

La agenda deberia permitir:

- filtrar por grupo
- filtrar por tecnico
- crear mantencion desde un dia del calendario
- reasignar grupo o tecnico sin romper el historico

### Historial

El historial deberia congelar:

- grupo asignado al momento de ejecutar
- tecnico asignado al momento de ejecutar
- hora real de visita
- hora real de cierre

## Orden recomendado de implementacion

1. `business_work_group_members`: completado
2. extender lectura de `tenant_users` con perfil funcional y grupos: pendiente parcial
3. FKs reales en `maintenance_work_orders`: completado
4. FKs reales en `maintenance_visits`: completado
5. `assigned_group_label` como compatibilidad temporal: completado
6. mover agenda a filtros por `grupo` y `tecnico`: pendiente
7. congelar snapshot de responsables al cerrar: siguiente ola

## Resultado esperado

Con este modelo:

- se conserva la funcionalidad util de `ieris_app`
- se mejora la trazabilidad
- se evita mezclar identidad, permisos y operacion
- `maintenance` queda listo para crecer sin rehacer asignaciones mas adelante
