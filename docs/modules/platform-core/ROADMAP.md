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
- validación browser de aparición de jobs nuevos en `Provisioning`
- validación browser de ejecución manual de jobs `pending` desde `Provisioning`
- validación browser de requeue de jobs `failed` desde `Provisioning`
- validación browser del disparo de `schema auto-sync` desde `Provisioning`

## Próximo nivel recomendado

- ampliar E2E browser a DLQ de provisioning y acceso tenant desde `Tenants`
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
