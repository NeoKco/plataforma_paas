# Recuperación de estado en mantenciones cerradas por error

Este runbook deja un procedimiento operativo para reabrir una OT de `maintenance` cuando fue cerrada o cancelada por error humano y por eso desapareció de la bandeja activa para quedar solo en `Historial`.

## Cuándo usarlo

Usar este flujo cuando pasó alguno de estos casos:

- se cerró una mantención antes de tiempo;
- se canceló una mantención por error;
- la OT ya no aparece en `Mantenciones` porque quedó en `Historial`;
- se necesita devolver la OT a `scheduled` o `in_progress` para continuar operación.

## Atajo disponible en la UI

Ahora `Historial` ya muestra una acción `Reabrir`.

Ese atajo solo está visible para perfiles administrativos del tenant (`admin` y `manager`).

Usar ese atajo cuando:

- solo necesitas devolver la OT a la bandeja activa;
- basta con revertir el estado operativo;
- no hace falta anular movimientos de `finance`.

Usar el script de este runbook cuando:

- necesitas una reversa más controlada;
- quieres decidir explícitamente el estado destino;
- debes anular también transacciones sincronizadas en `finance`;
- necesitas limpiar notas de cierre, motivo de cancelación o resolución del `due_item`.

## Qué hace el script

El script operativo vive en [backend/app/scripts/revert_maintenance_work_order_status.py](../../backend/app/scripts/revert_maintenance_work_order_status.py).

Capacidades:

- corre en `dry-run` por defecto;
- permite buscar la OT por `--work-order-id` o por `--title` exacto;
- si no se indica `--target-status`, intenta volver al estado previo usando `maintenance_status_logs`;
- limpia `completed_at` y `cancelled_at` cuando la OT vuelve a un estado activo;
- vuelve a dejar el `due_item` asociado en estado `scheduled` cuando corresponde;
- revierte el avance de la programación preventiva si la OT venía de una `schedule` y había quedado `completed`;
- opcionalmente anula las transacciones ligadas en `finance` con `--void-finance` y despega esos links del costo real;
- deja trazabilidad nueva en `maintenance_status_logs` indicando que fue una reversa manual por error humano.

## Lo que no hace automáticamente

- no decide por sí solo si hay que anular movimientos de `finance`; eso debe definirse caso a caso con `--void-finance`;
- no reconstruye edición operativa adicional fuera del estado; por ejemplo, si además hubo reprogramaciones manuales, esas deben revisarse aparte;
- no reemplaza la confirmación visual del frontend; solo corrige OT ya cerradas por error.

## Requisitos

- acceso al backend con entorno operativo cargado;
- conocer el `tenant_slug`;
- conocer el `work_order_id` o, al menos, el título exacto de la OT;
- si se usará `--void-finance`, validar antes si el cierre erróneo también contaminó `finance`.

## Paso 1: correr primero en dry-run

Ejemplo por ID:

```bash
cd backend
python -m app.scripts.revert_maintenance_work_order_status \
  --tenant-slug demo-tenant \
  --work-order-id 123
```

Ejemplo por título exacto:

```bash
cd backend
python -m app.scripts.revert_maintenance_work_order_status \
  --tenant-slug demo-tenant \
  --title "Mantención sst"
```

El `dry-run` muestra:

- estado actual de la OT;
- estado objetivo inferido o explícito;
- `schedule_id` y `due_item_id` afectados;
- vínculos financieros existentes;
- advertencia si existe `finance_synced_at` y no se pidió `--void-finance`.

## Paso 2: aplicar la reversa real

Volver al estado previo inferido:

```bash
cd backend
python -m app.scripts.revert_maintenance_work_order_status \
  --tenant-slug demo-tenant \
  --work-order-id 123 \
  --reason "Cierre ejecutado por error desde modal de costos" \
  --apply
```

Forzar un estado específico:

```bash
cd backend
python -m app.scripts.revert_maintenance_work_order_status \
  --tenant-slug demo-tenant \
  --work-order-id 123 \
  --target-status in_progress \
  --reason "La OT debía seguir en ejecución" \
  --apply
```

Reversa con anulación de `finance`:

```bash
cd backend
python -m app.scripts.revert_maintenance_work_order_status \
  --tenant-slug demo-tenant \
  --work-order-id 123 \
  --reason "Cierre y sync financiero erróneos" \
  --void-finance \
  --apply
```

## Flags útiles

- `--target-status scheduled|in_progress|completed|cancelled`
- `--reason "..."`
- `--changed-by-user-id <id>` para dejar actor explícito en trazabilidad
- `--void-finance`
- `--clear-closure-notes`
- `--clear-cancellation-reason`
- `--clear-due-resolution-note`
- `--apply`

## Cómo recuperar el ID de la OT

Opciones prácticas:

- desde `Historial`, abrir la ficha y revisar la OT en la API/Network del navegador;
- consultar `GET /tenant/maintenance/history` y ubicar la OT por título, cliente o fechas;
- usar directamente `--title` exacto en el script; si hay más de una coincidencia, el script listará candidatos y abortará para evitar tocar la OT equivocada.

## Validación posterior

Después de aplicar la reversa, validar:

1. la OT vuelve a aparecer en `Mantenciones` si quedó en `scheduled` o `in_progress`;
2. ya no queda solo en `Historial`;
3. la `Ficha de mantención` muestra el estado esperado;
4. si había `schedule`, la `Próxima mantención` quedó coherente;
5. si se usó `--void-finance`, las transacciones ligadas quedaron anuladas y la OT ya no mantiene links activos en `costo real`.

## Recomendación operativa

- siempre correr primero en `dry-run`;
- registrar motivo en `--reason`;
- usar `--void-finance` solo cuando el cierre erróneo también contaminó finanzas;
- si la OT tenía varias visitas o coordinación fina ya en curso, revisar manualmente la agenda después de reabrir.

## Cambio preventivo ya incorporado

Además de este runbook, el frontend ahora pide confirmación explícita antes de ejecutar `Guardar y cerrar mantención` desde el modal de costos, para reducir cierres accidentales.
