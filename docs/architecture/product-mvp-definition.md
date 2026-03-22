# Definicion de MVP

Este documento deja explicito que se considera "app usable" en el estado actual del proyecto.

La idea es evitar que el alcance siga creciendo de forma implícita.

## MVP Tecnico Ya Cerrado

El backend base se considera cerrado cuando cubre:

- auth `platform` y `tenant`
- multi-tenant con `platform_control` y DBs por tenant
- provisioning base
- lifecycle, maintenance y billing basicos
- cuotas, entitlements y access policy
- observabilidad, errores, tests y operacion base

Referencia:

- `docs/architecture/backend-closure-status.md`

## MVP de Producto Recomendado

La app puede considerarse usable cuando exista esto:

### Platform Admin

- login platform
- shell base
- dashboard leyendo `GET /platform/capabilities`
- listado de tenants
- detalle de tenant
- acciones administrativas minimas:
  - status
  - maintenance
  - plan
  - billing
- vistas operativas minimas de provisioning
- vistas operativas minimas de billing

### Backend

- contratos usados por frontend estables
- errores consistentes con `request_id`
- acceso tenant gobernado por policy efectiva
- observabilidad minima activa

## Lo que NO entra en este MVP

- portal tenant completo
- dashboards ricos o BI
- modulos adicionales mas alla de `core` y `finance`
- automatizaciones avanzadas de billing con multiples proveedores
- UI exhaustiva para cada detalle operativo del worker

## Criterio Practico de "App Usable"

La app ya es usable si un operador puede:

1. entrar a `platform_admin`
2. ver tenants
3. entender el estado operativo y de billing de un tenant
4. ejecutar acciones administrativas basicas
5. ver lo esencial de provisioning y billing sin usar `curl`

## Que Cambios Siguen Aceptandose Despues del MVP

Despues del MVP, backend y frontend pueden seguir creciendo, pero por estas razones:

- feedback de uso real
- cierre de huecos operativos detectados
- nuevos modulos de negocio
- refinamiento UX

No por seguir expandiendo alcance base indefinidamente.
