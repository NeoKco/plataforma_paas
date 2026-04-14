# SIGUIENTE_PASO

## Prioridad vigente

- validar visualmente en producción que las subrutas lazy de Mantenciones ya no rompen por chunks cacheados

## Decisión previa obligatoria

- ninguna; ya desplegado

## Próximo paso correcto

- validar en browser:
  - `Instalaciones`
  - `Tipos de equipo`
  - `Costos de mantención`
  - `Agenda`
  - `Reportes`
- confirmar que, si existía caché vieja, el frontend ya se recarga solo una vez y entra a la ruta correcta
- después de eso retomar la validación UX de `maintenance -> finance`

## Si el escenario principal falla

- correr `repair_maintenance_finance_sync.py --tenant-slug <slug> --dry-run`
- revisar política efectiva `auto_on_close` y transacciones `maintenance_work_order_income/expense`

## Condición de cierre de la próxima iteración

- publish frontend realizado
- validación visual en browser confirmada
- UX deja claro dónde se dispara el sync y dónde solo se consulta histórico
- precio sugerido editable y persistente en el estimado (sin sobreescribir margen objetivo)
- control por línea de lo que impacta el egreso funcionando
