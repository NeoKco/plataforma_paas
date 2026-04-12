# SIGUIENTE_PASO

## Prioridad vigente

- validar visualmente en `staging` el primer corte de defaults efectivos `maintenance -> finance` y decidir promoción a `production`

## Decisión previa obligatoria

- ¿qué decisión define el camino siguiente?
- confirmar en `staging` si el prellenado efectivo actual ya cubre la operación real o si hará falta un segundo corte funcional sobre glosas/reglas contables más finas

## Próximo paso correcto

- validar visualmente en tenant real de `staging`:
  - `Resumen técnico`
  - modal `Costos y cobro`
  - sync manual
  - cierre con `auto_on_close`
- si `staging` queda correcto, promover el mismo corte a `production`

## Si el escenario principal falla

- si falla el endpoint nuevo, corregir primero el contrato backend y no tocar la UX
- si falla solo el prellenado visual, ajustar frontend manteniendo fijo `GET /tenant/maintenance/finance-sync-defaults`
- si aparece inconsistencia de moneda/cuenta en `finance`, revisar de inmediato compatibilidad con `transaction_service.py` antes de promover

## Condición de cierre de la próxima iteración

- el corte `maintenance -> finance defaults efectivos` debe quedar validado visualmente en `staging`, o debe quedar documentado un bloqueo operativo concreto con evidencia suficiente
