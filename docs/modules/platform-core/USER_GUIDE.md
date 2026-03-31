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

Referencia:

- [tenant-basic-cycle.md](/home/felipe/platform_paas/docs/runbooks/tenant-basic-cycle.md)

### Operar provisioning

Desde `Provisioning`, la operación normal ya permite:

1. ver jobs nuevos creados desde `Tenants`
2. ejecutar manualmente un job `pending` o `retry_pending` si hace falta acelerar el ciclo
3. reencolar un job `failed` cuando ya se corrigió la causa o se quiere reintentar formalmente
4. lanzar `schema auto-sync` para tenants activos después de cambios backend o deploys
5. revisar y reencolar filas DLQ cuando la instalación usa backend de provisioning tipo `broker`

Referencia:

- [provisioning-guided-test.md](/home/felipe/platform_paas/docs/runbooks/provisioning-guided-test.md)

### Operar usuarios de plataforma

1. alta
2. edición de nombre y rol
3. activación/desactivación
4. reset de contraseña inicial

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
- que la política de acceso no lo esté bloqueando

## Referencias útiles

- Arquitectura rápida: [app-quick-guide.md](/home/felipe/platform_paas/docs/architecture/app-quick-guide.md)
- Recorrido funcional: [app-functional-walkthrough.md](/home/felipe/platform_paas/docs/architecture/app-functional-walkthrough.md)
- UX operativa: [platform-admin-operational-ux.md](/home/felipe/platform_paas/docs/architecture/platform-admin-operational-ux.md)
