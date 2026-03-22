# Contratos Backend Estables para Frontend

Este documento deja claro que endpoints del backend ya pueden considerarse contratos relativamente estables para frontend y cuales siguen mas expuestos a cambio.

No reemplaza `docs/api/index.md`; lo complementa.

## Fuente de Verdad Recomendada

Orden recomendado para frontend:

1. contratos estables de este documento
2. `GET /platform/capabilities` para catalogos y claves dinamicas
3. `docs/api/index.md` para ejemplos y payloads
4. `GET /openapi.json` como fuente cruda generada por FastAPI

## Contratos Estables para F1 y F2

Estos ya pueden usarse sin miedo razonable en el arranque del frontend `platform_admin`.

| Endpoint | Uso |
| --- | --- |
| `POST /platform/auth/login` | login platform |
| `POST /platform/auth/refresh` | rotacion de sesion |
| `POST /platform/auth/logout` | cierre de sesion |
| `GET /platform/capabilities` | catalogo backend-driven para estados, modulos y cuotas |
| `GET /health` | healthcheck de base |

## Contratos Estables para Operacion Tenant

Estos son base para `F3` y `F4`.

| Endpoint | Uso |
| --- | --- |
| `POST /platform/tenants/` | crear tenant |
| `GET /platform/tenants/` | listado base de tenants para panel platform |
| `GET /platform/tenants/{tenant_id}` | detalle base de tenant |
| `PATCH /platform/tenants/{tenant_id}/status` | lifecycle |
| `PATCH /platform/tenants/{tenant_id}/maintenance` | maintenance |
| `PATCH /platform/tenants/{tenant_id}/plan` | plan |
| `PATCH /platform/tenants/{tenant_id}/rate-limit` | cuotas HTTP del tenant |
| `PATCH /platform/tenants/{tenant_id}/module-limits` | cuotas funcionales por clave |
| `PATCH /platform/tenants/{tenant_id}/billing` | billing manual |
| `PATCH /platform/tenants/{tenant_id}/billing-identity` | identidad externa de billing |
| `GET /platform/tenants/{tenant_id}/access-policy` | lectura de politica efectiva |
| `GET /platform/tenants/{tenant_id}/module-usage` | uso y limites por modulo |
| `GET /platform/tenants/{tenant_id}/policy-history` | historial administrativo |

## Contratos Estables para Vista Tenant

Estos ya son buena base para el futuro portal tenant.

| Endpoint | Uso |
| --- | --- |
| `POST /tenant/auth/login` | login tenant |
| `POST /tenant/auth/refresh` | refresh tenant |
| `POST /tenant/auth/logout` | logout tenant |
| `GET /tenant/info` | estado tenant, plan, billing y cuotas efectivas |
| `GET /tenant/module-usage` | resumen de uso por modulo |
| `GET /tenant/finance/usage` | uso especifico de finance |

## Contratos Estables para Provisioning y Billing Operativo

Estos ya son utilizables por frontend `platform_admin`, pero su UI puede madurar bastante.

Provisioning:

- `GET /platform/provisioning-jobs/metrics`
- `GET /platform/provisioning-jobs/metrics/history`
- `GET /platform/provisioning-jobs/metrics/by-job-type`
- `GET /platform/provisioning-jobs/metrics/by-error-code`
- `GET /platform/provisioning-jobs/metrics/alerts`
- `GET /platform/provisioning-jobs/broker/dlq`
- `POST /platform/provisioning-jobs/{job_id}/requeue`

Billing:

- `GET /platform/tenants/{tenant_id}/billing/events`
- `GET /platform/tenants/{tenant_id}/billing/events/summary`
- `POST /platform/tenants/{tenant_id}/billing/events/{sync_event_id}/reconcile`
- `POST /platform/tenants/{tenant_id}/billing/events/reconcile`
- `GET /platform/tenants/billing/events/summary`
- `GET /platform/tenants/billing/events/alerts`
- `GET /platform/tenants/billing/events/alerts/history`

## Contratos que Deben Tratarse Como Evolutivos

Estos pueden cambiar mas facilmente por necesidades operativas o por mayor detalle futuro:

- payloads de metricas muy especializadas de provisioning
- filtros avanzados de DLQ
- formas de exportacion externa
- detalles finos del webhook de billing
- endpoints muy atados a broker interno o scoring del worker

Regla practica:

- si una pantalla depende de estados core, quotas, billing basico o access policy, el contrato ya es bastante estable
- si depende de metricas hiperoperativas o detalles internos del worker, asume evolucion

## Reglas para Cambios Backend que Impactan Frontend

Antes de cambiar un contrato ya considerado estable:

1. actualizar `docs/api/index.md`
2. actualizar este documento si cambia el nivel de estabilidad
3. preservar nombres y semantica cuando sea posible
4. si el cambio rompe UI, preferir agregar campos antes que reemplazarlos
5. si la ruptura es inevitable, cambiar pantalla y backend de forma coordinada

## Regla Especial para Capacidades

Frontend no debe hardcodear:

- `tenant_statuses`
- `tenant_billing_statuses`
- `maintenance_scopes`
- `maintenance_access_modes`
- `supported_module_limit_keys`
- `module_limit_capabilities`

La fuente de verdad para eso es `GET /platform/capabilities`.
