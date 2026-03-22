from collections.abc import Callable

from redis import Redis

from app.common.config.settings import settings


class RedisClientService:
    def __init__(
        self,
        *,
        client_factory: Callable[..., Redis] | None = None,
    ):
        self.client_factory = client_factory or Redis.from_url
        self._clients: dict[str, Redis] = {}

    def get_client(
        self,
        *,
        url: str | None = None,
    ) -> Redis:
        resolved_url = (url or settings.REDIS_URL or "").strip()
        if not resolved_url:
            raise ValueError("Redis URL not configured")

        client = self._clients.get(resolved_url)
        if client is None:
            client = self.client_factory(
                resolved_url,
                decode_responses=True,
            )
            self._clients[resolved_url] = client
        return client
