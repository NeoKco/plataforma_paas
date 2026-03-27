# Finance Frontend Notes

`Lote 0` deja:
- rutas del módulo bajo `tenant_portal/modules/finance`
- placeholders de páginas futuras
- compatibilidad con `TenantFinancePage` mientras madura el slice

`Lote 1` no abre UI nueva:
- la prioridad fue dejar las migraciones base del modulo listas
- frontend sigue estable sobre la vista actual de movimientos

`Lote 2` tampoco abre UI nueva:
- la prioridad fue dejar modelos, schemas y repositories base sin romper la vista existente

`Lote 3` abre API, no pantallas:
- ya existen endpoints CRUD base para catalogos, settings y exchange rates
- ya existen tambien endpoints de detalle y `reorder` donde aplica
- `CLP` ya forma parte del seed inicial del modulo

`Lote 4` ya abre frontend de catalogos:
- `/tenant-portal/finance/accounts`
- `/tenant-portal/finance/categories`
- `/tenant-portal/finance/tools`
- `/tenant-portal/finance/settings`
- las pantallas consumen la API real del modulo
- la navegacion secundaria del slice ya queda activa
- los formularios reutilizan el contrato backend sin inventar otra capa de datos

Pendiente inmediato:
`Lote 5` ya mueve el nucleo backend a `finance_transactions`:
- la pantalla heredada de `Movimientos` sigue visible
- `/tenant/finance/entries` se mantiene como contrato legacy
- el frontend todavia no abre UI rica de transacciones; eso queda para el siguiente lote

Pendiente inmediato:
- abrir el siguiente lote sobre detalle operacional de transacciones
- exponer balances por cuenta y relaciones ricas en la UI de movimientos
