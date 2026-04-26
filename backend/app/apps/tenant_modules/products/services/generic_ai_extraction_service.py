from __future__ import annotations

import json
import re
from typing import Any

from app.common.config.settings import settings


class ProductCatalogGenericAiExtractionService:
    USER_AGENT = "Mozilla/5.0 (compatible; orkestia-products-ai-extraction/1.0)"
    NOISE_LINE_RE = re.compile(
        r"^\s*producto\s*:\s*(start|end)\b|^-{10,}\s*$",
        re.I,
    )

    def extract_from_url(
        self,
        url: str,
        *,
        timeout_seconds: int | None = None,
        prompt_override: str | None = None,
    ) -> dict[str, Any]:
        self._ensure_ai_configured()
        nombre, precio, specs = self._preprocess_url(url, timeout_seconds=timeout_seconds)
        prompt = self._build_prompt(nombre, precio, specs, prompt_override=prompt_override)
        raw = self._analyze_prompt(prompt, timeout_seconds=timeout_seconds)
        ctx = {
            "url": url,
            "nombre": nombre,
            "precio": precio,
            "especificaciones": specs,
        }
        parsed = self._postprocess_llm_response(raw, ctx)
        if parsed.get("_fallback"):
            raise RuntimeError("La API IA devolvió una respuesta no utilizable para el catálogo")
        characteristics = self._map_characteristics(parsed.get("caracteristicas") or [])
        description = self._normalize_plain(parsed.get("descripcion"))
        excerpt = self._build_source_excerpt(description, characteristics)
        return {
            "name": self._normalize_catalog_name(nombre),
            "unit_price": self._parse_price(precio),
            "currency_code": "CLP",
            "description": description,
            "source_excerpt": excerpt,
            "characteristics": characteristics,
            "extraction_notes": (
                "Extracción IA genérica desde URL\n"
                "[products-enrichment:ai_full_generic] prompt técnico + postproceso estructurado"
            ),
            "used_ai_enrichment": True,
            "extraction_strategy": "ai_full_generic",
            "ai_raw_response": raw,
            "ai_spec_count": len(specs),
        }

    def _ensure_ai_configured(self) -> None:
        api_url = (settings.API_IA_URL or "").strip()
        api_key = (settings.MANAGER_API_IA_KEY or "").strip()
        if api_url and api_key:
            return
        raise ValueError(
            "Scraping IA bloqueado: faltan API_IA_URL y/o MANAGER_API_IA_KEY en el runtime"
        )

    def _preprocess_url(
        self,
        url: str,
        *,
        timeout_seconds: int | None = None,
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
            timeout=max(int(timeout_seconds or settings.API_IA_TIMEOUT or 30), 10),
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
        nombre = self._extract_heading_name(nombre_tag) if nombre_tag else "Nombre no encontrado"

        precio_tag = soup.find("span", class_="bs-product__final-price") or soup.find(
            "span",
            class_=re.compile(r"price", re.I),
        )
        precio_texto = precio_tag.get_text(strip=True) if precio_tag else ""
        precio_num = re.sub(r"[^\d]", "", precio_texto) if precio_texto else ""
        if not precio_num:
            meta_price = soup.select_one('meta[property="product:price:amount"]') or soup.select_one(
                'meta[itemprop="price"]'
            )
            if meta_price and meta_price.get("content"):
                precio_num = re.sub(r"[^\d]", "", meta_price.get("content"))

        specs: list[tuple[str, str]] = []

        def add_kv(label: str, value: str) -> None:
            normalized_label = (label or "").strip()
            normalized_value = (value or "").strip()
            if not normalized_label or not normalized_value:
                return
            if (
                self._is_noise_line(f"{normalized_label}: {normalized_value}")
                or self._is_noise_line(normalized_label)
                or self._is_noise_line(normalized_value)
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
                if parent.find("span", class_=re.compile(r"final-price|price", re.I)) or parent.find(
                    class_=re.compile(r"\bbs-product\b|product", re.I)
                ):
                    product_root = parent
                    break
                node = parent
        if not product_root:
            product_root = soup.find("main") or soup

        tabla_features = product_root.find("table", class_=re.compile(r"(product-features-table|features|spec)", re.I))
        if tabla_features:
            for tr in tabla_features.find_all("tr"):
                cells = tr.find_all(["th", "td"])
                if len(cells) >= 2:
                    add_kv(cells[0].get_text(" ", strip=True), cells[1].get_text(" ", strip=True))

        for table in product_root.find_all("table"):
            for tr in table.find_all("tr"):
                cells = tr.find_all(["th", "td"])
                if len(cells) >= 2:
                    add_kv(cells[0].get_text(" ", strip=True), cells[1].get_text(" ", strip=True))

        for dl in product_root.find_all("dl"):
            for dt in dl.find_all("dt"):
                dd = dt.find_next_sibling("dd")
                if dd:
                    add_kv(dt.get_text(" ", strip=True), dd.get_text(" ", strip=True))

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

        sec_hint_re = re.compile(r"(especificaciones|aplicaciones|medidas|caracter[ií]sticas|ficha t[eé]cnica|descrip)", re.I)
        max_items = 250
        current_section = None
        for section in unique_sections:
            if len(specs) >= max_items:
                break
            sec_text_flat = section.get_text(" ", strip=True)
            allow_bullets = bool(sec_hint_re.search(sec_text_flat)) or bool(section.get("class"))
            for li in section.find_all("li"):
                if len(specs) >= max_items:
                    break
                text = li.get_text(" ", strip=True)
                if not text or self._is_noise_line(text):
                    continue
                if ":" in text:
                    label, value = text.split(":", 1)
                    if label.strip() and value.strip() and len(label.strip()) <= 80:
                        add_kv(label, value)
                        continue
                if allow_bullets:
                    add_kv("Especificaciones", text)

            raw_html = section.decode_contents().replace("<br>", "\n")
            raw_text = BeautifulSoup(raw_html, "html.parser").get_text("\n", strip=True)
            for line in raw_text.split("\n"):
                if len(specs) >= max_items:
                    break
                normalized_line = (line or "").strip()
                if not normalized_line or self._is_noise_line(normalized_line):
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
                        add_kv("Dimensiones", norm_dim(f"{dim_match.group(1)}x{dim_match.group(2)}x{dim_match.group(3)}"))
                        continue
                    weight_match = re.fullmatch(r"\s*(\d+(?:[.,]\d+)?)\s*(kg|g)\s*", normalized_line, re.I)
                    if weight_match:
                        add_kv("Peso", f"{weight_match.group(1)}{weight_match.group(2)}")
                        continue
                    add_kv("Medidas", normalized_line)
                    continue
                if current_section == "Aplicaciones":
                    add_kv("Aplicaciones", normalized_line)
                    continue
                if current_section in {"Especificaciones", "Características", "Caracteristicas", "Ficha Técnica", "Ficha Tecnica"}:
                    add_kv("Especificaciones", normalized_line)
                    continue
                if current_section in {"Descripción", "Descripcion"}:
                    add_kv("Descripción", normalized_line)
                    continue
                if re.search(r"(\d|ip\d{2}|ral\s*\d{4}|vdc|vac|hz|mm|cm|kg|w\b|a\b)", normalized_line, re.I):
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

    def _build_prompt(
        self,
        nombre: str,
        precio: str,
        especificaciones: list[tuple[str, str]],
        *,
        prompt_override: str | None = None,
    ) -> str:
        spec_lines = [f"{clave}: {valor}" for clave, valor in especificaciones]
        prompt = f"""[INST]
Eres un extractor de datos técnicos. Debes transformar la ENTRADA en un array JSON.

SALIDA (estricto):
- Responde SOLO con un array JSON MINIFICADO (una sola línea).
- NO envuelvas el JSON en un string.
- NO lo metas dentro de otro array.
- Debe empezar con [ y terminar con ].
- Cada elemento debe ser exactamente: {{"clave":string,"valor":string,"unidad":string}}
- NO incluyas "fuente" (se agrega después).

REGLAS DE VERDAD (anti-alucinación):
- NO inventes Marca/Modelo/Tipo ni ningún dato que no aparezca en la ENTRADA.
- NO supongas unidades. Si no está claro, deja unidad="" y conserva el texto.
- NO omitas información: cada línea relevante de la ENTRADA debe quedar representada al menos una vez en el JSON.

REGLA NUEVA (Descripción para BD):
- Si en la ENTRADA existe texto descriptivo (párrafos, varias oraciones, explicación del producto/uso/beneficios),
  DEBES crear EXACTAMENTE 1 ítem adicional:
  {{"clave":"Descripción","valor":"<texto descriptivo limpio>","unidad":""}}
- Considera "descriptivo" si:
  - la línea tiene 140+ caracteres, o
  - contiene 2+ oraciones (puntos), o
  - explica finalidad/función ("diseñado para", "utilizado para", "protege", "permite", "ideal para", etc.).
- La "Descripción" debe ser texto plano. NO inventes nada.
- Si hay varias líneas descriptivas, combínalas en una sola descripción coherente separando con espacios.
- Usa la clave EXACTA "Descripción" (con tilde).

NORMALIZACIÓN DE VALOR/UNIDAD:
- Si valor trae unidad pegada, separa:
  "40A" -> valor="40", unidad="A"
  "500VDC" -> valor="500", unidad="VDC"
  "0.233kg" -> valor="0.233", unidad="kg"
- Para compuestos:
  "63 A / 56 A" -> valor="63 / 56", unidad="A"
  "230/240V" -> valor="230/240", unidad="V"
- Para dimensiones:
  "400x300x200" -> clave="Dimensiones", valor="400x300x200", unidad=""
  "3,5 x 8 x 7,5 cm" -> clave="Dimensiones", valor="3,5x8x7,5", unidad="cm"
- Para peso:
  "6.900 Kg" -> valor="6.900", unidad="Kg"

CÓMO INTERPRETAR LA ENTRADA:
- La entrada viene en líneas con formato "X: Y".
- Si X es "Especificaciones" y Y es una frase, puedes:
  a) Si detectas un dato inequívoco, mapearlo a una clave más útil.
  b) Si no es inequívoco, mantén clave="Especificaciones" y valor=la frase completa.
- Para líneas sueltas que no sean descriptivas y no calcen:
  - clave="Especificaciones" para frases técnicas
  - clave="Aplicaciones" para usos
  - clave="Medidas" para medidas sueltas

ENTRADA:
Nombre: {nombre}
Precio: {precio} CLP
{chr(10).join(spec_lines)}
[/INST]"""
        if (prompt_override or "").strip():
            prompt = f"{prompt}\n\n# Contexto adicional del runtime\n{prompt_override.strip()}"
        return prompt

    def _analyze_prompt(self, prompt: str, *, timeout_seconds: int | None = None) -> str:
        try:
            import requests
        except ModuleNotFoundError as exc:  # pragma: no cover - runtime dependency
            raise RuntimeError("La integración IA requiere requests instalado") from exc

        headers = {"Content-Type": "application/json"}
        api_key = (settings.MANAGER_API_IA_KEY or "").strip()
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        payload = {
            "model_id": (settings.API_IA_MODEL_ID or "").strip() or "mistral-ollama",
            "prompt": prompt,
            "options": {
                "max_tokens": int(settings.API_IA_MAX_TOKENS or 1200),
                "temperature": float(settings.API_IA_TEMPERATURE or 0.2),
            },
        }
        base_url = (settings.API_IA_URL or "").strip().rstrip("/")
        endpoint = base_url if base_url.lower().endswith("/analyze") else f"{base_url}/analyze"
        response = requests.post(
            endpoint,
            json=payload,
            headers=headers,
            timeout=max(int(timeout_seconds or settings.API_IA_TIMEOUT or 240), 30),
        )
        if not response.ok:
            body = (response.text or "").strip()
            raise RuntimeError(f"API IA devolvió {response.status_code}: {body}")
        if (response.headers.get("Content-Type", "") or "").startswith("application/json"):
            data = response.json()
        else:
            data = response.text
        if isinstance(data, dict) and isinstance(data.get("response"), str):
            return data["response"]
        if isinstance(data, dict) and isinstance(data.get("raw"), dict) and isinstance(data["raw"].get("response"), str):
            return data["raw"]["response"]
        if isinstance(data, dict) and isinstance(data.get("text"), str):
            return data["text"]
        if isinstance(data, str):
            return data
        return str(data)

    def _postprocess_llm_response(self, raw_text: str, ctx: dict[str, Any]) -> dict[str, Any]:
        parsed = self._extract_json_array(raw_text)
        result = {
            "caracteristicas": [],
            "nombre": ctx.get("nombre") or "",
            "precio": ctx.get("precio") or None,
            "descripcion": "",
            "fuente_raw": raw_text,
        }
        if not isinstance(parsed, list):
            result["_fallback"] = True
            return result

        out: list[dict[str, str]] = []
        seen_triplets: set[tuple[str, str, str]] = set()
        description_segments: list[str] = []

        for element in parsed:
            if not isinstance(element, dict):
                continue
            clave_raw = (element.get("clave") or element.get("key") or "").strip()
            valor_raw = (element.get("valor") or element.get("value") or "").strip()
            unidad_raw = (element.get("unidad") or element.get("unit") or "") or ""
            if not clave_raw or not valor_raw:
                continue
            if self._is_noise_line(clave_raw) or self._is_noise_line(valor_raw):
                continue
            clave_norm = self._norm_key(clave_raw)
            is_desc_key = (
                clave_norm in {"descripcion", "descripción"}
                or "descripcion" in clave_norm
                or "descrip" in clave_norm
                or "detalle" in clave_norm
                or "aplicacion" in clave_norm
            )
            if is_desc_key:
                if valor_raw and self._loose_norm_text(valor_raw) not in {
                    self._loose_norm_text(item) for item in description_segments
                }:
                    description_segments.append(valor_raw)
                continue
            if clave_norm in {"nombre", "precio", "valor", "unidad", "value", "unit"}:
                continue
            valor, unidad = self._normalize_valor_unidad(valor_raw, unidad_raw)
            clave_final = self._prettify_key(clave_raw)
            triplet = (self._norm_key(clave_final), self._loose_norm_text(valor), self._loose_norm_text(unidad))
            if triplet in seen_triplets:
                continue
            seen_triplets.add(triplet)
            out.append({"clave": clave_final, "valor": valor, "unidad": unidad or ""})

        if description_segments:
            result["descripcion"] = " ".join(segment.strip() for segment in description_segments if segment.strip())
        result["caracteristicas"] = out
        return result

    def _extract_json_array(self, text: str) -> Any:
        if not isinstance(text, str):
            return None
        try:
            parsed = json.loads(text)
        except Exception:
            start = text.find("[")
            end = text.rfind("]")
            if start != -1 and end != -1 and end > start:
                try:
                    parsed = json.loads(text[start : end + 1])
                except Exception:
                    return None
            else:
                return None
        if isinstance(parsed, list) and all(isinstance(item, dict) for item in parsed):
            return parsed
        if isinstance(parsed, list) and len(parsed) == 1 and isinstance(parsed[0], str):
            try:
                inner = json.loads(parsed[0])
            except Exception:
                return None
            if isinstance(inner, list):
                return inner
        return None

    def _map_characteristics(self, items: list[dict[str, Any]]) -> list[dict[str, Any]]:
        mapped: list[dict[str, Any]] = []
        for index, item in enumerate(items or []):
            label = self._normalize_plain(item.get("clave"))
            value = self._normalize_plain(item.get("valor"))
            unit = self._normalize_plain(item.get("unidad"))
            if not label or not value:
                continue
            mapped_value = f"{value} {unit}".strip() if unit else value
            mapped.append(
                {
                    "label": label[:120],
                    "value": mapped_value[:4000],
                    "sort_order": (index + 1) * 10,
                }
            )
        return mapped

    def _build_source_excerpt(
        self,
        description: str | None,
        characteristics: list[dict[str, Any]],
    ) -> str | None:
        if description:
            return description[:4000]
        if not characteristics:
            return None
        parts = [f"{item['label']}: {item['value']}" for item in characteristics[:12] if item.get("label") and item.get("value")]
        if not parts:
            return None
        return " | ".join(parts)[:4000]

    def _normalize_valor_unidad(self, valor: str, unidad: str) -> tuple[str, str]:
        text = (valor or "").strip()
        unit = (unidad or "").strip()
        if not text:
            return "", unit
        if unit:
            return text, unit
        match = re.fullmatch(r"([+-]?\d+(?:[.,]\d+)?)\s*([a-zA-Z°/%]+)", text)
        if match:
            return match.group(1), match.group(2)
        return text, unit

    def _norm_key(self, value: str) -> str:
        text = self._normalize_plain(value) or ""
        text = text.lower()
        text = (
            text.replace("á", "a")
            .replace("é", "e")
            .replace("í", "i")
            .replace("ó", "o")
            .replace("ú", "u")
        )
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def _prettify_key(self, value: str) -> str:
        normalized = self._normalize_plain(value) or ""
        if not normalized:
            return ""
        return normalized[:1].upper() + normalized[1:]

    def _loose_norm_text(self, value: str) -> str:
        text = self._normalize_plain(value) or ""
        text = text.lower()
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def _is_noise_line(self, value: str) -> bool:
        text = (value or "").strip()
        if not text:
            return True
        if self.NOISE_LINE_RE.search(text):
            return True
        if re.search(r"\bproducto\s*:\s*(start|end)\b", text, re.I):
            return True
        return False

    def _parse_price(self, value: str | None) -> float:
        text = re.sub(r"[^\d]", "", (value or "").strip())
        if not text:
            return 0.0
        try:
            return float(text)
        except Exception:
            return 0.0

    def _normalize_plain(self, value: Any) -> str | None:
        if value in (None, ""):
            return None
        text = str(value).strip()
        return text or None

    def _extract_heading_name(self, tag: Any) -> str:
        try:
            strings = [self._normalize_plain(item) for item in tag.stripped_strings]
            strings = [item for item in strings if item]
            if strings:
                return self._normalize_catalog_name(strings[0] or "") or "Nombre no encontrado"
        except Exception:
            pass
        return self._normalize_catalog_name(tag.get_text(" ", strip=True)) or "Nombre no encontrado"

    def _normalize_catalog_name(self, value: Any) -> str | None:
        text = self._normalize_plain(value)
        if not text:
            return text
        normalized = re.sub(r"\s+", " ", text).strip(" -|/")
        if not normalized:
            return None
        parts = [part.strip() for part in re.split(r"\s+(?=[A-ZÁÉÍÓÚÑ0-9]{3,}\b)", normalized) if part.strip()]
        if len(parts) > 1:
            base = parts[0]
            base_norm = self._loose_norm_text(base)
            for extra in parts[1:]:
                extra_norm = self._loose_norm_text(extra)
                if not extra_norm:
                    continue
                if extra_norm in base_norm:
                    continue
                if len(extra.split()) <= 3 and extra.isupper():
                    continue
                base = f"{base} {extra}".strip()
                base_norm = self._loose_norm_text(base)
            normalized = base
        return normalized[:255]
