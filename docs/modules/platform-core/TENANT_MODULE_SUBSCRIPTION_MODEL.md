# Tenant Module Subscription Model

Definición formal del modelo comercial y técnico para la `Etapa 15. Registro y Activación de Módulos`.

Estado actual:

- decisión de producto: `Aprobada`
- implementación repo/control model: `Primer corte técnico completado`
- implementación runtime: `Pendiente de promoción por ambiente`
- política vigente de activación efectiva mientras no se resuelva la suscripción tenant: `plan-driven`

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

Mientras la activación efectiva no se resuelva todavía desde suscripciones, la operación visible sigue siendo:

- catálogo backend-driven por `plan`
- activación tenant-side `plan-driven`

El primer corte técnico ya existe en `platform_control` y deja modelado:

- `tenant_base_plan_catalog`
- `tenant_module_catalog`
- `tenant_module_price_catalog`
- `tenant_subscriptions`
- `tenant_subscription_items`
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

## Siguiente corte técnico recomendado

1. promover el modelo nuevo a `staging` y `production`
2. resolver lectura y gestión tenant-side desde:
   - `tenant_subscriptions`
   - `tenant_subscription_items`
3. separar habilitación técnica efectiva de contrato comercial
4. adaptar `Configuración` y `Tenants > Plan y módulos` al nuevo catálogo base + add-ons
5. recién después conectar billing, grace y suspensión sobre esa misma base
