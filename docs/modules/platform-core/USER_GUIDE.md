# Platform Core User Guide

Guía operativa corta del bloque central.

## Para qué sirve

`platform-core` cubre la operación central del PaaS:

- instalar la plataforma
- acceder a `platform_admin`
- crear y gobernar tenants
- revisar provisioning y billing
- administrar usuarios de plataforma
- revisar actividad operativa

## Flujos principales

### Instalar la plataforma

1. completar el instalador inicial
2. crear la base `platform_control`
3. generar la cuenta raíz de operación

Referencia:

- [platform-bootstrap.md](/home/felipe/platform_paas/docs/runbooks/platform-bootstrap.md)

### Operar tenants

1. crear tenant
2. esperar provisioning
3. revisar acceso, billing, maintenance y límites
4. archivar o restaurar cuando corresponda
5. abrir el `tenant_portal` desde `Tenants` cuando el tenant ya esté activo y con DB operativa

Nota operativa:

- la alta de tenant ya no debería quedar desplegada por defecto en la misma pantalla; se abre solo cuando el operador pulsa `Nuevo tenant`

Referencia:

- [tenant-basic-cycle.md](/home/felipe/platform_paas/docs/runbooks/tenant-basic-cycle.md)

### Operar provisioning

Desde `Provisioning`, la operación normal ya permite:

1. ver jobs nuevos creados desde `Tenants`
2. ejecutar manualmente un job `pending` o `retry_pending` si hace falta acelerar el ciclo
3. reencolar un job `failed` cuando ya se corrigió la causa o se quiere reintentar formalmente
4. lanzar `schema auto-sync` para tenants activos después de cambios backend o deploys
5. revisar y reencolar filas DLQ individualmente o en lote cuando la instalación usa backend de provisioning tipo `broker`, incluyendo filtros por texto de error cuando necesites aislar solo una familia de fallos

Referencia:

- [provisioning-guided-test.md](/home/felipe/platform_paas/docs/runbooks/provisioning-guided-test.md)

### Operar usuarios de plataforma

1. alta
2. edición de nombre y rol
3. activación/desactivación
4. reset de contraseña inicial

Nota operativa:

- la creación de usuarios de plataforma también debería abrirse solo bajo demanda desde `Nuevo usuario`, dejando el catálogo como vista principal de lectura
- el catálogo de usuarios debería ocupar el ancho útil completo; la ficha y las acciones del usuario seleccionado deben quedar debajo en un segundo nivel más compacto para evitar huecos visuales innecesarios

Referencia:

- [platform-users-cycle.md](/home/felipe/platform_paas/docs/runbooks/platform-users-cycle.md)

## Errores comunes

### El tenant no está operativo

Revisar:

- estado del tenant
- jobs de provisioning
- si el job quedó `pending`, `retry_pending` o `failed`
- si conviene `Ejecutar ahora`, `Reencolar` o revisar primero la causa técnica
- política de acceso
- lifecycle visible

### No aparece acceso al portal tenant

Revisar:

- que el tenant esté `active`
- que provisioning haya cerrado correctamente
- que la DB tenant haya quedado configurada
- que la política de acceso no lo esté bloqueando

La UI de `Tenants` deja un mensaje explícito cuando el portal todavía no debe abrirse; hoy también queda cubierto por smoke browser para evitar regresiones sobre ese bloqueo.

### Límite de usuarios activos en portal tenant

Si el tenant ya alcanzó el cupo de usuarios activos, `Tenant Portal > Users` bloqueará la creación o reactivación de más cuentas activas y mostrará un mensaje operativo explícito. Este enforcement visible también queda cubierto por smoke browser.

Nota operativa:

- en `Tenant Portal > Usuarios`, la lectura del catálogo queda primero y la creación de un usuario nuevo se abre solo bajo demanda desde `Nuevo usuario`
- la tabla de acciones del usuario tenant ya permite `Editar`, `Activar/Desactivar` y `Eliminar`
- el borrado protege dos casos: no puedes eliminar tu propia cuenta y tampoco al último administrador activo del tenant

### Límite de transacciones en finance

Si el tenant ya alcanzó el cupo efectivo de `finance.entries`, `Tenant Portal > Finance` mostrará el estado `al límite` y bloqueará nuevas transacciones con un mensaje visible. Este enforcement también queda cubierto por smoke browser.

Cuando coinciden a la vez `finance.entries` y `finance.entries.monthly`, el bloqueo operativo prioriza el mensaje del límite total para mantener un criterio consistente de precedencia.

### Límite mensual de transacciones en finance

Si el tenant alcanza el cupo mensual `finance.entries.monthly`, `Tenant Portal > Finance` bloqueará nuevas transacciones del mes actual y mostrará un mensaje operativo explícito. Este enforcement también queda cubierto por smoke browser.

### Límite mensual por tipo en finance

Si el tenant alcanza `finance.entries.monthly.income` o `finance.entries.monthly.expense`, `Tenant Portal > Finance` bloqueará nuevas transacciones del tipo afectado durante el mes actual y mostrará un mensaje operativo explícito. Este enforcement también queda cubierto por smoke browser.

## Referencias útiles

- Arquitectura rápida: [app-quick-guide.md](/home/felipe/platform_paas/docs/architecture/app-quick-guide.md)
- Recorrido funcional: [app-functional-walkthrough.md](/home/felipe/platform_paas/docs/architecture/app-functional-walkthrough.md)
- UX operativa: [platform-admin-operational-ux.md](/home/felipe/platform_paas/docs/architecture/platform-admin-operational-ux.md)
