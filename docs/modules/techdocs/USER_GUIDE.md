# TechDocs User Guide

Guía operativa del módulo `techdocs` (`Expediente técnico`) para usuarios tenant y soporte funcional.

## Para qué sirve

Este módulo cubre el frente de expediente técnico del tenant:

- concentrar evidencia técnica por cliente, sitio o instalación
- registrar secciones y mediciones de una revisión
- guardar adjuntos reutilizables
- mantener trazabilidad de cambios del dossier
- apoyar:
  - terreno
  - mantenciones
  - soporte técnico
  - apoyo comercial

Base esperada:

- `techdocs` usa clientes y sitios de `business-core`
- puede apoyarse en instalaciones y OT de `maintenance`
- puede apoyarse en oportunidades de `crm`
- puede apoyarse en tareas de `taskops`
- no reemplaza a esos módulos; solo referencia su contexto

## Vistas disponibles

- `Resumen`
  - métricas rápidas
  - expedientes recientes
  - evidencias recientes
- `Expedientes`
  - tabla operativa
  - alta y edición
  - detalle con secciones, mediciones, evidencias y auditoría
- `Auditoría`
  - trazabilidad reciente por dossier y búsqueda textual

## Tipos de expediente actuales

- `installation`
- `diagnosis`
- `maintenance_support`
- `commercial_support`
- `compliance`
- `custom`

Lectura práctica:

- `installation`
  - ficha técnica base de instalación o activo técnico
- `diagnosis`
  - inspección o levantamiento puntual
- `maintenance_support`
  - respaldo técnico para OT o postventa
- `commercial_support`
  - apoyo técnico a una oportunidad o propuesta
- `compliance`
  - respaldo técnico de cumplimiento o certificación
- `custom`
  - expediente técnico no estándar

## Estados actuales

- `draft`
- `in_review`
- `approved`
- `archived`

Lectura práctica:

- `draft`
  - expediente en construcción
- `in_review`
  - expediente listo para revisión interna
- `approved`
  - expediente validado como lectura final
- `archived`
  - expediente ya no activo

## Flujo operativo sugerido

1. crear el expediente en `Expedientes`
2. asociar cliente, sitio, instalación, OT, oportunidad o tarea si aplica
3. definir el tipo y el estado inicial
4. agregar secciones técnicas
5. cargar mediciones dentro de cada sección
6. subir evidencias necesarias
7. mover a `in_review`
8. aprobar o archivar cuando corresponda
9. revisar trazabilidad en `Auditoría`

## Cómo usar cada frente

### Expedientes

Úsalo para el CRUD principal.

Cada expediente puede llevar:

- título
- tipo
- estado
- cliente opcional
- sitio opcional
- instalación opcional
- OT opcional
- oportunidad opcional
- tarea opcional
- responsable técnico opcional
- fecha de referencia
- resumen
- alcance
- observaciones

### Secciones

Úsalas para dividir el expediente.

Tipos actuales:

- `dc`
- `ac`
- `grounding`
- `inspection`
- `documents`
- `custom`

Sirven para separar:

- mediciones eléctricas
- inspección visual
- documentación asociada
- bloques técnicos propios del expediente

### Mediciones

Úsalas para dejar datos técnicos estructurados.

Cada medición puede llevar:

- etiqueta
- valor
- unidad
- rango esperado
- resultado `pass/fail/warn/info`
- observación

### Evidencias

Sirven para:

- fotos
- PDFs
- certificados
- planos
- soportes simples
- notas adjuntas

Límites actuales:

- máximo 12 MB por archivo
- tipos permitidos:
  - PDF
  - JPG
  - PNG
  - WEBP
  - TXT

### Auditoría

Úsala para:

- revisar quién cambió un expediente
- entender cambios de estado
- ver altas de secciones, mediciones y evidencias
- buscar por texto o por expediente

## Qué no hace todavía

Por ahora este módulo no incluye:

- firmas o aprobación formal electrónica
- generación PDF consolidada
- control de versiones formal por documento
- plantillas técnicas avanzadas
- checklists de inspección reutilizables

## Dependencias visibles

- si no hay clientes en `business-core`, la referencia de cliente queda vacía
- si no hay sitios o instalaciones, el expediente sigue funcionando igual
- si no hay oportunidad en `crm`, la referencia comercial queda vacía
- si no hay tarea en `taskops`, la referencia operativa queda vacía

## Criterio de soporte

Si el usuario reporta que no ve el módulo:

- revisar que el tenant tenga habilitado `techdocs`
- revisar permisos tenant:
  - `tenant.techdocs.read`
  - `tenant.techdocs.manage`

Si reporta que no puede subir un archivo:

- revisar tipo de archivo
- revisar tamaño máximo permitido

Si reporta que no puede relacionar una instalación:

- revisar que existan instalaciones activas en `maintenance`
