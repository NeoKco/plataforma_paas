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
- [tenant-portal-business-core-maintenance-import.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-business-core-maintenance-import.smoke.spec.ts)

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
- enforcement visible de cuota admin y reactivación bloqueada en `tenant_portal > Usuarios`
- enforcement visible de límite mensual de creación en `tenant_portal > Usuarios`
- enforcement visible de límites de `finance` en `tenant_portal`
- precedencia visible de `finance.entries` sobre `finance.entries.monthly` cuando ambos quedan agotados
- enforcement de límites mensuales de `finance.entries.monthly` en `tenant_portal`
- enforcement de límites mensuales por tipo `finance.entries.monthly.income` y `finance.entries.monthly.expense` en `tenant_portal`
- mantenimiento básico de catálogos `finance` para cuentas y categorías en `tenant_portal`
- flujo base de `finance budgets` con creación y clonación mensual en `tenant_portal`
- flujo avanzado de `finance budgets` con plantillas y ajustes guiados sobre el mes visible en `tenant_portal`
- flujo base de `finance loans` con creación de préstamo y pago simple de cuota en `tenant_portal`
- operaciones batch de `finance loans` con pago y reversa sobre cuotas seleccionadas en `tenant_portal`
- lectura contable derivada y exportaciones `CSV`/`JSON` de `finance loans` en `tenant_portal`
- alta básica de una transacción en `finance`
- carga de adjunto sobre transacción creada en `finance`
- anulación básica de una transacción creada en `finance`
- conciliación básica de una transacción creada en `finance`
- visibilidad de datos ya importados desde `ieris_app` en `business-core` y `maintenance`
- visibilidad de la política tenant de auto-sync `maintenance -> finance` desde `Resumen técnico`

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

Se prioriza `empresa-bootstrap` como baseline browser estable del repo para no mezclar la automatización con el tenant operativo `empresa-demo`.

Si tu entorno no tiene `empresa-bootstrap` operativo o usa otra clave, sobreescribe `E2E_TENANT_*`.

## Secuencia corta para otra IA

Si otra IA tiene que correr la baseline sin rearmar el contexto del proyecto, esta es la secuencia mínima recomendada:

1. confirmar backend en `127.0.0.1:8000`
2. confirmar tenant baseline `empresa-bootstrap`
3. validar el spec de importación/mantenciones:

```bash
cd /home/felipe/platform_paas/frontend
npx playwright test e2e/specs/tenant-portal-business-core-maintenance-import.smoke.spec.ts --list
```

4. correr baseline tenant:

```bash
cd /home/felipe/platform_paas/frontend
npm run e2e:tenant
```

5. si falla `webServer`, usar:

```bash
cd /home/felipe/platform_paas/frontend
E2E_USE_EXISTING_FRONTEND=1 npm run e2e:tenant
```

o el helper institucional:

```bash
cd /home/felipe/platform_paas
scripts/dev/run_local_browser_baseline.sh --target tenant
```

Qué debe validar esa IA en `maintenance`:

- `Resumen técnico`
- `Pendientes`
- `Costos y cobro`
- `Sincronización automática a finanzas`

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
- matriz visible por rol en `platform_admin` validada para `admin` y `support`, incluyendo redirecciones y modo solo lectura en `Usuarios de plataforma`
- `Billing` validado para workspace tenant con evento persistido y reconcile individual desde la fila visible
- `Billing` validado también para reconcile batch de eventos filtrados dentro del workspace tenant
- `Histórico tenants` validado para filtros, exportaciones `CSV/JSON` y apertura/cierre del detalle histórico visible
- `Provisioning` validado al menos para visibilidad de jobs nuevos disparados desde `Tenants`
- `Provisioning` validado también para ejecutar manualmente un job `pending` desde la consola
- `Provisioning` validado también para reencolar un job `failed` desde la consola
- `Provisioning` validado también para disparar `schema auto-sync` desde la toolbar
- `Provisioning` ya tiene además un smoke broker-only para reencolar una fila DLQ individual desde la tabla de resultados
- `Provisioning` ya tiene además un smoke broker-only para reencolar filas DLQ filtradas en lote
- `Provisioning` ya tiene además un smoke broker-only para validar filtros DLQ por `error contains` y confirmar opciones de requeue individual
- `tenant_portal` ya cubre además enforcement visible de límites de usuarios activos con overrides preparados de forma determinista
- `tenant_portal` ya cubre además login permitido cuando el tenant está `past_due` pero sigue en gracia, y bloqueo visible cuando la deuda vencida ya corta el acceso
- `tenant_portal` ya cubre además bloqueo por cuota `core.users.admin` al crear un admin extra y al intentar reactivar un admin inactivo
- `tenant_portal` ya cubre además bloqueo por `core.users.monthly` al intentar crear usuarios después de agotar el cupo del mes
- `tenant_portal` ya cubre además enforcement visible de límites de `finance.entries` bloqueando nuevas transacciones cuando el tenant queda al límite
- `tenant_portal` ya cubre además la precedencia visible del límite total `finance.entries` cuando coincide con `finance.entries.monthly`
- `tenant_portal` ya cubre además enforcement de `finance.entries.monthly` bloqueando nuevas transacciones cuando el tenant alcanza el cupo mensual
- `tenant_portal` ya cubre además enforcement de `finance.entries.monthly.income` y `finance.entries.monthly.expense` bloqueando nuevas transacciones según el tipo del movimiento
- `tenant_portal` ya cubre además el mantenimiento operativo de cuentas y categorías (`create`, `deactivate`, `delete`) dentro de `finance`
- `tenant_portal` ya cubre además el flujo base de presupuestos con alta mensual y clonación al mes visible
- `tenant_portal` ya cubre además plantillas y ajustes guiados de presupuestos sobre el mes visible
- `tenant_portal` ya cubre además la configuración operativa de `finance` sobre monedas, tipos de cambio y parámetros base
- `tenant_portal` ya cubre además el flujo base de préstamos con alta de cartera y pago simple de cuota
- `tenant_portal` ya cubre además pago en lote y reversa en lote de cuotas sobre préstamos seleccionados
- `tenant_portal` ya cubre además lectura contable derivada y exportaciones de préstamos tras pago y reversa
- `tenant_portal` ya cubre además visibilidad real de datos importados desde `ieris_app` en `business-core` y `maintenance`
- `tenant_portal` ya cubre además visibilidad de la política tenant para sincronización automática `maintenance -> finance` en `Resumen técnico`
- `tenant_portal` con `empresa-bootstrap` pasando
- flujo `finance` cubierto en creación, adjunto, anulación y conciliación
- datos importados validados al menos para:
  - organizaciones (`Ieris Ltda`)
  - clientes (`Cecilia Tabales`)
  - tipos de equipo (`heat pipe`)
  - órdenes de trabajo (`Mantención sst`)
- suite `platform_admin` validada en local con `12 passed` y `3 skipped` broker-only
- los `3` escenarios broker-only de DLQ quedaron además verificados explícitamente en un stack paralelo local con backend `broker` + Redis, con `3 passed`
- suite `tenant_portal` validada en local con `22 passed`
- el stack browser principal ya quedó prácticamente cerrado; lo siguiente pasa a ser regresión incremental cuando aparezcan nuevos bordes reales

## Comandos

Desde `frontend/`:

```bash
npm run e2e:install
npm run e2e
```

Baseline local consolidada desde la raíz del repo:

```bash
scripts/dev/run_local_browser_baseline.sh
```

Variantes útiles del script:

```bash
scripts/dev/run_local_browser_baseline.sh --target platform
scripts/dev/run_local_browser_baseline.sh --target tenant
scripts/dev/run_local_browser_baseline.sh --platform-only
scripts/dev/run_local_browser_baseline.sh --tenant-only
scripts/dev/run_local_browser_baseline.sh --skip-build
```

Limpieza posterior de tenants efímeros `e2e-*`:

```bash
cd /home/felipe/platform_paas/backend
PYTHONPATH=/home/felipe/platform_paas/backend \
/home/felipe/platform_paas/platform_paas_venv/bin/python \
app/scripts/cleanup_e2e_tenants.py --apply
```

Ese script usa el lifecycle seguro `archive -> deprovision -> delete`, por lo que no deja bases tenant ni jobs colgando en `platform_control`.

Validación local broker-only de DLQ:

```bash
scripts/dev/run_local_broker_dlq_baseline.sh
```

Ese helper levanta un backend paralelo con `PROVISIONING_DISPATCH_BACKEND=broker`, un frontend paralelo apuntando a ese backend y ejecuta exclusivamente los `3` smokes DLQ broker-only.

También admite un subset concreto:

```bash
scripts/dev/run_local_broker_dlq_baseline.sh --target batch
scripts/dev/run_local_broker_dlq_baseline.sh --target row
scripts/dev/run_local_broker_dlq_baseline.sh --target filters
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

Institucionalización del baseline:

- el baseline browser oficial queda automatizado en GitHub Actions mediante [.github/workflows/frontend-browser-e2e.yml](../../.github/workflows/frontend-browser-e2e.yml)
- el workflow prepara PostgreSQL efímero, crea `platform_control`, corre migraciones, siembra `seed_frontend_demo_baseline`, levanta backend local y ejecuta `build + e2e:platform + e2e:tenant`
- además conserva como artefactos el reporte HTML de Playwright, los resultados crudos y el log backend para acelerar la depuración cuando falle CI
- cuando se dispara manualmente, ese workflow acepta `target=all|platform|tenant` para revalidar solo la mitad afectada de la baseline principal
- esto convierte la cobertura browser actual en un check estándar de regresión para cambios de `frontend`, `backend` y contratos operativos asociados
- los smokes DLQ broker-only no bloquean ese baseline estándar porque en CI principal siguen quedando como `skip` sobre backend `database`; su validación broker real sigue siendo una pasada específica complementaria
- para ejecución local repetible existe además [scripts/dev/run_local_browser_baseline.sh](../../scripts/dev/run_local_browser_baseline.sh), pensado para developers que quieren reproducir el baseline sin recordar la secuencia completa manual
- ese helper local también acepta `--target all|platform|tenant` para revalidar solo el subset afectado sin correr siempre toda la baseline principal
- para la validación complementaria broker-only existe además [scripts/dev/run_local_broker_dlq_baseline.sh](../../scripts/dev/run_local_broker_dlq_baseline.sh), pensado para reproducir los smokes DLQ sin rearmar manualmente el stack paralelo
- para una pasada CI manual de esos mismos `3` smokes broker-only existe [.github/workflows/frontend-broker-dlq-e2e.yml](../../.github/workflows/frontend-broker-dlq-e2e.yml), que prepara PostgreSQL + Redis y ejecuta únicamente ese bloque DLQ
- el `workflow_dispatch` de ese job permite escoger `target=all|batch|row|filters` para revalidar solo el subset afectado cuando el cambio no toca todo el bloque DLQ

Notas del flujo `finance` que conviene recordar:

- el smoke tenant validado usa `empresa-bootstrap` como baseline activo de esta iteración
- la subida de imágenes en transacciones comprime el archivo antes de enviarlo
- cuando la imagen se comprime, el nombre visible final del adjunto puede cambiar a extensión `webp`
- los smokes de límites tenant ya no dependen de preparar overrides por UI de `Tenants`; usan control DB para fijar y limpiar estado reproducible
- el smoke de roles `platform_admin` crea usuarios efímeros `admin` y `support` para congelar la navegación visible, la redirección por ruta y el modo solo lectura sin depender de seeds manuales
- el smoke de `Billing` crea un tenant efímero y siembra un evento `invoice.payment_failed` controlado directamente en la DB de control para validar el workspace tenant y el reconcile individual sin depender de webhooks externos
- el smoke batch de `Billing` reutiliza la misma siembra backend-control con dos eventos del mismo filtro para validar `Reconciliar eventos filtrados` sin depender de webhooks externos
- el smoke de `Histórico tenants` recorre `create -> billing seed -> archive -> delete` sobre un tenant efímero para validar el archivo real sin tocar fixtures manuales
- el smoke de login billing tenant reutiliza el baseline `empresa-bootstrap`, siembra estados de billing controlados y luego restaura el tenant a `active` al finalizar para no ensuciar la suite
- el smoke admin de `tenant users` prepara primero un admin inactivo efímero y luego fija `core.users.admin=1` para comprobar el borde real de reactivación bloqueada sin depender de fixtures manuales
- el smoke mensual de `tenant users` usa snapshot real de uso y una siembra determinista con `created_at` del mes actual para fijar `core.users.monthly` sin asumir conteos hardcodeados
- el smoke de precedencia de `finance` fija en paralelo `finance.entries` y `finance.entries.monthly` para confirmar que el error visible y el `403` priorizan el límite total
- el smoke mensual de `finance` usa además un snapshot real del uso tenant para fijar `finance.entries.monthly` sin asumir conteos hardcodeados
- el smoke mensual por tipo de `finance` reutiliza ese snapshot real para fijar `finance.entries.monthly.income` y `finance.entries.monthly.expense` sin depender de conteos estáticos
- el smoke de catálogos `finance` usa registros efímeros con nombres únicos para validar alta, desactivación y borrado seguro sin depender del catálogo inicial
- el smoke de presupuestos usa meses futuros efímeros para evitar colisiones con planificación real y verificar alta + clonación sin ensuciar meses operativos actuales
- el smoke avanzado de presupuestos crea una categoría efímera, aplica la plantilla `previous_month` con escala/redondeo y ejecuta un ajuste guiado de desactivación para validar foco operativo sin depender de datos fijos
- el smoke de configuración financiera usa códigos y claves efímeras para validar creación, activación/desactivación y limpieza segura de monedas, tipos de cambio y parámetros del módulo
- el smoke de préstamos usa un préstamo efímero con 3 cuotas para validar la ruta mínima `create -> schedule -> payment` sin depender de cartera previa
- el smoke batch de préstamos reutiliza un préstamo efímero con 3 cuotas para validar `schedule -> batch payment -> batch reversal` sobre selección múltiple
- el smoke contable de préstamos reutiliza un préstamo efímero con pago + reversa simple para verificar la tabla de lectura derivada y las descargas `finance-loan-accounting-*.csv/json`
- ambos smokes de préstamos quedaron endurecidos contra variaciones legítimas de UI: cronograma ya expandido, formularios de pago con etiquetas parecidas y selects que cambian de posición según el modo
- no hubo parche funcional en frontend/backend de `finance loans` porque la evidencia mostró que el comportamiento de producto era correcto; lo inestable eran los locators y supuestos del smoke

## Estado de cierre actual

Con la validación local actual, el frente E2E browser queda cubierto en lo principal para:

- `platform_admin`
  - navegación y acceso
  - lifecycle base tenant
  - acceso rápido al `tenant_portal`
  - política visible por rol
  - `Provisioning` principal y variantes broker-only
  - `Billing` individual y batch
  - `Histórico tenants`
- `tenant_portal`
  - login base y login condicionado por billing
  - enforcement visible de límites de usuarios
  - slice amplio de `finance`

Lo que sigue después de este punto ya no es un hueco obvio de cobertura base, sino regresión incremental cuando aparezcan:

- nuevos bordes funcionales reales
- cambios de UX relevantes
- nuevos módulos tenant o administrativos

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
