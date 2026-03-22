import os
import unittest

from starlette.requests import Request

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"

from app.common.exceptions.handlers import _build_error_response  # noqa: E402


class ErrorHandlingTestCase(unittest.TestCase):
    def _request(self) -> Request:
        request = Request(
            {
                "type": "http",
                "method": "GET",
                "path": "/test",
                "headers": [],
                "query_string": b"",
                "scheme": "http",
                "server": ("testserver", 80),
                "client": ("127.0.0.1", 1234),
            }
        )
        request.state.request_id = "req-123"
        return request

    def test_http_error_payload_includes_request_id(self) -> None:
        response = _build_error_response(
            request=self._request(),
            status_code=403,
            detail="Forbidden test",
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn(b'"request_id":"req-123"', response.body)
        self.assertIn(b'"detail":"Forbidden test"', response.body)

    def test_validation_error_payload_includes_errors(self) -> None:
        response = _build_error_response(
            request=self._request(),
            status_code=422,
            detail="Request validation failed",
            errors=[{"loc": ["body"], "msg": "Field required"}],
        )

        self.assertEqual(response.status_code, 422)
        self.assertIn(b'"errors":[', response.body)
        self.assertIn(b'"request_id":"req-123"', response.body)

    def test_unhandled_error_payload_includes_error_type(self) -> None:
        response = _build_error_response(
            request=self._request(),
            status_code=500,
            detail="Internal server error",
            error_type="RuntimeError",
        )

        self.assertEqual(response.status_code, 500)
        self.assertIn(b'"error_type":"RuntimeError"', response.body)
        self.assertIn(b'"request_id":"req-123"', response.body)


if __name__ == "__main__":
    unittest.main()
