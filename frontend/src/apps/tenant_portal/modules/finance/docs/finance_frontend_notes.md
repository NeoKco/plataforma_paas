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
- el frontend todavia no los consume desde vistas nuevas
- el siguiente paso correcto es abrir cuentas/catalogos visualmente sobre estos contratos, no inventar otra API
