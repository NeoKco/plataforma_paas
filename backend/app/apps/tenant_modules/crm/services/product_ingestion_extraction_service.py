from __future__ import annotations

import re
from typing import Any


class CRMProductIngestionExtractionService:
    USER_AGENT = "Mozilla/5.0 (compatible; orkestia-crm-ingestion/1.0)"

    def extract_from_url(self, url: str) -> dict[str, Any]:
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
            timeout=25,
        )
        response.raise_for_status()

        content_type = (response.headers.get("content-type") or "").lower()
        if "text/html" not in content_type and "application/xhtml+xml" not in content_type and content_type:
            raise ValueError("La fuente no devolvió HTML legible para scraping")

        if not response.encoding:
            response.encoding = response.apparent_encoding

        soup = BeautifulSoup(response.text, "html.parser")
        for tag in soup(["script", "style", "noscript", "svg"]):
            tag.decompose()

        title = self._extract_title(soup)
        description = self._extract_description(soup)
        brand = self._extract_brand(soup)
        sku = self._extract_sku(soup)
        price = self._extract_price(soup)
        category = self._extract_category(soup)
        characteristics = self._extract_characteristics(soup)
        source_excerpt = self._build_source_excerpt(description, characteristics)

        return {
            "source_url": normalized_url,
            "name": title,
            "sku": sku,
            "brand": brand,
            "category_label": category,
            "product_type": "product",
            "unit_label": None,
            "unit_price": price,
            "currency_code": "CLP",
            "description": description,
            "source_excerpt": source_excerpt,
            "extraction_notes": "Extracción automática desde URL",
            "characteristics": characteristics,
        }

    def _extract_title(self, soup: Any) -> str:
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

    def _extract_description(self, soup: Any) -> str | None:
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

    def _extract_price(self, soup: Any) -> float:
        candidates = [
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
