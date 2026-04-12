# SIGUIENTE_PASO

## Prioridad vigente

- validar login tenant en UI y confirmar que no hay `500` al fallar sesión

## Decisión previa obligatoria

- confirmar si se despliega primero en `staging` y luego `production`, o directo a `production`

## Próximo paso correcto

- probar login tenant con credenciales inválidas y con tenant no provisionado
- si ya responde 401/503/404, cerrar el hotfix y volver al roadmap central

## Si el escenario principal falla

- revisar logs de backend y reintentar con un tenant operativo real

## Condición de cierre de la próxima iteración

- login tenant sin `500` y errores controlados visibles en UI
