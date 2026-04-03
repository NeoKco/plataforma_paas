# Platform Core Changelog

Resumen curado del bloque central.

## Base cerrada

- instalador web operativo
- base `platform_control`
- cuenta raíz de plataforma
- autenticación y separación por scope
- DB dinámica por tenant

## Operación visible

- `platform_admin` con dashboard, tenants, provisioning, billing, settings y actividad
- gestión de usuarios de plataforma
- ciclo base de tenants desde UI

## Endurecimiento

- política de lifecycle más explícita
- matriz de permisos visible
- actividad operativa
- exportaciones operativas en varias vistas
- primer stack Playwright browser base
- smoke browser de `platform_admin` ampliado a `create`, `archive` y `restore` de tenants
- smoke browser ampliado para validar acceso rápido desde `Tenants` al login de `tenant_portal`
- smoke browser ampliado para validar el bloqueo visible del acceso rápido al `tenant_portal` cuando el tenant todavía no es elegible
- smoke browser ampliado para verificar que los jobs nuevos aparezcan en `Provisioning`
- smoke browser ampliado para ejecutar manualmente jobs `pending` desde `Provisioning`
- smoke browser ampliado para validar enforcement visible de límites de usuarios activos en `tenant_portal`
- smoke browser ampliado para validar enforcement visible de límites de `finance` en `tenant_portal`
- smoke browser ampliado para reencolar jobs `failed` desde `Provisioning`
- smoke browser ampliado para disparar `schema auto-sync` desde `Provisioning`
- smoke browser broker-only agregado para reencolar individualmente filas DLQ desde `Provisioning`
- smoke browser broker-only agregado para reencolar en lote filas DLQ filtradas desde `Provisioning`
- smoke browser broker-only agregado para validar filtros DLQ por texto de error y opciones visibles de requeue individual
- baseline E2E tenant actualizado y validado sobre `empresa-bootstrap` en vez de `empresa-demo`
- smokes browser de límites tenant endurecidos para fijar y limpiar overrides por control DB
- enforcement backend agregado al endpoint moderno de creación de transacciones `finance` para respetar `finance.entries`
- smoke browser agregado para validar precedencia visible de `finance.entries` sobre `finance.entries.monthly` en `tenant_portal`
- smoke browser agregado para validar bloqueo mensual de `finance.entries.monthly` en `tenant_portal`
- smoke browser agregado para validar bloqueo mensual por tipo de `finance.entries.monthly.income` y `finance.entries.monthly.expense` en `tenant_portal`
- smoke browser agregado para validar cuentas y categorías `finance` con `create`, `deactivate` y `delete` en `tenant_portal`
- smoke browser agregado para validar presupuestos `finance` con alta mensual y clonación al mes visible en `tenant_portal`
- smoke browser agregado para validar préstamos `finance` con alta y pago simple de cuota en `tenant_portal`
- smoke browser agregado para validar préstamos `finance` con pago en lote y reversa en lote sobre cuotas seleccionadas
- baseline de permisos tenant corregido para incluir acceso `maintenance` en roles operativos que ya navegan ese módulo dentro de `tenant_portal`

## Documentación

- se consolidó una convención canónica por módulo/dominio en `docs/modules/`
- `finance` y `platform-core` quedan como referencia para siguientes módulos
