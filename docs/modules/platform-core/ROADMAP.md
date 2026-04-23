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
- validación browser del acceso rápido desde `Tenants` hacia `Provisioning` con `tenantSlug` y foco operativo precargados
- sidebar de `tenant_portal` backend-driven según `effective_enabled_modules`, con smoke browser dedicado para billing grace
- alta de `Nuevo tenant` con admin inicial explícito y sin bootstrap fijo compartido
- lectura visible en `Tenants` de que los módulos se habilitan por `plan`, tanto en el alta como en el bloque `Plan y módulos`
- separación contractual real de `maintenance` respecto de `core`, tanto en middleware tenant como en visibilidad del `tenant_portal`
- bootstrap tenant contractual por módulos:
  - `core` ya puede sembrar baseline de `business-core`
  - `core` o `finance` ya pueden sembrar baseline financiero final con `CLP`
  - el cambio posterior de plan puede backfillear esos defaults sin reprovisionar la DB tenant
- publicación en `staging` del corte contractual `maintenance` + bootstrap financiero por vertical
- validación browser en `staging` del sidebar tenant con `maintenance` tratado como módulo propio
- publicación en `production` del corte contractual `maintenance` + bootstrap financiero por vertical
- validación browser en `production` del sidebar tenant con `maintenance` tratado como módulo propio
- smoke browser específico `platform-admin-tenants-create-form` aprobado para validar admin inicial explícito + preview de módulos por plan
- despliegue y validación real del frente `Nuevo tenant` en `staging` y `production`
- validación browser de aparición de jobs nuevos en `Provisioning`
- validación browser de ejecución manual de jobs `pending` desde `Provisioning`
- validación browser de requeue de jobs `failed` desde `Provisioning`
- validación browser del disparo de `schema auto-sync` desde `Provisioning`
- observabilidad visible de `Provisioning` con snapshots recientes por tenant e historial de alertas operativas persistidas
- export portable mínimo por tenant en `Tenants` con `zip + manifest + csv`
- descarga autenticada del artifact portable desde `platform_admin`
- smoke browser inicial del export portable tenant-side
- import portable mínimo por tenant con carga de `zip`, `dry_run` y `apply` explícito sobre tenant destino
- validación browser end-to-end del flujo portable tenant (`export + dry_run + apply`) en `staging`
- validación browser end-to-end del flujo portable tenant (`export + dry_run + apply`) en `production`
- endurecimiento del import portable para convertir valores CSV según el tipo real de la columna destino antes de insertar
- soporte de dos modos de portabilidad en repo:
  - `portable_full`
  - `functional_data_only`
- soporte de la misma portabilidad también desde `tenant_portal` para admin tenant, con smoke browser dedicado en repo
- endurecimiento del deploy backend para crear y dejar escribible `TENANT_DATA_EXPORT_ARTIFACTS_DIR` al usuario real del servicio
- corrección de `settings.py` para que ningún `TENANT_BOOTSTRAP_DB_PASSWORD_*` demo inseguro quede embebido como default de código en `production`
- validación browser broker-only de requeue individual sobre filas DLQ desde `Provisioning`
- validación browser broker-only de requeue batch sobre filas DLQ filtradas desde `Provisioning`
- validación browser broker-only de filtros finos DLQ por texto de error y opciones de requeue desde `Provisioning`
- validación browser de `requeue guiado` dentro de `Provisioning`, usando una fila DLQ para enfocar filtros y disparar el reintento sugerido
- visibilidad explícita del `dispatch backend` activo dentro de `Provisioning`, para distinguir si el entorno publicado opera hoy con `broker` o `database`
- validación browser de esa capacidad visible mediante `platform-admin-provisioning-dispatch-capability`
- gating visible de la superficie `Operación DLQ` según el backend activo:
  - `broker`: filtros, batch y requeue guiado activos
  - `database`: estado broker-only no activo y derivación operativa al entorno correcto
- validación browser de ese gating mediante `platform-admin-provisioning-dlq-surface-gating`
- validación browser de `familias DLQ visibles` y `Enfocar familia` dentro de `Provisioning`, con agrupación broker-only sobre el subconjunto visible
- validación browser de `Reencolar familia` dentro de `Provisioning`, reintentando directamente una familia DLQ homogénea desde el resumen broker-only
- validación browser de batch homogéneo sobre múltiples `familias DLQ visibles` dentro de `Provisioning`, con selección explícita y requeue por lote broker-only sobre el mismo `tenant + job type`
- validación browser de recomendación operativa sobre `familias DLQ visibles` dentro de `Provisioning`, para decidir entre `single`, `family`, `family-batch` o limpiar selección según el subconjunto visible
- validación browser de prioridad por `tenant` visible dentro de `Provisioning`, para aislar primero un tenant cargado antes de operar sus familias DLQ
- validación browser de diagnóstico técnico `DLQ / BD` dentro de `Provisioning`, para distinguir si el problema visible dominante cae en rol postgres, base postgres, esquema tenant o drop de base tenant
- validación browser de matriz broker-only `tenant + capa técnica` dentro de `Provisioning`, para aislar la combinación operativa correcta entre tenant y capa técnica visible
- hardening E2E broker-only ya institucionalizado con runner compartido único para `local`, `staging published` y `workflow_dispatch` manual
- baseline published curado de `Provisioning/DLQ` ya institucionalizado para correr siempre `dispatch-capability + surface-gating + observability-visible`, y sumar broker-only solo cuando el entorno publicado realmente usa `broker`
- wrappers por ambiente ya disponibles para volver ese baseline rutina explícita:
  - `staging`: `scripts/dev/run_staging_published_provisioning_baseline.sh`
  - `production`: `scripts/dev/run_production_published_provisioning_baseline.sh`
- equivalente repo/CI ya institucionalizado:
  - `scripts/dev/run_repo_provisioning_baseline.sh`
  - `.github/workflows/frontend-provisioning-baseline-e2e.yml`
  - el workflow manual permite escoger `dispatch_backend=database|broker` y sumar broker-only solo cuando corresponde
- hardening visible adicional ya publicado en `platform_admin > Billing`:
  - la consola ahora deja una `Ruta de revalidación del carril`
  - traduce el workspace a una secuencia visible:
    - baseline visible global
    - bajada al workspace tenant cuando ya toca reconcile
    - referencia repo/CI equivalente con los smokes de reconcile individual y batch
- la salida formal de ese frente ya deja abierto el siguiente bloque maestro:
  - `Etapa 15. Registro y Activación de Módulos` pasa de pendiente a ejecución visible real
  - `Configuración` ya expone `Catálogo de planes y módulos`
  - `Configuración` ya expone `Dependencias entre módulos`
  - `Tenants > Plan y módulos` ya deja explícita la activación tenant-side, los límites por módulo del plan seleccionado y si esas dependencias ya quedan cubiertas o no
  - `platform_control` ya deja además el primer corte técnico persistente:
    - `tenant_base_plan_catalog`
    - `tenant_module_catalog`
    - `tenant_module_price_catalog`
    - `tenant_subscriptions`
    - `tenant_subscription_items`
  - `GET /platform/capabilities` ya expone:
    - `subscription_activation_model`
    - `subscription_billing_cycles`
    - `base_plan_catalog`
    - `module_subscription_catalog`
  - la decisión de producto ya queda cerrada para el siguiente corte:
    - no seguir con `plan-driven puro` como modelo final
    - no abrir `overrides` manuales libres por tenant
    - avanzar a `Plan Base + módulos arrendables por suscripción`
  - `Configuración` y `Tenants > Plan y módulos` ya quedaron adaptados al modelo aprobado:
    - `Configuración` ya muestra:
      - `Planes base`
      - `Módulos arrendables`
      - `Ciclos comerciales`
      - `Política efectiva actual por plan`
      - baseline resuelto del `Plan Base` con compatibilidad, cuotas y límites
    - `Tenants > Plan y módulos` ya deja visible:
      - `Plan Base aprobado`
      - `Plan operativo actual`
      - add-ons visibles
      - ciclos comerciales visibles
      - activación efectiva actual desde suscripciones tenant
      - fallback legacy visible cuando aplica
      - `Modelo contractual`
      - `Fuente baseline`
      - ruta formal hacia contratación tenant de add-ons
  - `Tenants > Plan y módulos` ya deja también contratación formal visible:
    - `Contrato comercial tenant` opera sobre `tenant_subscriptions` y `tenant_subscription_items`
    - `Baseline legacy por plan_code` queda como compatibilidad temporal
    - la vista ya separa `Plan Base`, add-ons arrendados y dependencias técnicas auto-resueltas
  - siguiente subcorte ya cerrado en repo:
    - `billing`, `grace` y `suspensión` ya se evalúan primero desde `tenant_subscriptions`
    - los eventos de billing ya proyectan estado/fechas sobre la suscripción cuando existe
    - el fallback legacy de módulos ya no se aplica a tenants con contrato ya gestionado en el modelo nuevo
  - subcorte nuevo ya cerrado en repo:
    - tenants gestionados por contrato ya resuelven el baseline de cuotas/límites desde `tenant_subscriptions` + `base_plan_catalog`
    - `tenant_plan_api_read_requests_per_minute`, `tenant_plan_api_write_requests_per_minute`, `tenant_plan_enabled_modules` y `tenant_plan_module_limits` ya no salen de `plan_code` para esos tenants
    - `GET /platform/capabilities` ya expone el `base_plan_catalog` resuelto con compatibilidad, cuotas y límites base
  - subcorte nuevo ya cerrado en repo y runtime:
    - `POST /platform/tenants` ya crea tenants nuevos con `base_plan_code`
    - el alta nueva ya nace contract-managed con `tenant_subscriptions` y `tenant_subscription_items`
    - el carril normal de creación ya deja `plan_code=null`
    - `Tenants > Nuevo tenant` ya usa `Plan Base inicial`
    - `Tenants > Plan y módulos` ya solo muestra baseline legacy cuando el tenant realmente sigue legacy
    - `Provisioning` ya bootstrappea desde `effective_enabled_modules`, no desde `tenant.plan_code`
    - `GET /platform/capabilities` ya no expone `plan_catalog` ni `available_plan_codes` como catálogo normal
    - la compatibilidad legacy visible ya queda acotada a `legacy_plan_fallback_available` + `legacy_plan_catalog`
  - subcorte nuevo ya cerrado en repo y runtime:
    - `plan_code` ya sale de la lectura visible normal para tenants contract-managed
    - `GET /platform/tenants`, `TenantPlanResponse`, respuestas de límites/uso y `tenant_context_middleware` ya lo dejan en `null` salvo que `legacy_plan_fallback_active=true`
    - `Tenants > Plan y módulos` y `tenant_portal > Resumen` ya muestran `Plan base` como baseline normal y reservan `plan_code` para compatibilidad legacy real
  - subcorte nuevo ya cerrado en repo y runtime:
    - `TenantCreateRequest` ya no declara `plan_code`
    - `PATCH /platform/tenants/{tenant_id}/plan` ya devuelve `409` para tenants contract-managed
    - la escritura contractual normal queda acotada a `base_plan_code` + `PATCH /platform/tenants/{tenant_id}/subscription`
  - subcorte nuevo ya cerrado en repo y runtime:
    - `seed_frontend_demo_baseline.py` y `seed_demo_data.py` ya generan tenants demo contract-managed desde `base_plan_code`
    - `audit_active_tenant_convergence.py` ya lee módulos efectivos desde `effective_enabled_modules`
  - subcorte nuevo ya cerrado en repo y runtime:
    - `tenant_service` ya no consulta módulos ni baseline legacy para tenants contract-managed solo por arrastre histórico de `plan_code`
    - `tenant_policy_event_service` ya deja `plan_code=null` en snapshots y `changed_fields` para tenants contract-managed
    - el baseline contractual sin `base_plan_code` ya no recae en `legacy_plan_code`; se informa como `subscription_contract`
  - el siguiente corte ya no es migrar tenants activos ni limpiar la lectura visible, sino:
    - revisión repo-wide ya cerrada:
      - no queda consumidor contractual real de `plan_code` fuera del carril legacy explícito
      - `plan_code` queda suficientemente acotado para salir del foco activo
    - dejar explícito si en el futuro reaparece algún tenant realmente legacy fuera del set activo actual
    - seguir separando en la consola el estado `contratado`, `incluido` y `efectivamente habilitado`
  - referencia formal:
    - [TENANT_MODULE_SUBSCRIPTION_MODEL.md](/home/felipe/platform_paas/docs/modules/platform-core/TENANT_MODULE_SUBSCRIPTION_MODEL.md)
  - migración contractual legacy ya cerrada:
    - `POST /platform/tenants/{tenant_id}/subscription/migrate-legacy`
    - [migrate_legacy_tenant_contracts.py](/home/felipe/platform_paas/backend/app/scripts/migrate_legacy_tenant_contracts.py)
    - `staging` y `production` ya dejan `processed=4, migrated=0, skipped=4, failed=0, mode=audit`
- validación browser de enforcement visible de límites de usuarios activos en `tenant_portal`
- validación browser de enforcement visible de límites de `finance` en `tenant_portal`
- validación browser de precedencia visible de `finance.entries` sobre `finance.entries.monthly` en `tenant_portal`
- validación browser del bloqueo mensual de `finance.entries.monthly` en `tenant_portal`
- validación browser del bloqueo mensual por tipo de `finance.entries.monthly.income` y `finance.entries.monthly.expense` en `tenant_portal`
- validación browser del mantenimiento operativo de cuentas y categorías `finance` en `tenant_portal`
- validación browser del flujo base de presupuestos `finance` en `tenant_portal`
- validación browser del flujo base de préstamos `finance` en `tenant_portal`
- validación browser del pago y reversa en lote de préstamos `finance` en `tenant_portal`
- primer slice visible de `Etapa 11. Secretos y Seguridad Operativa`:
  - `GET /platform/security-posture` ya expone el carril runtime real de secretos tenant
  - `Settings` ya muestra si `TENANT_SECRETS_FILE` está separado del `.env` legacy y si el backend puede escribir ahí
  - `production_ready` ya cae si el runtime sigue mezclando secretos tenant con el `.env` principal
  - segundo slice repo ya cerrado:
    - la resolución normal de secretos tenant ya no usa `/.env` como candidato cuando el runtime ya trabaja con `TENANT_SECRETS_FILE` separado
    - `/.env` legacy queda solo como rescate explícito
    - cobertura nueva en `test_security_hardening` para modo normal sin `.env` y para rescate legacy bajo flag
  - tercer slice repo ya cerrado:
    - `GET /platform/security-posture` ya resume cobertura tenant del carril runtime con `tenant_secret_distribution_summary`
    - `Tenants` ya expone `Sincronizar secreto runtime` además de `Rotar credenciales técnicas`
    - la distribución mínima centralizada ya existe sin obligar rotación
    - el rescate legacy queda más acotado dentro de una mutación explícita
  - cuarto slice repo ya cerrado:
    - `Sincronizar secreto runtime` ya no rescata desde `/.env` dentro del flujo normal de consola
    - si el secreto solo sobrevive en `/.env`, la operación normal responde conflicto y deriva a tooling controlado
    - el script [rescue_tenant_runtime_secrets_from_legacy.py](/home/felipe/platform_paas/backend/app/scripts/rescue_tenant_runtime_secrets_from_legacy.py) queda como carril explícito de rescate legacy
  - siguiente corte recomendado:
    - promover este cuarto slice a runtime published
    - abrir distribución/rotación centralizada más formal de secretos tenant
    - mantener el rescate legacy solo como tooling excepcional

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

- si se quiere seguir sobre portabilidad tenant, primero validar y desplegar la superficie tenant-side del corte dual actual y luego abrir una Fase 3 de endurecimiento:
  - download del reporte de import
  - compatibilidad más amplia con paquetes externos
  - opciones explícitas de estrategia de merge
- o, si se prefiere retomar el roadmap central más visible, abrir `platform-core hardening + E2E` sobre:
  - `Provisioning`
  - DLQ
  - filtros y recuperación fina dentro de `Provisioning`
- backlog transversal de mejoras sugeridas en [../improvements/README.md](/home/felipe/platform_paas/docs/modules/improvements/README.md)
- mantener `staging` como espejo instalado por defecto y usar `bootstrap reset` solo para validar `/install` cuando haga falta
- ampliar E2E browser a DLQ individual/filtros más finos y a recuperación operativa guiada dentro de `Provisioning`
- profundizar el carril broker-only de DLQ ahora que la propia consola ya expone el `dispatch backend` activo
- no seguir endureciendo `Provisioning/DLQ` por inercia: el frente broker-only ya quedó suficientemente cerrado para esta etapa después de la matriz `tenant + capa técnica`
- decidir si `production` debe correr también con `PROVISIONING_DISPATCH_BACKEND=broker` sólo si realmente se quiere que esos smokes broker-only pasen ahí, y no sólo queden explícitamente marcados como no aplicables
- más regresión sobre provisioning y billing
- seguir endureciendo copy, validaciones y observabilidad visible
- mantener la política documental canónica al abrir más dominios
- decidir si después del gating visual del sidebar conviene endurecer también rutas visibles secundarias del `tenant_portal` o si basta con backend + navegación principal

## Deuda técnica visible

- algunos recorridos siguen mejor cubiertos por backend tests que por browser E2E
- la documentación central era abundante pero estaba dispersa; ya quedó indexada, pero aún puede seguir normalizándose
- el backend ya calcula y aplica entitlements por módulo tenant y el sidebar principal del `tenant_portal` ya filtra por contrato/billing usando `effective_enabled_modules`
- `maintenance` ya no hereda visibilidad desde `core`; cualquier contrato o degradación por billing debe habilitarlo explícitamente como módulo propio
- el wrapper [deploy_backend_staging.sh](/home/felipe/platform_paas/deploy/deploy_backend_staging.sh) ya quedó corregido para apuntar por defecto a `/opt/platform_paas_staging`; no debe volver a asumir `/opt/platform_paas`
- el corte contractual `maintenance` + bootstrap financiero por vertical ya quedó validado en repo y publicado en `staging` y `production`
- la validación real del bootstrap contractual por módulos ya quedó cerrada en `staging` con tenants nuevos reales; hoy no existe todavía un smoke browser específico que inspeccione esos catálogos, pero el rollout ya quedó validado operativamente
- el baseline contractual de bootstrap por módulos (`CLP + Casa/Empresa + task_types/function_profiles`) ya quedó publicado en `staging` y `production`
- el staging ya puede alternar entre espejo instalado y bootstrap reset; hoy queda institucionalizado que el modo normal es espejo operativo y el siguiente paso ya no es de entorno sino de roadmap
- la plataforma ya tiene backup y restore PostgreSQL por tenant, export portable mínimo en `CSV + manifest` e import controlado mínimo con `dry_run` y `apply`, ya validados en `staging` y `production`
- el repo ya soporta además export/import dual (`portable_full` y `functional_data_only`) desde `platform_admin` y `tenant_portal`; ese corte ya quedó validado en `staging` y `production`
- el salto asistido `Fallos por código/Alertas -> Investigar en DLQ` ya quedó validado en `staging` con smoke específico y promovido a `production`; el siguiente trabajo sobre DLQ ya no es de cierre base sino de profundización operativa
- `Provisioning` ya expone además observabilidad visible con historial de snapshots y alertas persistidas; el siguiente subfrente recomendado pasa a ser requeue guiado o profundización broker-only de DLQ
- `Provisioning` ya expone también `requeue guiado` sobre DLQ y quedó validado en `staging`; en `production` el frontend quedó publicado pero el smoke broker-only se salta mientras el backend no resuelva como `broker`
- `Provisioning` ya expone también la `capacidad activa de provisioning`, dejando visible si el entorno corre con `dispatch backend` `broker` o `database`; ese corte ya quedó validado en `staging` y `production`
- `Provisioning` ya alinea además la propia superficie `Operación DLQ` con ese backend activo, evitando acciones broker-only ambiguas en entornos `database`; ese corte ya quedó validado en `staging` y `production`
- `Provisioning` ya expone además `familias DLQ visibles` para enfocar una familia homogénea antes de reencolar; ese corte ya quedó validado en `staging` y publicado en `production`, donde el smoke queda `skipped` si el backend sigue siendo `database`
- `Provisioning` ya expone además `Reencolar familia` sobre ese mismo resumen broker-only; el smoke nuevo ya quedó verde en `staging` y `skipped` en `production` por backend `database/non-broker`
- `Provisioning` ya expone además `Reencolar selección` sobre múltiples familias visibles homogéneas; el smoke nuevo ya quedó verde en `staging` y `skipped` en `production` por backend `database/non-broker`
- `Provisioning` ya expone además `Plan operativo sugerido` sobre `Familias DLQ visibles`; el smoke nuevo ya quedó verde en `staging` y `skipped` en `production` por backend `database/non-broker`
- `Provisioning` ya expone además `Prioridad por tenant visible`; el smoke nuevo ya quedó verde en `staging` y `skipped` en `production` por backend `database/non-broker`
- `Provisioning` ya expone además `Diagnóstico DLQ / BD visible`; el smoke nuevo ya quedó verde en `staging` y `skipped` en `production` por backend `database/non-broker`
- `Provisioning` ya expone además la matriz broker-only `tenant + capa técnica`; el smoke nuevo ya quedó verde en `staging` y `skipped` en `production` por backend `database/non-broker`
- el frente `Provisioning/DLQ broker-only` queda suficientemente endurecido para esta etapa; cualquier profundización adicional pasa a backlog opcional y deja de ser prioridad activa del roadmap central

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
