# Finance User Guide

Guía operativa corta del módulo `finance`.

## Para qué sirve

`finance` centraliza operación financiera tenant:

- transacciones
- presupuestos
- préstamos
- planificación mensual
- reportes
- catálogos y configuración financiera

## Pantallas principales

- `Movimientos`
  Crear, editar, filtrar, conciliar, marcar favoritas, operar por lote y anular transacciones.
- `Presupuestos`
  Cargar presupuesto mensual por categoría, clonar meses, aplicar plantillas y revisar desvíos.
- `Préstamos`
  Registrar cartera, generar cronograma, aplicar pagos y reversas, revisar lectura contable derivada.
- `Planificación`
  Ver señales operativas del mes, cuotas por vencer y presión presupuestaria.
- `Reportes`
  Revisar consolidado mensual, comparativas, rankings y exportaciones.
- `Cuentas`, `Categorías`, `Catálogos`, `Configuración`
  Mantener el catálogo operativo del módulo.

## Flujos principales

### Registrar una transacción

1. Ir a `Finanzas > Movimientos`.
2. Elegir `Tipo`.
3. Seleccionar `Cuenta origen`.
4. Elegir `Categoría` cuando aplique.
5. Completar `Monto`, `Fecha y hora` y `Descripción`.
6. Registrar.

Después del alta, el detalle operacional queda abierto para adjuntar boleta, factura o respaldo.

### Adjuntar respaldo

1. Seleccionar una transacción.
2. Usar el bloque de adjuntos en el detalle operacional.
3. Subir `JPG`, `PNG`, `WEBP` o `PDF`.

Las imágenes se comprimen antes de subir y el backend valida un tamaño final máximo de `5 MB`.
Si subes una imagen `JPG` o `PNG`, el nombre final visible del adjunto puede quedar con extensión `WEBP`.

### Corregir un movimiento

- Si el movimiento existe pero fue mal cargado: `Editar`.
- Si el movimiento debe salir de balances e informes sin perder historia: `Anular`.
- No existe borrado físico de transacciones.

### Mantener catálogos

- `Eliminar`
  Solo cuando el registro no tiene referencias reales.
- `Desactivar`
  Cuando quieres sacarlo de operación sin perder histórico.

Esta regla aplica especialmente a cuentas, categorías, monedas y catálogos auxiliares.

### Registrar y clonar presupuestos

1. Ir a `Finanzas > Presupuestos`.
2. Elegir `Mes`, `Categoría` y `Monto presupuestado`.
3. Registrar el presupuesto mensual.
4. Si necesitas replicarlo al siguiente período, usa `Clonar al mes visible`.

El portal muestra además una lectura rápida de `Presupuestado`, `Ejecutado`, `Desviación` y el estado derivado de cada fila para priorizar revisión.

### Registrar un préstamo y cobrar/pagar una cuota

1. Ir a `Finanzas > Préstamos`.
2. Registrar nombre, contraparte, capital, saldo, cuotas y cuenta operativa.
3. Abrir `Cronograma` desde la cartera.
4. Usar `Registrar pago` sobre una cuota para aplicar un abono simple.

El detalle del préstamo muestra cronograma, estado de cuotas y lectura contable derivada para revisar pagos y reversas desde el mismo módulo.

### Operar cuotas en lote

1. Abrir `Cronograma` del préstamo.
2. Seleccionar varias cuotas.
3. Elegir `Aplicar pago en lote` o `Aplicar reversa en lote`.
4. Confirmar monto por cuota, cuenta operativa y motivo de reversa cuando corresponda.

Esto permite regularizar varias cuotas en una sola operación manteniendo trazabilidad por cuota dentro del mismo préstamo.

## Errores comunes

### “Schema incompleto” o estructura atrasada

Si alguna vista indica que faltan tablas o columnas:

1. usar `Actualizar estructura del módulo` desde el portal tenant
2. esperar a que cierre el job de sincronización

### Una categoría no aparece al registrar transacción

Las categorías visibles dependen del tipo del movimiento:

- `Ingreso` muestra categorías de ingreso
- `Egreso` muestra categorías de egreso
- `Transferencia` no usa categoría

### No puedo eliminar una cuenta o categoría

Eso normalmente significa que ya tiene referencias operativas.

La acción correcta pasa a ser:

- `Desactivar`
- conservar trazabilidad histórica

## Referencias útiles

- Manual funcional extendido: [finance_user_manual.md](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/finance/docs/finance_user_manual.md)
- Manual administrativo: [finance_admin_manual.md](/home/felipe/platform_paas/frontend/src/apps/tenant_portal/modules/finance/docs/finance_admin_manual.md)
