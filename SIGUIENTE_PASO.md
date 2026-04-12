# SIGUIENTE_PASO

## Prioridad vigente

- validar en UI que `ieris-ltda` quedó solo con categorías default

## Decisión previa obligatoria

- decidir si se quiere hacer reset de categorías en otros tenants
- confirmar si la regla E2E (solo `empresa-bootstrap` y `empresa-demo`) requiere enforcement técnico

## Próximo paso correcto

- abrir `/tenant-portal/finance/categories` y confirmar que solo existen categorías default con familia
- si hay residuos, ejecutar `reset_finance_categories_to_defaults.py` en el tenant afectado

## Si el escenario principal falla

- revisar logs backend para errores de `finance_categories` o `parent_category_id`

## Condición de cierre de la próxima iteración

- catálogo finance limpio y validado en UI para `ieris-ltda`
