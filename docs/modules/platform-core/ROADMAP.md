# Platform Core Roadmap

Estado del bloque central.

## Estado actual

La base central ya es operable:

- instalador
- `platform_admin`
- users de plataforma
- tenants
- provisioning
- billing
- activity
- acceso tenant

## Cerrado

- instalación inicial reproducible
- auth `platform` y `tenant`
- DB de control + DB tenant
- lifecycle tenant base
- UI visible de platform admin
- primer stack E2E browser base
- smoke browser de `platform_admin` para `create`, `archive` y `restore`
- validación browser del acceso rápido desde `Tenants` hacia `tenant_portal` con `slug` precargado
- validación browser del bloqueo visible del acceso rápido al `tenant_portal` cuando el tenant aún no es elegible
- validación browser de aparición de jobs nuevos en `Provisioning`
- validación browser de ejecución manual de jobs `pending` desde `Provisioning`
- validación browser de requeue de jobs `failed` desde `Provisioning`
- validación browser del disparo de `schema auto-sync` desde `Provisioning`
- validación browser broker-only de requeue individual sobre filas DLQ desde `Provisioning`
- validación browser broker-only de requeue batch sobre filas DLQ filtradas desde `Provisioning`
- validación browser broker-only de filtros finos DLQ por texto de error y opciones de requeue desde `Provisioning`
- validación browser de enforcement visible de límites de usuarios activos en `tenant_portal`
- validación browser de enforcement visible de límites de `finance` en `tenant_portal`
- validación browser de precedencia visible de `finance.entries` sobre `finance.entries.monthly` en `tenant_portal`
- validación browser del bloqueo mensual de `finance.entries.monthly` en `tenant_portal`
- validación browser del bloqueo mensual por tipo de `finance.entries.monthly.income` y `finance.entries.monthly.expense` en `tenant_portal`

## Próximo nivel recomendado

- ampliar E2E browser a acceso tenant más profundo tras el salto desde `Tenants`, y a DLQ individual/filtros más finos
- más regresión sobre provisioning y billing
- seguir endureciendo copy, validaciones y observabilidad visible
- mantener la política documental canónica al abrir más dominios

## Deuda técnica visible

- algunos recorridos siguen mejor cubiertos por backend tests que por browser E2E
- la documentación central era abundante pero estaba dispersa; ya quedó indexada, pero aún puede seguir normalizándose

## Regla futura

Todo módulo o dominio nuevo debe salir con:

- carpeta en `docs/modules/<module>/`
- `README`
- `USER_GUIDE`
- `DEV_GUIDE`
- `ROADMAP`
- `CHANGELOG`
- `API_REFERENCE` cuando aplique
