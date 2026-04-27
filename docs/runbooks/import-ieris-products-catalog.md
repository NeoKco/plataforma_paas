# Importar catálogo legacy de `ieris_app`

Runbook para traer al PaaS todos los productos/servicios legacy con sus características, fotos, URL fuente e historial base de precio.

## Artefactos

- script principal:
  - `backend/app/scripts/import_ieris_products_catalog.py`
- helper de migración tenant puntual:
  - `backend/app/scripts/run_single_tenant_migrations.py`
- migración de soporte:
  - `backend/migrations/tenant/v0053_products_catalog_images_postgres_identity_fix.py`

## Reglas

- siempre tomar backup PostgreSQL del tenant antes de mutar datos
- `ieris-ltda` es tenant sensible y exige backup explícito previo
- usar `external_reference=ieris:catalogo_items:<legacy_id>` como referencia canónica
- no consolidar items legacy distintos solo porque compartan nombre o URL

## Flujo recomendado

1. validar que exista el módulo `products` en el tenant destino
2. correr dry-run
3. si el schema tenant falla, aplicar migraciones puntuales del tenant
4. tomar backup PostgreSQL inmediato del tenant
5. correr import `--apply`
6. auditar conteos finales en la tenant DB
7. actualizar changelog + memoria viva

## Dry-run

```bash
cd /home/felipe/platform_paas/backend
set -a
source /opt/platform_paas/.env
set +a
export PYTHONPATH=/home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python app/scripts/import_ieris_products_catalog.py \
  --tenant-slug ieris-ltda \
  --actor-user-id 1 \
  --target-media-dir /opt/platform_paas/storage/products_media \
  --report-out /home/felipe/platform_paas/tmp/ieris_products_import_report_dry_run.json
```

## Migración tenant puntual

Si el tenant ya tiene `products_product_images` pero sin `DEFAULT nextval(...)` en PostgreSQL:

```bash
cd /home/felipe/platform_paas/backend
set -a
source /opt/platform_paas/.env
set +a
export PYTHONPATH=/home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python app/scripts/run_single_tenant_migrations.py \
  --tenant-slug ieris-ltda
```

## Backup previo

```bash
cd /home/felipe/platform_paas/backend
set -a
source /opt/platform_paas/.env
set +a
export PYTHONPATH=/home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python app/scripts/run_tenant_backups.py \
  --backup-dir /var/backups/platform_paas/production_tenants \
  --retention-days 7 \
  --tenant-slug ieris-ltda
```

## Apply

```bash
cd /home/felipe/platform_paas/backend
set -a
source /opt/platform_paas/.env
set +a
export PYTHONPATH=/home/felipe/platform_paas/backend
/home/felipe/platform_paas/platform_paas_venv/bin/python app/scripts/import_ieris_products_catalog.py \
  --tenant-slug ieris-ltda \
  --actor-user-id 1 \
  --target-media-dir /opt/platform_paas/storage/products_media \
  --report-out /home/felipe/platform_paas/tmp/ieris_products_import_report_apply.json \
  --apply
```

## Qué importa

- `crm_products`
- `crm_product_characteristics`
- `products_product_sources`
- `products_price_history`
- `products_product_images`

## Reconciliación automática

Las reejecuciones del script ya limpian residuos legacy de corridas antiguas:

- `products_price_history.notes = legacy_import:ieris:catalogo_items:<legacy_id>`
- `products_product_images.caption = Importado desde ieris_app`

Si antes una corrida fusionó por error dos filas legacy con el mismo nombre o URL, la pasada siguiente:

- crea el artículo faltante como producto propio
- deja la fuente correcta por `external_reference`
- borra la foto/history sobrante que quedó pegada al producto equivocado

## Auditoría final esperada para `ieris-ltda`

Caso real cerrado el `2026-04-27`:

- `products=117`
- `characteristics=647`
- `sources=117`
- `price_history=117`
- `images=117`
- `services=6`
- `legacy_sources=117`
- `legacy_price_history=117`
- `legacy_images=117`
