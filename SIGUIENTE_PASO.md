# SIGUIENTE_PASO

## Prioridad vigente

- validar mantenimiento -> finanzas (precio sugerido editable + glosa final)

## Decisión previa obligatoria

- ninguna; ya desplegado

## Próximo paso correcto

- en empresa-demo abrir una OT y editar `Precio sugerido` en costeo estimado; guardar y reabrir para confirmar persistencia
- verificar que al editar `Precio sugerido` el margen objetivo se recalcula y aparece el hint en margen
- cerrar la OT con monto cobrado > 0 y revisar transacción en Finanzas
- confirmar glosa: `Ingreso mantención #XXX · trabajo · cliente` (sin equipo/sitio)
- confirmar que se generó egreso por costos reales cuando total_actual_cost > 0
- desmarcar una línea en `Costo real` y validar que no se descuente en el egreso
- si existen transacciones antiguas, confirmar que el script las corrigió en empresa-demo

## Si el escenario principal falla

- revisar logs de `maintenance_costing`/`finance` y validar que el tenant esté en `auto_on_close`

## Condición de cierre de la próxima iteración

- ingreso/egreso visible en Finanzas con glosa `mantención + trabajo + cliente`
- precio sugerido editable y persistente en el estimado
- control por línea de lo que impacta el egreso funcionando
