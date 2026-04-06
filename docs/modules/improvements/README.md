# Improvements by Module

Este documento agrupa mejoras sugeridas para todos los modulos documentados hoy en `docs/modules/`.

Sirve como backlog transversal de evoluciones no bloqueantes. No reemplaza los roadmaps especificos de cada modulo; los complementa.

Regla de uso:

- si una mejora cambia un flujo visible, debe actualizar tambien el roadmap del modulo correspondiente
- si la mejora introduce UI nueva, debe sumar o ajustar su smoke E2E
- si la mejora introduce API nueva, debe sumar o ajustar su documentacion de API

## 1. Business Core

Estado del modulo:

- dominio compartido ya operativo
- taxonomias, organizaciones, clientes, contactos, sitios y memberships ya estabilizados
- duplicados, assets y direcciones organizacionales ya iniciados

Mejoras sugeridas:

- consolidacion profunda de duplicados con merge guiado por campo y no solo reasignacion operativa
- refinamiento de auditoria historica de merges para trazabilidad documental completa
- `organization addresses` mas rica para empresas y proveedores
- mejor cobertura de membresias por grupo con filtros por vigencia y capacidad
- mejor lectura de compatibilidad entre tipos de tarea y perfiles funcionales
- extension de `assets` hacia relaciones mas ricas con `maintenance` e `iot`
- smokes browser mas finos para duplicados, assets y catálogos compartidos

Cobertura E2E sugerida:

- abrir taxonomias compartidas
- validar duplicados y merge guiado
- crear o editar assets
- validar miembros de grupo y compatibilidad de tareas

## 2. Community Core

Estado del modulo:

- aun no es prioridad de implementacion inmediata
- ya existe como dominio definido en documentacion
- esta pensado para la veta residencial y condominios

Mejoras sugeridas cuando se active:

- modelo base para comunidades, unidades, residentes y vehiculos
- autorizacion y registro de visitas residenciales
- lectura por unidad con historial de accesos
- integración con `maintenance` para condominios
- integracion con `iot` residencial
- experiencia operativa mobile-first para conserjeria

Cobertura E2E sugerida al abrirlo:

- alta de comunidad
- alta de unidad
- registro de residente
- flujo de visita residencial
- lectura de historial por unidad

## 3. Finance

Estado del modulo:

- funcionalmente cerrado para el alcance actual
- cubre catalogos, transacciones, presupuestos, prestamos, planificacion, adjuntos y conciliacion

Mejoras sugeridas:

- seguir migrando el frontend al `design system`
- pulir copy residual `es/en`
- ampliar observabilidad de cambios economicos y auditoria de lote
- mas specs browser sobre flujos profundos de provisioning y tenancy
- automatizar mejor la comparacion de historicos ante cambios de moneda o reglas de clasificacion
- mejorar reportes de desvio, analitica y trazabilidad economica
- extender ayudas contextuales para carga masiva y conciliaciones complejas

Cobertura E2E sugerida:

- mas regresion sobre catalogos y settings
- mas pruebas browser sobre presupuestos, prestamos y reconciliation
- validacion de artefactos y flujos batch mas finos

## 4. Maintenance

Estado del modulo:

- primer corte funcional cerrado
- backlog de mejoras sugeridas ya separado en [maintenance/improvements/README.md](/home/felipe/platform_paas/docs/modules/maintenance/improvements/README.md)

Mejoras sugeridas resumidas:

- agenda y coordinacion mas rica
- visitas con multi-ventana y mejor resultado operativo
- programacion preventiva mas automatizada
- costos y puente a `finance` mas inteligente
- ficha tecnica y reportes mas completos
- importacion legacy con mapeo mas amplio
- UX operativa y movilidad mas pulida

Cobertura E2E sugerida:

- agenda y reprogramacion
- visitas y resultados
- costos y sync a finanzas
- checklist y evidencias
- importador legacy en dry-run y apply

## 5. Platform Core

Estado del bloque central:

- base operable
- provisioning, billing, auth, tenants y admin ya cubiertos

Mejoras sugeridas:

- profundizar E2E del acceso tenant desde platform admin
- mas regresion de provisioning y DLQ
- gating frontend por `effective_enabled_modules`
- mejor observabilidad de lifecycle tenant y billing
- normalizar copy y ayudas en `platform_admin`
- reforzar artefactos de fallo y depuracion en browser E2E

Cobertura E2E sugerida:

- provisioning mas fino
- billing mas fino
- acceso tenant y bloqueo por elegibilidad
- matricial de roles y lifecycle tenant

## 6. Prioridades transversales recomendadas

Si hay capacidad limitada, el orden sugerido es:

1. `business-core` refinamientos que mejoran a `maintenance` e integraciones futuras
2. `platform-core` hardening de operacion y E2E
3. `finance` mejoras de UX y observabilidad
4. `maintenance` mejoras incrementales de operacion diaria
5. `community-core` cuando la veta residencial se active de verdad

## 7. Regla de mantenimiento del backlog

Cada vez que un modulo reciba una mejora visible:

- actualizar su roadmap especifico
- agregar o ajustar su README si cambia la presentacion del modulo
- revisar si corresponde sumar smoke E2E o ampliar uno existente
- si hay API nueva, agregar o actualizar su referencia tecnica

