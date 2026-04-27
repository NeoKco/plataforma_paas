from __future__ import annotations

import re
from typing import Any


class ProductCatalogAiPreprocessingService:
    USER_AGENT = "Mozilla/5.0 (compatible; orkestia-products-ai-extraction/1.0)"
    NOISE_LINE_RE = re.compile(
        r"^\s*producto\s*:\s*(start|end)\b|^-{10,}\s*$",
        re.I,
    )

    def preprocess_url(
        self,
        url: str,
        *,
        timeout_seconds: int = 30,
    ) -> tuple[str, str, list[tuple[str, str]]]:
        try:
            import requests
            from bs4 import BeautifulSoup
            from bs4 import Comment
        except ModuleNotFoundError as exc:  # pragma: no cover - runtime dependency
            raise RuntimeError(
                "La extracción IA requiere requests y beautifulsoup4 instalados"
            ) from exc

        response = requests.get(
            (url or "").strip(),
            headers={"User-Agent": self.USER_AGENT},
            timeout=max(int(timeout_seconds or 30), 10),
        )
        response.raise_for_status()
        try:
            if not response.encoding:
                response.encoding = response.apparent_encoding
        except Exception:
            pass

        soup = BeautifulSoup(response.text, "html.parser")

        try:
            for item in soup.find_all(string=lambda text: isinstance(text, Comment)):
                item.extract()
        except Exception:
            pass

        for tag in soup(["script", "style", "noscript", "svg"]):
            tag.decompose()
        for tag in soup.find_all(["header", "footer", "nav", "aside", "form"]):
            tag.decompose()
        noise_re = re.compile(
            r"(breadcrumb|menu|navbar|nav|footer|header|sidebar|newsletter|social|account|login|search|cart|"
            r"category|categor|filters?|related|recomendad|banner)",
            re.I,
        )
        for tag in soup.find_all(class_=noise_re):
            tag.decompose()
        for tag in soup.find_all(id=noise_re):
            tag.decompose()

        nombre_tag = soup.find("h1", class_="bs-product__title") or soup.find("h1")
        nombre = (
            self.extract_heading_name(nombre_tag)
            if nombre_tag
            else "Nombre no encontrado"
        )

        precio_tag = soup.find("span", class_="bs-product__final-price") or soup.find(
            "span",
            class_=re.compile(r"price", re.I),
        )
        precio_texto = precio_tag.get_text(strip=True) if precio_tag else ""
        precio_num = re.sub(r"[^\d]", "", precio_texto) if precio_texto else ""
        if not precio_num:
            meta_price = soup.select_one(
                'meta[property="product:price:amount"]'
            ) or soup.select_one('meta[itemprop="price"]')
            if meta_price and meta_price.get("content"):
                precio_num = re.sub(r"[^\d]", "", meta_price.get("content"))

        specs: list[tuple[str, str]] = []

        def add_kv(label: str, value: str) -> None:
            normalized_label = (label or "").strip()
            normalized_value = (value or "").strip()
            if not normalized_label or not normalized_value:
                return
            if (
                self.is_noise_line(f"{normalized_label}: {normalized_value}")
                or self.is_noise_line(normalized_label)
                or self.is_noise_line(normalized_value)
            ):
                return
            specs.append((normalized_label, normalized_value))

        def norm_dim(text: str) -> str:
            compact = re.sub(r"\s+", "", text or "")
            return compact.replace("×", "x")

        product_root = None
        if nombre_tag:
            node = nombre_tag
            for _ in range(8):
                parent = getattr(node, "parent", None)
                if not parent:
                    break
                if parent.find(
                    "span", class_=re.compile(r"final-price|price", re.I)
                ) or parent.find(class_=re.compile(r"\bbs-product\b|product", re.I)):
                    product_root = parent
                    break
                node = parent
        if not product_root:
            product_root = soup.find("main") or soup

        tabla_features = product_root.find(
            "table", class_=re.compile(r"(product-features-table|features|spec)", re.I)
        )
        if tabla_features:
            for tr in tabla_features.find_all("tr"):
                cells = tr.find_all(["th", "td"])
                if len(cells) >= 2:
                    add_kv(
                        cells[0].get_text(" ", strip=True),
                        cells[1].get_text(" ", strip=True),
                    )

        for table in product_root.find_all("table"):
            for tr in table.find_all("tr"):
                cells = tr.find_all(["th", "td"])
                if len(cells) >= 2:
                    add_kv(
                        cells[0].get_text(" ", strip=True),
                        cells[1].get_text(" ", strip=True),
                    )

        for dl in product_root.find_all("dl"):
            for dt in dl.find_all("dt"):
                dd = dt.find_next_sibling("dd")
                if dd:
                    add_kv(
                        dt.get_text(" ", strip=True),
                        dd.get_text(" ", strip=True),
                    )

        candidate_sections = []
        for tag_name, kwargs in (
            ("section", {"class_": re.compile(r"(description|spec|detail|product)", re.I)}),
            ("div", {"class_": re.compile(r"(description|spec|detail|product|tabs?)", re.I)}),
            ("section", {"class_": "bs-product-description"}),
        ):
            candidate_sections.extend(product_root.find_all(tag_name, **kwargs))

        heading_re = re.compile(
            r"^(especificaciones|aplicaciones|medidas|caracter[ií]sticas|ficha t[eé]cnica|descripci[oó]n)$",
            re.I,
        )
        for heading in product_root.find_all(["h2", "h3", "h4", "strong"]):
            text = heading.get_text(" ", strip=True).strip().rstrip(":")
            if text and heading_re.match(text):
                candidate_sections.append(heading.parent)
                if getattr(heading.parent, "parent", None):
                    candidate_sections.append(heading.parent.parent)

        seen_sections: set[int] = set()
        unique_sections = []
        for section in candidate_sections:
            section_id = id(section)
            if section_id in seen_sections:
                continue
            seen_sections.add(section_id)
            unique_sections.append(section)

        sec_hint_re = re.compile(
            r"(especificaciones|aplicaciones|medidas|caracter[ií]sticas|ficha t[eé]cnica|descrip)",
            re.I,
        )
        max_items = 250
        current_section = None
        for section in unique_sections:
            if len(specs) >= max_items:
                break
            sec_text_flat = section.get_text(" ", strip=True)
            allow_bullets = bool(sec_hint_re.search(sec_text_flat)) or bool(
                section.get("class")
            )
            for li in section.find_all("li"):
                if len(specs) >= max_items:
                    break
                text = li.get_text(" ", strip=True)
                if not text or self.is_noise_line(text):
                    continue
                if ":" in text:
                    label, value = text.split(":", 1)
                    if label.strip() and value.strip() and len(label.strip()) <= 80:
                        add_kv(label, value)
                        continue
                if allow_bullets:
                    add_kv("Especificaciones", text)

            raw_html = section.decode_contents().replace("<br>", "\n")
            raw_text = BeautifulSoup(raw_html, "html.parser").get_text(
                "\n", strip=True
            )
            for line in raw_text.split("\n"):
                if len(specs) >= max_items:
                    break
                normalized_line = (line or "").strip()
                if not normalized_line or self.is_noise_line(normalized_line):
                    continue
                upper = re.sub(r"\s+", " ", normalized_line).strip().upper().rstrip(":")
                if upper in {
                    "ESPECIFICACIONES",
                    "APLICACIONES",
                    "MEDIDAS",
                    "CARACTERÍSTICAS",
                    "CARACTERISTICAS",
                    "FICHA TÉCNICA",
                    "FICHA TECNICA",
                    "DESCRIPCIÓN",
                    "DESCRIPCION",
                }:
                    current_section = upper.title()
                    continue
                if ":" in normalized_line:
                    label, value = normalized_line.split(":", 1)
                    add_kv(label, value)
                    continue
                if current_section == "Medidas":
                    dim_match = re.fullmatch(
                        r"\s*(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*",
                        normalized_line,
                        re.I,
                    )
                    if dim_match:
                        add_kv(
                            "Dimensiones",
                            norm_dim(
                                f"{dim_match.group(1)}x{dim_match.group(2)}x{dim_match.group(3)}"
                            ),
                        )
                        continue
                    weight_match = re.fullmatch(
                        r"\s*(\d+(?:[.,]\d+)?)\s*(kg|g)\s*",
                        normalized_line,
                        re.I,
                    )
                    if weight_match:
                        add_kv(
                            "Peso",
                            f"{weight_match.group(1)}{weight_match.group(2)}",
                        )
                        continue
                    add_kv("Medidas", normalized_line)
                    continue
                if current_section == "Aplicaciones":
                    add_kv("Aplicaciones", normalized_line)
                    continue
                if current_section in {
                    "Especificaciones",
                    "Características",
                    "Caracteristicas",
                    "Ficha Técnica",
                    "Ficha Tecnica",
                }:
                    add_kv("Especificaciones", normalized_line)
                    continue
                if current_section in {"Descripción", "Descripcion"}:
                    add_kv("Descripción", normalized_line)
                    continue
                if re.search(
                    r"(\d|ip\d{2}|ral\s*\d{4}|vdc|vac|hz|mm|cm|kg|w\b|a\b)",
                    normalized_line,
                    re.I,
                ):
                    add_kv("Detalle", normalized_line)

        deduped: list[tuple[str, str]] = []
        seen: set[tuple[str, str]] = set()
        for label, value in specs:
            key = (label.strip().lower(), value.strip().lower())
            if key in seen:
                continue
            seen.add(key)
            deduped.append((label.strip(), value.strip()))
        return nombre, precio_num, deduped

    def is_noise_line(self, value: str) -> bool:
        text = (value or "").strip()
        if not text:
            return True
        if self.NOISE_LINE_RE.search(text):
            return True
        if re.search(r"\bproducto\s*:\s*(start|end)\b", text, re.I):
            return True
        return False

    def extract_heading_name(self, tag: Any) -> str:
        try:
            strings = [self.normalize_plain(item) for item in tag.stripped_strings]
            strings = [item for item in strings if item]
            if strings:
                return self.normalize_catalog_name(strings[0] or "") or "Nombre no encontrado"
        except Exception:
            pass
        return self.normalize_catalog_name(tag.get_text(" ", strip=True)) or "Nombre no encontrado"

    def normalize_plain(self, value: Any) -> str | None:
        if value in (None, ""):
            return None
        text = str(value).strip()
        return text or None

    def normalize_catalog_name(self, value: Any) -> str | None:
        text = self.normalize_plain(value)
        if not text:
            return text
        normalized = re.sub(r"\s+", " ", text).strip(" -|/")
        if not normalized:
            return None
        parts = [
            part.strip()
            for part in re.split(r"\s+(?=[A-ZÁÉÍÓÚÑ0-9]{3,}\b)", normalized)
            if part.strip()
        ]
        if len(parts) > 1:
            base = parts[0]
            base_norm = self.loose_norm_text(base)
            for extra in parts[1:]:
                extra_norm = self.loose_norm_text(extra)
                if not extra_norm:
                    continue
                if extra_norm in base_norm:
                    continue
                if len(extra.split()) <= 3 and extra.isupper():
                    continue
                base = f"{base} {extra}".strip()
                base_norm = self.loose_norm_text(base)
            normalized = base
        return normalized[:255]

    def loose_norm_text(self, value: str) -> str:
        text = self.normalize_plain(value) or ""
        text = text.lower()
        text = re.sub(r"\s+", " ", text).strip()
        return text
