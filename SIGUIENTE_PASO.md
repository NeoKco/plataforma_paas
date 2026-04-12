# SIGUIENTE_PASO

## Prioridad vigente

- validar mantenimiento -> finanzas (empresa-demo) y desplegar

## Decisión previa obligatoria

- confirmar si se despliega directo a production o primero a staging

## Próximo paso correcto

- correr smoke rápido manual: cerrar una OT con monto cobrado > 0 en empresa-demo y revisar transacción en Finanzas
- desplegar backend/frontend con este ajuste

## Si el escenario principal falla

- revisar logs de `maintenance_costing`/`finance` y validar que el tenant esté en `auto_on_close`

## Condición de cierre de la próxima iteración

- ingreso/egreso visible en Finanzas con glosa de mantención + cliente
