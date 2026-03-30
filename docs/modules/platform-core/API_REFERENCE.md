# Platform Core API Reference

Referencia resumida del bloque central.

Detalle ampliado:

- [index.md](/home/felipe/platform_paas/docs/api/index.md)
- [frontend-contract-stability.md](/home/felipe/platform_paas/docs/api/frontend-contract-stability.md)

## Áreas principales

- autenticación `platform`
- tenants
- provisioning
- billing
- platform users
- activity
- capabilities

## Endpoints clave

Autenticación:

- `/login`
- `/platform/*` protegidos por JWT `platform`

Tenants:

- `GET /platform/tenants`
- `POST /platform/tenants`
- `GET /platform/tenants/{tenant_id}`
- mutaciones de identity, lifecycle, maintenance, access policy y billing

Provisioning:

- `GET /platform/provisioning-jobs/`
- endpoints de métricas y ejecución de jobs

Billing:

- endpoints `platform/billing/*`

Activity:

- endpoints `platform/activity/*`

Capabilities:

- `GET /platform/capabilities`

## Notas

- la referencia detallada de contratos sigue viviendo en la documentación API general
- este archivo existe para que `platform-core` mantenga el mismo patrón documental que los módulos funcionales
