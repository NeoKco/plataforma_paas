import asyncio
import os
import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock

from starlette.requests import Request
from starlette.responses import JSONResponse

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.common.middleware.request_observability_middleware import (  # noqa: E402
    RequestObservabilityMiddleware,
)
from app.common.observability.logging_service import LoggingService  # noqa: E402


class RequestObservabilityMiddlewareTestCase(unittest.TestCase):
    def test_dispatch_preserves_incoming_request_id_and_adds_header(self) -> None:
        logging_service = MagicMock()
        middleware = RequestObservabilityMiddleware(
            app=MagicMock(),
            logging_service=logging_service,
        )
        request = Request(
            {
                "type": "http",
                "method": "GET",
                "path": "/health",
                "headers": [(b"x-request-id", b"req-123")],
                "query_string": b"",
                "scheme": "http",
                "server": ("testserver", 80),
                "client": ("127.0.0.1", 1234),
            }
        )

        async def call_next(req: Request):
            req.state.token_scope = "platform"
            req.state.platform_user_id = 1
            return JSONResponse({"status": "ok"})

        response = asyncio.run(middleware.dispatch(request, call_next))

        self.assertEqual(response.headers["X-Request-ID"], "req-123")
        logging_service.log_request_summary.assert_called_once()

    def test_dispatch_generates_request_id_when_missing(self) -> None:
        logging_service = MagicMock()
        middleware = RequestObservabilityMiddleware(
            app=MagicMock(),
            logging_service=logging_service,
        )
        request = Request(
            {
                "type": "http",
                "method": "GET",
                "path": "/tenant/me",
                "headers": [],
                "query_string": b"",
                "scheme": "http",
                "server": ("testserver", 80),
                "client": ("127.0.0.1", 1234),
            }
        )

        async def call_next(req: Request):
            req.state.token_scope = "tenant"
            req.state.tenant_user_id = 9
            req.state.tenant_slug = "empresa-bootstrap"
            return JSONResponse({"status": "ok"})

        response = asyncio.run(middleware.dispatch(request, call_next))

        self.assertTrue(response.headers["X-Request-ID"])
        logging_service.log_request_summary.assert_called_once()

    def test_dispatch_logs_exception_and_reraises(self) -> None:
        logging_service = MagicMock()
        middleware = RequestObservabilityMiddleware(
            app=MagicMock(),
            logging_service=logging_service,
        )
        request = Request(
            {
                "type": "http",
                "method": "GET",
                "path": "/boom",
                "headers": [],
                "query_string": b"",
                "scheme": "http",
                "server": ("testserver", 80),
                "client": ("127.0.0.1", 1234),
            }
        )

        async def call_next(req: Request):
            raise RuntimeError("boom")

        with self.assertRaises(RuntimeError):
            asyncio.run(middleware.dispatch(request, call_next))

        logging_service.log_request_exception.assert_called_once()


class LoggingServiceTestCase(unittest.TestCase):
    def test_log_provisioning_job_result_writes_json_payload(self) -> None:
        service = LoggingService("platform_paas.test.observability")
        service.logger = MagicMock()

        service.log_provisioning_job_result(
            job_id=1,
            tenant_id=2,
            tenant_slug="empresa-bootstrap",
            status="retry_pending",
            attempts=1,
            max_attempts=3,
            duration_ms=150,
            next_retry_at=datetime(2026, 3, 17, 12, 0, tzinfo=timezone.utc),
            error_message="boom",
        )

        service.logger.info.assert_called_once()
        payload = service.logger.info.call_args.args[0]
        self.assertIn('"event": "provisioning_job"', payload)
        self.assertIn('"tenant_slug": "empresa-bootstrap"', payload)
        self.assertIn('"status": "retry_pending"', payload)

    def test_log_provisioning_worker_cycle_writes_json_payload(self) -> None:
        service = LoggingService("platform_paas.test.observability")
        service.logger = MagicMock()

        service.log_provisioning_worker_cycle(
            worker_profile="default",
            selection_strategy="composite_score",
            eligible_jobs=5,
            backlog_aging_threshold_minutes=30,
            aged_eligible_jobs=2,
            top_eligible_job_scores=[
                {
                    "job_id": 1,
                    "total_score": 1100100,
                    "aged": True,
                }
            ],
            backlog_job_type_counts={"create_tenant_database": 4},
            backlog_tenant_type_counts={"empresa": 3},
            queued_jobs=4,
            processed_job_ids=[1, 2],
            failed_job_ids=[3],
            stopped_due_to_failure_limit=False,
            duration_ms=220,
            metrics_exported_tenants=1,
            job_types=["create_tenant_database"],
            priority_order=["create_tenant_database"],
            tenant_type_priority_order=["condos", "empresa"],
            job_type_limits={"create_tenant_database": 1},
            dynamic_job_type_limits_applied={"create_tenant_database": 2},
            tenant_type_limits={"empresa": 2},
            dynamic_tenant_type_limits_applied={"empresa": 3},
            skipped_due_to_job_type_limits=1,
            selected_job_type_counts={"create_tenant_database": 1},
            skipped_due_to_tenant_type_limits=1,
            selected_tenant_type_counts={"empresa": 2},
        )

        service.logger.info.assert_called_once()
        payload = service.logger.info.call_args.args[0]
        self.assertIn('"event": "provisioning_worker_cycle"', payload)
        self.assertIn('"worker_profile": "default"', payload)
        self.assertIn('"selection_strategy": "composite_score"', payload)
        self.assertIn('"eligible_jobs": 5', payload)
        self.assertIn('"backlog_aging_threshold_minutes": 30', payload)
        self.assertIn('"aged_eligible_jobs": 2', payload)
        self.assertIn('"top_eligible_job_scores": [{"aged": true, "job_id": 1, "total_score": 1100100}]', payload)
        self.assertIn('"backlog_job_type_counts": {"create_tenant_database": 4}', payload)
        self.assertIn('"backlog_tenant_type_counts": {"empresa": 3}', payload)
        self.assertIn('"processed_count": 2', payload)
        self.assertIn('"failed_count": 1', payload)
        self.assertIn('"metrics_exported_tenants": 1', payload)
        self.assertIn('"job_types": ["create_tenant_database"]', payload)
        self.assertIn('"priority_order": ["create_tenant_database"]', payload)
        self.assertIn('"tenant_type_priority_order": ["condos", "empresa"]', payload)
        self.assertIn('"dynamic_job_type_limits_applied": {"create_tenant_database": 2}', payload)
        self.assertIn('"dynamic_tenant_type_limits_applied": {"empresa": 3}', payload)
        self.assertIn('"skipped_due_to_job_type_limits": 1', payload)
        self.assertIn('"skipped_due_to_tenant_type_limits": 1', payload)

    def test_log_provisioning_metrics_export_error_writes_json_payload(self) -> None:
        service = LoggingService("platform_paas.test.observability")
        service.logger = MagicMock()

        service.log_provisioning_metrics_export_error(error_type="RuntimeError")

        service.logger.exception.assert_called_once()
        payload = service.logger.exception.call_args.args[0]
        self.assertIn('"event": "provisioning_metrics_export_error"', payload)
        self.assertIn('"error_type": "RuntimeError"', payload)

    def test_log_provisioning_alert_summary_writes_json_payload(self) -> None:
        service = LoggingService("platform_paas.test.observability")
        service.logger = MagicMock()

        service.log_provisioning_alert_summary(
            capture_key="capture-1",
            total_alerts=2,
            alert_codes=[
                "tenant_failed_jobs_threshold_exceeded",
                "worker_cycle_duration_threshold_exceeded",
            ],
            severities=["error", "warning"],
            tenant_slugs=["empresa-bootstrap"],
            worker_profiles=["default"],
        )

        service.logger.warning.assert_called_once()
        payload = service.logger.warning.call_args.args[0]
        self.assertIn('"event": "provisioning_alert_summary"', payload)
        self.assertIn('"capture_key": "capture-1"', payload)
        self.assertIn('"total_alerts": 2', payload)

    def test_log_provisioning_alert_persistence_error_writes_json_payload(self) -> None:
        service = LoggingService("platform_paas.test.observability")
        service.logger = MagicMock()

        service.log_provisioning_alert_persistence_error(error_type="RuntimeError")

        service.logger.exception.assert_called_once()
        payload = service.logger.exception.call_args.args[0]
        self.assertIn('"event": "provisioning_alert_persistence_error"', payload)
        self.assertIn('"error_type": "RuntimeError"', payload)


if __name__ == "__main__":
    unittest.main()
