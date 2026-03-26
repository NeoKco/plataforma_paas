# Finance API

API vigente en el arranque:
- `GET /tenant/finance/entries`
- `POST /tenant/finance/entries`
- `GET /tenant/finance/summary`
- `GET /tenant/finance/usage`

Estado tras `Lote 1`:
- no se agregaron endpoints nuevos todavia
- la prioridad de esta fase fue dejar el esquema tenant base del modulo listo

Estructura objetivo:
- router agregador en `api/router.py`
- subrutas por slice funcional (`transactions`, `accounts`, `categories`, etc.)

Pendiente:
- endpoints de catalogos
- endpoints de cuentas
- endpoints de prestamos, presupuestos, conciliacion y reportes
