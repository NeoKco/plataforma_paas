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

## Documentación

- se consolidó una convención canónica por módulo/dominio en `docs/modules/`
- `finance` y `platform-core` quedan como referencia para siguientes módulos
