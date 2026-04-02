# Maintenance Roadmap

Estado actual:

- `Descubrimiento completado`

Prioridad:

- alta

Motivo:

- es un frente de trabajo diario
- tiene dependencia operativa real para la evolucion del PaaS
- es mejor candidato que `egresos`, porque ese frente ya fue reemplazado por `finance`

## Fase 0. Descubrimiento y congelamiento

Estado:

- `Completado`

Entregables:

- auditoria de backend fuente
- auditoria de frontend fuente
- inventario de endpoints y tablas
- definicion de alcance del primer corte

## Fase 1. Diseno canonico del modulo

Estado:

- `Completado`

Entregables:

- carpeta canonica en `docs/modules/maintenance/`
- decision de naming (`maintenance`)
- definicion de fronteras del modulo
- backlog inicial de mejoras

## Fase 2. Slice base tenant

Estado:

- `Pendiente`

Objetivo:

- abrir el modulo dentro del PaaS como slice real

Alcance:

- tipos de equipo
- instalaciones
- mantenciones activas
- cierre/anulacion
- historial

Criterio de salida:

- backend tenant operativo
- frontend tenant visible
- migraciones tenant creadas
- pruebas backend minimas

## Fase 3. Endurecimiento operativo

Estado:

- `Pendiente`

Objetivo:

- que el modulo sirva mejor que la fuente para operacion diaria

Alcance:

- lectura por ficha/orden de trabajo
- mejores estados de ciclo de vida
- agenda integrada
- conflictos visibles de programacion
- trazabilidad de cambios

## Fase 4. Evidencias y checklist

Estado:

- `Pendiente`

Alcance:

- adjuntos
- checklist tecnico
- observacion de cierre estandarizada
- storage real del modulo

## Fase 5. Extension tecnica

Estado:

- `Pendiente`

Alcance:

- puente con expediente tecnico
- reportes tecnicos
- mejoras moviles para terreno

## Mejoras de producto recomendadas

- asociar mantencion a instalacion especifica
- timeline tecnico por cliente
- estados mas expresivos que `pendiente` y `realizada`
- ficha lateral con contexto completo del cliente y del equipo
- cierre con evidencia y checklist
- reprogramacion clara sin perder historial

## Riesgos

- mezclar demasiado pronto expediente tecnico dentro del modulo base
- arrastrar el patron fuente de “mover a historico” en vez de usar lifecycle
- depender de clientes/tareas/calendario sin definir contratos estables
- traer deuda UX del sistema fuente al tenant portal nuevo

## Siguiente paso recomendado

- abrir la fase de implementacion del slice base
- empezar por modelo de datos y contratos API antes de copiar frontend
