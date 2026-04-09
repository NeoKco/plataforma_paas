# Tenant Data Portability

Runbook corto para operar la Fase 1 de portabilidad tenant.

## Propósito

La plataforma ahora soporta un export portable por tenant en:

- `zip`
- `manifest.json`
- múltiples `csv`

Esto sirve para:

- respaldo operativo portable
- consulta externa
- base para una futura importación controlada

No reemplaza el backup PostgreSQL canónico.

## Flujo operativo

Desde `platform_admin > Tenants`:

1. seleccionar el tenant
2. verificar que `db_configured=true`
3. usar `Exportar CSV portable`
4. esperar job `completed`
5. descargar el `zip`

Si el tenant todavía no tiene DB configurada:

- el botón queda bloqueado
- primero hay que completar provisioning o reprovision

## Qué genera la Fase 1

Paquete portable mínimo:

- `manifest.json`
- `tenant_info.csv`
- `users.csv`
- `business_clients.csv`
- y otras tablas del scope `portable_minimum` cuando existen en la DB tenant

Tablas ausentes:

- no hacen fallar el export
- quedan registradas como `skipped_tables` dentro del `manifest`

## Runtime y almacenamiento

Variable nueva:

- `TENANT_DATA_EXPORT_ARTIFACTS_DIR`

Uso:

- directorio raíz donde `platform_control` deja artifacts `zip` por tenant/job

Ejemplo productivo sugerido:

```env
TENANT_DATA_EXPORT_ARTIFACTS_DIR=/opt/platform_paas/storage/tenant_data_exports
```

## Regla cerrada

- `pg_dump` sigue siendo el respaldo técnico serio
- `CSV + manifest` es portabilidad, no sustituto del backup técnico

## Siguiente fase

La siguiente fase ya no es export:

- import controlado
- `dry_run`
- validación previa
- aplicación explícita sobre tenant destino
