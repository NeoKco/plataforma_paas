# SIGUIENTE_PASO

## Prioridad vigente

- validar visualmente en producción la aclaración UX de mantenimiento -> finanzas en histórico

## Decisión previa obligatoria

- ninguna; ya desplegado

## Próximo paso correcto

- validar en browser:
  - una OT ya sincronizada debe mostrar alerta verde con ids de ingreso/egreso
  - una OT sin sync visible debe mostrar alerta amarilla indicando que la vista es solo histórica
- opcional:
  - publicar el mismo frontend en `staging` para mantener carriles alineados
- mantener validación funcional:
  - editar `Precio sugerido` y confirmar persistencia
  - verificar hint de margen calculado
  - desmarcar una línea en `Costo real` y validar que no se descuente en el egreso

## Si el escenario principal falla

- correr `repair_maintenance_finance_sync.py --tenant-slug <slug> --dry-run`
- revisar política efectiva `auto_on_close` y transacciones `maintenance_work_order_income/expense`

## Condición de cierre de la próxima iteración

- publish frontend realizado
- validación visual en browser confirmada
- UX deja claro dónde se dispara el sync y dónde solo se consulta histórico
- precio sugerido editable y persistente en el estimado (sin sobreescribir margen objetivo)
- control por línea de lo que impacta el egreso funcionando
