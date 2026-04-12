# SIGUIENTE_PASO

## Prioridad vigente

- reintentar eliminar el tenant con error después del hotfix

## Decisión previa obligatoria

- decidir si se debe aplicar el hotfix también al worker provisioning (si corre separado)

## Próximo paso correcto

- ejecutar `Desprovisionar tenant` y luego `Eliminar tenant`
- confirmar que no aparece `Permission denied` en la consola

## Si el escenario principal falla

- revisar logs backend para errores de `finance_categories` o `parent_category_id`

## Condición de cierre de la próxima iteración

- tenant eliminado correctamente desde UI
