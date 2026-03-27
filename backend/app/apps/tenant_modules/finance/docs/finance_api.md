# Finance API

API vigente en el arranque:
- `GET /tenant/finance/entries`
- `POST /tenant/finance/entries`
- `GET /tenant/finance/transactions`
- `POST /tenant/finance/transactions`
- `PUT /tenant/finance/transactions/{transaction_id}`
- `GET /tenant/finance/transactions/{transaction_id}`
- `PATCH /tenant/finance/transactions/{transaction_id}/favorite`
- `PATCH /tenant/finance/transactions/{transaction_id}/reconciliation`
- `PATCH /tenant/finance/transactions/favorite/batch`
- `PATCH /tenant/finance/transactions/reconciliation/batch`
- `GET /tenant/finance/budgets`
- `POST /tenant/finance/budgets`
- `PUT /tenant/finance/budgets/{budget_id}`
- `GET /tenant/finance/loans`
- `POST /tenant/finance/loans`
- `PUT /tenant/finance/loans/{loan_id}`
- `GET /tenant/finance/loans/{loan_id}`
- `PATCH /tenant/finance/loans/{loan_id}/installments/{installment_id}/payment`
- `PATCH /tenant/finance/loans/{loan_id}/installments/{installment_id}/payment/reversal`
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

Estado actual de `Lote 6`:
- ya existen `GET|POST /tenant/finance/transactions`
- ya existe `PUT /tenant/finance/transactions/{transaction_id}` para editar una transaccion existente
- ya existe `GET /tenant/finance/transactions/{transaction_id}` con auditoria reciente
- ya existe `GET /tenant/finance/account-balances`
- `GET /tenant/finance/transactions` ya admite filtros por tipo, cuenta, categoria, favorita, conciliacion y texto
- ya existen `PATCH /tenant/finance/transactions/{transaction_id}/favorite`
- ya existen `PATCH /tenant/finance/transactions/{transaction_id}/reconciliation` con nota opcional
- ya existen `PATCH /tenant/finance/transactions/favorite/batch`
- ya existen `PATCH /tenant/finance/transactions/reconciliation/batch` con nota opcional
- `tenant_portal` ya consume ese contrato moderno en la pantalla principal de `Transacciones`
- ya existen `GET|POST /tenant/finance/budgets`
- ya existe `PUT /tenant/finance/budgets/{budget_id}` para editar un presupuesto mensual existente
- `GET /tenant/finance/budgets` ya expone lectura `presupuesto vs real` por mes y categoria, con variacion y porcentaje de uso
- `GET /tenant/finance/budgets` ya admite filtros por tipo de categoria, estado derivado y visibilidad de inactivos
- `tenant_portal` ya consume ese contrato en la primera pantalla real de `Presupuestos`
- ya existen `GET|POST /tenant/finance/loans`
- ya existe `PUT /tenant/finance/loans/{loan_id}` para editar un préstamo existente
- ya existe `GET /tenant/finance/loans/{loan_id}` para recuperar cronograma y detalle operativo de cuotas
- `GET /tenant/finance/loans` ya expone cartera con saldo pendiente, capital inicial, proximo vencimiento y avance de cuotas
- ya existe `PATCH /tenant/finance/loans/{loan_id}/installments/{installment_id}/payment` para registrar abonos sobre una cuota y recalcular el saldo pendiente del préstamo
- ya existe `PATCH /tenant/finance/loans/{loan_id}/installments/payment/batch` para aplicar pago sobre varias cuotas seleccionadas del mismo préstamo
- ese endpoint ya admite `allocation_mode = interest_first | principal_first | proportional`
- el lote ya admite `amount_mode = full_remaining | fixed_per_installment`
- el detalle de cuota ya expone `paid_principal_amount` y `paid_interest_amount`
- ya existe `PATCH /tenant/finance/loans/{loan_id}/installments/{installment_id}/payment/reversal` para revertir parcial o totalmente un abono aplicado a una cuota
- ya existe `PATCH /tenant/finance/loans/{loan_id}/installments/payment/reversal/batch` para revertir en lote cuotas seleccionadas del mismo préstamo
- la reversa batch ya admite `amount_mode = full_paid | fixed_per_installment`
- la reversa individual y batch ahora exigen `reversal_reason_code`
- el detalle de cuota ya expone `reversal_reason_code`
- pagos y reversas sobre cuotas ahora generan una transaccion real en `finance_transactions`
- esa transaccion queda enlazada por `loan_id`, `source_type` (`loan_installment_payment|loan_installment_reversal`) y `source_id`
- ya existe `GET /tenant/finance/reports/overview` para recuperar lectura mensual consolidada
- `tenant_portal` ya consume ese contrato en la primera pantalla real de `Préstamos`

Nucleo transaccional ya disponible en backend:
- tabla `finance_transactions`
- tabla `finance_transaction_tags`
- tabla `finance_transaction_attachments`
- tabla `finance_transaction_audit`
- tabla `finance_budgets`
- tabla `finance_loans`
- tabla `finance_loan_installments`
- lectura mensual consolidada expuesta por API en `reports/overview`

Pendiente:
- enriquecer `budgets` con lectura mas densa por categoria y estados operativos mas ricos
- conciliacion asistida con motivos estructurados y lotes mas inteligentes sobre filtro activo
- enriquecer el enlace contable de `loans` con cuenta origen y lectura derivada mas densa
- endpoints de planificacion y reportes mas densos o exportables
