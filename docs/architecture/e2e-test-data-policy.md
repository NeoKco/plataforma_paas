# Política E2E y Datos de Prueba

Esta política define cómo se preparan, usan y limpian datos de prueba en `platform_paas`.

## Objetivo

Evitar que las pruebas E2E:

- ensucien `production`
- alteren tenants operativos
- dejen catálogos o movimientos basura
- generen diagnósticos falsos

## Tenants permitidos para E2E

Los tenants permitidos para E2E browser son:

- `empresa-bootstrap`
- `empresa-demo`

## Tenants prohibidos para E2E

No usar para E2E:

- `ieris-ltda`
- cualquier tenant operativo real

## Naming obligatorio

Los artefactos de prueba deben ser identificables.

Prefijos permitidos:

- `e2e-`
- `debug-`

Aplica a:

- tenants efímeros
- categorías
- transacciones
- cuentas
- préstamos
- adjuntos o lotes de prueba

## Limpieza obligatoria

Toda prueba que cree basura funcional debe dejar:

- cleanup automático o
- script de cleanup documentado

Referencias existentes:

- `cleanup_e2e_tenants.py`
- `cleanup_tenant_e2e_finance_data.py`

## Producción

En `production`:

- preferir smoke que no deje datos
- si un smoke requiere crear datos, debe dejar cleanup
- no usar tenants reales para sembrar datos E2E

## Cierre mínimo de un frente E2E

- tenant permitido
- datos claramente etiquetados
- cleanup existente
- runbook actualizado
- memoria viva alineada si el cambio afecta política de pruebas
