from datetime import datetime, timezone
from typing import Protocol

from sqlalchemy.orm import Session

from app.apps.platform_control.models.provisioning_job import ProvisioningJob
from app.apps.platform_control.repositories.provisioning_job_repository import (
    ProvisioningJobRepository,
)
from app.apps.platform_control.services.provisioning_job_service import (
    ProvisioningJobService,
)
from app.common.config.settings import settings
from app.common.observability.logging_service import LoggingService
from app.common.services.redis_client_service import RedisClientService


class ProvisioningDispatchBackend(Protocol):
    def enqueue_job(
        self,
        db: Session,
        *,
        tenant_id: int,
        job_type: str,
        status: str,
        max_attempts: int | None = None,
    ) -> ProvisioningJob: ...

    def list_pending_jobs(
        self,
        db: Session,
        *,
        limit: int,
        job_types: list[str] | None = None,
        priority_order: list[str] | None = None,
    ) -> list[ProvisioningJob]: ...

    def finalize_job(
        self,
        *,
        job: ProvisioningJob,
    ) -> None: ...

    def describe(self) -> str: ...

    def list_dead_letter_jobs(
        self,
        db: Session,
        *,
        limit: int,
        job_type: str | None = None,
        tenant_slug: str | None = None,
        error_code: str | None = None,
        error_contains: str | None = None,
    ) -> list[dict]: ...

    def requeue_dead_letter_job(
        self,
        db: Session,
        *,
        job_id: int,
        due_at: datetime | None = None,
    ) -> ProvisioningJob | None: ...


class DatabaseProvisioningDispatchBackend:
    def __init__(
        self,
        provisioning_job_service: ProvisioningJobService | None = None,
    ):
        self.provisioning_job_service = (
            provisioning_job_service or ProvisioningJobService()
        )

    def enqueue_job(
        self,
        db: Session,
        *,
        tenant_id: int,
        job_type: str,
        status: str,
        max_attempts: int | None = None,
    ) -> ProvisioningJob:
        kwargs = {
            "db": db,
            "tenant_id": tenant_id,
            "job_type": job_type,
            "status": status,
        }
        if max_attempts is not None:
            kwargs["max_attempts"] = max_attempts
        return self.provisioning_job_service.create_job(**kwargs)

    def list_pending_jobs(
        self,
        db: Session,
        *,
        limit: int,
        job_types: list[str] | None = None,
        priority_order: list[str] | None = None,
        ) -> list[ProvisioningJob]:
        return self.provisioning_job_service.list_pending_jobs(
            db=db,
            limit=limit,
            job_types=job_types,
            priority_order=priority_order,
        )

    def finalize_job(
        self,
        *,
        job: ProvisioningJob,
    ) -> None:
        return None

    def describe(self) -> str:
        return "database"

    def list_dead_letter_jobs(
        self,
        db: Session,
        *,
        limit: int,
        job_type: str | None = None,
        tenant_slug: str | None = None,
        error_code: str | None = None,
        error_contains: str | None = None,
    ) -> list[dict]:
        return []

    def requeue_dead_letter_job(
        self,
        db: Session,
        *,
        job_id: int,
        due_at: datetime | None = None,
    ) -> ProvisioningJob | None:
        return None


class BrokerProvisioningDispatchBackend:
    def __init__(
        self,
        provisioning_job_service: ProvisioningJobService | None = None,
        provisioning_job_repository: ProvisioningJobRepository | None = None,
        redis_client_service: RedisClientService | None = None,
        logging_service: LoggingService | None = None,
        broker_url: str | None = None,
        key_prefix: str | None = None,
        processing_lease_seconds: int | None = None,
        dlq_retention_seconds: int | None = None,
    ):
        self.provisioning_job_service = (
            provisioning_job_service or ProvisioningJobService()
        )
        self.provisioning_job_repository = (
            provisioning_job_repository or ProvisioningJobRepository()
        )
        self.redis_client_service = redis_client_service or RedisClientService()
        self.logging_service = logging_service or LoggingService(
            logger_name="platform_paas.ops"
        )
        self.broker_url = (
            broker_url or settings.PROVISIONING_BROKER_URL or settings.REDIS_URL
        ).strip()
        self.key_prefix = (
            key_prefix
            or settings.PROVISIONING_BROKER_KEY_PREFIX
            or "platform_paas:provisioning_broker"
        ).strip()
        self.processing_lease_seconds = max(
            processing_lease_seconds
            or settings.PROVISIONING_BROKER_PROCESSING_LEASE_SECONDS,
            1,
        )
        self.dlq_retention_seconds = max(
            dlq_retention_seconds
            or settings.PROVISIONING_BROKER_DLQ_RETENTION_SECONDS,
            0,
        )

    def enqueue_job(
        self,
        db: Session,
        *,
        tenant_id: int,
        job_type: str,
        status: str,
        max_attempts: int | None = None,
    ) -> ProvisioningJob:
        kwargs = {
            "db": db,
            "tenant_id": tenant_id,
            "job_type": job_type,
            "status": status,
        }
        if max_attempts is not None:
            kwargs["max_attempts"] = max_attempts
        job = self.provisioning_job_service.create_job(**kwargs)
        self._register_job_type(job.job_type)
        self._schedule_ready_job(
            job_type=job.job_type,
            job_id=job.id,
        )
        return job

    def list_pending_jobs(
        self,
        db: Session,
        *,
        limit: int,
        job_types: list[str] | None = None,
        priority_order: list[str] | None = None,
    ) -> list[ProvisioningJob]:
        claimed_jobs = self._claim_due_job_ids(
            limit=limit,
            job_types=job_types,
            priority_order=priority_order,
        )
        if not claimed_jobs:
            return []

        ordered_job_ids = [job_id for _, job_id in claimed_jobs]
        rows = self.provisioning_job_repository.list_by_ids(db, ordered_job_ids)
        rows_by_id = {row.id: row for row in rows}
        valid_jobs: list[ProvisioningJob] = []
        now = datetime.now(timezone.utc)

        for claimed_job_type, job_id in claimed_jobs:
            job = rows_by_id.get(job_id)
            if job is None:
                self._discard_job(claimed_job_type, job_id)
                continue

            if job.status not in {"pending", "retry_pending"}:
                self._discard_job(claimed_job_type, job_id)
                continue

            if (
                job.next_retry_at is not None
                and job.next_retry_at > now
            ):
                self._reschedule_job(
                    claimed_job_type,
                    job_id,
                    job.next_retry_at,
                )
                continue

            valid_jobs.append(job)

        return valid_jobs

    def finalize_job(
        self,
        *,
        job: ProvisioningJob,
    ) -> None:
        if job.status == "retry_pending" and job.next_retry_at is not None:
            self._reschedule_job(job.job_type, job.id, job.next_retry_at)
            return

        if job.status == "failed":
            self._move_job_to_dlq(job)
            return

        self._discard_job(job.job_type, job.id)

    def describe(self) -> str:
        return "broker"

    def list_dead_letter_jobs(
        self,
        db: Session,
        *,
        limit: int,
        job_type: str | None = None,
        tenant_slug: str | None = None,
        error_code: str | None = None,
        error_contains: str | None = None,
    ) -> list[dict]:
        if limit <= 0:
            return []

        job_types = [job_type] if job_type else self._resolve_candidate_job_types(None)
        self._prune_dead_letter_jobs(job_types)
        candidates: list[tuple[float, str, int]] = []
        client = self._redis_client()
        for current_job_type in job_types:
            rows = client.zrangebyscore(
                self._dlq_key(current_job_type),
                min="-inf",
                max="+inf",
                withscores=True,
            )
            for raw_job_id, score in rows:
                candidates.append((float(score), current_job_type, int(raw_job_id)))

        candidates.sort(key=lambda item: (-item[0], item[2]))
        selected = candidates[:limit]
        rows = self.provisioning_job_repository.list_by_ids(
            db,
            [job_id for _, _, job_id in selected],
        )
        rows_by_id = {row.id: row for row in rows}
        result: list[dict] = []
        normalized_error_code = (error_code or "").strip().lower()
        normalized_error_contains = (error_contains or "").strip().lower()
        for score, current_job_type, job_id in selected:
            job = rows_by_id.get(job_id)
            if job is None:
                self._remove_from_dlq(current_job_type, job_id)
                continue
            if tenant_slug and getattr(getattr(job, "tenant", None), "slug", None) != tenant_slug:
                continue
            if normalized_error_code:
                current_error_code = (getattr(job, "error_code", None) or "").lower()
                if normalized_error_code != current_error_code:
                    continue
            if normalized_error_contains:
                error_message = (getattr(job, "error_message", None) or "").lower()
                if normalized_error_contains not in error_message:
                    continue
            result.append(
                {
                    "job": job,
                    "recorded_at": datetime.fromtimestamp(score, tz=timezone.utc),
                    "job_type": current_job_type,
                }
            )
        return result

    def requeue_dead_letter_job(
        self,
        db: Session,
        *,
        job_id: int,
        due_at: datetime | None = None,
    ) -> ProvisioningJob | None:
        job = self.provisioning_job_repository.get_by_id(db, job_id)
        if job is None:
            return None

        self._prune_dead_letter_jobs([job.job_type])
        if self._remove_from_dlq(job.job_type, job.id):
            self._schedule_ready_job(
                job_type=job.job_type,
                job_id=job.id,
                due_at=due_at,
            )
            self.logging_service.log_provisioning_broker_dlq_event(
                action="requeue",
                job_id=job.id,
                job_type=job.job_type,
                tenant_id=getattr(job, "tenant_id", None),
                tenant_slug=getattr(getattr(job, "tenant", None), "slug", None),
                detail=(due_at.isoformat() if due_at is not None else None),
            )
        return job

    def _claim_due_job_ids(
        self,
        *,
        limit: int,
        job_types: list[str] | None,
        priority_order: list[str] | None,
    ) -> list[tuple[str, int]]:
        if limit <= 0:
            return []

        now = self._now_timestamp()
        candidate_job_types = self._resolve_candidate_job_types(job_types)
        if not candidate_job_types:
            return []

        priority_index = {
            job_type: index
            for index, job_type in enumerate(priority_order or [])
        }
        candidates: list[tuple[float, int, int, str]] = []
        client = self._redis_client()

        for job_type in candidate_job_types:
            self._reclaim_expired_jobs(job_type, now)
            ready_key = self._ready_key(job_type)
            rows = client.zrangebyscore(
                ready_key,
                min="-inf",
                max=now,
                start=0,
                num=limit,
                withscores=True,
            )
            for raw_job_id, due_score in rows:
                candidates.append(
                    (
                        float(due_score),
                        priority_index.get(job_type, len(priority_index)),
                        int(raw_job_id),
                        job_type,
                    )
                )

        candidates.sort(key=lambda item: (item[0], item[1], item[2]))
        selected: list[tuple[str, int]] = []
        lease_until = now + self.processing_lease_seconds
        for _, _, job_id, job_type in candidates:
            if len(selected) >= limit:
                break
            ready_key = self._ready_key(job_type)
            processing_key = self._processing_key(job_type)
            if client.zrem(ready_key, job_id):
                client.zadd(processing_key, {job_id: lease_until})
                selected.append((job_type, job_id))
        return selected

    def _resolve_candidate_job_types(
        self,
        job_types: list[str] | None,
    ) -> list[str]:
        if job_types:
            return [job_type.strip() for job_type in job_types if job_type.strip()]

        raw_values = self._redis_client().smembers(self._job_types_key())
        return sorted(str(value) for value in raw_values if str(value).strip())

    def _register_job_type(self, job_type: str) -> None:
        self._redis_client().sadd(self._job_types_key(), job_type)

    def _schedule_ready_job(
        self,
        *,
        job_type: str,
        job_id: int,
        due_at: datetime | None = None,
    ) -> None:
        client = self._redis_client()
        self._register_job_type(job_type)
        client.zadd(
            self._ready_key(job_type),
            {job_id: self._score_for_datetime(due_at)},
        )

    def _reschedule_job(
        self,
        job_type: str,
        job_id: int,
        due_at: datetime,
    ) -> None:
        client = self._redis_client()
        client.zrem(self._processing_key(job_type), job_id)
        self._schedule_ready_job(
            job_type=job_type,
            job_id=job_id,
            due_at=due_at,
        )

    def _discard_job(
        self,
        job_type: str,
        job_id: int,
    ) -> None:
        client = self._redis_client()
        client.zrem(self._processing_key(job_type), job_id)
        client.zrem(self._ready_key(job_type), job_id)
        client.zrem(self._dlq_key(job_type), job_id)

    def _reclaim_expired_jobs(
        self,
        job_type: str,
        now_timestamp: int,
    ) -> None:
        client = self._redis_client()
        processing_key = self._processing_key(job_type)
        expired_job_ids = client.zrangebyscore(
            processing_key,
            min="-inf",
            max=now_timestamp,
        )
        for raw_job_id in expired_job_ids:
            job_id = int(raw_job_id)
            if client.zrem(processing_key, job_id):
                client.zadd(
                    self._ready_key(job_type),
                    {job_id: now_timestamp},
                )

    def _job_types_key(self) -> str:
        return f"{self.key_prefix}:job_types"

    def _ready_key(self, job_type: str) -> str:
        return f"{self.key_prefix}:ready:{job_type}"

    def _processing_key(self, job_type: str) -> str:
        return f"{self.key_prefix}:processing:{job_type}"

    def _dlq_key(self, job_type: str) -> str:
        return f"{self.key_prefix}:dlq:{job_type}"

    def _score_for_datetime(self, due_at: datetime | None) -> float:
        if due_at is None:
            return float(self._now_timestamp())
        if due_at.tzinfo is None:
            due_at = due_at.replace(tzinfo=timezone.utc)
        return due_at.timestamp()

    def _now_timestamp(self) -> int:
        return int(datetime.now(timezone.utc).timestamp())

    def _redis_client(self):
        return self.redis_client_service.get_client(url=self.broker_url)

    def _move_job_to_dlq(self, job: ProvisioningJob) -> None:
        self._prune_dead_letter_jobs([job.job_type])
        client = self._redis_client()
        client.zrem(self._processing_key(job.job_type), job.id)
        client.zrem(self._ready_key(job.job_type), job.id)
        client.zadd(
            self._dlq_key(job.job_type),
            {job.id: float(self._now_timestamp())},
        )
        self.logging_service.log_provisioning_broker_dlq_event(
            action="dead_letter",
            job_id=job.id,
            job_type=job.job_type,
            tenant_id=getattr(job, "tenant_id", None),
            tenant_slug=getattr(getattr(job, "tenant", None), "slug", None),
            detail=getattr(job, "error_message", None),
        )

    def _remove_from_dlq(self, job_type: str, job_id: int) -> bool:
        return bool(self._redis_client().zrem(self._dlq_key(job_type), job_id))

    def _prune_dead_letter_jobs(self, job_types: list[str]) -> int:
        if self.dlq_retention_seconds <= 0:
            return 0

        expired_before = float(
            self._now_timestamp() - self.dlq_retention_seconds
        )
        removed = 0
        client = self._redis_client()
        for job_type in job_types:
            expired_job_ids = client.zrangebyscore(
                self._dlq_key(job_type),
                min="-inf",
                max=expired_before,
            )
            for raw_job_id in expired_job_ids:
                job_id = int(raw_job_id)
                if client.zrem(self._dlq_key(job_type), job_id):
                    removed += 1
                    self.logging_service.log_provisioning_broker_dlq_event(
                        action="expire",
                        job_id=job_id,
                        job_type=job_type,
                        detail=f"retention_seconds={self.dlq_retention_seconds}",
                    )
        return removed


class ProvisioningDispatchService:
    def __init__(
        self,
        *,
        backend_name: str | None = None,
        provisioning_job_service: ProvisioningJobService | None = None,
        provisioning_job_repository: ProvisioningJobRepository | None = None,
        database_backend: DatabaseProvisioningDispatchBackend | None = None,
        broker_backend: BrokerProvisioningDispatchBackend | None = None,
    ):
        self.backend_name = (
            (backend_name or settings.PROVISIONING_DISPATCH_BACKEND).strip().lower()
            or "database"
        )
        self.database_backend = database_backend or DatabaseProvisioningDispatchBackend(
            provisioning_job_service=provisioning_job_service
        )
        self.broker_backend = broker_backend or BrokerProvisioningDispatchBackend(
            provisioning_job_service=provisioning_job_service,
            provisioning_job_repository=provisioning_job_repository,
        )

    def enqueue_job(
        self,
        db: Session,
        *,
        tenant_id: int,
        job_type: str,
        status: str = "pending",
        max_attempts: int | None = None,
    ) -> ProvisioningJob:
        return self._resolve_backend().enqueue_job(
            db,
            tenant_id=tenant_id,
            job_type=job_type,
            status=status,
            max_attempts=max_attempts,
        )

    def list_pending_jobs(
        self,
        db: Session,
        *,
        limit: int,
        job_types: list[str] | None = None,
        priority_order: list[str] | None = None,
    ) -> list[ProvisioningJob]:
        return self._resolve_backend().list_pending_jobs(
            db,
            limit=limit,
            job_types=job_types,
            priority_order=priority_order,
        )

    def describe_backend(self) -> str:
        return self._resolve_backend().describe()

    def finalize_job(
        self,
        *,
        job: ProvisioningJob,
    ) -> None:
        self._resolve_backend().finalize_job(job=job)

    def list_dead_letter_jobs(
        self,
        db: Session,
        *,
        limit: int,
        job_type: str | None = None,
        tenant_slug: str | None = None,
        error_code: str | None = None,
        error_contains: str | None = None,
    ) -> list[dict]:
        return self._resolve_backend().list_dead_letter_jobs(
            db,
            limit=limit,
            job_type=job_type,
            tenant_slug=tenant_slug,
            error_code=error_code,
            error_contains=error_contains,
        )

    def requeue_dead_letter_job(
        self,
        db: Session,
        *,
        job_id: int,
        due_at: datetime | None = None,
    ) -> ProvisioningJob | None:
        return self._resolve_backend().requeue_dead_letter_job(
            db,
            job_id=job_id,
            due_at=due_at,
        )

    def _resolve_backend(self) -> ProvisioningDispatchBackend:
        if self.backend_name == "database":
            return self.database_backend
        if self.backend_name == "broker":
            return self.broker_backend
        raise ValueError(f"Unknown provisioning dispatch backend: {self.backend_name}")
