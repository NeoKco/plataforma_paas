# E2E Browser

Primer corte de pruebas `browser` del frontend con `Playwright`.

Cobertura inicial:

- login de `platform_admin`
- navegación base de `platform_admin`
- login de `tenant_portal`
- smoke real de `finance` creando una transacción
- smoke de adjuntos en `finance`
- smoke de anulación en `finance`
- smoke de conciliación en `finance`

Specs actuales:

- [platform-admin.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin.smoke.spec.ts)
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
