# Preventive Scheduling And Costing Model

Diseno canonico para la siguiente extension de `maintenance`, alineado con lo ya construido en `platform_paas`.

## Objetivo real

Resolver dos necesidades operativas sin degradar el slice actual:

- no depender de recordar organizacion por organizacion cuando toca una mantencion
- saber cuanto cuesta una mantencion, cuanto conviene cobrar y como impacta en `finance`

La decision principal es esta:

- no construir una lista manual de mantenciones
- construir una programacion permanente que alimente una bandeja automatica de vencimientos

## Encaje con lo que ya existe

El modulo hoy ya tiene estas piezas reales:

- `business-core` es dueño de:
  - `business_organizations`
  - `business_clients`
  - `business_sites`
  - `business_work_groups`
  - `business_task_types`
- `maintenance` ya es dueño de:
  - `maintenance_installations`
  - `maintenance_work_orders`
  - `maintenance_visits`
  - `maintenance_status_logs`
- `finance` ya tiene:
  - `finance_transactions`
  - `source_type`
  - `source_id`

Por eso, la extension correcta no reemplaza `work_orders` ni inventa otro nucleo contable:

- `programaciones` generan `due_items`
- `due_items` alimentan `work_orders`
- `work_orders` siguen siendo la ejecucion real
- `finance_transactions` registra el hecho economico

## Aclaracion de dominio

El usuario operativo puede querer ver carga agrupada por organizacion, pero la unidad real de trabajo sigue siendo:

- `cliente`
- `direccion`
- `instalacion`
- `mantencion a ejecutar`

Regla:

- la bandeja puede agrupar visualmente por organizacion
- la accion operativa se toma por `client_id` y, cuando exista, por `site_id` / `installation_id`

No conviene duplicar `organization_id` en las tablas nuevas salvo por snapshot o performance futura, porque hoy se puede resolver desde `business_clients.organization_id`.

## Capas funcionales recomendadas

### 1. Programaciones

Define la regla permanente:

- cada cuanto se mantiene
- desde cuando corre el ciclo
- cuantos dias antes entra en gestion
- si esta activa o no

### 2. Pendientes

Es la bandeja automatica que se alimenta sola cuando una programacion entra en ventana.

No es una lista fija ni manual.

### 3. Agenda y orden de trabajo

Cuando el item se agenda:

- se crea o enlaza una `maintenance_work_order`
- el `due_item` sale de la lista activa
- la ejecucion sigue en el flujo actual de `Mantenciones`, `Agenda` e `Historial`

### 4. Costeo y cobro

Se separa en:

- costo estimado antes de ejecutar
- costo real y cobro final al cerrar

### 5. Integracion financiera

`maintenance` produce el evento operativo; `finance` registra el movimiento economico.

## Modelo de datos recomendado

### Tabla nueva: `maintenance_schedules`

Programacion permanente por cliente, direccion o instalacion.

Campos recomendados:

- `id`
- `client_id` obligatorio
- `site_id` nullable
- `installation_id` nullable
- `task_type_id` nullable
- `cost_template_id` nullable
- `name`
- `description`
- `frequency_value`
- `frequency_unit`
  - `days`
  - `weeks`
  - `months`
  - `years`
- `lead_days`
- `start_mode`
  - `from_installation_date`
  - `from_last_maintenance_date`
  - `from_manual_due_date`
  - `from_first_completed_work_order`
- `base_date`
- `last_executed_at`
- `next_due_at`
- `default_priority`
- `estimated_duration_minutes`
- `billing_mode`
  - `per_work_order`
  - `contract`
  - `warranty`
  - `no_charge`
- `is_active`
- `auto_create_due_items`
- `notes`
- `created_by_user_id`
- `created_at`
- `updated_at`

Reglas recomendadas:

- si existe `installation_id`, el schedule deberia quedar amarrado a esa instalacion
- si aun no existe instalacion, permitir schedule a nivel cliente/sitio, pero dejarlo como estado transitorio
- no permitir dos schedules activos equivalentes sobre el mismo `client_id + site_id + installation_id + task_type_id + frequency`

### Tabla nueva: `maintenance_due_items`

Item operativo de la bandeja automatica.

Campos recomendados:

- `id`
- `schedule_id`
- `client_id`
- `site_id` nullable
- `installation_id` nullable
- `due_at`
- `visible_from`
- `due_status`
  - `upcoming`
  - `due`
  - `contacted`
  - `scheduled`
  - `postponed`
  - `completed`
  - `skipped`
  - `cancelled`
- `contact_status`
  - `not_contacted`
  - `contact_pending`
  - `contacted`
  - `pending_confirmation`
  - `confirmed`
  - `no_response`
  - `rejected`
- `assigned_work_group_id` nullable
- `assigned_tenant_user_id` nullable
- `work_order_id` nullable
- `postponed_until` nullable
- `contact_note` nullable
- `resolution_note` nullable
- `created_at`
- `updated_at`

Regla anti-duplicado obligatoria:

- un mismo `schedule_id` no debe tener mas de un `due_item` abierto para el mismo ciclo de vencimiento

La forma mas limpia de resolverlo es con una clave funcional como:

- `schedule_id + due_at`

o una `cycle_key` calculada, si luego necesitas manejar periodos mas complejos.

Traza de reutilización de costos ya aplicada:

- si una programación nace desde una `Plantilla de costeo de mantención`, debe guardar `cost_template_id`
- eso permite métricas de uso simples sin convertir la funcionalidad en catálogo transversal
- el archivado de plantillas no debe romper la referencia histórica de schedules ya vinculados

### Ajustes recomendados a `maintenance_work_orders`

La tabla actual ya sirve como orden operativa. Solo conviene extenderla con referencias minimas:

- `schedule_id` nullable
- `due_item_id` nullable
- `billing_mode` nullable al principio, luego posiblemente obligatorio para nuevos flujos preventivos

Motivo:

- poder saber si una OT vino de programacion automatica o de alta libre
- poder trazar desde `finance` hasta el origen preventivo sin joins ambiguos

### Tabla nueva: `maintenance_cost_estimates`

Costeo previo de la mantencion.

Campos recomendados:

- `id`
- `work_order_id`
- `labor_cost`
- `travel_cost`
- `materials_cost`
- `external_services_cost`
- `overhead_cost`
- `total_estimated_cost`
- `target_margin_percent`
- `suggested_price`
- `notes`
- `created_at`
- `updated_at`

### Tabla nueva: `maintenance_cost_actuals`

Costeo y cobro real al cierre.

Campos recomendados:

- `id`
- `work_order_id`
- `labor_cost`
- `travel_cost`
- `materials_cost`
- `external_services_cost`
- `overhead_cost`
- `total_actual_cost`
- `actual_price_charged`
- `actual_income`
- `actual_profit`
- `actual_margin_percent`
- `notes`
- `closed_at`

### Tabla nueva: `maintenance_cost_lines`

Detalle granular reutilizable para estimado y real.

Campos recomendados:

- `id`
- `work_order_id`
- `cost_stage`
  - `estimated`
  - `actual`
- `line_type`
  - `labor`
  - `travel`
  - `material`
  - `service`
  - `overhead`
- `description`
- `quantity`
- `unit_cost`
- `total_cost`
- `finance_transaction_id` nullable
- `notes`

### Integracion con `finance`

En primer corte no hace falta una tabla puente propia si se usa bien `finance_transactions`:

- `source_type = 'maintenance_work_order'`
- `source_id = work_order_id`

Esto permite:

- abrir la mantencion desde finanzas
- abrir las transacciones desde la OT
- evitar duplicar logica contable en `maintenance`

Una tabla `maintenance_finance_links` puede quedar como opcional para fases posteriores, no como requisito del corte inicial.

## Reglas de negocio

### Programacion

- no todo cliente nuevo entra automaticamente a mantenciones
- solo debe entrar si tiene una programacion activa o un servicio/contrato que la exija
- un cliente puede tener multiples schedules
- un sitio puede tener multiples schedules
- una instalacion puede tener multiples schedules si corresponden tipos de servicio distintos

### Bandeja automatica

- la bandeja no se carga a mano como flujo principal
- un proceso automatico revisa schedules activos y crea `due_items`
- si el item ya fue agendado, no debe volver a aparecer como pendiente
- si la OT se cancela, el `due_item` puede volver a estado operativo
- si el `due_item` se posterga, debe respetarse `postponed_until`

### Agenda y OT

- agendar desde `Pendientes` crea o vincula una `work_order`
- una OT manual creada desde `Agenda` puede no venir de schedule
- una OT que viene de `due_item` debe preservar ese enlace
- al completar una OT preventiva:
  - se actualiza `last_executed_at`
  - se recalcula `next_due_at`
  - el siguiente ciclo no se crea al cierre, sino cuando entre en ventana o segun la politica del generador

### Costeo y cobro

- el precio sugerido nunca reemplaza al precio final cobrado
- debe poder existir costo estimado sin costo real
- debe poder existir costo real sin ingreso aun
- debe poder existir ingreso `0` si `billing_mode` es `warranty` o `no_charge`
- no conviene meter los campos de costo dentro del modal de `Nueva orden`; es mejor abrir un flujo o modal de `Costos` sobre la OT ya existente

### Finanzas

Recomendacion para primer corte:

- sincronizacion `manual` o `auto_on_close` configurable por tenant

No recomendado para el primer corte:

- postear siempre automatico a `finance` sin politica explicita

## Flujo operativo recomendado

### Alta de cliente nuevo

Flujo recomendado:

1. se crea cliente / direccion / instalacion normalmente
2. si ese cliente requiere mantencion recurrente, se ofrece:
   - `Crear plan de mantención ahora`
   - `Omitir por ahora`
3. si se crea el schedule:
   - se calcula `next_due_at`
   - se calcula `visible_from`
   - el item aparecera solo cuando entre en ventana

Mejora recomendada:

- reporte de `clientes activos con instalación y sin plan de mantención`

Eso evita perder clientes nuevos que si requieren ciclo preventivo.

### Bandeja diaria

Pantalla nueva sugerida:

- `Mantenciones > Pendientes`

Columnas recomendadas:

- semaforo
- cliente
- organizacion
- direccion
- instalacion
- tipo de mantencion
- ultima mantencion
- proxima mantencion
- dias para vencer o dias vencida
- estado de contacto
- acciones

Acciones recomendadas:

- `Ver cliente`
- `Ver historial`
- `Contactar`
- `Agendar`
- `Posponer`
- `Omitir`

Regla UX:

- agrupar por organizacion es valido para lectura
- la accion se ejecuta siempre sobre el cliente o la instalacion

### Agendamiento

Desde `Pendientes`, el boton `Agendar` deberia:

- abrir modal de OT o agenda con datos precargados
- cliente bloqueado si el pendiente ya viene resuelto
- direccion filtrada
- instalacion sugerida o exigida si el schedule ya la tiene

Al confirmar:

- se crea `maintenance_work_order`
- se vincula `due_item.work_order_id`
- `due_item.due_status = scheduled`

### Cierre de la OT

Al completar:

- la OT sale de `Mantenciones`
- pasa a `Historial`
- el `due_item` pasa a `completed`
- el schedule recalcula `next_due_at`

### Costos y cobros

Primer corte recomendado:

- no abrir una pantalla top-level nueva de inmediato
- agregar accion `Costos` o `Cobro` sobre OT abierta/cerrada
- usar modal o ficha secundaria especializada

Bloques de la vista:

- datos generales
- costo estimado
- costo real
- cobro final
- transacciones financieras vinculadas

## Flujo backend recomendado

### Carpetas y naming

Alineado con la app actual:

- `backend/app/apps/tenant_modules/maintenance/models/`
- `backend/app/apps/tenant_modules/maintenance/repositories/`
- `backend/app/apps/tenant_modules/maintenance/services/`
- `backend/app/apps/tenant_modules/maintenance/api/`
- `backend/app/apps/tenant_modules/maintenance/schemas/`

No hace falta abrir un directorio `jobs/` en el primer corte si el proyecto aun no lo usa para este modulo.

Para el generador automatico conviene partir con:

- servicio de dominio
- script invocable desde `backend/app/scripts/`
- luego moverlo a worker o scheduler si hace falta

### Piezas nuevas recomendadas

Backend:

- `models/schedule.py`
- `models/due_item.py`
- `models/cost_estimate.py`
- `models/cost_actual.py`
- `models/cost_line.py`
- `repositories/schedule_repository.py`
- `repositories/due_item_repository.py`
- `repositories/cost_repository.py`
- `services/schedule_service.py`
- `services/due_item_service.py`
- `services/cost_service.py`
- `services/finance_integration_service.py`
- `api/schedules.py`
- `api/due_items.py`
- `api/costing.py`

Script programado recomendado:

- `backend/app/scripts/run_maintenance_due_generation.py`

### Endpoints sugeridos

Programaciones:

- `GET /tenant/maintenance/schedules`
- `POST /tenant/maintenance/schedules`
- `GET /tenant/maintenance/schedules/{schedule_id}`
- `PUT /tenant/maintenance/schedules/{schedule_id}`
- `PATCH /tenant/maintenance/schedules/{schedule_id}/status`

Pendientes:

- `GET /tenant/maintenance/due-items`
- `POST /tenant/maintenance/due-items/{due_item_id}/contact`
- `POST /tenant/maintenance/due-items/{due_item_id}/schedule`
- `POST /tenant/maintenance/due-items/{due_item_id}/postpone`
- `POST /tenant/maintenance/due-items/{due_item_id}/skip`

Costeo:

- `GET /tenant/maintenance/work-orders/{work_order_id}/costing`
- `PUT /tenant/maintenance/work-orders/{work_order_id}/cost-estimate`
- `PUT /tenant/maintenance/work-orders/{work_order_id}/cost-actual`
- `POST /tenant/maintenance/work-orders/{work_order_id}/finance-sync`

## Flujo frontend recomendado

### Navegacion

Mantener el modulo actual y crecer sin romperlo.

Orden sugerido:

- `Resumen`
- `Pendientes`
- `Mantenciones`
- `Instalaciones`
- `Tipos de equipo`
- `Historial`
- `Agenda`

`Programaciones` puede abrir primero como:

- boton secundario dentro de `Pendientes`
- o CTA contextual desde cliente / instalacion

No es obligatorio abrirla como tab principal en el primer corte.

### Contexto desde `business-core`

En la ficha del cliente conviene agregar despues:

- `Crear plan de mantención`
- `Ver pendientes`

En la ficha de instalacion o desde `Instalaciones`:

- `Programar ciclo`

### Contexto desde `Agenda`

La agenda ya existe. El acople correcto seria:

- crear OT libre desde calendario, como hoy
- o agendar un `due_item` ya vencido/por vencer

La agenda no debe convertirse en la fuente de verdad de vencimientos; esa fuente debe ser la bandeja automatica.

## Roadmap funcional recomendado

### Fase A. Programaciones y bandeja automatica

- abrir `maintenance_schedules`
- abrir `maintenance_due_items`
- generador automatico diario
- pantalla `Pendientes`
- agendar pendiente hacia `work_orders`

### Fase B. Contexto desde cliente e instalacion

- CTA `Crear plan de mantención` en cliente
- CTA desde instalacion
- flujo de alta de cliente con opcion `requiere mantención periódica`
- reporte de clientes/instalaciones sin plan

### Fase C. Costeo estimado y real

- tablas de costo
- accion `Costos` en OT
- precio sugerido y precio real
- soporte de `billing_mode`

### Fase D. Integracion con finanzas

- generar transacciones vinculadas por `source_type/source_id`
- vista cruzada OT <-> Finanzas
- politica tenant de sync `manual` o `auto_on_close`

### Fase E. Reportes

- vencidas
- por vencer
- cumplimiento
- costo real
- ingreso real
- margen por cliente
- margen por tipo de servicio
- margen por tecnico o grupo

## Mejoras recomendadas

- soportar alta masiva de schedules por CSV en una fase posterior
- permitir agendamiento multiple para varias mantenciones del mismo cliente o sitio
- consolidar `Plantillas de costeo de mantención` con edición y archivado, manteniéndolas como capacidad propia del módulo
- separar en reportes `preventiva`, `correctiva`, `emergencia`, `garantia`
- mas adelante, detectar creacion de schedule desde instalacion o venta cerrada si otro modulo entrega ese disparador

## Mejoras futuras no bloqueantes

Estas mejoras quedan deliberadamente fuera del primer corte de implementacion:

- contratos de mantencion
- alertas por WhatsApp o email
- asignacion automatica de tecnicos
- IA para estimar costos
- optimizacion de rutas
- scoring de clientes

## Decisiones que conviene mantener

- `business-core` sigue siendo dueño de cliente, organizacion y direccion
- `maintenance` no debe clonar clientes ni agenda comercial
- `finance` sigue siendo dueño de ingresos y egresos
- la nueva bandeja debe ser preventiva y automatica, no una lista manual desechable
