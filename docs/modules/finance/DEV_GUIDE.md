# Finance Developer Guide

Guía de desarrollo y extensión del módulo `finance`.

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

## Contratos y decisiones importantes

- El núcleo actual es `finance_transactions`, no `finance_entries`.
- `/tenant/finance/entries` sigue solo como compatibilidad legacy.
- Transacciones no se borran físicamente; se anulan.
- Catálogos se eliminan solo con `delete seguro`; si hay referencias, se bloquea.
- Adjuntos del módulo viven dentro del propio backend del módulo, no en carpetas externas de staging.
- La moneda base afecta formateo y lectura agregada, pero no recalcula histórico automáticamente.

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

## Testing

Backend:

- tests de flujo y core financiero bajo `backend/app/tests/`
- referencia: [finance_testing.md](/home/felipe/platform_paas/backend/app/apps/tenant_modules/finance/docs/finance_testing.md)

Frontend:

- build de `frontend`
- smoke browser Playwright

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
