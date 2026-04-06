# Maintenance Improvements Backlog

Este documento recopila las mejoras sugeridas que siguen disponibles para el modulo `maintenance` despues del primer corte funcional cerrado.

Estado de base:

- el modulo ya esta funcionalmente cerrado para operacion diaria del primer corte
- lo que sigue aqui no es bloqueo de salida, sino mejora incremental sugerida
- cada item debe validarse primero en doc y luego, si cambia una interfaz visible, con su smoke E2E correspondiente

## 1. Agenda y coordinacion de terreno

Mejoras sugeridas:

- vista de timeline por cliente, instalacion y responsable
- reprogramacion mas rica con arrastre visual de visitas posteriores
- edicion mas clara de ventanas multiples desde `Agenda` y `Visitas`
- mejor deteccion de conflictos por instalacion, grupo y tecnico
- panel de carga por tecnico/grupo para ver saturacion diaria o semanal
- acciones mas rapidas para mover, dividir o reagendar visitas en lote

Cobertura E2E sugerida cuando exista cambio visible:

- abrir la agenda mensual
- crear una OT abierta
- reprogramarla
- verificar que la primera visita se sincroniza o se mueve en cadena cuando corresponda
- validar conflicto visible y bloqueo backend `409`

## 2. Visitas en terreno

Mejoras sugeridas:

- check-in y check-out mas granular por visita
- ubicacion o geo-referencia opcional de la visita
- adjuntar fotos o evidencias directamente desde la visita
- firma o confirmacion simple de cliente cuando aplique
- mejor edicion de responsables y secuencia de visitas relacionadas
- manejo offline o de baja conectividad para terreno, si se prioriza movil

Cobertura E2E sugerida:

- crear visita
- cambiar tipo y resultado
- cerrar visita con resultado operativo
- validar reencadenamiento de visitas posteriores

## 3. Programacion preventiva

Mejoras sugeridas:

- generacion automatica de pendientes desde reglas recurrentes mas finas
- priorizacion por vencimiento, criticidad o SLA
- reglas de frecuencia por tipo de equipo o tipo de tarea
- vista de vencimientos con agrupacion operativa mas rica
- mejor sugerencia de siguiente mantencion a partir de historico
- ajustes por temporadas, ventanas de acceso o ventanas horarias del cliente

Cobertura E2E sugerida:

- crear programacion preventiva
- generar un pendiente
- agendar una OT desde Pendientes
- validar sugerencia de siguiente mantencion

## 4. Costos y puente a finanzas

Mejoras sugeridas:

- auto-sync mas completo hacia `finance` cuando el tenant lo permita
- reintentos mas visibles y auditados del puente financiero
- plantillas de costeo mas inteligentes por tipo de tarea o tipo de equipo
- sugerencia automatica de margen y lineas segun historial
- comparativa entre estimado, real y cobrado con alertas de desvio
- exportacion economica por OT o por rango de fechas

Cobertura E2E sugerida:

- abrir modal de costos
- aplicar plantilla
- editar costo real
- sincronizar a finanzas
- validar traza de plantilla aplicada

## 5. Ficha tecnica y reportes

Mejoras sugeridas:

- expediente tecnico mas rico por instalacion
- PDF o exportable de cierre tecnico
- consolidado de historial por activo con filtros mas finos
- reportes de productividad por grupo, tecnico o instalacion
- reportes de SLA, tiempos de respuesta y tiempos de cierre
- indicadores de repeticion de falla o reincidencia

Cobertura E2E sugerida:

- abrir ficha de mantencion
- revisar el expediente liviano
- validar apertura de reportes tecnicos

## 6. Importacion e interoperabilidad

Mejoras sugeridas:

- importar `business_work_group_members` cuando exista mapeo confiable de usuarios
- mapear usuarios legacy a usuarios reales del tenant
- ampliar validaciones post-import y reportes de consistencia
- soportar nuevos tenants destino con una guia de preflight mas automatizada
- endurecer limpieza de residuos legacy visibles si aparecen nuevos patrones

Cobertura E2E sugerida:

- ejecutar el importador en `dry-run`
- validar reporte JSON
- ejecutar `--apply`
- verificar visibilidad de datos importados en `business-core` y `maintenance`

## 7. UX operativa y movilidad

Mejoras sugeridas:

- atajos de teclado en bandejas operativas
- filtros guardados por usuario
- mejoras de accesibilidad y lectura en pantallas pequeñas
- acciones mas compactas para operaciones repetitivas
- mejor feedback visual al guardar, reprogramar o sincronizar

Cobertura E2E sugerida:

- validar modales y formularios principales
- comprobar que los cambios visibles siguen sin romper la lectura primero

## Lectura rapida por modulo

- `Pendientes`: automatizacion y priorizacion mas fina
- `Mantenciones`: agenda, reprogramacion y coordinacion mas rapida
- `Historial`: lectura, filtros y trazabilidad mas rica
- `Visitas`: multi-ventana, seguimiento y resultados operativos mas precisos
- `Costos y cobro`: automatizacion economica, plantillas mas inteligentes y sync a finanzas
- `Checklist y evidencias`: captura mas rica de terreno y mejor reutilizacion documental
- `Instalaciones`: expediente tecnico mas completo
- `Reportes`: indicadores operativos y de calidad de servicio
- `Importadores`: mas cobertura para datos legacy y consistencia post-apply

## Regla de avance

Si una mejora pasa de sugerencia a flujo visible nuevo:

1. actualizar este documento
2. actualizar [README.md](../README.md)
3. anotar el cambio en [CHANGELOG.md](../CHANGELOG.md)
4. agregar o ajustar el smoke E2E correspondiente si la interfaz visible cambia

