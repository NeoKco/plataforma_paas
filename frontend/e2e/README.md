# E2E Browser

Primer corte de pruebas `browser` del frontend con `Playwright`.

Cobertura inicial:

- login de `platform_admin`
- navegación base de `platform_admin`
- lifecycle básico de tenant en `platform_admin` (`create`, `archive`, `restore`)
- acceso rápido al `tenant_portal` desde `Tenants` con slug precargado
- visibilidad de job nuevo en `Provisioning` después de crear tenant
- ejecución manual de un job `pending` desde `Provisioning`
- requeue de un job `failed` desde `Provisioning`
- disparo de `schema auto-sync` desde `Provisioning`
- requeue batch de filas DLQ filtradas desde `Provisioning` cuando el backend usa broker
- login de `tenant_portal`
- smoke real de `finance` creando una transacción
- smoke de adjuntos en `finance`
- smoke de anulación en `finance`
- smoke de conciliación en `finance`

Specs actuales:

- [platform-admin.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin.smoke.spec.ts)
- [platform-admin-tenant-lifecycle.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-lifecycle.smoke.spec.ts)
- [platform-admin-tenant-portal-access.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-tenant-portal-access.smoke.spec.ts)
- [platform-admin-provisioning.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning.smoke.spec.ts)
- [platform-admin-provisioning-run-now.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-run-now.smoke.spec.ts)
- [platform-admin-provisioning-retry.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-retry.smoke.spec.ts)
- [platform-admin-schema-auto-sync.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-schema-auto-sync.smoke.spec.ts)
- [platform-admin-provisioning-dlq.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin-provisioning-dlq.smoke.spec.ts)
- [tenant-portal-finance.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance.smoke.spec.ts)
- [tenant-portal-finance-attachments-void.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-attachments-void.smoke.spec.ts)
- [tenant-portal-finance-reconciliation.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-reconciliation.smoke.spec.ts)

Variables de entorno:

- usar `.env.e2e.example` como referencia
- si tu demo local usa otro tenant o credenciales, sobreescribe `E2E_TENANT_*` y `E2E_PLATFORM_*`
- si `Playwright` no encuentra su browser exacto, puedes apuntar `E2E_CHROMIUM_EXECUTABLE_PATH` a un `chromium` ya instalado
- el baseline actual usa `empresa-demo`, porque ya trae cuentas y datos útiles para el smoke de `finance`
- si tu entorno no tiene ese tenant o usa otra clave, sobreescribe `E2E_TENANT_*`

Comandos útiles:

- `npm run e2e:platform`
- `npm run e2e:tenant`
- `npm run e2e`

Notas:

- el backend debe estar levantado antes de correr las pruebas
- el frontend puede levantarse automáticamente desde `playwright.config.ts`, o reutilizar uno existente con `E2E_USE_EXISTING_FRONTEND=1`
- para instalar el navegador local usa `npm run e2e:install`
- el baseline tenant actualmente validado es `empresa-demo`
- cuando el smoke sube una imagen en `finance`, el frontend la comprime antes del upload y el nombre final visible queda en `WEBP`
- `npm run e2e:platform` ya ejecuta todo el bloque `platform-admin*.spec.ts`, no solo el smoke de login/navegación base
- el smoke de `retry` de provisioning siembra un job `failed` controlado en la DB de control usando el Python del backend; si tu entorno usa otra ruta, sobreescribe `E2E_BACKEND_PYTHON`
- el smoke de DLQ requiere `PROVISIONING_DISPATCH_BACKEND=broker`; si el entorno usa `database`, el spec queda omitido automáticamente
