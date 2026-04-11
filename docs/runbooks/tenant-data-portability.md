# Tenant Data Portability

Runbook corto para operar la portabilidad tenant actual.

## Propósito

La plataforma soporta portabilidad tenant mediante:

- `zip`
- `manifest.json`
- múltiples `csv`

Esto sirve para:

- respaldo operativo portable
- consulta externa
- migración o importación controlada sobre otro tenant

No reemplaza el backup PostgreSQL canónico.

## Modos soportados

- `portable_full`
  incluye el paquete portable completo soportado por la plataforma: identidad tenant, roles, usuarios y datos funcionales soportados
- `functional_data_only`
  excluye identidad tenant, roles y usuarios; deja solo datos funcionales soportados
- `portable_minimum`
  queda solo como compatibilidad de import para paquetes heredados ya emitidos

## Superficies disponibles

- `platform_admin > Tenants`
- `tenant_portal > Resumen técnico`, solo para admin tenant

Ambas superficies usan la misma lógica backend y generan el mismo tipo de artifact portable.

## Flujo operativo de export

Desde `platform_admin > Tenants` o `tenant_portal > Resumen técnico`:

1. seleccionar el tenant
2. verificar que `db_configured=true`
3. elegir el modo:
   - `Paquete completo`
   - `Solo datos funcionales`
4. usar `Exportar paquete portable`
5. esperar job `completed`
6. descargar el `zip`

Si el tenant todavía no tiene DB configurada:

- el botón queda bloqueado
- primero hay que completar provisioning o reprovision

## Qué genera el export actual

Paquete portable actual:

- `manifest.json`
- múltiples `csv`
- `export_scope` declarado en el `manifest`

Según el scope:

- `portable_full`
  incluye identidad tenant, roles, usuarios y datos funcionales soportados
- `functional_data_only`
  excluye identidad tenant, roles y usuarios
  pero sí conserva catálogos y tablas de soporte necesarias para respetar FKs funcionales
  por ejemplo:
  - `maintenance_equipment_types`
  - `finance_beneficiaries`
  - `finance_people`
  - `finance_projects`

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

Desde `platform_admin > Tenants` o `tenant_portal > Resumen técnico`:

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
- el `manifest` puede venir con `export_scope=portable_full`, `functional_data_only` o `portable_minimum` heredado
- la estrategia inicial es `skip_existing`
- la importación no reemplaza filas existentes
- `skip_existing` hoy evita colisiones tanto por PK como por constraints únicos simples/compuestos ya presentes en el tenant destino

## Estado actual del frente

- export/import portable desde `platform_admin`: implementado y validado
- dos modos de export/import (`portable_full` y `functional_data_only`): implementados y validados en `staging` y `production`
- export/import portable desde `tenant_portal` para admin tenant: implementado y validado en `staging` y `production`
- compatibilidad con `portable_minimum`: mantenida solo para import de paquetes heredados
- `dry_run`: soportado
- `apply`: soportado
- siguiente paso recomendado:
  - si el roadmap vuelve a portabilidad, abrir Fase 3 de endurecimiento
  - si no, considerar este corte cerrado y retomar `platform-core hardening + E2E` sobre `Provisioning/DLQ`

## Lecciones operativas ya cerradas

- el deploy backend debe crear y dejar escribible `TENANT_DATA_EXPORT_ARTIFACTS_DIR` para el usuario real del servicio
- el import no debe insertar strings crudos desde CSV en columnas tipadas
- los scopes portables deben incluir también tablas de soporte referenciadas por FK desde tablas funcionales; si no, el `dry_run` puede verse sano pero el `apply` fallará en runtime
- el import actual ya convierte por tipo de columna al menos:
  - boolean
  - integer
  - numeric
  - date
  - datetime
  - time
  - json
  - binary base64
- si el cambio toca UI visible de `platform_admin` o `tenant_portal`, no basta con desplegar backend: también hay que reconstruir el frontend publicado
- en este entorno de agente, el smoke `tenant-portal-data-portability` puede requerir ejecución fuera del sandbox cuando Chromium falla al arrancar con `SIGTRAP`; tratarlo como limitación de ejecución del agente, no como fallo funcional, si el mismo spec pasa fuera de sandbox
