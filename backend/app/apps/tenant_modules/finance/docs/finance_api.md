# Finance API

API vigente en el arranque:
- `GET /tenant/finance/entries`
- `POST /tenant/finance/entries`
- `GET /tenant/finance/summary`
- `GET /tenant/finance/usage`
- `GET /tenant/finance/accounts`
- `POST /tenant/finance/accounts`
- `PUT /tenant/finance/accounts/{account_id}`
- `PATCH /tenant/finance/accounts/{account_id}/status`
- `GET /tenant/finance/categories`
- `POST /tenant/finance/categories`
- `PUT /tenant/finance/categories/{category_id}`
- `PATCH /tenant/finance/categories/{category_id}/status`
- `GET /tenant/finance/beneficiaries`
- `POST /tenant/finance/beneficiaries`
- `PUT /tenant/finance/beneficiaries/{beneficiary_id}`
- `PATCH /tenant/finance/beneficiaries/{beneficiary_id}/status`
- `GET /tenant/finance/people`
- `POST /tenant/finance/people`
- `PUT /tenant/finance/people/{person_id}`
- `PATCH /tenant/finance/people/{person_id}/status`
- `GET /tenant/finance/projects`
- `POST /tenant/finance/projects`
- `PUT /tenant/finance/projects/{project_id}`
- `PATCH /tenant/finance/projects/{project_id}/status`
- `GET /tenant/finance/tags`
- `POST /tenant/finance/tags`
- `PUT /tenant/finance/tags/{tag_id}`
- `PATCH /tenant/finance/tags/{tag_id}/status`
- `GET /tenant/finance/currencies`
- `POST /tenant/finance/currencies`
- `PUT /tenant/finance/currencies/{currency_id}`
- `PATCH /tenant/finance/currencies/{currency_id}/status`
- `GET /tenant/finance/currencies/exchange-rates`
- `POST /tenant/finance/currencies/exchange-rates`
- `PUT /tenant/finance/currencies/exchange-rates/{exchange_rate_id}`
- `GET /tenant/finance/settings`
- `POST /tenant/finance/settings`
- `PUT /tenant/finance/settings/{setting_id}`
- `PATCH /tenant/finance/settings/{setting_id}/status`

Estado tras `Lote 1`:
- no se agregaron endpoints nuevos todavia
- la prioridad de esta fase fue dejar el esquema tenant base del modulo listo

Estado tras `Lote 3`:
- ya existen endpoints CRUD base para catalogos clave
- las rutas mantienen el patron `router -> service -> repository`
- las respuestas siguen el formato tipado del modulo, incluyendo `requested_by`

Estructura objetivo:
- router agregador en `api/router.py`
- subrutas por slice funcional (`transactions`, `accounts`, `categories`, etc.)

Pendiente:
- vistas frontend que consuman estos endpoints
- endpoints de prestamos, presupuestos, conciliacion y reportes
