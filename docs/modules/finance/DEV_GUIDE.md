# Finance Developer Guide

Guía de desarrollo y extensión del módulo `finance`.

Referencias transversales obligatorias:

- [Gobernanza de implementacion](/home/felipe/platform_paas/docs/architecture/implementation-governance.md)
- [Estandar de construccion de modulos](/home/felipe/platform_paas/docs/architecture/module-build-standard.md)

## Estructura

### Backend

Raíz:

- [finance](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance)

Capas principales:

- `api/`
  Endpoints FastAPI y traducción HTTP.
- `services/`
  Reglas de negocio y coordinación de casos de uso.
- `repositories/`
  Persistencia y consultas SQLAlchemy.
- `models/`
  Modelos ORM del módulo.
- `schemas/`
  Contratos de request/response.
- `utils/`
  Dinero, fechas, exportaciones, adjuntos, imports y filtros.
- `docs/`
  Documentación técnica detallada.
- `storage/attachments/`
  Storage real de adjuntos del módulo.

### Frontend

Raíz:

- [finance](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/finance)

Capas principales:

- `pages/`
  Pantallas del tenant portal.
- `services/`
  Clientes HTTP del módulo.
- `forms/`
  Formularios reutilizables.
- `components/`
  Componentes específicos del módulo.
- `hooks/`
  Estado derivado y lógica reusable de vista.
- `utils/`
  Formato, iconos y constantes del módulo.
- `docs/`
  Notas de frontend y manuales operativos.

### E2E

- [e2e](/home/felipe/platform_paas/frontend/e2e)

Smokes vigentes:

- [platform-admin.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/platform-admin.smoke.spec.ts)
- [tenant-portal-finance.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance.smoke.spec.ts)
- [tenant-portal-finance-catalogs.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-catalogs.smoke.spec.ts)
- [tenant-portal-finance-budgets.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-budgets.smoke.spec.ts)
- [tenant-portal-finance-budgets-advanced.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-budgets-advanced.smoke.spec.ts)
- [tenant-portal-finance-settings.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-settings.smoke.spec.ts)
- [tenant-portal-finance-loans.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-loans.smoke.spec.ts)
- [tenant-portal-finance-loans-batch.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-loans-batch.smoke.spec.ts)
- [tenant-portal-finance-loans-accounting.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-loans-accounting.smoke.spec.ts)
- [tenant-portal-finance-attachments-void.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-attachments-void.smoke.spec.ts)
- [tenant-portal-finance-reconciliation.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-reconciliation.smoke.spec.ts)
- [tenant-portal-finance-limit.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-limit.smoke.spec.ts)
- [tenant-portal-finance-limit-precedence.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-limit-precedence.smoke.spec.ts)
- [tenant-portal-finance-monthly-limit.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-monthly-limit.smoke.spec.ts)
- [tenant-portal-finance-monthly-type-limits.smoke.spec.ts](/home/felipe/platform_paas/frontend/e2e/specs/tenant-portal-finance-monthly-type-limits.smoke.spec.ts)

## Contratos y decisiones importantes

- El núcleo actual es `finance_transactions`, no `finance_entries`.
- `/tenant/finance/entries` sigue solo como compatibilidad legacy.
- Transacciones no se borran físicamente; se anulan.
- Catálogos se eliminan solo con `delete seguro`; si hay referencias, se bloquea.
- Adjuntos del módulo viven dentro del propio backend del módulo, no en carpetas externas de staging.
- Las imágenes adjuntas se comprimen en frontend antes del upload y se normalizan a `image/webp`.
- La moneda base afecta formateo y lectura agregada, pero no recalcula histórico automáticamente.
- Las marcas de tiempo del backend se guardan en UTC o con zona válida; los formularios `datetime-local` del frontend deben convertir a valor local con helper dedicado y no con `toISOString().slice(...)` directo, porque eso adelanta la hora visible y termina guardando desfases operativos de varias horas.
- La lectura y captura de fechas en `tenant_portal` debe usar la zona efectiva resuelta por `platform-core`:
  - override de usuario si existe
  - si no existe, zona por defecto del tenant
  - solo al final, fallback de plataforma
- La futura integración con `maintenance` debe apoyarse sobre `finance_transactions.source_type/source_id`; `finance` registra el hecho económico, pero `maintenance` sigue siendo dueño de la programación, ejecución y costeo operativo.
- El bootstrap tenant ya no deja un único catálogo genérico de categorías:
  - `tenant_type=empresa` siembra un set orientado a operación y servicio
  - `tenant_type=condominio` y cualquier perfil no empresa siembran un set hogar/condominio
  - si la DB está recién creada y no existe uso financiero, el bootstrap reemplaza el catálogo neutral de migración por el perfil vertical correcto
- Las categorías default ahora nacen con familia (parent) por tipo: `Ingresos`, `Egresos`, `Transferencias`.
- El primer corte de esa integración ya está operativo en `maintenance`:
  - `maintenance` guarda costo estimado y costo real propios
  - la acción manual `finance-sync` crea o actualiza transacciones de ingreso/egreso con `source_type/source_id`
  - `finance` no asume la lógica de costeo técnico; solo registra y conserva el hecho contable enlazado
- El siguiente corte ya deja además política tenant-side para auto-sync:
  - la configuración vive en `tenant_info` y se administra desde `Mantenciones > Resumen`
  - `finance` sigue sin volverse dueño del workflow técnico
  - `source_type/source_id` sigue siendo el enlace canónico

## Cómo extender el módulo

### Agregar una nueva capacidad backend

1. definir schema en `schemas/`
2. implementar reglas en `services/`
3. agregar persistencia en `repositories/`
4. exponer endpoint en `api/`
5. cubrir con tests backend
6. documentar impacto en `docs/modules/finance/` y en docs técnicas específicas si aplica

### Agregar una nueva pantalla frontend

1. crear página en `pages/`
2. agregar servicio HTTP en `services/`
3. reutilizar `FinanceModuleNav`, `PageHeader`, `PanelCard` y `FinanceHelpBubble`
4. conectar ruta en [routes.tsx](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/finance/routes.tsx)
5. validar textos `es/en`
6. añadir smoke o ampliar E2E si el flujo lo justifica

## Regla UX aplicada

- los CRUD visibles de `finance` deben priorizar lectura primero
- la alta o edición no debería invadir la vista principal si el usuario no la pidió
- usar como referencia oficial el [Estandar de botones CRUD](/home/felipe/platform_paas/docs/architecture/crud-button-standard.md)
- `Cuentas`, `Categorías`, `Catálogos auxiliares` y `Configuración` ya adoptan modal bajo demanda para creación y edición
- `Movimientos` ya usa `Registrar transacción` en el header, detalle en modal bajo `Ver` y sin panel fijo de detalle operacional en la pantalla principal
- `Presupuestos` ya usa `Nuevo presupuesto` en modal bajo demanda
- `Préstamos` ya usa `Nuevo préstamo` en modal bajo demanda

## Testing

Backend:

- tests de flujo y core financiero bajo `backend/app/tests/`
- referencia: [finance_testing.md](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/docs/finance_testing.md)

Frontend:

- build de `frontend`
- smoke browser Playwright
- baseline tenant actual validado sobre `empresa-bootstrap`
- cobertura tenant validada para creación de transacción, carga de adjunto, anulación, conciliación, límites efectivos, mantenimiento de cuentas/categorías, configuración financiera base (`currencies`, `exchange rates`, `settings`), flujo base de presupuestos, plantillas y ajustes guiados de presupuestos, flujo base de préstamos, operaciones batch/reversal de préstamos y lectura contable derivada con exportaciones `CSV`/`JSON`
- el smoke avanzado de presupuestos usa categoría y meses efímeros para validar `template apply` con escala/redondeo y la acción guiada `deactivate_unused` sin acoplarse al catálogo inicial del tenant
- el smoke contable de préstamos usa un préstamo efímero, aplica pago simple + reversa y verifica la tabla derivada junto con las descargas `finance-loan-accounting-*.csv/json`
- los smokes de préstamos se estabilizaron para aceptar cronograma ya abierto, separar correctamente el formulario individual del batch y seleccionar de forma explícita `Cuenta origen`, nota operativa y motivo de reversa
- no se requirió cambio funcional del módulo en esta ronda porque la regresión observada fue exclusivamente E2E: los endpoints y la UI ya resolvían el caso real, pero los tests asumían estados/locators demasiado frágiles

## Importación legacy

Script operativo:

- [import_finance_legacy_egresos.py](/home/felipe/platform_paas/backend/app/scripts/import_finance_legacy_egresos.py)

Perfil de importación:

- [imports.py](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/utils/imports.py)

Uso típico:

```bash
cd /home/felipe/platform_paas/backend
PYTHONPATH=/home/felipe/platform_paas/backend \
/home/felipe/platform_paas/platform_paas_venv/bin/python \
app/scripts/import_finance_legacy_egresos.py --apply --tenant-slug empresa-demo --actor-user-id 1
```

## Referencias técnicas

- Overview: [finance_overview.md](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/docs/finance_overview.md)
- API detallada: [finance_api.md](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/docs/finance_api.md)
- DB: [finance_db.md](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/docs/finance_db.md)
- Reglas: [finance_business_rules.md](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/docs/finance_business_rules.md)
- Frontend notes: [finance_frontend_notes.md](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/finance/docs/finance_frontend_notes.md)
