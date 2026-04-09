# Tenant Data Portability

Runbook corto para operar la portabilidad tenant actual.

## Propósito

La plataforma ahora soporta portabilidad tenant por:

- `zip`
- `manifest.json`
- múltiples `csv`

Esto sirve para:

- respaldo operativo portable
- consulta externa
- migración o importación controlada sobre otro tenant

No reemplaza el backup PostgreSQL canónico.

## Flujo operativo de export

Desde `platform_admin > Tenants`:

1. seleccionar el tenant
2. verificar que `db_configured=true`
3. usar `Exportar CSV portable`
4. esperar job `completed`
5. descargar el `zip`

Si el tenant todavía no tiene DB configurada:

- el botón queda bloqueado
- primero hay que completar provisioning o reprovision

## Qué genera el export actual

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

## Flujo operativo de import

Desde `platform_admin > Tenants`:

1. seleccionar el tenant destino
2. verificar que `db_configured=true`
3. cargar un paquete `zip` exportado por la plataforma
4. ejecutar primero `Simular import portable`
5. revisar el resultado del job
6. ejecutar `Aplicar import portable` solo si el `dry_run` quedó sano

Reglas operativas:

- el tenant destino no puede estar `archived`
- el paquete debe incluir `manifest.json`
- la validación actual revisa `checksums` y `schema_version`
- la estrategia inicial es `skip_existing`
- la importación no reemplaza filas existentes

## Estado actual del frente

- export portable mínimo: implementado y validado
- import controlado mínimo: implementado y validado
- `dry_run`: validado en browser
- `apply`: validado en browser
- `staging`: validado
- `production`: validado
- siguiente paso recomendado: Fase 3 de endurecimiento solo si el roadmap lo prioriza

## Lecciones operativas ya cerradas

- el deploy backend debe crear y dejar escribible `TENANT_DATA_EXPORT_ARTIFACTS_DIR` para el usuario real del servicio
- el import no debe insertar strings crudos desde CSV en columnas tipadas
- el import actual ya convierte por tipo de columna al menos:
  - boolean
  - integer
  - numeric
  - date
  - datetime
  - time
  - json
  - binary base64
- si el cambio toca UI visible de `platform_admin`, no basta con desplegar backend: también hay que reconstruir el frontend publicado
