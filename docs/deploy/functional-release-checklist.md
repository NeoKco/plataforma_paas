# Checklist de Release Funcional

Este checklist complementa el release tecnico. La idea es validar que la app siga siendo usable, no solo que el deploy termine sin error.

## Antes del Release

- migraciones revisadas
- tests backend en verde
- cambios de contratos revisados en `docs/api/index.md`
- si frontend consume el cambio, contratos revisados en `docs/api/frontend-contract-stability.md`
- variables de entorno nuevas documentadas en `docs/runbooks/backend-env-catalog.md`

## Validaciones Funcionales Minimas

### Base

- `GET /health` responde `healthy`
- login `platform` funciona
- refresh y logout `platform` funcionan
- `GET /platform/capabilities` responde

### Tenants

- se puede crear un tenant
- el tenant queda con `status=pending`
- el provisioning job se crea
- el tenant puede pasar a `active` despues del flujo esperado
- `GET /platform/tenants/{tenant_id}/access-policy` responde
- `GET /platform/tenants/{tenant_id}/module-usage` responde

### Lifecycle y Billing

- cambio manual de `status` funciona
- cambio manual de `maintenance` funciona
- cambio de `plan` funciona
- cambio de billing state funciona
- `GET /tenant/info` refleja policy efectiva

### Provisioning

- se pueden consultar metricas y alerts
- la DLQ responde si el backend broker esta activo
- el requeue administrativo responde

### Billing Sync

- el historial de eventos responde
- el resumen agregado responde
- las alertas de billing responden
- la reconciliacion individual o batch responde

## Validaciones Funcionales Recomendadas para Frontend

- login de `platform_admin`
- dashboard inicial carga `capabilities`
- la sesion persiste entre refreshes
- errores backend con `request_id` se muestran de forma legible

## Criterio de Aprobacion

Un release funcional se considera aceptable cuando:

- las validaciones base pasan
- al menos una validacion de tenant pasa de punta a punta
- provisioning y billing operativo siguen consultables
- no hay regresion visible en auth o access policy
