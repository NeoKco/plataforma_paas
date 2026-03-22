from dataclasses import dataclass
from threading import Lock
from time import time

from app.common.config.settings import settings
from app.common.services.redis_client_service import RedisClientService


@dataclass
class TenantRateLimitResult:
    allowed: bool
    limit: int
    remaining: int
    reset_at: int


class TenantRateLimitService:
    def __init__(
        self,
        *,
        window_seconds: int = 60,
        time_func=None,
        backend_name: str | None = None,
        redis_url: str | None = None,
        key_prefix: str | None = None,
        redis_client_service: RedisClientService | None = None,
    ):
        self.window_seconds = max(window_seconds, 1)
        self.time_func = time_func or time
        self.backend_name = (
            backend_name or settings.TENANT_API_RATE_LIMIT_BACKEND or "memory"
        ).strip().lower()
        self.redis_url = (
            redis_url
            or settings.TENANT_API_RATE_LIMIT_REDIS_URL
            or settings.REDIS_URL
            or settings.PROVISIONING_BROKER_URL
        ).strip()
        self.key_prefix = (
            key_prefix
            or settings.TENANT_API_RATE_LIMIT_KEY_PREFIX
            or "platform_paas:tenant_rate_limit"
        ).strip()
        self.redis_client_service = redis_client_service or RedisClientService()
        self._lock = Lock()
        self._buckets: dict[str, dict[str, int]] = {}

    def consume(
        self,
        *,
        tenant_slug: str,
        operation_type: str,
        limit: int,
    ) -> TenantRateLimitResult:
        if self.backend_name == "redis":
            return self._consume_redis(
                tenant_slug=tenant_slug,
                operation_type=operation_type,
                limit=limit,
            )
        if self.backend_name not in {"memory", "inmemory"}:
            raise ValueError(
                f"Unknown tenant rate limit backend: {self.backend_name}"
            )

        return self._consume_memory(
            tenant_slug=tenant_slug,
            operation_type=operation_type,
            limit=limit,
        )

    def _consume_memory(
        self,
        *,
        tenant_slug: str,
        operation_type: str,
        limit: int,
    ) -> TenantRateLimitResult:
        if limit <= 0:
            now = int(self.time_func())
            return TenantRateLimitResult(
                allowed=True,
                limit=0,
                remaining=0,
                reset_at=now + self.window_seconds,
            )

        bucket_key = f"{tenant_slug}:{operation_type}"
        now = int(self.time_func())
        current_window = now // self.window_seconds
        reset_at = ((current_window + 1) * self.window_seconds)

        with self._lock:
            self._prune_stale_windows(current_window)
            bucket = self._buckets.get(bucket_key)

            if bucket is None or bucket["window"] != current_window:
                bucket = {"window": current_window, "count": 0}
                self._buckets[bucket_key] = bucket

            if bucket["count"] >= limit:
                return TenantRateLimitResult(
                    allowed=False,
                    limit=limit,
                    remaining=0,
                    reset_at=reset_at,
                )

            bucket["count"] += 1
            remaining = max(limit - bucket["count"], 0)
            return TenantRateLimitResult(
                allowed=True,
                limit=limit,
                remaining=remaining,
                reset_at=reset_at,
            )

    def _prune_stale_windows(self, current_window: int) -> None:
        stale_keys = [
            key
            for key, value in self._buckets.items()
            if value["window"] < current_window - 1
        ]
        for key in stale_keys:
            self._buckets.pop(key, None)

    def _consume_redis(
        self,
        *,
        tenant_slug: str,
        operation_type: str,
        limit: int,
    ) -> TenantRateLimitResult:
        now = int(self.time_func())
        current_window = now // self.window_seconds
        reset_at = ((current_window + 1) * self.window_seconds)

        if limit <= 0:
            return TenantRateLimitResult(
                allowed=True,
                limit=0,
                remaining=0,
                reset_at=reset_at,
            )

        client = self.redis_client_service.get_client(url=self.redis_url)
        key = (
            f"{self.key_prefix}:{tenant_slug}:{operation_type}:{current_window}"
        )
        current_count = int(client.incr(key))
        if current_count == 1:
            client.expireat(key, reset_at + 1)

        allowed = current_count <= limit
        remaining = max(limit - min(current_count, limit), 0)
        return TenantRateLimitResult(
            allowed=allowed,
            limit=limit,
            remaining=remaining,
            reset_at=reset_at,
        )
