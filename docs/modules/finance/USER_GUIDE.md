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
