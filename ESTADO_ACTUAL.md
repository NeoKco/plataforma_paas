# ESTADO_ACTUAL

## Última actualización

- fecha: 2026-04-12
- foco de iteración: acceso rápido al portal tenant + guard de hash inválido en login
- estado general: backend y frontend publicados en `staging` y `production`

## Resumen ejecutivo en 30 segundos

- el login tenant ya no revienta con hashes inválidos (se trata como credencial inválida)
- `Tenants` ahora permite abrir el portal con contraseña temporal tras un reset
- falta validar el flujo visual del botón de acceso rápido

## Qué ya quedó hecho

- [password_service.py](/home/felipe/platform_paas/backend/app/common/security/password_service.py) evita 500 por hashes inválidos
- [TenantsPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/tenants/TenantsPage.tsx) agrega acceso rápido con contraseña temporal
- [TenantLoginPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/pages/auth/TenantLoginPage.tsx) aplica prefill temporal desde sessionStorage

## Qué archivos se tocaron

- [backend/app/common/security/password_service.py](/home/felipe/platform_paas/backend/app/common/security/password_service.py)
- [frontend/src/apps/platform_admin/pages/tenants/TenantsPage.tsx](/home/felipe/platform_paas/frontend/src/apps/platform_admin/pages/tenants/TenantsPage.tsx)
- [frontend/src/apps/tenant_portal/pages/auth/TenantLoginPage.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/pages/auth/TenantLoginPage.tsx)
- [docs/modules/platform-core/USER_GUIDE.md](/home/felipe/platform_paas/docs/modules/platform-core/USER_GUIDE.md)
- [docs/modules/platform-core/CHANGELOG.md](/home/felipe/platform_paas/docs/modules/platform-core/CHANGELOG.md)

## Qué decisiones quedaron cerradas

- no se exponen contraseñas reales; se usa reset + prefill temporal en el navegador actual

## Qué falta exactamente

- validar el botón `Abrir portal con contraseña temporal` desde `Tenants`

## Qué no debe tocarse

- no introducir contraseñas en URL
- no reabrir slices ya cerrados

## Validaciones ya ejecutadas

- deploy backend `staging` -> `523 tests OK`
- deploy backend `production` -> `523 tests OK`
- frontend publish `staging` -> `OK`
- frontend publish `production` -> `OK`

## Bloqueos reales detectados

- pendiente validación UI del acceso rápido

## Mi conclusión

- el backend y frontend ya están publicados; falta validar el flujo de acceso rápido
