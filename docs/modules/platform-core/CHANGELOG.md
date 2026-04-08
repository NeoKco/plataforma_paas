# Platform Core Changelog

## 2026-04-07

- se normaliza la convención local de puertos para no pisar la producción del mini PC: desarrollo pasa a backend `8100` y frontend `5173`, mientras producción mantiene backend `8000` detrás de `nginx`
- se ejecuta la primera salida productiva técnica sobre mini PC Debian en `/opt/platform_paas`, con backend real bajo `systemd`, frontend Vite publicado por `nginx` y topología single-host inicial en `orkestia.ddns.net`
- se agrega [platform-paas-single-host.conf](/home/felipe/platform_paas/infra/nginx/platform-paas-single-host.conf) para operar SPA + backend por rutas sobre un único dominio cuando todavía no existe separación `app/api`
- se agrega [platform-paas-single-host-ssl.conf](/home/felipe/platform_paas/infra/nginx/platform-paas-single-host-ssl.conf) y se activa HTTPS real para `orkestia.ddns.net` con certificado Let's Encrypt
- se endurece [deploy_backend.sh](/home/felipe/platform_paas/deploy/deploy_backend.sh) para exportar `PYTHONPATH` en migraciones y pruebas, evitando fallos de import al desplegar fuera del workspace de desarrollo
- se endurece [validate_backend_env.sh](/home/felipe/platform_paas/deploy/validate_backend_env.sh) para rechazar `TENANT_BOOTSTRAP_DB_PASSWORD_*` inseguros antes del restart del servicio
- se actualiza [backend.production.example.env](/home/felipe/platform_paas/infra/env/backend.production.example.env) para declarar explícitamente los overrides de passwords bootstrap requeridos en producción
- se valida externamente `https://orkestia.ddns.net` desde navegador real y se ejecuta smoke remoto completo `all` contra la URL pública con `7/7` checks OK
- el frente central pasa de `cutover pendiente de validación externa` a `producción inicial validada`

## 2026-04-04

- se agrega [implementation-governance.md](/home/felipe/platform_paas/docs/architecture/implementation-governance.md) como canon transversal de estandares, revisiones, estructura minima, documentacion viva y handoff para continuidad con otra IA
- se actualizan [project-structure.md](/home/felipe/platform_paas/docs/architecture/project-structure.md), [development-roadmap.md](/home/felipe/platform_paas/docs/architecture/development-roadmap.md), [developer-onboarding.md](/home/felipe/platform_paas/docs/runbooks/developer-onboarding.md), [frontend-e2e-browser.md](/home/felipe/platform_paas/docs/runbooks/frontend-e2e-browser.md) y [frontend/e2e/README.md](/home/felipe/platform_paas/frontend/e2e/README.md) para dejar un marco único de implementación y validación browser
- se endurece la política oficial de continuidad: todo cambio visible debe actualizar documentación canónica, revisar cobertura E2E existente y dejar handoff explícito para el siguiente developer o IA
- se alinea [platform-core/ROADMAP.md](/home/felipe/platform_paas/docs/modules/platform-core/ROADMAP.md) para dejar explícito que el cierre funcional central ya está logrado y que el pendiente real del bloque central es el cutover productivo sobre un host real

## 2026-04-03

- se agrega el script operativo [sync_active_tenant_schemas.py](/home/felipe/platform_paas/backend/app/scripts/sync_active_tenant_schemas.py) para sincronizar en linea los esquemas tenant activos sin depender del worker
- se actualiza [backend-migrations.md](/home/felipe/platform_paas/docs/runbooks/backend-migrations.md) para dejar explicito el flujo de migracion masiva y directa de tenants existentes

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
- el baseline E2E tenant se mantiene sobre `empresa-bootstrap` como tenant reservado para pruebas browser, dejando `empresa-demo` para trabajo funcional con datos reales
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
- se agrega [cleanup_e2e_tenants.py](/home/felipe/platform_paas/backend/app/scripts/cleanup_e2e_tenants.py) para barrer tenants efímeros `e2e-*` con lifecycle seguro y evitar acumulación en `platform_control`
- la alta de `Tenants` y de `Usuarios de plataforma` pasa a abrirse solo bajo demanda en modal, evitando formularios de creación desplegados por defecto en la lectura principal
- la vista de `Usuarios de plataforma` deja de usar una grilla desbalanceada tras mover el alta a modal: el catálogo ahora toma el ancho útil completo y la ficha/acciones del usuario seleccionado quedan en un segundo nivel más armónico
- `Tenant Portal > Usuarios` también pasa a alta bajo demanda: el catálogo queda primero, `Nuevo usuario` abre modal y el bloque de operador actual queda como contexto secundario
- `Tenant Portal > Usuarios` suma acciones de `Editar` y `Eliminar` en la tabla; el borrado queda endurecido para bloquear autoeliminación y la eliminación del último admin activo del tenant
- `Tenant Portal > Usuarios` pasa a administrar también la zona horaria: el tenant define una zona por defecto y cada usuario puede heredarla o sobrescribirla
- `/tenant/info` expone `timezone`, `user_timezone` y `effective_timezone`, y las vistas del portal pasan a reutilizar esa zona efectiva para leer/capturar fechas operativas
- `sync_tenant_schema` deja de reintentarse cuando la configuracion DB del tenant esta incompleta; ese caso ahora termina en fallo terminal para evitar loops sobre tenants no provisionados
- `seed_frontend_demo_baseline.py` neutraliza jobs tecnicos vivos cuando resetea `empresa-demo` a `pending` sin DB, para no dejar `retry_pending` inconsistentes en `platform_control`

## Documentación

- se consolidó una convención canónica por módulo/dominio en `docs/modules/`
- `finance` y `platform-core` quedan como referencia para siguientes módulos
