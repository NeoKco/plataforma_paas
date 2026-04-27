from __future__ import annotations

import json
import re
from typing import Any


class ProductCatalogAiPostprocessingService:
    def build_prompt(
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

    def postprocess_llm_response(
        self,
        raw_text: str,
        ctx: dict[str, Any],
    ) -> dict[str, Any]:
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
                normalized_segment = self._loose_norm_text(valor_raw)
                if valor_raw and normalized_segment not in {
                    self._loose_norm_text(item) for item in description_segments
                }:
                    description_segments.append(valor_raw)
                continue
            if clave_norm in {"nombre", "precio", "valor", "unidad", "value", "unit"}:
                continue
            valor, unidad = self._normalize_valor_unidad(valor_raw, unidad_raw)
            clave_final = self._prettify_key(clave_raw)
            triplet = (
                self._norm_key(clave_final),
                self._loose_norm_text(valor),
                self._loose_norm_text(unidad),
            )
            if triplet in seen_triplets:
                continue
            seen_triplets.add(triplet)
            out.append({"clave": clave_final, "valor": valor, "unidad": unidad or ""})

        if description_segments:
            result["descripcion"] = " ".join(
                segment.strip() for segment in description_segments if segment.strip()
            )
        result["caracteristicas"] = out
        return result

    def map_characteristics(
        self, items: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
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

    def build_source_excerpt(
        self,
        description: str | None,
        characteristics: list[dict[str, Any]],
    ) -> str | None:
        if description:
            return description[:4000]
        if not characteristics:
            return None
        parts = [
            f"{item['label']}: {item['value']}"
            for item in characteristics[:12]
            if item.get("label") and item.get("value")
        ]
        if not parts:
            return None
        return " | ".join(parts)[:4000]

    def normalize_valor_unidad(self, valor: str, unidad: str) -> tuple[str, str]:
        return self._normalize_valor_unidad(valor, unidad)

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
        if re.search(
            r"^\s*producto\s*:\s*(start|end)\b|^-{10,}\s*$",
            text,
            re.I,
        ):
            return True
        if re.search(r"\bproducto\s*:\s*(start|end)\b", text, re.I):
            return True
        return False

    def _normalize_plain(self, value: Any) -> str | None:
        if value in (None, ""):
            return None
        text = str(value).strip()
        return text or None
