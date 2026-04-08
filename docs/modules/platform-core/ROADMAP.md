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

Estado práctico de cierre:

- cierre funcional base: `Completado`
- cierre operativo técnico: `Completado en mini PC Debian`
- cierre operativo definitivo: `Pendiente por validación externa / humo de terreno / TLS`

## Cerrado

- instalación inicial reproducible
- auth `platform` y `tenant`
- DB de control + DB tenant
- lifecycle tenant base
- UI visible de platform admin
- primer stack E2E browser base
- gobernanza transversal de implementacion, revision y handoff documentada
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
- validación browser del mantenimiento operativo de cuentas y categorías `finance` en `tenant_portal`
- validación browser del flujo base de presupuestos `finance` en `tenant_portal`
- validación browser del flujo base de préstamos `finance` en `tenant_portal`
- validación browser del pago y reversa en lote de préstamos `finance` en `tenant_portal`

## Pendiente para cierre operativo del bloque central

Este frente ya no depende de abrir más funcionalidad de producto.

Lo pendiente real para considerar el bloque central efectivamente cerrado en terreno es:

- confirmar host productivo real
- completar validación externa real sobre `orkestia.ddns.net`
- emitir y activar TLS para `orkestia.ddns.net` o separar `app/api`
- reconstruir frontend con URL final HTTPS si cambia el origen público
- ejecutar smoke corto de terreno desde navegador real
- actualizar estado post-producción y evidencia operativa final

Referencia operativa:

- [ESTADO_ACTUAL.md](/home/felipe/platform_paas/ESTADO_ACTUAL.md)
- [SIGUIENTE_PASO.md](/home/felipe/platform_paas/SIGUIENTE_PASO.md)
- [PAQUETE_RELEASE_OPERADOR.md](/home/felipe/platform_paas/PAQUETE_RELEASE_OPERADOR.md)
- [backend-production-preflight.md](/home/felipe/platform_paas/docs/deploy/backend-production-preflight.md)
- [frontend-static-nginx.md](/home/felipe/platform_paas/docs/deploy/frontend-static-nginx.md)
- [production-cutover-checklist.md](/home/felipe/platform_paas/docs/deploy/production-cutover-checklist.md)

## Próximo nivel recomendado

Una vez resuelto el deploy real, el siguiente nivel recomendado pasa a ser:

- backlog transversal de mejoras sugeridas en [../improvements/README.md](/home/felipe/platform_paas/docs/modules/improvements/README.md)
- ampliar E2E browser a acceso tenant más profundo tras el salto desde `Tenants`, y a DLQ individual/filtros más finos
- más regresión sobre provisioning y billing
- seguir endureciendo copy, validaciones y observabilidad visible
- mantener la política documental canónica al abrir más dominios
- dejar el sidebar de `tenant_portal` backend-driven según `effective_enabled_modules`, para que cada tenant vea solo los módulos contratados y vigentes
- tratar ese gating visual como trabajo posterior al cierre funcional de `maintenance`, no antes

## Deuda técnica visible

- algunos recorridos siguen mejor cubiertos por backend tests que por browser E2E
- la documentación central era abundante pero estaba dispersa; ya quedó indexada, pero aún puede seguir normalizándose
- el backend ya calcula y aplica entitlements por módulo tenant, pero el menú frontend sigue hardcodeado y todavía no filtra por contrato/billing

## Conclusión práctica

- `finance`: cerrado para el alcance actual
- `business-core`: operativo
- `maintenance`: cerrado en su primer corte
- `platform-core`: funcionalmente cerrado
- el deploy técnico base ya quedó resuelto en el mini PC; lo pendiente real es la validación externa final y el endurecimiento TLS

## Regla futura

Todo módulo o dominio nuevo debe salir con:

- carpeta en `docs/modules/<module>/`
- `README`
- `USER_GUIDE`
- `DEV_GUIDE`
- `ROADMAP`
- `CHANGELOG`
- `API_REFERENCE` cuando aplique
