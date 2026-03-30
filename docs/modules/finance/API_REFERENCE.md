# Finance API Reference

Referencia resumida de endpoints del módulo `finance`.

Detalle extendido:

- [finance_api.md](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/docs/finance_api.md)

## Transacciones

- `GET /tenant/finance/entries`
- `POST /tenant/finance/entries`
- `GET /tenant/finance/summary`
- `GET /tenant/finance/usage`
- `GET /tenant/finance/account-balances`
- `GET /tenant/finance/transactions`
- `POST /tenant/finance/transactions`
- `PUT /tenant/finance/transactions/{transaction_id}`
- `GET /tenant/finance/transactions/{transaction_id}`
- `PATCH /tenant/finance/transactions/{transaction_id}/void`
- `PATCH /tenant/finance/transactions/{transaction_id}/favorite`
- `PATCH /tenant/finance/transactions/favorite/batch`
- `PATCH /tenant/finance/transactions/{transaction_id}/reconciliation`
- `PATCH /tenant/finance/transactions/reconciliation/batch`

Adjuntos:

- `POST /tenant/finance/transactions/{transaction_id}/attachments`
- `DELETE /tenant/finance/transactions/{transaction_id}/attachments/{attachment_id}`
- `GET /tenant/finance/transactions/{transaction_id}/attachments/{attachment_id}/download`

## Presupuestos

- `GET /tenant/finance/budgets`
- `POST /tenant/finance/budgets`
- `PUT /tenant/finance/budgets/{budget_id}`
- `PATCH /tenant/finance/budgets/{budget_id}/status`
- `POST /tenant/finance/budgets/clone`
- `POST /tenant/finance/budgets/template`
- `POST /tenant/finance/budgets/focus-adjustment`

## Préstamos

- `GET /tenant/finance/loans`
- `POST /tenant/finance/loans`
- `PUT /tenant/finance/loans/{loan_id}`
- `GET /tenant/finance/loans/{loan_id}`
- `PATCH /tenant/finance/loans/{loan_id}/installments/{installment_id}/payment`
- `PATCH /tenant/finance/loans/{loan_id}/installments/payment/batch`
- `PATCH /tenant/finance/loans/{loan_id}/installments/{installment_id}/payment/reversal`
- `PATCH /tenant/finance/loans/{loan_id}/installments/payment/reversal/batch`

## Planificación y reportes

- `GET /tenant/finance/planning/overview`
- `GET /tenant/finance/reports/overview`
- `GET /tenant/finance/reports/export/csv`
- `GET /tenant/finance/reports/export/json`

## Catálogos

Cuentas:

- `GET /tenant/finance/accounts`
- `POST /tenant/finance/accounts`
- `PUT /tenant/finance/accounts/{account_id}`
- `PATCH /tenant/finance/accounts/{account_id}/status`
- `DELETE /tenant/finance/accounts/{account_id}`

Categorías:

- `GET /tenant/finance/categories`
- `POST /tenant/finance/categories`
- `GET /tenant/finance/categories/{category_id}`
- `PUT /tenant/finance/categories/{category_id}`
- `PATCH /tenant/finance/categories/{category_id}/status`
- `PATCH /tenant/finance/categories/reorder`
- `DELETE /tenant/finance/categories/{category_id}`

Auxiliares:

- `beneficiaries`
- `people`
- `projects`
- `tags`

Todos siguen el patrón:

- `GET`
- `POST`
- `GET /{id}`
- `PUT /{id}`
- `PATCH /{id}/status`
- `DELETE /{id}`

## Configuración financiera

Monedas:

- `GET /tenant/finance/currencies`
- `POST /tenant/finance/currencies`
- `GET /tenant/finance/currencies/{currency_id}`
- `PUT /tenant/finance/currencies/{currency_id}`
- `PATCH /tenant/finance/currencies/{currency_id}/status`
- `DELETE /tenant/finance/currencies/{currency_id}`

Tipos de cambio:

- `GET /tenant/finance/exchange-rates`
- `POST /tenant/finance/exchange-rates`
- `GET /tenant/finance/exchange-rates/{exchange_rate_id}`
- `PUT /tenant/finance/exchange-rates/{exchange_rate_id}`
- `DELETE /tenant/finance/exchange-rates/{exchange_rate_id}`

Settings:

- `GET /tenant/finance/settings`
- `PUT /tenant/finance/settings`

## Operación de estructura

- `GET /tenant/schema-status`
- `POST /tenant/sync-schema`

## Notas operativas

- `DELETE` en catálogos es seguro, no forzado
- `void` reemplaza `DELETE` para transacciones
- si el tenant tiene schema incompleto, algunas vistas responden `400` controlado hasta completar sync
