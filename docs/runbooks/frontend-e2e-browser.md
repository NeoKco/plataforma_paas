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
- [tenant-portal-finance.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance.smoke.spec.ts)

## Alcance inicial

Cobertura actual:

- login `platform_admin`
- navegación corta a `Tenants` y `Provisioning`
- login `tenant_portal`
- alta básica de una transacción en `finance`
- carga de adjunto sobre transacción creada en `finance`
- anulación básica de una transacción creada en `finance`

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
  - `E2E_TENANT_SLUG=empresa-demo`
  - `E2E_TENANT_EMAIL=admin@empresa-demo.local`
  - `E2E_TENANT_PASSWORD=EmpresaDemoPortal123!`

Se prioriza `empresa-demo` porque ya trae cuentas y datos operativos en `finance`, así que el smoke valida el flujo real con menos bootstrap previo.

Si tu entorno no tiene `empresa-demo` operativo o usa otra clave, sobreescribe `E2E_TENANT_*`.

Comandos separados:

```bash
npm run e2e:platform
npm run e2e:tenant
```

Eso permite validar primero la consola de plataforma y después el flujo tenant con credenciales correctas del entorno.

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

## Siguiente expansión sugerida

Cuando este stack empiece a usarse de verdad, los siguientes specs correctos son:

- create tenant + provisioning desde `platform_admin`
- acceso rápido al `tenant_portal` desde `Tenants`
- archive / restore tenant
- adjuntos y anulación de transacciones en `finance`
- creación de usuario tenant y enforcement de límites
