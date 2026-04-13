# SIGUIENTE_PASO

## Prioridad vigente

- endurecer UX de mantenimiento -> finanzas para distinguir lectura histórica vs cierre operativo

## Decisión previa obligatoria

- ninguna; ya desplegado

## Próximo paso correcto

- reforzar en UI que `Ver costos` desde `Historial` es solo lectura y no un botón de sincronización
- agregar señal operativa visible en `Editar cierre` y/o modal de costos para indicar cuándo el cierre ya quedó sincronizado a Finanzas
- mantener validación funcional:
  - editar `Precio sugerido` y confirmar persistencia
  - verificar hint de margen calculado
  - desmarcar una línea en `Costo real` y validar que no se descuente en el egreso

## Si el escenario principal falla

- correr `repair_maintenance_finance_sync.py --tenant-slug <slug> --dry-run`
- revisar política efectiva `auto_on_close` y transacciones `maintenance_work_order_income/expense`

## Condición de cierre de la próxima iteración

- UX deja claro dónde se dispara el sync y dónde solo se consulta histórico
- precio sugerido editable y persistente en el estimado (sin sobreescribir margen objetivo)
- control por línea de lo que impacta el egreso funcionando
