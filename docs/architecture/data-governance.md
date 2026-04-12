# Gobernanza de Datos

Este documento fija la gobernanza mínima de datos para `platform_paas`.

No reemplaza la gobernanza de implementación. La complementa.

Su objetivo es dejar explícito:

- quién es dueño de cada dato
- qué tipo de dato es
- cómo debe validarse
- cuándo se archiva, migra o elimina
- cómo deben integrarse los módulos sin duplicar verdad

Debe leerse junto con:

- [Gobernanza de implementacion](./implementation-governance.md)
- [Mapa de dominios del PaaS](./domain-map.md)
- [Modelo multi-tenant](./multi-tenant-model.md)
- [Estandar de construccion de modulos](./module-build-standard.md)

## Objetivo

La regla central es esta:

- cada dato crítico debe tener un dominio dueño
- cada integración entre módulos debe respetar esa propiedad
- ningún módulo debe duplicar una verdad compartida solo por conveniencia de UI

## Clasificación base de datos

Todo dato relevante del PaaS debe caer en una de estas clases:

### 1. Datos maestros

Definen identidad o taxonomía compartida y suelen cambiar poco.

Ejemplos:

- organizaciones
- clientes
- contactos
- sitios
- activos
- perfiles funcionales
- tipos de tarea
- grupos de trabajo
- cuentas
- categorías financieras
- monedas

### 2. Datos operativos

Representan trabajo vivo o flujo transaccional del sistema.

Ejemplos:

- órdenes de trabajo
- visitas
- programaciones preventivas
- due items
- transacciones financieras
- presupuestos
- préstamos
- jobs de provisioning

### 3. Datos de configuración

Controlan comportamiento, límites o defaults.

Ejemplos:

- módulos habilitados por plan
- políticas tenant
- moneda base
- seeds por vertical
- defaults por contrato

### 4. Datos auditables

Sirven para soporte, trazabilidad, observabilidad o cumplimiento.

Ejemplos:

- activity logs
- status logs
- auditoría de transacciones
- artifacts de portabilidad
- historial de provisioning

## Regla de ownership por dominio

Cada dominio es dueño de su verdad principal.

### `platform-core`

Dueño de:

- identidad de plataforma
- tenants
- planes
- provisioning
- billing
- políticas transversales

### `business-core`

Dueño de:

- organizaciones
- clientes
- contactos
- sitios
- activos
- grupos de trabajo
- perfiles funcionales
- tipos de tarea

### `maintenance`

Dueño de:

- instalaciones
- work orders
- schedules
- due items
- visitas
- checklist y evidencias
- costeo operativo

No es dueño de:

- clientes
- sitios
- grupos
- perfiles
- tipos de tarea

### `finance`

Dueño de:

- transacciones
- cuentas
- categorías
- monedas
- settings financieros
- presupuestos
- préstamos

No es dueño de:

- identidad maestra del cliente
- lifecycle operativo de mantenciones

## Regla de integración entre módulos

Los módulos se integran por referencia y contrato, no por duplicación libre.

Ejemplos oficiales:

- `maintenance` referencia entidades de `business-core`
- `maintenance` puede sincronizar resultado económico hacia `finance`
- `platform-core` define contrato modular y bootstrap, pero no reemplaza la lógica del dominio tenant

## Regla de contratos de datos

Todo cruce entre módulos debe dejar claro:

- dato de origen
- módulo dueño
- módulo consumidor
- momento del sync
- campos derivados
- campos editables
- precedencia cuando hay conflicto

Si un flujo no puede explicarse con esa matriz, el contrato todavía no está bien cerrado.

## Regla de defaults y seeds

Los defaults no son datos “de muestra”. Son parte del contrato operativo.

### Reglas

- deben ser idempotentes
- deben respetar ownership del dominio
- no deben borrar operación ya existente
- deben distinguir bootstrap inicial de backfill posterior cuando haga falta
- deben documentarse en el roadmap/changelog del dominio afectado

### Casos actuales cerrados

- `core` puede sembrar baseline mínimo de `business-core`
- `core` o `finance` pueden sembrar baseline financiero
- `CLP` es la moneda base efectiva por defecto para tenants nuevos o sin uso financiero
- el catálogo financiero mezcla familias `Casa - ...` y `Empresa - ...` sin romper la unicidad vigente

## Regla de calidad de datos

La calidad mínima obligatoria incluye:

- unicidad donde el dominio la necesita
- normalización de nombres o identificadores cuando aplique
- protección backend contra duplicados
- validación de referencias cruzadas
- compatibilidad con archivo o desactivación segura

La UI puede ayudar, pero nunca es la última barrera.

## Regla de eliminación, archivo y retención

Principio operativo:

- si el dato tiene historial operativo, financiero o auditable, preferir `archive/deactivate`
- el `delete` físico debe ser excepcional y protegido

### Casos típicos

- catálogos compartidos: desactivar antes que borrar
- transacciones financieras: no borrar físicamente
- OTs con historial: reabrir o anular según flujo, no borrar por conveniencia
- tenant portability: no reemplaza backup PostgreSQL

## Regla de portabilidad y migración

Toda exportación/importación debe distinguir:

- respaldo técnico real
- portabilidad funcional
- migración parcial controlada

Regla cerrada:

- backup PostgreSQL por tenant es el respaldo técnico canónico
- CSV/zip portable sirve para portabilidad y migración controlada, no para sustituir backup

## Regla de datos sensibles y de acceso

Aunque el proyecto no tenga aún una política formal de clasificación legal completa, el criterio mínimo es:

- credenciales y secretos nunca viven en defaults inseguros de código
- datos de acceso y configuración sensible deben pasar por entorno seguro
- adjuntos y artifacts deben respetar permisos del dominio y del actor
- no exponer datos técnicos internos en UI sin necesidad operativa

## Regla de evidencia y soporte

Cuando un cambio toca datos críticos, debe dejar evidencia proporcional:

- test backend focalizado
- smoke visible si cambia flujo UI
- runbook si cambia recuperación, seed, sync o portabilidad
- changelog y roadmap del dominio

## Preguntas de control

Antes de cerrar un cambio de datos, responder:

- ¿qué dominio es dueño de este dato?
- ¿este cambio crea una segunda verdad innecesaria?
- ¿el seed/default es idempotente?
- ¿si el tenant ya tiene uso real, el cambio evita resetear operación?
- ¿el contrato entre módulos quedó explícito?
- ¿otra IA puede entender el flujo sin depender del chat?

Si alguna respuesta es `no`, la gobernanza de datos todavía no está bien cerrada.
