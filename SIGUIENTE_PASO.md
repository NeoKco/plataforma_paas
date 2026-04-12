# SIGUIENTE_PASO

## Prioridad vigente

- validar mantenimiento -> finanzas (empresa-demo)

## Decisión previa obligatoria

- ninguna; ya desplegado

## Próximo paso correcto

- cerrar una OT con monto cobrado > 0 en empresa-demo y revisar transacción en Finanzas
- confirmar glosa contiene mantención + cliente + sitio

## Si el escenario principal falla

- revisar logs de `maintenance_costing`/`finance` y validar que el tenant esté en `auto_on_close`

## Condición de cierre de la próxima iteración

- ingreso/egreso visible en Finanzas con glosa de mantención + cliente
