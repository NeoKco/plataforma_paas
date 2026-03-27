# Finance Overview

Estado actual:
- `finance` queda definido como modulo base del SaaS.
- este modulo actua como piloto para la convencion modular futura.
- el arranque actual ya cubre `Lote 0`, `Lote 1`, `Lote 2`, `Lote 3`, `Lote 4` y `Lote 5` del plan maestro.

Alcance de esta fase:
- estructura backend y frontend del modulo
- ruta tenant estable y compatible con la pantalla actual
- documentacion tecnica y funcional inicial
- preservacion del flujo minimo ya existente de movimientos
- migraciones base de catalogos y configuracion
- seeds idempotentes iniciales para moneda, categorias y settings
- seed idempotente adicional para `CLP`
- modelos SQLAlchemy de catalogos base
- schemas backend por entidad
- repositories CRUD base por catalogo
- servicios backend por catalogo
- endpoints CRUD base para catalogos y configuracion
- pantallas frontend operativas para cuentas, categorias, catalogos auxiliares y configuracion financiera
- nucleo transaccional real en `finance_transactions`
- backfill idempotente desde `finance_entries`
- auditoria y adjuntos base para transacciones
- compatibilidad legacy: `/tenant/finance/entries` sigue operando, pero ya persiste sobre `finance_transactions`

Pendiente inmediato:
- `Lote 6` detalle y panel operacional de transacciones
- `Lote 7` prestamos, planificacion y reportes
