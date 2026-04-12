# SIGUIENTE_PASO

## Prioridad vigente

- validar que `Pendientes` ya carga sin error en `ieris-ltda`

## Decisión previa obligatoria

- definir si la limpieza E2E de finanzas debe quedar automatizada en el pipeline published o solo manual bajo demanda

## Próximo paso correcto

- abrir `/tenant-portal/maintenance/due-items` y confirmar que no hay 500
- si persiste, ejecutar un repair manual de secuencia y revisar logs

## Si el escenario principal falla

- correr manualmente `run_maintenance_due_generation.py --tenant-slug ieris-ltda`
- inspeccionar logs con `journalctl -u platform-paas-backend.service` y buscar `maintenance_due_items_pkey`

## Condición de cierre de la próxima iteración

- `Pendientes` operativo y sin errores en producción
