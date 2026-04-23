# Tenant Module Subscription Model

Definición formal del modelo comercial y técnico para la `Etapa 15. Registro y Activación de Módulos`.

Estado actual:

- decisión de producto: `Aprobada`
- implementación repo/control model: `Contratación formal desde consola completada`
- implementación runtime: `Contratación formal promovida en staging y production`
- política vigente de activación efectiva: `tenant_subscriptions` como fuente principal, con fallback legacy por `plan_code` solo como compatibilidad residual cuando todavía aparezca un tenant legacy fuera del set activo ya migrado
- alta nueva de tenant: `Contract-managed desde creación`

## Objetivo

Dejar de pensar la activación modular solo como:

- un `plan` con todos los módulos embebidos
- o excepciones manuales por tenant

Y pasar a un modelo explícito:

- `Plan Base` obligatorio por tenant
- `finance` siempre incluido dentro del `Plan Base`
- módulos adicionales arrendables por suscripción

## Modelo comercial aprobado

Todo tenant debe contratar siempre un `Plan Base`.

Ese `Plan Base` incluye al menos:

- tenant activo
- módulo `finance`
- acceso base a la plataforma
- configuración general del tenant
- soporte base
- límites base que se definan por producto

Encima de eso, el tenant puede arrendar módulos adicionales, por ejemplo:

- `maintenance`
- `iot`
- `crm`
- `documental`
- `agenda`
- otros futuros

## Ciclos comerciales aprobados

Los módulos arrendables deben normalizarse en estos ciclos:

- `monthly`
- `quarterly`
- `semiannual`
- `annual`

No conviene permitir ciclos arbitrarios.

## Política comercial aprobada

- todo tenant debe tener `Plan Base` activo
- `finance` no se puede desactivar mientras exista el tenant
- los módulos adicionales se activan por suscripción
- puede haber uno o varios módulos adicionales activos al mismo tiempo
- el alta a mitad de ciclo debe soportar prorrateo
- la renovación debe tender a una sola fecha alineada por tenant
- el vencimiento de un módulo no debe borrar datos
- el vencimiento puede pasar por:
  - `grace_period`
  - luego `suspended`
- cuando un módulo vence, la primera degradación recomendada es lectura o acceso restringido, no borrado

## Separación obligatoria de conceptos

La implementación futura debe separar siempre tres capas:

### 1. Catálogo comercial

Qué se vende.

Ejemplos:

- `BASE_PLAN`
- `MOD_MAINTENANCE`
- `MOD_IOT`

### 2. Suscripción comercial del tenant

Qué contrató realmente ese tenant.

Ejemplos:

- base activa
- maintenance trimestral
- iot mensual

### 3. Habilitación técnica efectiva

Qué módulos quedan realmente encendidos para ese tenant.

Ejemplos:

- `finance = enabled`
- `maintenance = enabled`
- `iot = suspended`

No se debe mezclar `módulo contratado` con `módulo técnicamente habilitado`.

## Regla importante sobre dependencias

Las dependencias técnicas entre módulos no obligan a vender ambos módulos por separado.

Ejemplo:

- si `maintenance` depende técnicamente de `core`, eso no implica cobrar ambos como productos distintos
- comercialmente puede venderse `maintenance`
- técnicamente el sistema puede habilitar la dependencia requerida por debajo

## Política de renovación recomendada

Se aprueba como dirección recomendada la `co-terminación`:

- una fecha principal de renovación por tenant
- si se agrega un módulo a mitad de ciclo, se prorratea
- en la siguiente renovación, todo queda alineado al ciclo principal

## Estados mínimos recomendados

### Suscripción base del tenant

- `active`
- `grace_period`
- `suspended`
- `cancelled`
- `expired`

### Suscripción por módulo adicional

- `pending`
- `active`
- `scheduled_cancel`
- `grace_period`
- `suspended`
- `expired`

No es obligatorio implementar todos en el primer corte, pero la arquitectura debe permitirlos.

## UX objetivo

### Configuración

Debe exponer:

- catálogo del `Plan Base`
- catálogo de módulos arrendables
- ciclos permitidos
- dependencias técnicas entre módulos

### Tenants

Debe separar:

- `Plan Base`
- módulos adicionales activos
- módulos disponibles para contratar
- próxima renovación
- estado comercial

### Tenant-side o vista comercial futura

Debe poder mostrar:

- plan base actual
- módulos activos
- módulos disponibles
- ciclo de renovación
- estado de pago
- historial de activaciones y cancelaciones

## Diseño técnico recomendado

La información comercial debe vivir en `platform_control`, no en cada tenant DB.

La DB tenant debe seguir guardando solo los datos operativos del cliente.

### Entidades recomendadas

Catálogo:

- `module_catalog`
- `base_plan_catalog`
- `module_price_catalog`

Suscripción tenant:

- `tenant_subscriptions`
- `tenant_subscription_items`

Donde:

- `tenant_subscriptions` representa la suscripción global del tenant
- `tenant_subscription_items` representa cada componente contratado:
  - base
  - maintenance
  - iot
  - crm
  - etc.

## Regla de transición

La transición vigente ya no es `plan-driven puro`.

Hoy la operación visible queda así:

- catálogo backend-driven por `plan`
- activación tenant-side efectiva desde `tenant_subscriptions`
- fallback legacy por `plan_code` solo cuando todavía hace falta compatibilidad en tenants legacy todavía no migrados fuera del set activo actual

El primer corte técnico ya existe en `platform_control` y deja modelado:

- `tenant_base_plan_catalog`
- `tenant_module_catalog`
- `tenant_module_price_catalog`
- `tenant_subscriptions`
- `tenant_subscription_items`
- `module_subscription_catalog` expuesto desde `/platform/capabilities`

## Estado del primer corte técnico

El primer corte técnico ya quedó:

- validado en repo con `migration_flow` y `platform_flow`
- promovido en `staging` y `production`
- ejecutado con backend deploy completo `531 tests OK` por ambiente

Resultado operativo:

- sin migraciones de control pendientes en ambos carriles
- `tenant_schema_sync` verde por ambiente
- auditoría activa multi-tenant en verde:
  - `staging`: `processed=4, warnings=0, failed=0`
  - `production`: `processed=4, warnings=0, failed=0, accepted_tenants_with_notes=1`

## Estado del corte de migración legacy

La transición contractual ya no depende solo de cambios manuales en consola:

- existe mutación formal:
  - `POST /platform/tenants/{tenant_id}/subscription/migrate-legacy`
- existe script batch:
  - [migrate_legacy_tenant_contracts.py](/home/felipe/platform_paas/backend/app/scripts/migrate_legacy_tenant_contracts.py)
- `set_subscription_contract(...)` ya retira `plan_code` por defecto al guardar el contrato

Estado actual validado:

- `staging`: `processed=4, migrated=0, skipped=4, failed=0, mode=audit`
- `production`: `processed=4, migrated=0, skipped=4, failed=0, mode=audit`

Esto deja a los 4 tenants activos de ambos ambientes ya gestionados por contrato y sin `plan_code`.

## Estado del corte de alta nueva contractual

La creación de tenants nuevos ya no debe depender del baseline legacy:

- `POST /platform/tenants` acepta `base_plan_code`
- `plan_code` queda solo como compatibilidad heredada de entrada
- el tenant nuevo nace con:
  - `plan_code = null`
  - `tenant_subscriptions`
  - `tenant_subscription_items`
- `Tenants > Nuevo tenant` ya pide `Plan Base inicial`
- el bootstrap de provisioning ya resuelve módulos desde `effective_enabled_modules`

Resultado operativo actual:

- los tenants activos de `staging` y `production` no necesitan fallback legacy para operar
- el fallback `plan_code` queda acotado a compatibilidad histórica y a un eventual tenant legacy futuro
  - `production`: `processed=4, warnings=0, failed=0, accepted_tenants_with_notes=1`
- expansión de `GET /platform/capabilities` con:
  - `subscription_activation_model`
  - `subscription_billing_cycles`
  - `base_plan_catalog`
  - `module_subscription_catalog`

Pero el siguiente corte de la `Etapa 15` ya no debe diseñarse como:

- excepciones libres por tenant

Sino como:

- `Plan Base` obligatorio
- más `suscripciones por módulo`

## Estado visible actual

Además del corte técnico ya promovido, la consola visible ya quedó adaptada así:

1. `Configuración` ya expone:
   - `Planes base`
   - `Módulos arrendables`
   - `Ciclos comerciales`
   - `Política efectiva actual por plan`
2. `Tenants > Plan y módulos` ya expone:
   - `Plan Base aprobado`
   - `Contrato comercial tenant`
   - `Plan operativo actual`
   - add-ons visibles
   - ciclos visibles
   - dependencias cubiertas o no
3. la consola ya deja visible:
   - base plan de suscripción
   - add-ons arrendados
   - módulos técnicos
   - fallback legacy cuando aplica
   - fuente efectiva de activación
4. la consola ya permite además:
   - contratar add-ons desde `Tenants > Plan y módulos`
   - fijar ciclo comercial por tenant y por add-on
   - programar salida de un add-on al cierre del período al desmarcarlo
   - mantener separado el `Baseline legacy por plan_code`
5. política comercial efectiva ya conectada:
   - `billing`, `grace` y `suspensión` ya se evalúan primero desde `tenant_subscriptions`
   - los eventos y campos `billing_*` siguen existiendo como compatibilidad/proyección
   - el fallback legacy de módulos ya no se aplica a tenants con contrato ya gestionado en el modelo nuevo
6. baseline técnico efectivo ya alineado:
   - tenants gestionados por contrato ya resuelven el baseline de cuotas/límites desde el `Plan Base`
   - `read/write rate limits`, módulos base habilitados y `module_limits` ya no salen de `plan_code` para esos tenants
   - `plan_code` queda como compatibilidad solo para tenants legacy
   - `Configuración` ya muestra el baseline resuelto del `Plan Base` con compatibilidad, cuotas y límites
   - `Tenants > Plan y módulos` ya expone:
     - `Modelo contractual`
     - `Fuente baseline`
     - si el tenant sigue en legacy o ya está gestionado por contrato

## Siguiente corte técnico recomendado

1. migrar los tenants legacy restantes al modelo contractual nuevo
2. retirar luego el fallback legacy total por `plan_code`
3. seguir manteniendo separada la habilitación técnica efectiva del contrato comercial
4. recién después cerrar la limpieza final del baseline legacy en consola y API
