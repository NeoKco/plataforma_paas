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
6. abrir `Provisioning` desde el mismo tenant cuando necesites leer solo su backlog técnico sin perderte en la cola global
7. usar `Exportar paquete portable` cuando necesites un paquete portable del tenant
8. elegir si el paquete debe salir como:
   - `Paquete completo`
   - `Solo datos funcionales`
9. usar `Simular import portable` y luego `Aplicar import portable` cuando necesites cargar un paquete `zip + manifest + csv` sobre un tenant destino

Nota operativa:

- la alta de tenant ya no debería quedar desplegada por defecto en la misma pantalla; se abre solo cuando el operador pulsa `Nuevo tenant`
- `Nuevo tenant` ahora exige capturar explícitamente:
  - nombre del admin inicial
  - correo del admin inicial
  - contraseña del admin inicial
- para tenants nuevos ya no corresponde asumir un bootstrap fijo tipo `admin@<slug>.local / TenantAdmin123!`
- los módulos del tenant no se habilitan con toggles manuales en el alta; se habilitan por el `plan`
- la misma pantalla ya debe mostrar qué módulos activa el plan seleccionado
- en tenants existentes, el bloque correcto para revisar o cambiar eso es `Plan y módulos`

Referencia:

- [tenant-basic-cycle.md](/home/felipe/platform_paas/docs/runbooks/tenant-basic-cycle.md)
- [tenant-data-portability.md](/home/felipe/platform_paas/docs/runbooks/tenant-data-portability.md)

### Operar provisioning

Desde `Provisioning`, la operación normal ya permite:

1. ver jobs nuevos creados desde `Tenants`
2. ejecutar manualmente un job `pending` o `retry_pending` si hace falta acelerar el ciclo
3. reencolar un job `failed` cuando ya se corrigió la causa o se quiere reintentar formalmente
4. lanzar `schema auto-sync` para tenants activos después de cambios backend o deploys
5. revisar y reencolar filas DLQ individualmente o en lote cuando la instalación usa backend de provisioning tipo `broker`, incluyendo filtros por texto de error cuando necesites aislar solo una familia de fallos
6. revisar snapshots recientes por tenant, alertas operativas persistidas y ciclos recientes del worker para distinguir deuda puntual de degradación sostenida
7. usar `Guiar requeue` sobre una fila DLQ cuando prefieras que la consola te estreche automáticamente tenant, tipo de job y error antes de reencolar
8. llegar desde `Tenants` con `tenantSlug` precargado cuando quieras abrir una lectura ya enfocada en un tenant específico

Referencia:

- [provisioning-guided-test.md](/home/felipe/platform_paas/docs/runbooks/provisioning-guided-test.md)

### Export portable por tenant desde platform admin

Desde `Tenants`, el bloque `Portabilidad tenant` ya permite:

1. generar un export portable `CSV + manifest + zip`
2. elegir `Paquete completo` o `Solo datos funcionales`
3. revisar los últimos jobs de export
4. descargar el `zip` generado

### Export portable por tenant desde tenant portal

Desde `Tenant Portal > Resumen técnico`, el bloque `Portabilidad tenant` ya permite, para admin tenant:

1. generar un export portable `CSV + manifest + zip`
2. elegir `Paquete completo` o `Solo datos funcionales`
3. revisar los últimos jobs de export
4. descargar el `zip` generado

Regla operativa:

- esto no reemplaza `pg_dump`
- si el tenant todavía no tiene `db_configured=true`, el export no se puede generar

### Import portable por tenant

Desde `Tenants` o `Tenant Portal > Resumen técnico`, el bloque `Import portable controlado` ya permite:

1. cargar un paquete `zip` exportado por la plataforma
2. ejecutar `dry_run`
3. revisar el historial reciente de imports
4. ejecutar `apply` explícito si el `dry_run` fue correcto

Reglas operativas:

- el tenant destino debe estar provisionado
- el tenant destino no puede estar `archived`
- el paquete debe traer `manifest.json`
- el import valida checksums y `schema_version`
- el paquete puede venir como `portable_full`, `functional_data_only` o `portable_minimum` heredado
- la estrategia actual es `skip_existing`
- la importación no reemplaza registros ya existentes

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

Secuencia corta para dejar un tenant nuevo operativo:

1. crear el tenant
2. revisar su job en `Provisioning`
3. si queda `pending` o `retry_pending`, ejecutar o reencolar
4. si el job quedó `completed` pero la DB sigue incompleta, usar `Reprovisionar tenant`
5. si la DB existe pero el esquema está atrasado, correr `schema auto-sync`
6. volver a `Tenants` y confirmar `status=active` + `db_configured=true`
7. recién ahí deben aparecer `Archivar tenant` y `Abrir portal tenant`

### Límite de usuarios activos en portal tenant

Si el tenant ya alcanzó el cupo de usuarios activos, `Tenant Portal > Users` bloqueará la creación o reactivación de más cuentas activas y mostrará un mensaje operativo explícito. Este enforcement visible también queda cubierto por smoke browser.

Nota operativa:

- en `Tenant Portal > Usuarios`, la lectura del catálogo queda primero y la creación de un usuario nuevo se abre solo bajo demanda desde `Nuevo usuario`
- la tabla de acciones del usuario tenant ya permite `Editar`, `Activar/Desactivar` y `Eliminar`
- el borrado protege dos casos: no puedes eliminar tu propia cuenta y tampoco al último administrador activo del tenant
- en `Tenant Portal > Usuarios` ahora también se configura la zona horaria operativa:
  - arriba se define la zona por defecto del tenant
  - en cada usuario puedes dejar que herede esa zona o aplicar una preferencia puntual
  - la lectura/captura de fechas del portal usa esa zona efectiva

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
