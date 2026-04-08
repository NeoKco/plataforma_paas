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
- cierre operativo técnico: `Completado en mini PC Debian con HTTPS`
- cierre operativo definitivo: `Completado`
- entorno staging/test separado en el mismo mini PC: `Completado`
- reset controlado de `staging` para volver al instalador inicial: `Completado`
- validación visual del instalador sobre `staging bootstrap`: `Completado`
- restauración de `staging` a espejo instalado después del bootstrap: `Completado`

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
- sidebar de `tenant_portal` backend-driven según `effective_enabled_modules`, con smoke browser dedicado para billing grace
- alta de `Nuevo tenant` con admin inicial explícito y sin bootstrap fijo compartido
- lectura visible en `Tenants` de que los módulos se habilitan por `plan`, tanto en el alta como en el bloque `Plan y módulos`
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

## Cierre operativo del bloque central

Este frente ya no depende de abrir más funcionalidad de producto.

El bloque central ya quedó cerrado para su primera salida real en terreno:

- host productivo real confirmado sobre mini PC Debian
- `https://orkestia.ddns.net` validado externamente
- smoke remoto completo aprobado sobre la URL pública
- estado post-producción y evidencia operativa ya asentados
- entorno `staging` separado levantado en `/opt/platform_paas_staging`
- backend staging bajo `systemd` en `127.0.0.1:8200`
- frontend staging publicado por `nginx` en `http://192.168.7.42:8081`
- flujo `/install` validado realmente sobre `staging` en modo bootstrap
- `staging` restaurado a espejo operativo después de la validación del instalador

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
- decidir si el `staging` actual seguirá como espejo instalado o si se automatizará un reset controlado para validar bootstrap inicial desde cero
- decidir en qué modo operativo debe quedar `staging` después de validar `/install`: espejo instalado o bootstrap temporal
- ampliar E2E browser a acceso tenant más profundo tras el salto desde `Tenants`, y a DLQ individual/filtros más finos
- más regresión sobre provisioning y billing
- seguir endureciendo copy, validaciones y observabilidad visible
- mantener la política documental canónica al abrir más dominios
- decidir si después del gating visual del sidebar conviene endurecer también rutas visibles secundarias del `tenant_portal` o si basta con backend + navegación principal

## Deuda técnica visible

- algunos recorridos siguen mejor cubiertos por backend tests que por browser E2E
- la documentación central era abundante pero estaba dispersa; ya quedó indexada, pero aún puede seguir normalizándose
- el backend ya calcula y aplica entitlements por módulo tenant y el sidebar principal del `tenant_portal` ya filtra por contrato/billing usando `effective_enabled_modules`
- el staging ya puede alternar entre espejo instalado y bootstrap reset; hoy ya quedó devuelto a espejo operativo y el siguiente paso ya no es de entorno sino de roadmap

## Conclusión práctica

- `finance`: cerrado para el alcance actual
- `business-core`: operativo
- `maintenance`: cerrado en su primer corte
- `platform-core`: funcionalmente cerrado
- el deploy técnico base y su validación inicial ya quedaron resueltos en el mini PC con HTTPS

## Regla futura

Todo módulo o dominio nuevo debe salir con:

- carpeta en `docs/modules/<module>/`
- `README`
- `USER_GUIDE`
- `DEV_GUIDE`
- `ROADMAP`
- `CHANGELOG`
- `API_REFERENCE` cuando aplique
