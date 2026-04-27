import argparse
import json
import mimetypes
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from uuid import uuid4

import psycopg2
from dotenv import dotenv_values
from psycopg2.extras import RealDictCursor
from sqlalchemy import text

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.apps.tenant_modules.core.services.tenant_connection_service import (  # noqa: E402
    TenantConnectionService,
)
from app.apps.tenant_modules.crm.models import (  # noqa: E402
    CRMProduct,
    CRMProductCharacteristic,
)
from app.apps.tenant_modules.products.models import (  # noqa: E402
    ProductCatalogImage,
    ProductPriceHistory,
    ProductSource,
)
from app.common.config.settings import settings  # noqa: E402
from app.common.db.control_database import ControlSessionLocal  # noqa: E402


LEGACY_SOURCE_PREFIX = "ieris:catalogo_items:"


@dataclass
class ImportCounters:
    created: int = 0
    updated: int = 0
    existing: int = 0
    skipped: int = 0
    missing_files: int = 0

    def as_dict(self) -> dict:
        return {
            "created": self.created,
            "updated": self.updated,
            "existing": self.existing,
            "skipped": self.skipped,
            "missing_files": self.missing_files,
        }


@dataclass
class CleanupCounters:
    deleted_price_history: int = 0
    deleted_images: int = 0

    def as_dict(self) -> dict:
        return {
            "deleted_price_history": self.deleted_price_history,
            "deleted_images": self.deleted_images,
        }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Importa productos/servicios desde la BD legacy de ieris_app hacia "
            "products en un tenant del PaaS. Dry-run por defecto."
        )
    )
    parser.add_argument("--tenant-slug", default="ieris-ltda")
    parser.add_argument("--actor-user-id", type=int, default=1)
    parser.add_argument("--legacy-app-dir", type=Path, default=Path("/home/felipe/ieris_app"))
    parser.add_argument("--legacy-env", type=Path, default=None)
    parser.add_argument("--legacy-db-name", default=None)
    parser.add_argument("--legacy-db-user", default=None)
    parser.add_argument("--legacy-db-password", default=None)
    parser.add_argument("--legacy-db-host", default=None)
    parser.add_argument("--legacy-db-port", default=None)
    parser.add_argument("--target-media-dir", type=Path, default=None)
    parser.add_argument(
        "--report-out",
        type=Path,
        default=Path("/home/felipe/platform_paas/tmp/ieris_products_import_report.json"),
    )
    parser.add_argument("--apply", action="store_true")
    return parser.parse_args()


def load_legacy_db_config(args: argparse.Namespace) -> dict:
    env_path = args.legacy_env or (args.legacy_app_dir / ".env")
    env_values = dotenv_values(env_path) if env_path.exists() else {}

    config = {
        "dbname": args.legacy_db_name or env_values.get("DB_NAME") or os.getenv("DB_NAME"),
        "user": args.legacy_db_user or env_values.get("DB_USER") or os.getenv("DB_USER"),
        "password": args.legacy_db_password
        or env_values.get("DB_PASSWORD")
        or os.getenv("DB_PASSWORD"),
        "host": args.legacy_db_host or env_values.get("DB_HOST") or os.getenv("DB_HOST"),
        "port": args.legacy_db_port or env_values.get("DB_PORT") or os.getenv("DB_PORT"),
    }
    missing = [key for key, value in config.items() if not value]
    if missing:
        raise ValueError(
            "No se pudo resolver la configuración DB legacy de ieris_app. "
            f"Faltan: {', '.join(missing)}"
        )
    return config


def fetch_rows(conn, table_name: str, query: str) -> list[dict]:
    with conn.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(
            """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name = %s
            ) AS table_exists
            """,
            (table_name,),
        )
        exists_row = cursor.fetchone() or {}
        if not exists_row.get("table_exists"):
            return []
        cursor.execute(query)
        return list(cursor.fetchall() or [])


def fetch_legacy_source(legacy_config: dict) -> dict:
    with psycopg2.connect(**legacy_config) as conn:
        items = fetch_rows(
            conn,
            "catalogo_items",
            """
            SELECT
                id,
                tipo,
                nombre,
                descripcion,
                unidad,
                precio_base,
                impuesto,
                activo,
                requiere_visita,
                requiere_stock,
                empresa_id,
                foto,
                origen_precio,
                url_proveedor,
                metodo_extraccion,
                selector_precio,
                nombre_en_proveedor,
                actualizado_por_bot,
                ultima_actualizacion_precio,
                moneda,
                requiere_revision,
                last_scraped_at,
                scrape_status,
                scrape_error,
                scraping_task_id,
                creado_en,
                actualizado_en
            FROM catalogo_items
            ORDER BY id
            """,
        )
        characteristics = fetch_rows(
            conn,
            "catalogo_item_caracteristicas",
            """
            SELECT
                id,
                item_id,
                clave,
                valor,
                unidad,
                fuente,
                confianza,
                origen_detalle,
                creado_por_bot,
                creado_en
            FROM catalogo_item_caracteristicas
            ORDER BY item_id, id
            """,
        )
        providers = fetch_rows(
            conn,
            "empresa",
            """
            SELECT id, nombre
            FROM empresa
            ORDER BY id
            """,
        )

    grouped_characteristics: dict[int, list[dict]] = {}
    for row in characteristics:
        item_id = int(row["item_id"])
        grouped_characteristics.setdefault(item_id, []).append(row)

    provider_map = {
        int(row["id"]): normalize_text(row.get("nombre")) for row in providers if row.get("id") is not None
    }

    return {
        "items": items,
        "characteristics": grouped_characteristics,
        "providers": provider_map,
        "source_counts": {
            "items": len(items),
            "characteristics": len(characteristics),
            "with_photo": sum(1 for row in items if normalize_text(row.get("foto"))),
            "with_url": sum(1 for row in items if normalize_text(row.get("url_proveedor"))),
        },
    }


def normalize_text(value) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip()
    return normalized or None


def normalize_token(value: str | None) -> str:
    return (normalize_text(value) or "").strip().lower()


def normalize_product_type(value: str | None) -> str:
    return "service" if normalize_token(value) == "servicio" else "product"


def normalize_currency(value: str | None) -> str:
    return (normalize_text(value) or "CLP").upper()


def normalize_float(value) -> float:
    if value in (None, "", "null"):
        return 0.0
    return max(float(value), 0.0)


def coerce_datetime(value) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value
    return None


def build_external_reference(legacy_item_id: int) -> str:
    return f"{LEGACY_SOURCE_PREFIX}{legacy_item_id}"


def build_source_summary(item: dict, provider_name: str | None) -> str | None:
    parts: list[str] = []
    if provider_name:
        parts.append(f"Proveedor legacy: {provider_name}")
    if normalize_text(item.get("nombre_en_proveedor")):
        parts.append(f"Nombre proveedor: {normalize_text(item.get('nombre_en_proveedor'))}")
    if normalize_text(item.get("origen_precio")):
        parts.append(f"Origen precio: {normalize_text(item.get('origen_precio'))}")
    if normalize_text(item.get("metodo_extraccion")):
        parts.append(f"Método extracción: {normalize_text(item.get('metodo_extraccion'))}")
    if normalize_text(item.get("selector_precio")):
        parts.append(f"Selector precio: {normalize_text(item.get('selector_precio'))}")
    if normalize_text(item.get("scrape_status")):
        parts.append(f"Estado scraping legacy: {normalize_text(item.get('scrape_status'))}")
    if normalize_text(item.get("scrape_error")):
        parts.append(f"Error scraping legacy: {normalize_text(item.get('scrape_error'))}")
    if item.get("requiere_revision"):
        parts.append("Legacy requiere revisión: sí")
    if item.get("actualizado_por_bot"):
        parts.append("Legacy actualizado por bot: sí")
    if normalize_text(item.get("scraping_task_id")):
        parts.append(f"Task legacy: {normalize_text(item.get('scraping_task_id'))}")
    return "\n".join(parts) if parts else None


def map_source_kind(item: dict) -> str:
    if normalize_text(item.get("url_proveedor")):
        return "vendor_site"
    return "manual_capture"


def map_sync_status(item: dict) -> str:
    if normalize_text(item.get("scrape_error")):
        return "error"
    if item.get("requiere_revision"):
        return "warning"
    if normalize_text(item.get("last_scraped_at")) or item.get("actualizado_por_bot"):
        return "synced"
    return "idle"


def build_characteristics_payload(rows: list[dict]) -> list[dict]:
    payload: list[dict] = []
    for index, row in enumerate(rows or []):
        label = normalize_text(row.get("clave"))
        value = normalize_text(row.get("valor"))
        unit = normalize_text(row.get("unidad"))
        if not label or not value:
            continue
        full_value = value
        if unit and unit.lower() not in value.lower():
            full_value = f"{value} {unit}".strip()
        payload.append(
            {
                "label": label,
                "value": full_value,
                "sort_order": (index + 1) * 10,
            }
        )
    return payload


def resolve_media_root(target_media_dir: Path | None) -> Path:
    root = target_media_dir or Path(settings.PRODUCTS_MEDIA_DIR)
    root.mkdir(parents=True, exist_ok=True)
    return root


def infer_image_content_type(file_name: str | None, content_bytes: bytes) -> str:
    guessed = mimetypes.guess_type(file_name or "")[0]
    if guessed:
        return guessed
    if content_bytes.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if content_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if content_bytes.startswith((b"GIF87a", b"GIF89a")):
        return "image/gif"
    if content_bytes[:4] == b"RIFF" and content_bytes[8:12] == b"WEBP":
        return "image/webp"
    if content_bytes.startswith(b"BM"):
        return "image/bmp"
    return "application/octet-stream"


def build_legacy_image_path(legacy_app_dir: Path, file_name: str | None) -> Path | None:
    normalized = normalize_text(file_name)
    if not normalized:
        return None
    return legacy_app_dir / "uploads" / "productos" / normalized


def assert_required_target_tables(tenant_db) -> None:
    required = {
        "crm_products",
        "crm_product_characteristics",
        "products_product_sources",
        "products_price_history",
        "products_product_images",
    }
    rows = tenant_db.execute(
        text(
            """
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = ANY(:names)
            """
        ),
        {"names": list(required)},
    ).fetchall()
    existing = {row[0] for row in rows}
    missing = sorted(required - existing)
    if missing:
        raise ValueError(
            "El tenant destino no tiene el esquema products esperado. "
            f"Faltan tablas: {', '.join(missing)}"
        )


def import_products_catalog(
    tenant_db,
    *,
    legacy_data: dict,
    legacy_app_dir: Path,
    media_root: Path,
    actor_user_id: int,
    apply_files: bool,
) -> dict:
    item_rows = legacy_data["items"]
    characteristics_map = legacy_data["characteristics"]
    providers = legacy_data["providers"]

    products_counter = ImportCounters()
    sources_counter = ImportCounters()
    images_counter = ImportCounters()
    price_history_counter = ImportCounters()
    characteristics_counter = ImportCounters()
    cleanup_counter = CleanupCounters()

    existing_sources = tenant_db.query(ProductSource).all()
    sources_by_external_reference = {
        normalize_text(row.external_reference): row
        for row in existing_sources
        if normalize_text(row.external_reference)
    }

    existing_images = tenant_db.query(ProductCatalogImage).all()
    images_by_product: dict[int, list[ProductCatalogImage]] = {}
    for row in existing_images:
        images_by_product.setdefault(row.product_id, []).append(row)

    existing_price_keys = {
        (
            row.product_id,
            normalize_text(row.source_url),
            normalize_text(row.notes),
            float(row.unit_price or 0),
        )
        for row in tenant_db.query(ProductPriceHistory).all()
    }

    legacy_items_by_reference = {
        build_external_reference(int(row["id"])): row
        for row in item_rows
        if row.get("id") is not None
    }

    for legacy_item in item_rows:
        legacy_id = int(legacy_item["id"])
        external_reference = build_external_reference(legacy_id)
        source_url = normalize_text(legacy_item.get("url_proveedor"))
        source = sources_by_external_reference.get(external_reference)

        product = None
        if source is not None:
            product = tenant_db.get(CRMProduct, source.product_id)

        characteristics_payload = build_characteristics_payload(
            characteristics_map.get(legacy_id, [])
        )

        payload = {
            "sku": None,
            "name": normalize_text(legacy_item.get("nombre")) or f"Legacy item {legacy_id}",
            "product_type": normalize_product_type(legacy_item.get("tipo")),
            "unit_label": normalize_text(legacy_item.get("unidad")) or "unidad",
            "unit_price": normalize_float(legacy_item.get("precio_base")),
            "description": normalize_text(legacy_item.get("descripcion")),
            "is_active": bool(legacy_item.get("activo", True)),
            "sort_order": legacy_id * 10,
            "characteristics": characteristics_payload,
        }

        if product is None:
            product = CRMProduct(
                sku=payload["sku"],
                name=payload["name"],
                product_type=payload["product_type"],
                unit_label=payload["unit_label"],
                unit_price=payload["unit_price"],
                description=payload["description"],
                is_active=payload["is_active"],
                sort_order=payload["sort_order"],
            )
            tenant_db.add(product)
            tenant_db.flush()
            products_counter.created += 1
        else:
            changed = False
            for field in (
                "sku",
                "name",
                "product_type",
                "unit_label",
                "unit_price",
                "description",
                "is_active",
                "sort_order",
            ):
                if getattr(product, field) != payload[field]:
                    setattr(product, field, payload[field])
                    changed = True
            tenant_db.add(product)
            tenant_db.flush()
            if changed:
                products_counter.updated += 1
            else:
                products_counter.existing += 1

        tenant_db.query(CRMProductCharacteristic).filter(
            CRMProductCharacteristic.product_id == product.id
        ).delete()
        for row in characteristics_payload:
            tenant_db.add(
                CRMProductCharacteristic(
                    product_id=product.id,
                    label=row["label"],
                    value=row["value"],
                    sort_order=row["sort_order"],
                )
            )
            characteristics_counter.created += 1
        tenant_db.flush()

        provider_name = providers.get(legacy_item.get("empresa_id"))
        source_kind = map_source_kind(legacy_item)
        source_label = provider_name or normalize_text(legacy_item.get("nombre_en_proveedor")) or "IERIS import"
        sync_status = map_sync_status(legacy_item)
        source_status = "active" if bool(legacy_item.get("activo", True)) else "archived"
        timestamp = (
            coerce_datetime(legacy_item.get("ultima_actualizacion_precio"))
            or coerce_datetime(legacy_item.get("last_scraped_at"))
            or coerce_datetime(legacy_item.get("actualizado_en"))
            or coerce_datetime(legacy_item.get("creado_en"))
            or datetime.now(timezone.utc)
        )
        source_summary = build_source_summary(legacy_item, provider_name)

        if source is None or source.product_id != product.id:
            source = ProductSource(
                product_id=product.id,
                connector_id=None,
                draft_id=None,
                run_item_id=None,
                source_kind=source_kind,
                source_label=source_label,
                source_url=source_url,
                external_reference=external_reference,
                source_status=source_status,
                sync_status=sync_status,
                refresh_mode="manual",
                refresh_merge_policy="safe_merge",
                refresh_prompt=None,
                latest_unit_price=payload["unit_price"],
                currency_code=normalize_currency(legacy_item.get("moneda")),
                source_summary=source_summary,
                captured_at=timestamp,
                last_seen_at=timestamp,
                last_sync_attempt_at=timestamp if source_url else None,
                next_refresh_at=None,
                last_refresh_success_at=timestamp if sync_status == "synced" else None,
                last_sync_error=normalize_text(legacy_item.get("scrape_error")),
            )
            tenant_db.add(source)
            tenant_db.flush()
            sources_counter.created += 1
            sources_by_external_reference[external_reference] = source
        else:
            changed = False
            updates = {
                "product_id": product.id,
                "source_kind": source_kind,
                "source_label": source_label,
                "source_url": source_url,
                "external_reference": external_reference,
                "source_status": source_status,
                "sync_status": sync_status,
                "latest_unit_price": payload["unit_price"],
                "currency_code": normalize_currency(legacy_item.get("moneda")),
                "source_summary": source_summary,
                "captured_at": timestamp,
                "last_seen_at": timestamp,
                "last_sync_attempt_at": timestamp if source_url else None,
                "last_refresh_success_at": timestamp if sync_status == "synced" else None,
                "last_sync_error": normalize_text(legacy_item.get("scrape_error")),
            }
            for field, value in updates.items():
                if getattr(source, field) != value:
                    setattr(source, field, value)
                    changed = True
            source.updated_at = datetime.now(timezone.utc)
            tenant_db.add(source)
            tenant_db.flush()
            if changed:
                sources_counter.updated += 1
            else:
                sources_counter.existing += 1
            sources_by_external_reference[external_reference] = source

        price_key = (
            product.id,
            source_url,
            f"legacy_import:{external_reference}",
            payload["unit_price"],
        )
        if price_key in existing_price_keys or payload["unit_price"] <= 0:
            price_history_counter.existing += 1
        else:
            tenant_db.add(
                ProductPriceHistory(
                    product_id=product.id,
                    product_source_id=source.id,
                    connector_id=None,
                    draft_id=None,
                    price_kind="reference",
                    unit_price=payload["unit_price"],
                    currency_code=normalize_currency(legacy_item.get("moneda")),
                    source_label=source_label,
                    source_url=source_url,
                    notes=f"legacy_import:{external_reference}",
                    captured_at=timestamp,
                )
            )
            tenant_db.flush()
            existing_price_keys.add(price_key)
            price_history_counter.created += 1

        legacy_photo_name = normalize_text(legacy_item.get("foto"))
        if not legacy_photo_name:
            images_counter.skipped += 1
            continue

        legacy_photo_path = build_legacy_image_path(legacy_app_dir, legacy_photo_name)
        if legacy_photo_path is None or not legacy_photo_path.exists():
            images_counter.missing_files += 1
            continue

        existing_product_images = images_by_product.setdefault(product.id, [])
        existing_image = next(
            (row for row in existing_product_images if row.file_name == legacy_photo_name),
            None,
        )
        if existing_image is not None:
            absolute_path = media_root / existing_image.storage_key
            if not absolute_path.exists():
                if not apply_files:
                    images_counter.updated += 1
                    continue
                content_bytes = legacy_photo_path.read_bytes()
                absolute_path.parent.mkdir(parents=True, exist_ok=True)
                absolute_path.write_bytes(content_bytes)
                existing_image.file_size = len(content_bytes)
                existing_image.content_type = infer_image_content_type(
                    legacy_photo_name,
                    content_bytes,
                )
                if not existing_image.caption:
                    existing_image.caption = "Importado desde ieris_app"
                tenant_db.add(existing_image)
                tenant_db.flush()
                images_counter.updated += 1
                continue

            changed = False
            content_bytes = legacy_photo_path.read_bytes()
            inferred_content_type = infer_image_content_type(legacy_photo_name, content_bytes)
            if existing_image.file_size != len(content_bytes):
                existing_image.file_size = len(content_bytes)
                changed = True
            if existing_image.content_type != inferred_content_type:
                existing_image.content_type = inferred_content_type
                changed = True
            if not existing_image.caption:
                existing_image.caption = "Importado desde ieris_app"
                changed = True
            if changed:
                tenant_db.add(existing_image)
                tenant_db.flush()
                images_counter.updated += 1
            else:
                images_counter.existing += 1
            continue

        if not apply_files:
            images_counter.created += 1
            continue

        content_bytes = legacy_photo_path.read_bytes()
        suffix = legacy_photo_path.suffix.lower()
        storage_key = str(Path(f"legacy_import/product_{product.id}") / f"{uuid4().hex}{suffix}")
        absolute_path = media_root / storage_key
        absolute_path.parent.mkdir(parents=True, exist_ok=True)
        absolute_path.write_bytes(content_bytes)

        image = ProductCatalogImage(
            product_id=product.id,
            file_name=legacy_photo_name,
            storage_key=storage_key,
            content_type=infer_image_content_type(legacy_photo_name, content_bytes),
            file_size=len(content_bytes),
            caption="Importado desde ieris_app",
            is_primary=len(existing_product_images) == 0,
            uploaded_by_user_id=actor_user_id,
        )
        if image.is_primary:
            for row in existing_product_images:
                row.is_primary = False
                tenant_db.add(row)
        tenant_db.add(image)
        tenant_db.flush()
        existing_product_images.append(image)
        images_counter.created += 1

    imported_products = tenant_db.execute(
        text(
            """
            SELECT DISTINCT product_id
            FROM products_product_sources
            WHERE external_reference LIKE :prefix
            """
        ),
        {"prefix": f"{LEGACY_SOURCE_PREFIX}%"},
    ).scalars().all()

    for product_id in imported_products:
        references = tenant_db.execute(
            text(
                """
                SELECT external_reference
                FROM products_product_sources
                WHERE product_id = :product_id
                  AND external_reference LIKE :prefix
                """
            ),
            {"product_id": product_id, "prefix": f"{LEGACY_SOURCE_PREFIX}%"},
        ).scalars().all()
        allowed_references = {
            normalize_text(value) for value in references if normalize_text(value)
        }
        allowed_notes = {f"legacy_import:{value}" for value in allowed_references}
        allowed_photo_names = {
            normalize_text(legacy_items_by_reference[value].get("foto"))
            for value in allowed_references
            if value in legacy_items_by_reference
        }
        allowed_photo_names = {value for value in allowed_photo_names if value}

        stale_price_rows = tenant_db.query(ProductPriceHistory).filter(
            ProductPriceHistory.product_id == product_id,
            ProductPriceHistory.notes.like(f"legacy_import:{LEGACY_SOURCE_PREFIX}%"),
        ).all()
        for row in stale_price_rows:
            note = normalize_text(row.notes)
            if note and note not in allowed_notes:
                tenant_db.delete(row)
                cleanup_counter.deleted_price_history += 1

        stale_image_rows = tenant_db.query(ProductCatalogImage).filter(
            ProductCatalogImage.product_id == product_id,
            ProductCatalogImage.caption == "Importado desde ieris_app",
        ).all()
        for row in stale_image_rows:
            file_name = normalize_text(row.file_name)
            if file_name and file_name not in allowed_photo_names:
                absolute_path = media_root / row.storage_key
                if absolute_path.exists():
                    absolute_path.unlink()
                tenant_db.delete(row)
                cleanup_counter.deleted_images += 1

        tenant_db.flush()

    return {
        "source_counts": legacy_data["source_counts"],
        "products": products_counter.as_dict(),
        "sources": sources_counter.as_dict(),
        "price_history": price_history_counter.as_dict(),
        "images": images_counter.as_dict(),
        "characteristics": {
            "created": characteristics_counter.created,
            "expected": legacy_data["source_counts"]["characteristics"],
        },
        "cleanup": cleanup_counter.as_dict(),
    }


def verify_import_summary(result: dict) -> dict:
    source_counts = result["source_counts"]
    verification = {
        "products": {
            "expected": int(source_counts["items"]),
            "processed": int(
                result["products"]["created"]
                + result["products"]["updated"]
                + result["products"]["existing"]
                + result["products"]["skipped"]
            ),
        },
        "sources": {
            "expected": int(source_counts["items"]),
            "processed": int(
                result["sources"]["created"]
                + result["sources"]["updated"]
                + result["sources"]["existing"]
                + result["sources"]["skipped"]
            ),
        },
        "images": {
            "expected": int(source_counts["with_photo"]),
            "processed": int(
                result["images"]["created"]
                + result["images"]["updated"]
                + result["images"]["existing"]
                + result["images"]["skipped"]
                + result["images"]["missing_files"]
            ),
        },
        "characteristics": {
            "expected": int(source_counts["characteristics"]),
            "processed": int(result["characteristics"]["created"]),
        },
    }
    mismatches = [
        name
        for name, payload in verification.items()
        if payload["expected"] != payload["processed"]
    ]
    if mismatches:
        details = "; ".join(
            f"{name}: expected={verification[name]['expected']} processed={verification[name]['processed']}"
            for name in mismatches
        )
        raise ValueError(f"La verificación post-import detectó inconsistencias: {details}")
    return verification


def main() -> int:
    args = parse_args()
    report_out = args.report_out
    report_out.parent.mkdir(parents=True, exist_ok=True)
    legacy_config = load_legacy_db_config(args)
    tenant_db = None
    legacy_data = None
    try:
        legacy_data = fetch_legacy_source(legacy_config)
        control_db = ControlSessionLocal()
        try:
            tenant_connection_service = TenantConnectionService()
            tenant = tenant_connection_service.get_tenant(control_db, args.tenant_slug)
            if tenant is None:
                raise ValueError(
                    f"No existe un tenant activo con slug='{args.tenant_slug}' para importar"
                )
            tenant_session_factory = tenant_connection_service.get_tenant_session(tenant)
        finally:
            control_db.close()

        tenant_db = tenant_session_factory()
        assert_required_target_tables(tenant_db)
        media_root = resolve_media_root(args.target_media_dir)
        result = import_products_catalog(
            tenant_db,
            legacy_data=legacy_data,
            legacy_app_dir=args.legacy_app_dir,
            media_root=media_root,
            actor_user_id=args.actor_user_id,
            apply_files=args.apply,
        )
        result["verification"] = verify_import_summary(result)
        if args.apply:
            tenant_db.commit()
        else:
            tenant_db.rollback()

        report = {
            "status": "ok",
            "mode": "apply" if args.apply else "dry-run",
            "tenant_slug": args.tenant_slug,
            "legacy": {
                "app_dir": str(args.legacy_app_dir),
                "db_name": legacy_config["dbname"],
                "db_host": legacy_config["host"],
                "db_port": str(legacy_config["port"]),
            },
            "target_media_dir": str(media_root),
            "result": result,
        }
        report_out.write_text(
            json.dumps(report, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print(json.dumps(report, indent=2, ensure_ascii=False))
        return 0
    except Exception as exc:
        if tenant_db is not None:
            tenant_db.rollback()
        report = {
            "status": "error",
            "mode": "apply" if args.apply else "dry-run",
            "tenant_slug": args.tenant_slug,
            "legacy": {
                "app_dir": str(args.legacy_app_dir),
                "db_name": legacy_config.get("dbname"),
                "db_host": legacy_config.get("host"),
                "db_port": str(legacy_config.get("port")),
            },
            "error": str(exc),
            "source_counts": (legacy_data or {}).get("source_counts", {}),
        }
        report_out.write_text(
            json.dumps(report, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        print(json.dumps(report, indent=2, ensure_ascii=False))
        return 1
    finally:
        if tenant_db is not None:
            tenant_db.close()


if __name__ == "__main__":
    raise SystemExit(main())
