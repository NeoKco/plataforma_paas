# SIGUIENTE_PASO

## Prioridad vigente

- publicar el hotfix de deprovision y limpiar tenants E2E bloqueados

## Decisión previa obligatoria

- confirmar si se despliega primero en `staging` y luego `production`, o directo a `production`

## Próximo paso correcto

- desplegar backend con el hotfix en el entorno elegido
- reintentar deprovision desde UI y/o ejecutar `cleanup_e2e_tenants.py --apply --prefix e2e-`

## Si el escenario principal falla

- aplicar cleanup manual con el script en `dry-run` y revisar errores por tenant
- revisar permisos de `/opt/platform_paas/.env` y confirmar que el runtime usa `TENANT_SECRETS_FILE`

## Condición de cierre de la próxima iteración

- tenants E2E eliminados sin errores y deprovision estable en producción
