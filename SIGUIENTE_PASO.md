# SIGUIENTE_PASO

## Prioridad vigente

- validar el acceso rápido al portal tenant en producción

## Decisión previa obligatoria

- decidir si se usa el flujo de reset existente o se requiere una acción nueva de “impersonación”

## Próximo paso correcto

- validar botón `Abrir portal con contraseña temporal` desde `Tenants`
- confirmar que el login ya no muestra `Internal server error`

## Si el escenario principal falla

- revisar que el prefill se guarde en `sessionStorage` y se limpie al abrir el portal
- revisar consola del navegador para errores de navegación

## Condición de cierre de la próxima iteración

- acceso rápido al portal tenant validado en `staging` y `production`
