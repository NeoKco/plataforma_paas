import hashlib
import hmac
import time


class StripeWebhookSignatureService:
    def __init__(self, *, tolerance_seconds: int = 300) -> None:
        self.tolerance_seconds = tolerance_seconds

    def validate_signature(
        self,
        *,
        payload: bytes,
        signature_header: str | None,
        secret: str,
        now_timestamp: int | None = None,
    ) -> bool:
        if not secret.strip():
            return True
        if not signature_header:
            return False

        timestamp, signatures = self._parse_signature_header(signature_header)
        if timestamp is None or not signatures:
            return False

        current_timestamp = int(time.time()) if now_timestamp is None else now_timestamp
        if abs(current_timestamp - timestamp) > self.tolerance_seconds:
            return False

        signed_payload = f"{timestamp}.".encode("utf-8") + payload
        expected_signature = hmac.new(
            secret.encode("utf-8"),
            signed_payload,
            hashlib.sha256,
        ).hexdigest()

        return any(
            hmac.compare_digest(signature, expected_signature)
            for signature in signatures
        )

    def _parse_signature_header(
        self,
        signature_header: str,
    ) -> tuple[int | None, list[str]]:
        timestamp = None
        signatures: list[str] = []

        for chunk in signature_header.split(","):
            item = chunk.strip()
            if "=" not in item:
                continue
            key, value = item.split("=", 1)
            normalized_key = key.strip().lower()
            normalized_value = value.strip()
            if normalized_key == "t":
                try:
                    timestamp = int(normalized_value)
                except ValueError:
                    timestamp = None
            elif normalized_key == "v1" and normalized_value:
                signatures.append(normalized_value)

        return timestamp, signatures
