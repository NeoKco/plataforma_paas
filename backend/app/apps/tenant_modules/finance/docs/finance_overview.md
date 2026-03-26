# Finance Overview

Estado actual:
- `finance` queda definido como modulo base del SaaS.
- este modulo actua como piloto para la convencion modular futura.
- el arranque actual ya cubre `Lote 0`, `Lote 1`, `Lote 2` y `Lote 3` del plan maestro.

Alcance de esta fase:
- estructura backend y frontend del modulo
- ruta tenant estable y compatible con la pantalla actual
- documentacion tecnica y funcional inicial
- preservacion del flujo minimo ya existente de movimientos
- migraciones base de catalogos y configuracion
- seeds idempotentes iniciales para moneda, categorias y settings
- modelos SQLAlchemy de catalogos base
- schemas backend por entidad
- repositories CRUD base por catalogo
- servicios backend por catalogo
- endpoints CRUD base para catalogos y configuracion

Pendiente inmediato:
- `Lote 4` cuentas
- `Lote 5` transacciones enriquecidas
