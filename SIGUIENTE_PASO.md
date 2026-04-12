# SIGUIENTE_PASO

## Prioridad vigente

- validar mantenimiento -> finanzas (precio sugerido editable + glosa final)

## Decisión previa obligatoria

- ninguna; ya desplegado

## Próximo paso correcto

- en empresa-demo abrir una OT y editar `Precio sugerido` en costeo estimado; guardar y reabrir para confirmar persistencia
- verificar que al editar `Precio sugerido` aparece el hint con el valor calculado
- cerrar la OT con monto cobrado > 0 y revisar transacción en Finanzas
- confirmar glosa: `Ingreso mantención #XXX · trabajo · cliente` (sin equipo/sitio)

## Si el escenario principal falla

- revisar logs de `maintenance_costing`/`finance` y validar que el tenant esté en `auto_on_close`

## Condición de cierre de la próxima iteración

- ingreso/egreso visible en Finanzas con glosa `mantención + trabajo + cliente`
- precio sugerido editable y persistente en el estimado
