import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from app.tests.fixtures import set_test_environment

set_test_environment()

from app.apps.platform_control.services.provisioning_job_service import (  # noqa: E402
    ProvisioningJobService,
)
from app.apps.provisioning.services.provisioning_service import ProvisioningService  # noqa: E402
from app.scripts.run_provisioning_worker import (  # noqa: E402
    build_worker_lock_file_path,
    parse_worker_profiles,
    resolve_worker_job_types,
)
from app.workers.provisioning_worker import ProvisioningWorker  # noqa: E402


class ProvisioningWorkerTestCase(unittest.TestCase):
    def test_provisioning_job_service_lists_pending_jobs(self) -> None:
        expected_jobs = [SimpleNamespace(id=1), SimpleNamespace(id=2)]

        class FakeRepository:
            def list_pending(self, db, limit, job_types=None, priority_order=None):
                self.calls = (db, limit, job_types, priority_order)
                return expected_jobs

        repository = FakeRepository()
        service = ProvisioningJobService(provisioning_job_repository=repository)

        result = service.list_pending_jobs(db="db-session", limit=3)

        self.assertEqual(result, expected_jobs)
        self.assertEqual(repository.calls, ("db-session", 3, None, None))

    def test_provisioning_job_service_lists_pending_jobs_filtered_by_type(self) -> None:
        expected_jobs = [SimpleNamespace(id=1, job_type="create_tenant_database")]

        class FakeRepository:
            def list_pending(self, db, limit, job_types=None, priority_order=None):
                self.calls = (db, limit, job_types, priority_order)
                return expected_jobs

        repository = FakeRepository()
        service = ProvisioningJobService(provisioning_job_repository=repository)

        result = service.list_pending_jobs(
            db="db-session",
            limit=3,
            job_types=["create_tenant_database"],
        )

        self.assertEqual(result, expected_jobs)
        self.assertEqual(
            repository.calls,
            ("db-session", 3, ["create_tenant_database"], None),
        )

    def test_provisioning_job_service_lists_pending_jobs_with_priority_order(self) -> None:
        expected_jobs = [SimpleNamespace(id=1, job_type="sync_tenant_schema")]

        class FakeRepository:
            def list_pending(self, db, limit, job_types=None, priority_order=None):
                self.calls = (db, limit, job_types, priority_order)
                return expected_jobs

        repository = FakeRepository()
        service = ProvisioningJobService(provisioning_job_repository=repository)

        result = service.list_pending_jobs(
            db="db-session",
            limit=5,
            job_types=["sync_tenant_schema", "create_tenant_database"],
            priority_order=["sync_tenant_schema", "create_tenant_database"],
        )

        self.assertEqual(result, expected_jobs)
        self.assertEqual(
            repository.calls,
            (
                "db-session",
                5,
                ["sync_tenant_schema", "create_tenant_database"],
                ["sync_tenant_schema", "create_tenant_database"],
            ),
        )

    def test_worker_processes_pending_jobs_in_order(self) -> None:
        lifecycle: list[str] = []
        processed_calls: list[int] = []

        class FakeSession:
            def __init__(self, name: str):
                self.name = name

            def close(self):
                lifecycle.append(f"close:{self.name}")

        class FakeProvisioningJobService:
            def list_pending_jobs(self, db, limit, job_types=None, priority_order=None):
                lifecycle.append(
                    f"list:{db.name}:{limit}:{job_types}:{priority_order}"
                )
                return [SimpleNamespace(id=10), SimpleNamespace(id=11)]

        class FakeProvisioningService:
            def run_job(self, db, job_id):
                processed_calls.append(job_id)
                lifecycle.append(f"run:{db.name}:{job_id}")

        class FakeProvisioningMetricsService:
            def capture_snapshot(self, db):
                lifecycle.append(f"snapshot:{db.name}")
                return [SimpleNamespace(id=1), SimpleNamespace(id=2)]

        class FakeProvisioningMetricsExportService:
            def export_current_summary(self, db):
                lifecycle.append(f"export:{db.name}")
                return 2

        counter = {"value": 0}

        def session_factory():
            counter["value"] += 1
            return FakeSession(name=f"s{counter['value']}")

        logging_service = MagicMock()
        worker = ProvisioningWorker(
            session_factory=session_factory,
            provisioning_job_service=FakeProvisioningJobService(),
            provisioning_metrics_service=FakeProvisioningMetricsService(),
            provisioning_metrics_export_service=FakeProvisioningMetricsExportService(),
            provisioning_service=FakeProvisioningService(),
            logging_service=logging_service,
        )

        with patch(
            "app.workers.provisioning_worker.settings.WORKER_SELECTION_BUFFER_MULTIPLIER",
            1,
        ):
            processed = worker.run_once(
                max_jobs=2,
                job_types=["create_tenant_database"],
                worker_profile="provisioning-default",
            )

        self.assertEqual(processed, [10, 11])
        self.assertEqual(processed_calls, [10, 11])
        self.assertEqual(
            lifecycle,
            [
                "list:s1:2:['create_tenant_database']:['create_tenant_database']",
                "close:s1",
                "run:s2:10",
                "close:s2",
                "run:s3:11",
                "close:s3",
                "snapshot:s4",
                "export:s4",
                "close:s4",
            ],
        )
        logging_service.log_provisioning_worker_cycle.assert_called_once()
        self.assertEqual(
            logging_service.log_provisioning_worker_cycle.call_args.kwargs[
                "worker_profile"
            ],
            "provisioning-default",
        )

    def test_worker_resolves_priority_order_from_settings(self) -> None:
        class FakeSession:
            def close(self):
                pass

        class FakeProvisioningJobService:
            def list_pending_jobs(self, db, limit, job_types=None, priority_order=None):
                self.calls = (limit, job_types, priority_order)
                return []

        fake_job_service = FakeProvisioningJobService()
        logging_service = MagicMock()
        worker = ProvisioningWorker(
            session_factory=FakeSession,
            provisioning_job_service=fake_job_service,
            provisioning_metrics_service=SimpleNamespace(capture_snapshot=lambda db: []),
            provisioning_metrics_export_service=SimpleNamespace(
                export_current_summary=lambda db: 0
            ),
            provisioning_service=SimpleNamespace(run_job=lambda db, job_id: None),
            logging_service=logging_service,
        )

        with patch(
            "app.workers.provisioning_worker.settings.WORKER_JOB_TYPE_PRIORITIES",
            "create_tenant_database=20;sync_tenant_schema=10",
        ):
            with patch(
                "app.workers.provisioning_worker.settings.WORKER_SELECTION_BUFFER_MULTIPLIER",
                1,
            ):
                summary = worker.run_once_with_metrics(
                    max_jobs=5,
                    job_types=["create_tenant_database", "sync_tenant_schema"],
                )

        self.assertEqual(
            fake_job_service.calls,
            (
                5,
                ["create_tenant_database", "sync_tenant_schema"],
                ["sync_tenant_schema", "create_tenant_database"],
            ),
        )
        self.assertEqual(
            summary.priority_order,
            ["sync_tenant_schema", "create_tenant_database"],
        )

    def test_worker_resolves_tenant_type_priority_from_settings(self) -> None:
        class FakeSession:
            def close(self):
                pass

        class FakeProvisioningJobService:
            def list_pending_jobs(self, db, limit, job_types=None, priority_order=None):
                return [
                    SimpleNamespace(
                        id=10,
                        job_type="create_tenant_database",
                        tenant=SimpleNamespace(tenant_type="empresa"),
                    ),
                    SimpleNamespace(
                        id=11,
                        job_type="create_tenant_database",
                        tenant=SimpleNamespace(tenant_type="condos"),
                    ),
                ]

        processed_calls: list[int] = []

        class FakeProvisioningService:
            def run_job(self, db, job_id):
                processed_calls.append(job_id)

        worker = ProvisioningWorker(
            session_factory=FakeSession,
            provisioning_job_service=FakeProvisioningJobService(),
            provisioning_metrics_service=SimpleNamespace(capture_snapshot=lambda db: []),
            provisioning_metrics_export_service=SimpleNamespace(
                export_current_summary=lambda db: 0
            ),
            provisioning_service=FakeProvisioningService(),
            logging_service=MagicMock(),
        )

        with patch(
            "app.workers.provisioning_worker.settings.WORKER_TENANT_TYPE_PRIORITIES",
            "condos=10;empresa=20",
        ), patch(
            "app.workers.provisioning_worker.settings.WORKER_SELECTION_BUFFER_MULTIPLIER",
            1,
        ):
            summary = worker.run_once_with_metrics(
                max_jobs=2,
                job_types=["create_tenant_database"],
            )

        self.assertEqual(
            summary.tenant_type_priority_order,
            ["condos", "empresa"],
        )
        self.assertEqual(summary.selection_strategy, "composite_score")
        self.assertEqual(summary.top_eligible_job_scores[0]["job_id"], 11)
        self.assertEqual(summary.processed_job_ids, [11, 10])

    def test_worker_promotes_aged_jobs_before_others(self) -> None:
        class FakeSession:
            def close(self):
                pass

        class FakeProvisioningJobService:
            def list_pending_jobs(self, db, limit, job_types=None, priority_order=None):
                now = datetime.now(timezone.utc)
                return [
                    SimpleNamespace(
                        id=10,
                        job_type="create_tenant_database",
                        tenant=SimpleNamespace(tenant_type="empresa"),
                        created_at=now,
                    ),
                    SimpleNamespace(
                        id=11,
                        job_type="create_tenant_database",
                        tenant=SimpleNamespace(tenant_type="empresa"),
                        created_at=now.replace(minute=max(now.minute - 1, 0)),
                    ),
                ]

        processed_calls: list[int] = []

        class FakeProvisioningService:
            def run_job(self, db, job_id):
                processed_calls.append(job_id)

        worker = ProvisioningWorker(
            session_factory=FakeSession,
            provisioning_job_service=FakeProvisioningJobService(),
            provisioning_metrics_service=SimpleNamespace(capture_snapshot=lambda db: []),
            provisioning_metrics_export_service=SimpleNamespace(
                export_current_summary=lambda db: 0
            ),
            provisioning_service=FakeProvisioningService(),
            logging_service=MagicMock(),
        )

        older = datetime(2026, 3, 18, 10, 0, tzinfo=timezone.utc)
        newer = datetime(2026, 3, 18, 10, 50, tzinfo=timezone.utc)
        fake_now = datetime(2026, 3, 18, 11, 0, tzinfo=timezone.utc)

        worker.provisioning_job_service = SimpleNamespace(
            list_pending_jobs=lambda db, limit, job_types=None, priority_order=None: [
                SimpleNamespace(
                    id=10,
                    job_type="create_tenant_database",
                    tenant=SimpleNamespace(tenant_type="empresa"),
                ),
                SimpleNamespace(
                    id=11,
                    job_type="create_tenant_database",
                    tenant=SimpleNamespace(tenant_type="empresa"),
                ),
            ]
        )

        worker._is_aged_job = lambda job, now, threshold: job.id == 11  # type: ignore[method-assign]
        worker._get_job_waiting_minutes = (  # type: ignore[method-assign]
            lambda job, now: 60 if job.id == 11 else 10
        )

        with patch(
            "app.workers.provisioning_worker.settings.WORKER_BACKLOG_AGING_THRESHOLD_MINUTES",
            30,
        ), patch(
            "app.workers.provisioning_worker.settings.WORKER_SELECTION_BUFFER_MULTIPLIER",
            1,
        ):
            summary = worker.run_once_with_metrics(
                max_jobs=2,
                job_types=["create_tenant_database"],
            )

        self.assertEqual(summary.backlog_aging_threshold_minutes, 30)
        self.assertEqual(summary.aged_eligible_jobs, 1)
        self.assertEqual(summary.top_eligible_job_scores[0]["job_id"], 11)
        self.assertTrue(summary.top_eligible_job_scores[0]["aged"])
        self.assertEqual(summary.processed_job_ids, [11, 10])

    def test_worker_composite_score_prefers_aged_job_over_tenant_priority(self) -> None:
        class FakeSession:
            def close(self):
                pass

        worker = ProvisioningWorker(
            session_factory=FakeSession,
            provisioning_job_service=SimpleNamespace(
                list_pending_jobs=lambda db, limit, job_types=None, priority_order=None: [
                    SimpleNamespace(
                        id=10,
                        job_type="create_tenant_database",
                        tenant=SimpleNamespace(tenant_type="condos"),
                        created_at=datetime(2026, 3, 18, 10, 55, tzinfo=timezone.utc),
                    ),
                    SimpleNamespace(
                        id=11,
                        job_type="create_tenant_database",
                        tenant=SimpleNamespace(tenant_type="empresa"),
                        created_at=datetime(2026, 3, 18, 10, 0, tzinfo=timezone.utc),
                    ),
                ]
            ),
            provisioning_metrics_service=SimpleNamespace(capture_snapshot=lambda db: []),
            provisioning_metrics_export_service=SimpleNamespace(
                export_current_summary=lambda db: 0
            ),
            provisioning_service=SimpleNamespace(run_job=lambda db, job_id: None),
            logging_service=MagicMock(),
        )

        fake_now = datetime(2026, 3, 18, 11, 0, tzinfo=timezone.utc)
        with patch(
            "app.workers.provisioning_worker.settings.WORKER_TENANT_TYPE_PRIORITIES",
            "condos=10;empresa=20",
        ), patch(
            "app.workers.provisioning_worker.settings.WORKER_BACKLOG_AGING_THRESHOLD_MINUTES",
            30,
        ), patch(
            "app.workers.provisioning_worker.datetime",
        ) as fake_datetime, patch(
            "app.workers.provisioning_worker.settings.WORKER_SELECTION_BUFFER_MULTIPLIER",
            1,
        ):
            fake_datetime.now.return_value = fake_now
            fake_datetime.side_effect = lambda *args, **kwargs: datetime(*args, **kwargs)
            summary = worker.run_once_with_metrics(
                max_jobs=2,
                job_types=["create_tenant_database"],
            )

        self.assertEqual(summary.processed_job_ids, [11, 10])
        self.assertEqual(summary.top_eligible_job_scores[0]["job_id"], 11)
        self.assertGreater(
            summary.top_eligible_job_scores[0]["total_score"],
            summary.top_eligible_job_scores[1]["total_score"],
        )

    def test_worker_applies_job_type_limits_with_backpressure(self) -> None:
        class FakeSession:
            def close(self):
                pass

        class FakeProvisioningJobService:
            def list_pending_jobs(self, db, limit, job_types=None, priority_order=None):
                self.calls = (limit, job_types, priority_order)
                return [
                    SimpleNamespace(id=10, job_type="create_tenant_database"),
                    SimpleNamespace(id=11, job_type="create_tenant_database"),
                    SimpleNamespace(id=12, job_type="sync_tenant_schema"),
                ]

        class FakeProvisioningService:
            def __init__(self):
                self.calls: list[int] = []

            def run_job(self, db, job_id):
                self.calls.append(job_id)

        fake_job_service = FakeProvisioningJobService()
        fake_provisioning_service = FakeProvisioningService()
        logging_service = MagicMock()
        worker = ProvisioningWorker(
            session_factory=FakeSession,
            provisioning_job_service=fake_job_service,
            provisioning_metrics_service=SimpleNamespace(capture_snapshot=lambda db: []),
            provisioning_metrics_export_service=SimpleNamespace(
                export_current_summary=lambda db: 0
            ),
            provisioning_service=fake_provisioning_service,
            logging_service=logging_service,
        )

        with patch(
            "app.workers.provisioning_worker.settings.WORKER_JOB_TYPE_LIMITS",
            "create_tenant_database=1;sync_tenant_schema=1",
        ), patch(
            "app.workers.provisioning_worker.settings.WORKER_SELECTION_BUFFER_MULTIPLIER",
            3,
        ):
            summary = worker.run_once_with_metrics(
                max_jobs=3,
                job_types=["create_tenant_database", "sync_tenant_schema"],
            )

        self.assertEqual(
            fake_job_service.calls,
            (
                9,
                ["create_tenant_database", "sync_tenant_schema"],
                ["create_tenant_database", "sync_tenant_schema"],
            ),
        )
        self.assertEqual(summary.eligible_jobs, 3)
        self.assertEqual(summary.queued_jobs, 2)
        self.assertEqual(summary.processed_job_ids, [10, 12])
        self.assertEqual(summary.selected_job_type_counts, {
            "create_tenant_database": 1,
            "sync_tenant_schema": 1,
        })
        self.assertEqual(summary.skipped_due_to_job_type_limits, 1)
        self.assertEqual(
            summary.job_type_limits,
            {"create_tenant_database": 1, "sync_tenant_schema": 1},
        )

    def test_worker_ignores_invalid_job_type_limits(self) -> None:
        worker = ProvisioningWorker(
            session_factory=SimpleNamespace,
            provisioning_job_service=MagicMock(),
            provisioning_metrics_service=MagicMock(),
            provisioning_metrics_export_service=MagicMock(),
            provisioning_service=MagicMock(),
            logging_service=MagicMock(),
        )

        with patch(
            "app.workers.provisioning_worker.settings.WORKER_JOB_TYPE_LIMITS",
            "create_tenant_database=bad;sync_tenant_schema=-1;repair_tenant_schema=2",
        ):
            result = worker._parse_job_type_limits()

        self.assertEqual(result, {"repair_tenant_schema": 2})

    def test_worker_applies_dynamic_backlog_limits(self) -> None:
        class FakeSession:
            def close(self):
                pass

        class FakeProvisioningJobService:
            def list_pending_jobs(self, db, limit, job_types=None, priority_order=None):
                self.calls = (limit, job_types, priority_order)
                return [
                    SimpleNamespace(id=10, job_type="create_tenant_database"),
                    SimpleNamespace(id=11, job_type="create_tenant_database"),
                    SimpleNamespace(id=12, job_type="create_tenant_database"),
                    SimpleNamespace(id=13, job_type="sync_tenant_schema"),
                ]

        class FakeProvisioningService:
            def __init__(self):
                self.calls: list[int] = []

            def run_job(self, db, job_id):
                self.calls.append(job_id)

        fake_provisioning_service = FakeProvisioningService()
        worker = ProvisioningWorker(
            session_factory=FakeSession,
            provisioning_job_service=FakeProvisioningJobService(),
            provisioning_metrics_service=SimpleNamespace(capture_snapshot=lambda db: []),
            provisioning_metrics_export_service=SimpleNamespace(
                export_current_summary=lambda db: 0
            ),
            provisioning_service=fake_provisioning_service,
            logging_service=MagicMock(),
        )

        with patch(
            "app.workers.provisioning_worker.settings.WORKER_JOB_TYPE_LIMITS",
            "create_tenant_database=1;sync_tenant_schema=1",
        ), patch(
            "app.workers.provisioning_worker.settings.WORKER_JOB_TYPE_BACKLOG_LIMITS",
            "create_tenant_database=3:2",
        ), patch(
            "app.workers.provisioning_worker.settings.WORKER_SELECTION_BUFFER_MULTIPLIER",
            3,
        ):
            summary = worker.run_once_with_metrics(
                max_jobs=3,
                job_types=["create_tenant_database", "sync_tenant_schema"],
            )

        self.assertEqual(summary.eligible_jobs, 4)
        self.assertEqual(
            summary.backlog_job_type_counts,
            {"create_tenant_database": 3, "sync_tenant_schema": 1},
        )
        self.assertEqual(
            summary.job_type_limits,
            {"create_tenant_database": 2, "sync_tenant_schema": 1},
        )
        self.assertEqual(
            summary.dynamic_job_type_limits_applied,
            {"create_tenant_database": 2},
        )
        self.assertEqual(summary.processed_job_ids, [10, 11, 13])
        self.assertEqual(summary.skipped_due_to_job_type_limits, 1)

    def test_worker_ignores_invalid_job_type_backlog_limits(self) -> None:
        worker = ProvisioningWorker(
            session_factory=SimpleNamespace,
            provisioning_job_service=MagicMock(),
            provisioning_metrics_service=MagicMock(),
            provisioning_metrics_export_service=MagicMock(),
            provisioning_service=MagicMock(),
            logging_service=MagicMock(),
        )

        with patch(
            "app.workers.provisioning_worker.settings.WORKER_JOB_TYPE_BACKLOG_LIMITS",
            (
                "create_tenant_database=bad:2;"
                "sync_tenant_schema=3:bad;"
                "repair_tenant_schema=-1:2;"
                "rebuild_tenant_indexes=5:3"
            ),
        ):
            result = worker._parse_job_type_backlog_limits()

        self.assertEqual(
            result,
            {"rebuild_tenant_indexes": {"threshold": 5, "limit": 3}},
        )

    def test_worker_applies_tenant_type_limits_with_backpressure(self) -> None:
        class FakeSession:
            def close(self):
                pass

        class FakeProvisioningJobService:
            def list_pending_jobs(self, db, limit, job_types=None, priority_order=None):
                return [
                    SimpleNamespace(
                        id=10,
                        job_type="create_tenant_database",
                        tenant=SimpleNamespace(tenant_type="empresa"),
                    ),
                    SimpleNamespace(
                        id=11,
                        job_type="create_tenant_database",
                        tenant=SimpleNamespace(tenant_type="empresa"),
                    ),
                    SimpleNamespace(
                        id=12,
                        job_type="sync_tenant_schema",
                        tenant=SimpleNamespace(tenant_type="condos"),
                    ),
                ]

        worker = ProvisioningWorker(
            session_factory=FakeSession,
            provisioning_job_service=FakeProvisioningJobService(),
            provisioning_metrics_service=SimpleNamespace(capture_snapshot=lambda db: []),
            provisioning_metrics_export_service=SimpleNamespace(
                export_current_summary=lambda db: 0
            ),
            provisioning_service=SimpleNamespace(run_job=lambda db, job_id: None),
            logging_service=MagicMock(),
        )

        with patch(
            "app.workers.provisioning_worker.settings.WORKER_TENANT_TYPE_LIMITS",
            "empresa=1;condos=1",
        ), patch(
            "app.workers.provisioning_worker.settings.WORKER_SELECTION_BUFFER_MULTIPLIER",
            3,
        ):
            summary = worker.run_once_with_metrics(
                max_jobs=3,
                job_types=["create_tenant_database", "sync_tenant_schema"],
            )

        self.assertEqual(
            summary.backlog_tenant_type_counts,
            {"empresa": 2, "condos": 1},
        )
        self.assertEqual(
            summary.tenant_type_limits,
            {"empresa": 1, "condos": 1},
        )
        self.assertEqual(
            summary.selected_tenant_type_counts,
            {"empresa": 1, "condos": 1},
        )
        self.assertEqual(summary.skipped_due_to_tenant_type_limits, 1)
        self.assertEqual(summary.processed_job_ids, [10, 12])

    def test_worker_applies_dynamic_tenant_type_backlog_limits(self) -> None:
        class FakeSession:
            def close(self):
                pass

        class FakeProvisioningJobService:
            def list_pending_jobs(self, db, limit, job_types=None, priority_order=None):
                return [
                    SimpleNamespace(
                        id=10,
                        job_type="create_tenant_database",
                        tenant=SimpleNamespace(tenant_type="empresa"),
                    ),
                    SimpleNamespace(
                        id=11,
                        job_type="create_tenant_database",
                        tenant=SimpleNamespace(tenant_type="empresa"),
                    ),
                    SimpleNamespace(
                        id=12,
                        job_type="sync_tenant_schema",
                        tenant=SimpleNamespace(tenant_type="empresa"),
                    ),
                    SimpleNamespace(
                        id=13,
                        job_type="sync_tenant_schema",
                        tenant=SimpleNamespace(tenant_type="condos"),
                    ),
                ]

        worker = ProvisioningWorker(
            session_factory=FakeSession,
            provisioning_job_service=FakeProvisioningJobService(),
            provisioning_metrics_service=SimpleNamespace(capture_snapshot=lambda db: []),
            provisioning_metrics_export_service=SimpleNamespace(
                export_current_summary=lambda db: 0
            ),
            provisioning_service=SimpleNamespace(run_job=lambda db, job_id: None),
            logging_service=MagicMock(),
        )

        with patch(
            "app.workers.provisioning_worker.settings.WORKER_TENANT_TYPE_LIMITS",
            "empresa=1;condos=1",
        ), patch(
            "app.workers.provisioning_worker.settings.WORKER_TENANT_TYPE_BACKLOG_LIMITS",
            "empresa=3:2",
        ), patch(
            "app.workers.provisioning_worker.settings.WORKER_SELECTION_BUFFER_MULTIPLIER",
            3,
        ):
            summary = worker.run_once_with_metrics(
                max_jobs=3,
                job_types=["create_tenant_database", "sync_tenant_schema"],
            )

        self.assertEqual(
            summary.backlog_tenant_type_counts,
            {"empresa": 3, "condos": 1},
        )
        self.assertEqual(
            summary.tenant_type_limits,
            {"empresa": 2, "condos": 1},
        )
        self.assertEqual(
            summary.dynamic_tenant_type_limits_applied,
            {"empresa": 2},
        )
        self.assertEqual(
            summary.selected_tenant_type_counts,
            {"empresa": 2, "condos": 1},
        )
        self.assertEqual(summary.skipped_due_to_tenant_type_limits, 1)
        self.assertEqual(summary.processed_job_ids, [10, 11, 13])

    def test_worker_ignores_invalid_tenant_type_backlog_limits(self) -> None:
        worker = ProvisioningWorker(
            session_factory=SimpleNamespace,
            provisioning_job_service=MagicMock(),
            provisioning_metrics_service=MagicMock(),
            provisioning_metrics_export_service=MagicMock(),
            provisioning_service=MagicMock(),
            logging_service=MagicMock(),
        )

        with patch(
            "app.workers.provisioning_worker.settings.WORKER_TENANT_TYPE_BACKLOG_LIMITS",
            "empresa=bad:2;condos=3:bad;iot=-1:2;retail=5:3",
        ):
            result = worker._parse_backlog_limit_mapping(
                "empresa=bad:2;condos=3:bad;iot=-1:2;retail=5:3",
            )

        self.assertEqual(result, {"retail": {"threshold": 5, "limit": 3}})

    def test_worker_returns_empty_list_when_no_jobs_pending(self) -> None:
        class FakeSession:
            def close(self):
                pass

        class FakeProvisioningJobService:
            def list_pending_jobs(self, db, limit, job_types=None, priority_order=None):
                return []

        class FakeProvisioningMetricsService:
            def capture_snapshot(self, db):
                return []

        class FakeProvisioningMetricsExportService:
            def export_current_summary(self, db):
                return 0

        worker = ProvisioningWorker(
            session_factory=FakeSession,
            provisioning_job_service=FakeProvisioningJobService(),
            provisioning_metrics_service=FakeProvisioningMetricsService(),
            provisioning_metrics_export_service=FakeProvisioningMetricsExportService(),
            provisioning_service=SimpleNamespace(run_job=lambda db, job_id: None),
            logging_service=MagicMock(),
        )

        processed = worker.run_once(max_jobs=5)

        self.assertEqual(processed, [])

    def test_worker_metrics_stop_cycle_after_failure_limit(self) -> None:
        class FakeSession:
            def close(self):
                pass

        class FakeProvisioningJobService:
            def list_pending_jobs(self, db, limit, job_types=None, priority_order=None):
                return [
                    SimpleNamespace(id=10),
                    SimpleNamespace(id=11),
                    SimpleNamespace(id=12),
                ]

        processed_calls: list[int] = []

        class FakeProvisioningService:
            def run_job(self, db, job_id):
                processed_calls.append(job_id)
                raise RuntimeError("boom")

        class FakeProvisioningMetricsService:
            def capture_snapshot(self, db):
                return [SimpleNamespace(id=1)]

        class FakeProvisioningMetricsExportService:
            def export_current_summary(self, db):
                return 1

        logging_service = MagicMock()
        worker = ProvisioningWorker(
            session_factory=FakeSession,
            provisioning_job_service=FakeProvisioningJobService(),
            provisioning_metrics_service=FakeProvisioningMetricsService(),
            provisioning_metrics_export_service=FakeProvisioningMetricsExportService(),
            provisioning_service=FakeProvisioningService(),
            logging_service=logging_service,
        )

        summary = worker.run_once_with_metrics(max_jobs=3, max_failures=2)

        self.assertEqual(summary.queued_jobs, 3)
        self.assertEqual(summary.processed_job_ids, [])
        self.assertEqual(summary.failed_job_ids, [10, 11])
        self.assertTrue(summary.stopped_due_to_failure_limit)
        self.assertEqual(processed_calls, [10, 11])
        logging_service.log_provisioning_worker_cycle.assert_called_once()

    def test_worker_continues_after_job_failure(self) -> None:
        lifecycle: list[str] = []

        class FakeSession:
            def __init__(self, name: str):
                self.name = name

            def close(self):
                lifecycle.append(f"close:{self.name}")

        class FakeProvisioningJobService:
            def list_pending_jobs(self, db, limit, job_types=None, priority_order=None):
                return [SimpleNamespace(id=10), SimpleNamespace(id=11)]

        class FakeProvisioningService:
            def run_job(self, db, job_id):
                lifecycle.append(f"run:{db.name}:{job_id}")
                if job_id == 10:
                    raise RuntimeError("boom")

        class FakeProvisioningMetricsService:
            def capture_snapshot(self, db):
                lifecycle.append(f"snapshot:{db.name}")
                return [SimpleNamespace(id=1)]

        class FakeProvisioningMetricsExportService:
            def export_current_summary(self, db):
                lifecycle.append(f"export:{db.name}")
                return 1

        counter = {"value": 0}

        def session_factory():
            counter["value"] += 1
            return FakeSession(name=f"s{counter['value']}")

        worker = ProvisioningWorker(
            session_factory=session_factory,
            provisioning_job_service=FakeProvisioningJobService(),
            provisioning_metrics_service=FakeProvisioningMetricsService(),
            provisioning_metrics_export_service=FakeProvisioningMetricsExportService(),
            provisioning_service=FakeProvisioningService(),
            logging_service=MagicMock(),
        )

        processed = worker.run_once(max_jobs=2)

        self.assertEqual(processed, [11])
        self.assertEqual(
            lifecycle,
            [
                "close:s1",
                "run:s2:10",
                "close:s2",
                "run:s3:11",
                "close:s3",
                "snapshot:s4",
                "export:s4",
                "close:s4",
            ],
        )

    def test_worker_does_not_fail_if_metrics_snapshot_capture_breaks(self) -> None:
        class FakeSession:
            def close(self):
                pass

        class FakeProvisioningJobService:
            def list_pending_jobs(self, db, limit, job_types=None, priority_order=None):
                return [SimpleNamespace(id=10)]

        class FakeProvisioningService:
            def run_job(self, db, job_id):
                return None

        class FakeProvisioningMetricsService:
            def capture_snapshot(self, db):
                raise RuntimeError("snapshot failed")

        class FakeProvisioningMetricsExportService:
            def export_current_summary(self, db):
                return 0

        logging_service = MagicMock()
        worker = ProvisioningWorker(
            session_factory=FakeSession,
            provisioning_job_service=FakeProvisioningJobService(),
            provisioning_metrics_service=FakeProvisioningMetricsService(),
            provisioning_metrics_export_service=FakeProvisioningMetricsExportService(),
            provisioning_service=FakeProvisioningService(),
            logging_service=logging_service,
        )

        result = worker.run_once_with_metrics(max_jobs=1, max_failures=1)

        self.assertEqual(result.processed_job_ids, [10])
        self.assertEqual(result.metrics_snapshot_count, 0)
        logging_service.log_provisioning_metrics_snapshot_error.assert_called_once()

    def test_worker_does_not_fail_if_metrics_export_breaks(self) -> None:
        class FakeSession:
            def close(self):
                pass

        class FakeProvisioningJobService:
            def list_pending_jobs(self, db, limit, job_types=None, priority_order=None):
                return [SimpleNamespace(id=10)]

        class FakeProvisioningService:
            def run_job(self, db, job_id):
                return None

        class FakeProvisioningMetricsService:
            def capture_snapshot(self, db):
                return [SimpleNamespace(id=1)]

        class FakeProvisioningMetricsExportService:
            def export_current_summary(self, db):
                raise RuntimeError("export failed")

        logging_service = MagicMock()
        worker = ProvisioningWorker(
            session_factory=FakeSession,
            provisioning_job_service=FakeProvisioningJobService(),
            provisioning_metrics_service=FakeProvisioningMetricsService(),
            provisioning_metrics_export_service=FakeProvisioningMetricsExportService(),
            provisioning_service=FakeProvisioningService(),
            logging_service=logging_service,
        )

        result = worker.run_once_with_metrics(max_jobs=1, max_failures=1)

        self.assertEqual(result.processed_job_ids, [10])
        self.assertEqual(result.metrics_snapshot_count, 1)
        self.assertEqual(result.metrics_exported_tenants, 0)
        logging_service.log_provisioning_metrics_export_error.assert_called_once()

    def test_worker_logs_alert_summary_when_alerts_are_detected(self) -> None:
        class FakeSession:
            def close(self):
                pass

        snapshot = SimpleNamespace(
            capture_key="capture-1",
            tenant_slug="empresa-bootstrap",
            pending_jobs=4,
            retry_pending_jobs=0,
            failed_jobs=1,
            max_attempts_seen=2,
            captured_at=datetime.now(timezone.utc),
        )
        trace = SimpleNamespace(
            capture_key="capture-1",
            worker_profile="default",
            failed_count=1,
            duration_ms=1200,
            aged_eligible_jobs=1,
            stopped_due_to_failure_limit=False,
            captured_at=datetime.now(timezone.utc),
        )

        logging_service = MagicMock()
        alert_service = MagicMock(
            evaluate_records=MagicMock(
                return_value=[
                    {
                        "alert_code": "tenant_failed_jobs_threshold_exceeded",
                        "severity": "error",
                        "tenant_slug": "empresa-bootstrap",
                        "worker_profile": None,
                    }
                ]
            )
        )
        cycle_trace_service = MagicMock(
            save_cycle_trace=MagicMock(return_value=trace)
        )

        worker = ProvisioningWorker(
            session_factory=FakeSession,
            provisioning_job_service=SimpleNamespace(
                list_pending_jobs=lambda db, limit, job_types=None, priority_order=None: [
                    SimpleNamespace(id=10)
                ]
            ),
            provisioning_metrics_service=SimpleNamespace(
                capture_snapshot=lambda db, capture_key=None: [snapshot]
            ),
            provisioning_alert_service=alert_service,
            provisioning_worker_cycle_trace_service=cycle_trace_service,
            provisioning_metrics_export_service=SimpleNamespace(
                export_current_summary=lambda db: 1
            ),
            provisioning_service=SimpleNamespace(run_job=lambda db, job_id: None),
            logging_service=logging_service,
        )

        result = worker.run_once_with_metrics(max_jobs=1, max_failures=1)

        self.assertEqual(result.processed_job_ids, [10])
        alert_service.evaluate_records.assert_called_once()
        alert_service.save_alert_history.assert_called_once()
        logging_service.log_provisioning_alert_summary.assert_called_once()

    def test_worker_does_not_fail_if_alert_persistence_breaks(self) -> None:
        class FakeSession:
            def close(self):
                pass

        snapshot = SimpleNamespace(
            capture_key="capture-1",
            tenant_slug="empresa-bootstrap",
            pending_jobs=4,
            retry_pending_jobs=0,
            failed_jobs=1,
            max_attempts_seen=2,
            captured_at=datetime.now(timezone.utc),
        )
        trace = SimpleNamespace(
            capture_key="capture-1",
            worker_profile="default",
            failed_count=1,
            duration_ms=1200,
            aged_eligible_jobs=1,
            stopped_due_to_failure_limit=False,
            captured_at=datetime.now(timezone.utc),
        )

        alert_service = MagicMock(
            evaluate_records=MagicMock(
                return_value=[
                    {
                        "alert_code": "tenant_failed_jobs_threshold_exceeded",
                        "severity": "error",
                        "tenant_slug": "empresa-bootstrap",
                        "worker_profile": None,
                    }
                ]
            ),
            save_alert_history=MagicMock(side_effect=RuntimeError("persist failed")),
        )
        logging_service = MagicMock()

        worker = ProvisioningWorker(
            session_factory=FakeSession,
            provisioning_job_service=SimpleNamespace(
                list_pending_jobs=lambda db, limit, job_types=None, priority_order=None: [
                    SimpleNamespace(id=10)
                ]
            ),
            provisioning_metrics_service=SimpleNamespace(
                capture_snapshot=lambda db, capture_key=None: [snapshot]
            ),
            provisioning_alert_service=alert_service,
            provisioning_worker_cycle_trace_service=MagicMock(
                save_cycle_trace=MagicMock(return_value=trace)
            ),
            provisioning_metrics_export_service=SimpleNamespace(
                export_current_summary=lambda db: 1
            ),
            provisioning_service=SimpleNamespace(run_job=lambda db, job_id: None),
            logging_service=logging_service,
        )

        result = worker.run_once_with_metrics(max_jobs=1, max_failures=1)

        self.assertEqual(result.processed_job_ids, [10])
        logging_service.log_provisioning_alert_persistence_error.assert_called_once()
        logging_service.log_provisioning_alert_summary.assert_called_once()

    def test_build_worker_lock_file_path_uses_job_types_suffix(self) -> None:
        result = build_worker_lock_file_path(
            "/tmp/platform_paas_worker.lock",
            ["create_tenant_database", "sync_schema"],
        )

        self.assertEqual(
            result,
            "/tmp/platform_paas_worker.lock.create_tenant_database.sync_schema",
        )

    def test_build_worker_lock_file_path_uses_profile_and_job_types(self) -> None:
        result = build_worker_lock_file_path(
            "/tmp/platform_paas_worker.lock",
            ["create_tenant_database"],
            worker_profile="default",
        )

        self.assertEqual(
            result,
            "/tmp/platform_paas_worker.lock.profile.default.create_tenant_database",
        )

    def test_parse_worker_profiles_parses_mapping(self) -> None:
        profiles = parse_worker_profiles(
            "default=create_tenant_database;sync=sync_tenant_schema,repair_tenant_schema"
        )

        self.assertEqual(
            profiles,
            {
                "default": ["create_tenant_database"],
                "sync": ["sync_tenant_schema", "repair_tenant_schema"],
            },
        )

    def test_resolve_worker_job_types_prefers_explicit_job_types(self) -> None:
        with patch(
            "app.scripts.run_provisioning_worker.settings.WORKER_PROFILES",
            "default=create_tenant_database",
        ):
            result = resolve_worker_job_types(
                explicit_job_types=["sync_tenant_schema"],
                worker_profile="default",
            )

        self.assertEqual(result, ["sync_tenant_schema"])

    def test_resolve_worker_job_types_uses_profile_when_present(self) -> None:
        with patch(
            "app.scripts.run_provisioning_worker.settings.WORKER_PROFILES",
            "default=create_tenant_database",
        ):
            result = resolve_worker_job_types(
                explicit_job_types=None,
                worker_profile="default",
            )

        self.assertEqual(result, ["create_tenant_database"])

    def test_resolve_worker_job_types_rejects_unknown_profile(self) -> None:
        with patch(
            "app.scripts.run_provisioning_worker.settings.WORKER_PROFILES",
            "default=create_tenant_database",
        ):
            with self.assertRaises(ValueError):
                resolve_worker_job_types(
                    explicit_job_types=None,
                    worker_profile="missing",
                )


class ProvisioningServiceRetryTestCase(unittest.TestCase):
    def _build_job(
        self,
        *,
        attempts: int = 0,
        max_attempts: int = 3,
        status: str = "pending",
    ):
        return SimpleNamespace(
            id=1,
            tenant_id=1,
            status=status,
            attempts=attempts,
            max_attempts=max_attempts,
            error_code=None,
            error_message=None,
            next_retry_at=None,
            last_attempt_at=None,
        )

    def _build_tenant(self):
        return SimpleNamespace(
            id=1,
            slug="empresa-bootstrap",
            name="Empresa Bootstrap",
            tenant_type="empresa",
            status="pending",
            db_name=None,
            db_user=None,
            db_host=None,
            db_port=None,
        )

    def test_run_job_schedules_retry_when_attempts_remain(self) -> None:
        job = self._build_job(attempts=0, max_attempts=3)
        tenant = self._build_tenant()
        finalized_jobs: list[tuple[str, datetime | None]] = []

        class FakeDb:
            def commit(self):
                pass

        class FakeProvisioningJobRepository:
            def get_by_id(self, db, job_id):
                return job

            def refresh(self, db, job_obj):
                return None

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                return tenant

        service = ProvisioningService(
            tenant_repository=FakeTenantRepository(),
            provisioning_job_repository=FakeProvisioningJobRepository(),
            provisioning_dispatch_service=SimpleNamespace(
                finalize_job=lambda job: finalized_jobs.append(
                    (job.status, job.next_retry_at)
                )
            ),
            tenant_secret_service=SimpleNamespace(),
            logging_service=MagicMock(),
        )

        with patch(
            "app.apps.provisioning.services.provisioning_service.PostgresBootstrapService"
        ) as bootstrap_cls:
            bootstrap_cls.return_value.create_role_if_not_exists.side_effect = RuntimeError(
                "postgres unavailable"
            )
            with self.assertRaises(RuntimeError):
                service.run_job(FakeDb(), 1)

        self.assertEqual(job.status, "retry_pending")
        self.assertEqual(job.attempts, 1)
        self.assertIsInstance(job.last_attempt_at, datetime)
        self.assertIsInstance(job.next_retry_at, datetime)
        self.assertGreater(job.next_retry_at, job.last_attempt_at)
        self.assertEqual(job.error_code, "postgres_role_bootstrap_failed")
        self.assertEqual(tenant.status, "pending")
        self.assertEqual(len(finalized_jobs), 1)
        self.assertEqual(finalized_jobs[0][0], "retry_pending")

    def test_run_job_marks_failed_when_max_attempts_reached(self) -> None:
        job = self._build_job(attempts=2, max_attempts=3)
        tenant = self._build_tenant()
        finalized_jobs: list[tuple[str, datetime | None]] = []

        class FakeDb:
            def commit(self):
                pass

        class FakeProvisioningJobRepository:
            def get_by_id(self, db, job_id):
                return job

            def refresh(self, db, job_obj):
                return None

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                return tenant

        service = ProvisioningService(
            tenant_repository=FakeTenantRepository(),
            provisioning_job_repository=FakeProvisioningJobRepository(),
            provisioning_dispatch_service=SimpleNamespace(
                finalize_job=lambda job: finalized_jobs.append(
                    (job.status, job.next_retry_at)
                )
            ),
            tenant_secret_service=SimpleNamespace(),
            logging_service=MagicMock(),
        )

        with patch(
            "app.apps.provisioning.services.provisioning_service.PostgresBootstrapService"
        ) as bootstrap_cls:
            bootstrap_cls.return_value.create_role_if_not_exists.side_effect = RuntimeError(
                "postgres unavailable"
            )
            with self.assertRaises(RuntimeError):
                service.run_job(FakeDb(), 1)

        self.assertEqual(job.status, "failed")
        self.assertEqual(job.attempts, 3)
        self.assertEqual(job.error_code, "postgres_role_bootstrap_failed")
        self.assertIsNone(job.next_retry_at)
        self.assertEqual(tenant.status, "error")
        self.assertEqual(finalized_jobs, [("failed", None)])

    def test_calculate_retry_delay_is_capped(self) -> None:
        service = ProvisioningService(
            tenant_repository=SimpleNamespace(),
            provisioning_job_repository=SimpleNamespace(),
            tenant_secret_service=SimpleNamespace(),
            logging_service=MagicMock(),
        )

        delay = service._calculate_retry_delay_seconds(10)

        self.assertGreaterEqual(delay, 1)
        self.assertLessEqual(delay, 900)

    def test_requeue_failed_job_resets_state_and_dispatches(self) -> None:
        job = self._build_job(attempts=3, max_attempts=3)
        job.status = "failed"
        job.error_code = "postgres_role_bootstrap_failed"
        job.error_message = "postgres unavailable"
        tenant = self._build_tenant()
        tenant.status = "error"
        requeued_job_ids: list[int] = []

        class FakeDb:
            def commit(self):
                pass

        class FakeProvisioningJobRepository:
            def get_by_id(self, db, job_id):
                return job

            def refresh(self, db, job_obj):
                return None

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                return tenant

        service = ProvisioningService(
            tenant_repository=FakeTenantRepository(),
            provisioning_job_repository=FakeProvisioningJobRepository(),
            provisioning_dispatch_service=SimpleNamespace(
                requeue_dead_letter_job=lambda db, job_id, due_at=None: requeued_job_ids.append(
                    (job_id, due_at)
                )
            ),
            tenant_secret_service=SimpleNamespace(),
            logging_service=MagicMock(),
        )

        result = service.requeue_failed_job(FakeDb(), 1)

        self.assertIs(result, job)
        self.assertEqual(job.status, "pending")
        self.assertEqual(job.attempts, 0)
        self.assertIsNone(job.error_code)
        self.assertIsNone(job.error_message)
        self.assertEqual(tenant.status, "pending")
        self.assertEqual(len(requeued_job_ids), 1)
        self.assertEqual(requeued_job_ids[0][0], 1)
        self.assertIsNone(requeued_job_ids[0][1])

    def test_requeue_failed_jobs_filters_and_forwards_delay(self) -> None:
        first_job = self._build_job()
        first_job.id = 1
        first_job.status = "failed"
        second_job = self._build_job()
        second_job.id = 2
        second_job.status = "failed"
        tenant = self._build_tenant()
        requeue_calls: list[tuple[int, datetime | None]] = []

        class FakeDb:
            def commit(self):
                pass

        class FakeProvisioningJobRepository:
            def get_by_id(self, db, job_id):
                return first_job if job_id == 1 else second_job

            def refresh(self, db, job_obj):
                return None

        class FakeTenantRepository:
            def get_by_id(self, db, tenant_id):
                return tenant

        class FakeProvisioningDispatchService:
            def list_dead_letter_jobs(
                self,
                db,
                *,
                limit,
                job_type,
                tenant_slug,
                error_code,
                error_contains,
            ):
                return [{"job": first_job}, {"job": second_job}]

            def requeue_dead_letter_job(self, db, job_id, due_at=None):
                requeue_calls.append((job_id, due_at))

        service = ProvisioningService(
            tenant_repository=FakeTenantRepository(),
            provisioning_job_repository=FakeProvisioningJobRepository(),
            provisioning_dispatch_service=FakeProvisioningDispatchService(),
            tenant_secret_service=SimpleNamespace(),
            logging_service=MagicMock(),
        )

        result = service.requeue_failed_jobs(
            FakeDb(),
            limit=2,
            job_type="create_tenant_database",
            tenant_slug="empresa-bootstrap",
            error_contains="postgres",
            reset_attempts=False,
            delay_seconds=30,
        )

        self.assertEqual([job.id for job in result], [1, 2])
        self.assertEqual([call[0] for call in requeue_calls], [1, 2])
        self.assertTrue(all(call[1] is not None for call in requeue_calls))


if __name__ == "__main__":
    unittest.main()
