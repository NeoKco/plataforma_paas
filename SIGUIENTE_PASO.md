# SIGUIENTE_PASO

## Prioridad vigente

- validar en UI que todas las categorías finance de `ieris-ltda` tengan familia

## Decisión previa obligatoria

- definir si la reparación de familias debe correr masivamente en otros tenants existentes

## Próximo paso correcto

- abrir `/tenant-portal/finance/categories` y confirmar que todo tiene familia visible
- si falta, correr `repair_finance_category_families.py` para el tenant afectado

## Si el escenario principal falla

- revisar logs backend para errores de `finance_categories` o `parent_category_id`

## Condición de cierre de la próxima iteración

- categorías finance con familia visible en `ieris-ltda`
