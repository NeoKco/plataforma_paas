# Finance API

API vigente en el arranque:
- `GET /tenant/finance/entries`
- `POST /tenant/finance/entries`
- `GET /tenant/finance/transactions`
- `POST /tenant/finance/transactions`
- `GET /tenant/finance/transactions/{transaction_id}`
- `GET /tenant/finance/account-balances`
- `GET /tenant/finance/summary`
- `GET /tenant/finance/usage`
- `GET /tenant/finance/accounts`
- `GET /tenant/finance/accounts/{account_id}`
- `POST /tenant/finance/accounts`
- `PUT /tenant/finance/accounts/{account_id}`
- `PATCH /tenant/finance/accounts/{account_id}/status`
- `PATCH /tenant/finance/accounts/reorder`
- `GET /tenant/finance/categories`
- `GET /tenant/finance/categories/{category_id}`
- `POST /tenant/finance/categories`
- `PUT /tenant/finance/categories/{category_id}`
- `PATCH /tenant/finance/categories/{category_id}/status`
- `PATCH /tenant/finance/categories/reorder`
- `GET /tenant/finance/beneficiaries`
- `GET /tenant/finance/beneficiaries/{beneficiary_id}`
- `POST /tenant/finance/beneficiaries`
- `PUT /tenant/finance/beneficiaries/{beneficiary_id}`
- `PATCH /tenant/finance/beneficiaries/{beneficiary_id}/status`
- `PATCH /tenant/finance/beneficiaries/reorder`
- `GET /tenant/finance/people`
- `GET /tenant/finance/people/{person_id}`
- `POST /tenant/finance/people`
- `PUT /tenant/finance/people/{person_id}`
- `PATCH /tenant/finance/people/{person_id}/status`
- `PATCH /tenant/finance/people/reorder`
- `GET /tenant/finance/projects`
- `GET /tenant/finance/projects/{project_id}`
- `POST /tenant/finance/projects`
- `PUT /tenant/finance/projects/{project_id}`
- `PATCH /tenant/finance/projects/{project_id}/status`
- `PATCH /tenant/finance/projects/reorder`
- `GET /tenant/finance/tags`
- `GET /tenant/finance/tags/{tag_id}`
- `POST /tenant/finance/tags`
- `PUT /tenant/finance/tags/{tag_id}`
- `PATCH /tenant/finance/tags/{tag_id}/status`
- `PATCH /tenant/finance/tags/reorder`
- `GET /tenant/finance/currencies`
- `GET /tenant/finance/currencies/{currency_id}`
- `POST /tenant/finance/currencies`
- `PUT /tenant/finance/currencies/{currency_id}`
- `PATCH /tenant/finance/currencies/{currency_id}/status`
- `PATCH /tenant/finance/currencies/reorder`
- `GET /tenant/finance/currencies/exchange-rates`
- `GET /tenant/finance/currencies/exchange-rates/{exchange_rate_id}`
- `POST /tenant/finance/currencies/exchange-rates`
- `PUT /tenant/finance/currencies/exchange-rates/{exchange_rate_id}`
- `GET /tenant/finance/settings`
- `GET /tenant/finance/settings/{setting_id}`
- `POST /tenant/finance/settings`
- `PUT /tenant/finance/settings/{setting_id}`
- `PATCH /tenant/finance/settings/{setting_id}/status`

Estado tras `Lote 1`:
- no se agregaron endpoints nuevos todavia
- la prioridad de esta fase fue dejar el esquema tenant base del modulo listo

Estado tras `Lote 3`:
- ya existen endpoints CRUD base para catalogos clave
- ya existen endpoints de detalle y `reorder` donde aplica
- las rutas mantienen el patron `router -> service -> repository`
- las respuestas siguen el formato tipado del modulo, incluyendo `requested_by`

Estado tras `Lote 4`:
- frontend ya consume estos contratos en `/tenant-portal/finance/accounts`
- frontend ya consume estos contratos en `/tenant-portal/finance/categories`
- frontend ya consume estos contratos en `/tenant-portal/finance/tools`
- frontend ya consume estos contratos en `/tenant-portal/finance/settings`

Estado tras `Lote 5`:
- `/tenant/finance/entries` se mantiene como contrato legacy
- internamente, esas rutas ya persisten y leen desde `finance_transactions`
- el backfill desde `finance_entries` a `finance_transactions` queda cubierto por migracion
- el siguiente paso API ya no era romper `/entries`, sino abrir endpoints ricos de transacciones sobre la nueva tabla

Estado tras la primera parte de `Lote 6`:
- ya existen `GET|POST /tenant/finance/transactions`
- ya existe `GET /tenant/finance/transactions/{transaction_id}` con auditoria reciente
- ya existe `GET /tenant/finance/account-balances`
- `GET /tenant/finance/transactions` ya admite filtros por tipo, cuenta, categoria, conciliacion y texto
- ya existen `PATCH /tenant/finance/transactions/{transaction_id}/favorite`
- ya existen `PATCH /tenant/finance/transactions/{transaction_id}/reconciliation`
- `tenant_portal` ya consume ese contrato moderno en la pantalla principal de `Transacciones`

Nucleo transaccional ya disponible en backend:
- tabla `finance_transactions`
- tabla `finance_transaction_tags`
- tabla `finance_transaction_attachments`
- tabla `finance_transaction_audit`

Pendiente:
- endpoints de prestamos, presupuestos, conciliacion y reportes
- edicion completa de transacciones existentes
