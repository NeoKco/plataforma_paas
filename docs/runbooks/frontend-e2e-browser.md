# E2E Browser Local

Este runbook deja el primer stack `E2E` browser del proyecto sobre `Playwright`.

No busca cubrir todo el producto en la primera iteración.

Busca dejar una base útil, mantenible y rápida para validar recorridos reales de:

- `platform_admin`
- `tenant_portal`
- `finance`

## Ubicación

Archivos principales:

- [playwright.config.ts](/home/felipe/platform_paas/frontend/playwright.config.ts)
- [package.json](/home/felipe/platform_paas/frontend/package.json)
- [README.md](/home/felipe/platform_paas/frontend/e2e/README.md)
- [auth.ts](/home/felipe/platform_paas/frontend/e2e/support/auth.ts)
- [env.ts](/home/felipe/platform_paas/frontend/e2e/support/env.ts)
- [platform-admin.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin.smoke.spec.ts)
- [platform-admin-tenant-lifecycle.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-lifecycle.smoke.spec.ts)
- [platform-admin-tenant-portal-access.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-portal-access.smoke.spec.ts)
- [platform-admin-tenant-portal-blocked.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-portal-blocked.smoke.spec.ts)
- [platform-admin-provisioning.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning.smoke.spec.ts)
- [platform-admin-provisioning-run-now.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-run-now.smoke.spec.ts)
- [platform-admin-provisioning-retry.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-retry.smoke.spec.ts)
- [platform-admin-schema-auto-sync.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-schema-auto-sync.smoke.spec.ts)
- [platform-admin-provisioning-dlq-row.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-row.smoke.spec.ts)
- [platform-admin-provisioning-dlq.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq.smoke.spec.ts)
- [platform-admin-provisioning-dlq-filters.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq-filters.smoke.spec.ts)
- [tenant-portal-users-limit.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-users-limit.smoke.spec.ts)
- [tenant-portal-finance-limit.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-limit.smoke.spec.ts)
- [tenant-portal-finance-limit-precedence.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-limit-precedence.smoke.spec.ts)
- [tenant-portal-finance-monthly-limit.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-monthly-limit.smoke.spec.ts)
- [tenant-portal-finance-monthly-type-limits.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-monthly-type-limits.smoke.spec.ts)
- [tenant-portal-finance-catalogs.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-catalogs.smoke.spec.ts)
- [tenant-portal-finance-budgets.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-budgets.smoke.spec.ts)
- [tenant-portal-finance-loans.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-loans.smoke.spec.ts)
- [tenant-portal-finance-loans-batch.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-loans-batch.smoke.spec.ts)
- [tenant-portal-finance.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance.smoke.spec.ts)
- [tenant-portal-finance-attachments-void.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-attachments-void.smoke.spec.ts)
- [tenant-portal-finance-reconciliation.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-reconciliation.smoke.spec.ts)

## Alcance inicial

Cobertura actual:

- login `platform_admin`
- navegación corta a `Tenants` y `Provisioning`
- acceso rápido al `tenant_portal` desde `Tenants` con `slug` precargado
- bloqueo visible del acceso rápido al `tenant_portal` cuando el tenant no está operativo para abrir portal
- lifecycle básico de tenant en `platform_admin` con `create`, `archive` y `restore`
- visibilidad de job nuevo en `Provisioning` después de crear tenant
- ejecución manual de un job `pending` desde `Provisioning`
- requeue de un job `failed` desde `Provisioning`
- disparo de `schema auto-sync` desde `Provisioning`
- requeue individual de una fila DLQ desde `Provisioning` cuando el backend usa broker
- requeue batch de filas DLQ filtradas desde `Provisioning` cuando el backend usa broker
- filtros finos DLQ por texto de error y revisión de `delay/reset attempts` antes del requeue individual cuando el backend usa broker
- login `tenant_portal`
- enforcement visible de límites de usuarios activos en `tenant_portal`
- enforcement visible de límites de `finance` en `tenant_portal`
- precedencia visible de `finance.entries` sobre `finance.entries.monthly` cuando ambos quedan agotados
- enforcement de límites mensuales de `finance.entries.monthly` en `tenant_portal`
- enforcement de límites mensuales por tipo `finance.entries.monthly.income` y `finance.entries.monthly.expense` en `tenant_portal`
- mantenimiento básico de catálogos `finance` para cuentas y categorías en `tenant_portal`
- flujo base de `finance budgets` con creación y clonación mensual en `tenant_portal`
- flujo base de `finance loans` con creación de préstamo y pago simple de cuota en `tenant_portal`
- operaciones batch de `finance loans` con pago y reversa sobre cuotas seleccionadas en `tenant_portal`
- alta básica de una transacción en `finance`
- carga de adjunto sobre transacción creada en `finance`
- anulación básica de una transacción creada en `finance`
- conciliación básica de una transacción creada en `finance`

Esto no reemplaza:

- tests backend
- pruebas guiadas manuales
- validación visual profunda

## Precondiciones

- backend levantado
- datos demo o tenant real de desarrollo disponibles
- navegador `chromium` instalado para `Playwright`

## Variables de entorno

Archivo de referencia:

- [\.env.e2e.example](/home/felipe/platform_paas/frontend/.env.e2e.example)

Variables principales:

- `E2E_BASE_URL`
- `E2E_USE_EXISTING_FRONTEND`
- `E2E_CHROMIUM_EXECUTABLE_PATH`
- `E2E_PLATFORM_EMAIL`
- `E2E_PLATFORM_PASSWORD`
- `E2E_TENANT_SLUG`
- `E2E_TENANT_EMAIL`
- `E2E_TENANT_PASSWORD`

Baseline recomendado para desarrollo local:

- usar un tenant realmente `active`
- el baseline actual del smoke tenant usa:
  - `E2E_TENANT_SLUG=empresa-bootstrap`
  - `E2E_TENANT_EMAIL=admin@empresa-bootstrap.local`
  - `E2E_TENANT_PASSWORD=TenantAdmin123!`

Se prioriza `empresa-bootstrap` porque en la validación local quedó `active`, con login funcional y bootstrap reproducible para `finance` y límites tenant.

Si tu entorno no tiene `empresa-bootstrap` operativo o usa otra clave, sobreescribe `E2E_TENANT_*`.

Comandos separados:

```bash
npm run e2e:platform
npm run e2e:tenant
```

Eso permite validar primero la consola de plataforma y después el flujo tenant con credenciales correctas del entorno.

`npm run e2e:tenant` ya ejecuta todo `tenant-portal*.spec.ts`, incluyendo el smoke de límites y los smokes de `finance`.

Resultado validado en local a la fecha:

- `platform_admin` smoke pasando
- `platform_admin` lifecycle tenant base pasando
- acceso rápido desde `Tenants` al login de `tenant_portal` con `slug` precargado pasando
- acceso rápido desde `Tenants` correctamente bloqueado cuando el tenant no está en estado elegible pasando
- `Provisioning` validado al menos para visibilidad de jobs nuevos disparados desde `Tenants`
- `Provisioning` validado también para ejecutar manualmente un job `pending` desde la consola
- `Provisioning` validado también para reencolar un job `failed` desde la consola
- `Provisioning` validado también para disparar `schema auto-sync` desde la toolbar
- `Provisioning` ya tiene además un smoke broker-only para reencolar una fila DLQ individual desde la tabla de resultados
- `Provisioning` ya tiene además un smoke broker-only para reencolar filas DLQ filtradas en lote
- `Provisioning` ya tiene además un smoke broker-only para validar filtros DLQ por `error contains` y confirmar opciones de requeue individual
- `tenant_portal` ya cubre además enforcement visible de límites de usuarios activos con overrides preparados de forma determinista
- `tenant_portal` ya cubre además enforcement visible de límites de `finance.entries` bloqueando nuevas transacciones cuando el tenant queda al límite
- `tenant_portal` ya cubre además la precedencia visible del límite total `finance.entries` cuando coincide con `finance.entries.monthly`
- `tenant_portal` ya cubre además enforcement de `finance.entries.monthly` bloqueando nuevas transacciones cuando el tenant alcanza el cupo mensual
- `tenant_portal` ya cubre además enforcement de `finance.entries.monthly.income` y `finance.entries.monthly.expense` bloqueando nuevas transacciones según el tipo del movimiento
- `tenant_portal` ya cubre además el mantenimiento operativo de cuentas y categorías (`create`, `deactivate`, `delete`) dentro de `finance`
- `tenant_portal` ya cubre además el flujo base de presupuestos con alta mensual y clonación al mes visible
- `tenant_portal` ya cubre además el flujo base de préstamos con alta de cartera y pago simple de cuota
- `tenant_portal` ya cubre además pago en lote y reversa en lote de cuotas sobre préstamos seleccionados
- `tenant_portal` con `empresa-bootstrap` pasando
- flujo `finance` cubierto en creación, adjunto, anulación y conciliación

## Comandos

Desde `frontend/`:

```bash
npm run e2e:install
npm run e2e
```

Variantes útiles:

```bash
npm run e2e:headed
npm run e2e:ui
npm run e2e:report
```

## Criterio operativo

Decisiones de este primer corte:

- usar solo `chromium`
- no montar todavía una matriz completa multi-browser
- no automatizar backend en el config; se asume backend ya operativo
- permitir que `Playwright` levante el frontend o reutilice uno existente

Notas del flujo `finance` que conviene recordar:

- el smoke tenant validado usa `empresa-bootstrap` como baseline activo de esta iteración
- la subida de imágenes en transacciones comprime el archivo antes de enviarlo
- cuando la imagen se comprime, el nombre visible final del adjunto puede cambiar a extensión `webp`
- los smokes de límites tenant ya no dependen de preparar overrides por UI de `Tenants`; usan control DB para fijar y limpiar estado reproducible
- el smoke de precedencia de `finance` fija en paralelo `finance.entries` y `finance.entries.monthly` para confirmar que el error visible y el `403` priorizan el límite total
- el smoke mensual de `finance` usa además un snapshot real del uso tenant para fijar `finance.entries.monthly` sin asumir conteos hardcodeados
- el smoke mensual por tipo de `finance` reutiliza ese snapshot real para fijar `finance.entries.monthly.income` y `finance.entries.monthly.expense` sin depender de conteos estáticos
- el smoke de catálogos `finance` usa registros efímeros con nombres únicos para validar alta, desactivación y borrado seguro sin depender del catálogo inicial
- el smoke de presupuestos usa meses futuros efímeros para evitar colisiones con planificación real y verificar alta + clonación sin ensuciar meses operativos actuales
- el smoke de préstamos usa un préstamo efímero con 3 cuotas para validar la ruta mínima `create -> schedule -> payment` sin depender de cartera previa
- el smoke batch de préstamos reutiliza un préstamo efímero con 3 cuotas para validar `schedule -> batch payment -> batch reversal` sobre selección múltiple

## Siguiente expansión sugerida

Cuando este stack empiece a usarse de verdad, los siguientes specs correctos son:

- archive / restore tenant
- provisioning más profundo desde `platform_admin` (DLQ individual, variaciones de filtros o delay)
- cuentas y categorías básicas en `finance`
- más regresión visible sobre configuraciones operativas de `finance`, ajustes guiados/plantillas y escenarios extra de usuarios tenant

Nota operativa del smoke `retry`:

- el spec crea un tenant de prueba y luego siembra un job `failed` controlado directamente en la DB de control para validar la recuperación visible sin depender de un fallo accidental del worker
- por defecto usa `/home/felipe/platform_paas/platform_paas_venv/bin/python`; si tu entorno cambia, puedes sobreescribir `E2E_BACKEND_PYTHON`

Nota operativa del smoke `DLQ`:

- requiere `PROVISIONING_DISPATCH_BACKEND=broker`, porque la DLQ no existe operativamente sobre el backend `database`
- cuando el entorno no soporta broker, el spec se omite sin romper la suite general

Nota operativa del smoke `DLQ row`:

- requiere `PROVISIONING_DISPATCH_BACKEND=broker`
- siembra una fila DLQ controlada y valida el reencolado individual desde la tabla visible del workspace

Nota operativa del smoke `DLQ filters`:

- requiere `PROVISIONING_DISPATCH_BACKEND=broker`
- siembra más de una fila DLQ para el mismo tenant y valida que el filtro `error contains` aísle solo el subconjunto esperado
- además verifica que la confirmación del requeue individual refleje el `delay` y el `reset attempts` visibles en la UI
