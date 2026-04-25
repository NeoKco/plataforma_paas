from __future__ import annotations

import json
import re
from typing import Any


class CRMProductIngestionExtractionService:
    USER_AGENT = "Mozilla/5.0 (compatible; orkestia-crm-ingestion/1.0)"
    PROVIDER_SPECIFIC_TITLE_SELECTORS = {
        "mercadolibre": [
            "h1.ui-pdp-title",
            "meta[property='og:title']",
        ],
        "sodimac": [
            "h1.jsx-2753877163.product-name",
            "h1.product-name",
            "meta[property='og:title']",
        ],
        "easy": [
            "h1.vtex-store-components-3-x-productNameContainer",
            "h1.product-name",
            "meta[property='og:title']",
        ],
    }
    PROVIDER_SPECIFIC_PRICE_SELECTORS = {
        "mercadolibre": [
            "meta[property='product:price:amount']",
            ".andes-money-amount__fraction",
            "[data-testid='price-part']",
        ],
        "sodimac": [
            "meta[property='product:price:amount']",
            ".prices-main-price",
            ".price-main",
        ],
        "easy": [
            "meta[property='product:price:amount']",
            ".easy-buy-box__best-price",
            ".priceValue",
        ],
    }
    PROVIDER_SPECIFIC_DESCRIPTION_SELECTORS = {
        "mercadolibre": [
            ".ui-pdp-description__content",
            "meta[property='og:description']",
        ],
        "sodimac": [
            ".product-description",
            "meta[property='og:description']",
        ],
        "easy": [
            ".vtex-store-components-3-x-productDescriptionText",
            "meta[property='og:description']",
        ],
    }

    def extract_from_url(
        self,
        url: str,
        *,
        provider_key: str | None = None,
        timeout_seconds: int | None = None,
    ) -> dict[str, Any]:
        try:
            import requests
            from bs4 import BeautifulSoup
        except ModuleNotFoundError as exc:
            raise RuntimeError(
                "La extracción automática requiere requests y beautifulsoup4 instalados"
            ) from exc

        normalized_url = (url or "").strip()
        if not normalized_url:
            raise ValueError("La URL es obligatoria para extraer datos")

        response = requests.get(
            normalized_url,
            headers={"User-Agent": self.USER_AGENT},
            timeout=max(int(timeout_seconds or 25), 5),
        )
        response.raise_for_status()

        content_type = (response.headers.get("content-type") or "").lower()
        if "text/html" not in content_type and "application/xhtml+xml" not in content_type and content_type:
            raise ValueError("La fuente no devolvió HTML legible para scraping")

        if not response.encoding:
            response.encoding = response.apparent_encoding

        normalized_provider = (provider_key or "generic").strip().lower()
        soup = BeautifulSoup(response.text, "html.parser")
        structured_payload = self._extract_structured_product_payload(
            soup,
            provider_key=normalized_provider,
            source_url=normalized_url,
        )
        provider_payload = self._extract_provider_payload(
            soup,
            provider_key=normalized_provider,
            source_url=normalized_url,
        )
        for tag in soup(["script", "style", "noscript", "svg"]):
            tag.decompose()

        title = (
            structured_payload.get("name")
            or provider_payload.get("name")
            or self._extract_title(soup, provider_key=normalized_provider)
        )
        description = (
            structured_payload.get("description")
            or provider_payload.get("description")
            or self._extract_description(soup, provider_key=normalized_provider)
        )
        brand = structured_payload.get("brand") or provider_payload.get("brand") or self._extract_brand(soup)
        sku = structured_payload.get("sku") or provider_payload.get("sku") or self._extract_sku(soup)
        price = self._coalesce_price(
            structured_payload.get("unit_price"),
            provider_payload.get("unit_price"),
            self._extract_price(soup, provider_key=normalized_provider),
        )
        category = (
            structured_payload.get("category_label")
            or provider_payload.get("category_label")
            or self._extract_category(soup)
        )
        characteristics = self._merge_characteristics(
            structured_payload.get("characteristics") or [],
            provider_payload.get("characteristics") or [],
            self._extract_characteristics(soup),
        )
        source_excerpt = self._build_source_excerpt(description, characteristics)

        return {
            "source_url": normalized_url,
            "name": title,
            "sku": sku,
            "brand": brand,
            "category_label": category,
            "product_type": (
                structured_payload.get("product_type")
                or provider_payload.get("product_type")
                or "product"
            ),
            "unit_label": None,
            "unit_price": price,
            "currency_code": (
                structured_payload.get("currency_code")
                or provider_payload.get("currency_code")
                or "CLP"
            ),
            "description": description,
            "source_excerpt": source_excerpt,
            "extraction_notes": (
                structured_payload.get("extraction_notes")
                or provider_payload.get("extraction_notes")
                or f"Extracción automática desde URL ({normalized_provider})"
            ),
            "external_reference": (
                structured_payload.get("external_reference")
                or provider_payload.get("external_reference")
            ),
            "characteristics": characteristics,
        }

    def _extract_title(self, soup: Any, *, provider_key: str = "generic") -> str:
        for selector in self.PROVIDER_SPECIFIC_TITLE_SELECTORS.get(provider_key, []):
            candidate = soup.select_one(selector)
            text = self._content_or_text(candidate)
            if text:
                return text
        candidates = [
            soup.select_one('meta[property="og:title"]'),
            soup.select_one('meta[name="twitter:title"]'),
            soup.find("h1"),
            soup.title,
        ]
        for candidate in candidates:
            text = self._content_or_text(candidate)
            if text:
                return text
        raise ValueError("No se pudo detectar un nombre útil del producto")

    def _extract_description(self, soup: Any, *, provider_key: str = "generic") -> str | None:
        for selector in self.PROVIDER_SPECIFIC_DESCRIPTION_SELECTORS.get(provider_key, []):
            candidate = soup.select_one(selector)
            text = self._content_or_text(candidate)
            if text and len(text) > 20:
                return text[:4000]
        candidates = [
            soup.select_one('meta[name="description"]'),
            soup.select_one('meta[property="og:description"]'),
            soup.select_one('[itemprop="description"]'),
            soup.find("section", class_=re.compile(r"description|detalle|producto", re.I)),
            soup.find("div", class_=re.compile(r"description|detalle|producto", re.I)),
        ]
        for candidate in candidates:
            text = self._content_or_text(candidate)
            if text and len(text) > 20:
                return text[:4000]
        paragraphs = [
            self._normalize_text(p.get_text(" ", strip=True))
            for p in soup.find_all("p")
        ]
        paragraphs = [item for item in paragraphs if item and len(item) > 30]
        if paragraphs:
            return paragraphs[0][:4000]
        return None

    def _extract_provider_payload(
        self,
        soup: Any,
        *,
        provider_key: str,
        source_url: str,
    ) -> dict[str, Any]:
        if provider_key == "mercadolibre":
            return self._extract_mercadolibre_payload(soup, source_url=source_url)
        return {}

    def _extract_mercadolibre_payload(self, soup: Any, *, source_url: str) -> dict[str, Any]:
        script_blob = "\n".join(
            (script.string or script.get_text() or "")
            for script in soup.find_all("script")
        )
        external_reference = self._extract_mercadolibre_reference_from_url(source_url)
        currency_code = self._search_script_value(
            script_blob,
            [
                r'"currency_id"\s*:\s*"([A-Z]{3})"',
                r'"priceCurrency"\s*:\s*"([A-Z]{3})"',
            ],
        )
        seller_name = self._search_script_value(
            script_blob,
            [
                r'"seller_name"\s*:\s*"([^"]+)"',
                r'"nickname"\s*:\s*"([^"]+)"',
            ],
        )
        condition = self._search_script_value(
            script_blob,
            [
                r'"condition"\s*:\s*"([^"]+)"',
            ],
        )
        available_quantity = self._search_script_value(
            script_blob,
            [
                r'"available_quantity"\s*:\s*(\d+)',
            ],
        )
        shipping_mode = self._search_script_value(
            script_blob,
            [
                r'"shipping_mode"\s*:\s*"([^"]+)"',
            ],
        )
        characteristics: list[dict[str, Any]] = []
        if seller_name:
            characteristics.append({"label": "Vendedor", "value": seller_name, "sort_order": 10})
        if condition:
            characteristics.append(
                {
                    "label": "Condición",
                    "value": self._normalize_mercadolibre_condition(condition),
                    "sort_order": 20,
                }
            )
        if available_quantity:
            characteristics.append(
                {
                    "label": "Disponibilidad",
                    "value": f"{available_quantity} unidades",
                    "sort_order": 30,
                }
            )
        if shipping_mode:
            characteristics.append(
                {
                    "label": "Despacho",
                    "value": shipping_mode.replace("_", " ").strip(),
                    "sort_order": 40,
                }
            )
        return {
            "currency_code": currency_code,
            "external_reference": external_reference,
            "category_label": self._extract_category(soup),
            "characteristics": characteristics,
            "extraction_notes": "Extracción automática dedicada para Mercado Libre",
        }

    def _extract_brand(self, soup: Any) -> str | None:
        candidates = [
            soup.select_one('meta[property="product:brand"]'),
            soup.select_one('[itemprop="brand"]'),
            soup.find(string=re.compile(r"\bmarca\b", re.I)),
        ]
        for candidate in candidates:
            text = self._content_or_text(candidate)
            if text:
                return text[:120]
        return None

    def _extract_sku(self, soup: Any) -> str | None:
        candidates = [
            soup.select_one('[itemprop="sku"]'),
            soup.select_one('meta[property="product:retailer_item_id"]'),
            soup.find(string=re.compile(r"\bsku\b|\bc[oó]digo\b|\bref\b", re.I)),
        ]
        for candidate in candidates:
            text = self._content_or_text(candidate)
            if text:
                cleaned = re.sub(r"\s+", " ", text).strip()
                if len(cleaned) <= 80:
                    return cleaned
        return None

    def _extract_price(self, soup: Any, *, provider_key: str = "generic") -> float:
        provider_candidates = [soup.select_one(selector) for selector in self.PROVIDER_SPECIFIC_PRICE_SELECTORS.get(provider_key, [])]
        candidates = [
            *provider_candidates,
            soup.select_one('meta[property="product:price:amount"]'),
            soup.select_one('meta[itemprop="price"]'),
            soup.find(attrs={"class": re.compile(r"price|precio", re.I)}),
            soup.find(string=re.compile(r"\$\s?[\d\.\,]+")),
        ]
        for candidate in candidates:
            text = self._content_or_text(candidate)
            amount = self._parse_price(text)
            if amount is not None:
                return amount
        return 0.0

    def _extract_category(self, soup: Any) -> str | None:
        breadcrumb = soup.find(attrs={"class": re.compile(r"breadcrumb|miga", re.I)})
        if breadcrumb:
            parts = [
                self._normalize_text(item.get_text(" ", strip=True))
                for item in breadcrumb.find_all(["a", "li", "span"])
            ]
            parts = [item for item in parts if item and len(item) > 2]
            if len(parts) >= 2:
                return parts[-2][:120]
        return None

    def _extract_characteristics(self, soup: Any) -> list[dict[str, Any]]:
        characteristics: list[dict[str, Any]] = []
        seen: set[tuple[str, str]] = set()

        def append(label: str, value: str) -> None:
            normalized_label = self._normalize_text(label)
            normalized_value = self._normalize_text(value)
            if not normalized_label or not normalized_value:
                return
            key = (normalized_label.lower(), normalized_value.lower())
            if key in seen:
                return
            seen.add(key)
            characteristics.append(
                {
                    "label": normalized_label[:120],
                    "value": normalized_value[:4000],
                    "sort_order": len(characteristics) * 10 + 10,
                }
            )

        for table in soup.find_all("table"):
            for row in table.find_all("tr"):
                cells = row.find_all(["th", "td"])
                if len(cells) >= 2:
                    append(cells[0].get_text(" ", strip=True), cells[1].get_text(" ", strip=True))

        for definition in soup.find_all("dl"):
            for term in definition.find_all("dt"):
                detail = term.find_next_sibling("dd")
                if detail:
                    append(term.get_text(" ", strip=True), detail.get_text(" ", strip=True))

        for item in soup.find_all("li"):
            text = self._normalize_text(item.get_text(" ", strip=True))
            if ":" not in text:
                continue
            label, value = text.split(":", 1)
            if len(label) <= 80:
                append(label, value)

        return characteristics[:40]

    def _extract_structured_product_payload(
        self,
        soup: Any,
        *,
        provider_key: str,
        source_url: str,
    ) -> dict[str, Any]:
        payload = self._extract_json_ld_product(soup) or {}
        if not payload:
            return {}
        notes = "Extracción estructurada desde JSON-LD"
        if provider_key != "generic":
            notes = f"{notes} ({provider_key})"
        payload["source_url"] = source_url
        payload["extraction_notes"] = notes
        return payload

    def _extract_json_ld_product(self, soup: Any) -> dict[str, Any] | None:
        for script in soup.find_all("script", attrs={"type": re.compile(r"ld\+json", re.I)}):
            raw_text = (script.string or script.get_text() or "").strip()
            if not raw_text:
                continue
            try:
                parsed = json.loads(raw_text)
            except Exception:  # noqa: BLE001
                continue
            candidate = self._pick_structured_product_candidate(parsed)
            if not isinstance(candidate, dict):
                continue
            normalized = self._normalize_structured_product(candidate)
            if normalized.get("name"):
                return normalized
        return None

    def _pick_structured_product_candidate(self, payload: Any) -> dict[str, Any] | None:
        if isinstance(payload, list):
            for item in payload:
                candidate = self._pick_structured_product_candidate(item)
                if candidate:
                    return candidate
            return None
        if not isinstance(payload, dict):
            return None
        payload_type = str(payload.get("@type") or "").lower()
        if payload_type in {"product", "service"}:
            return payload
        graph = payload.get("@graph")
        if isinstance(graph, list):
            for item in graph:
                candidate = self._pick_structured_product_candidate(item)
                if candidate:
                    return candidate
        for key in ("mainEntity", "itemOffered", "item", "product"):
            if key in payload:
                candidate = self._pick_structured_product_candidate(payload.get(key))
                if candidate:
                    return candidate
        return None

    def _normalize_structured_product(self, payload: dict[str, Any]) -> dict[str, Any]:
        payload_type = str(payload.get("@type") or "Product").lower()
        brand = payload.get("brand")
        if isinstance(brand, dict):
            brand = brand.get("name")
        offers = payload.get("offers")
        if isinstance(offers, list):
            offers = next((item for item in offers if isinstance(item, dict)), None)
        if not isinstance(offers, dict):
            offers = {}
        price = self._parse_price(
            str(
                offers.get("price")
                or payload.get("price")
                or offers.get("lowPrice")
                or ""
            )
        )
        currency = (
            offers.get("priceCurrency")
            or payload.get("priceCurrency")
            or "CLP"
        )
        characteristics = self._normalize_structured_characteristics(
            payload.get("additionalProperty")
            or payload.get("additionalProperties")
            or payload.get("attribute")
            or []
        )
        external_reference = (
            payload.get("sku")
            or payload.get("mpn")
            or payload.get("productID")
            or payload.get("gtin13")
            or payload.get("gtin")
        )
        category = payload.get("category")
        if isinstance(category, list):
            category = next((str(item) for item in category if item), None)
        description = payload.get("description")
        return {
            "name": self._normalize_text(payload.get("name")),
            "sku": self._normalize_text(payload.get("sku") or payload.get("mpn") or payload.get("productID")),
            "brand": self._normalize_text(brand),
            "category_label": self._normalize_text(str(category) if category is not None else None),
            "product_type": "service" if payload_type == "service" else "product",
            "unit_price": price or 0.0,
            "currency_code": self._normalize_text(str(currency) if currency is not None else None) or "CLP",
            "description": self._normalize_text(str(description) if description is not None else None),
            "external_reference": self._normalize_text(str(external_reference) if external_reference is not None else None),
            "characteristics": characteristics,
        }

    def _normalize_structured_characteristics(self, payload: Any) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        items = payload if isinstance(payload, list) else [payload]
        for item in items:
            if not isinstance(item, dict):
                continue
            label = item.get("name") or item.get("propertyID")
            value = item.get("value") or item.get("valueReference")
            if isinstance(value, dict):
                value = value.get("name") or value.get("@id")
            normalized_label = self._normalize_text(str(label) if label is not None else None)
            normalized_value = self._normalize_text(str(value) if value is not None else None)
            if not normalized_label or not normalized_value:
                continue
            rows.append(
                {
                    "label": normalized_label[:120],
                    "value": normalized_value[:4000],
                    "sort_order": (len(rows) + 1) * 10,
                }
            )
        return rows[:40]

    def _merge_characteristics(
        self,
        primary: list[dict[str, Any]],
        secondary: list[dict[str, Any]],
        tertiary: list[dict[str, Any]] | None = None,
    ) -> list[dict[str, Any]]:
        merged: list[dict[str, Any]] = []
        seen: set[tuple[str, str]] = set()
        for item in [*(primary or []), *(secondary or []), *((tertiary or []))]:
            label = self._normalize_text(item.get("label"))
            value = self._normalize_text(item.get("value"))
            if not label or not value:
                continue
            key = (label.lower(), value.lower())
            if key in seen:
                continue
            seen.add(key)
            merged.append(
                {
                    "label": label[:120],
                    "value": value[:4000],
                    "sort_order": (len(merged) + 1) * 10,
                }
            )
        return merged[:40]

    def _build_source_excerpt(
        self,
        description: str | None,
        characteristics: list[dict[str, Any]],
    ) -> str | None:
        parts: list[str] = []
        if description:
            parts.append(description[:600])
        if characteristics:
            lines = [f"{item['label']}: {item['value']}" for item in characteristics[:8]]
            parts.append("\n".join(lines))
        excerpt = "\n\n".join(item for item in parts if item).strip()
        return excerpt[:4000] if excerpt else None

    @staticmethod
    def _content_or_text(candidate: Any) -> str | None:
        if candidate is None:
            return None
        if hasattr(candidate, "get"):
            content = candidate.get("content")
            if content:
                return CRMProductIngestionExtractionService._normalize_text(content)
        if hasattr(candidate, "get_text"):
            return CRMProductIngestionExtractionService._normalize_text(candidate.get_text(" ", strip=True))
        return CRMProductIngestionExtractionService._normalize_text(str(candidate))

    @staticmethod
    def _normalize_text(value: str | None) -> str | None:
        text = re.sub(r"\s+", " ", (value or "")).strip()
        return text or None

    @staticmethod
    def _parse_price(value: str | None) -> float | None:
        text = (value or "").strip()
        if not text:
            return None
        digits = re.sub(r"[^\d,\.]", "", text)
        if not digits:
            return None
        if digits.count(",") == 1 and digits.count(".") >= 1:
            digits = digits.replace(".", "").replace(",", ".")
        elif digits.count(",") > 1 and digits.count(".") == 0:
            digits = digits.replace(",", "")
        elif digits.count(".") > 1 and digits.count(",") == 0:
            digits = digits.replace(".", "")
        elif digits.count(",") == 1 and digits.count(".") == 0:
            digits = digits.replace(",", ".")
        else:
            digits = digits.replace(",", "")
        try:
            return max(float(digits), 0)
        except ValueError:
            return None

    @staticmethod
    def _coalesce_price(*values: Any) -> float:
        for value in values:
            try:
                amount = float(value or 0)
            except (TypeError, ValueError):
                amount = 0
            if amount > 0:
                return amount
        return 0.0

    @staticmethod
    def _extract_mercadolibre_reference_from_url(source_url: str) -> str | None:
        match = re.search(r"/([A-Z]{3}-?\d+)(?:[#/?]|$)", (source_url or "").upper())
        if match:
            return match.group(1).replace("--", "-")
        return None

    @staticmethod
    def _search_script_value(script_blob: str, patterns: list[str]) -> str | None:
        for pattern in patterns:
            match = re.search(pattern, script_blob or "", re.I)
            if match:
                return CRMProductIngestionExtractionService._normalize_text(match.group(1))
        return None

    @staticmethod
    def _normalize_mercadolibre_condition(value: str) -> str:
        normalized = (value or "").strip().lower()
        if normalized == "new":
            return "Nuevo"
        if normalized == "used":
            return "Usado"
        return value
