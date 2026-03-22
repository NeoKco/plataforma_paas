import json
import os
import socket
import subprocess
import sys
import time
import unittest
import urllib.error
import urllib.request
from pathlib import Path

os.environ["DEBUG"] = "true"
os.environ["APP_ENV"] = "test"


class HttpSmokeTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.backend_dir = Path(__file__).resolve().parents[2]
        cls.port = cls._find_free_port()
        env = os.environ.copy()
        env["DEBUG"] = "true"
        env["APP_ENV"] = "test"

        cls.server = subprocess.Popen(
            [
                sys.executable,
                "-m",
                "uvicorn",
                "app.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                str(cls.port),
            ],
            cwd=cls.backend_dir,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
        cls.base_url = f"http://127.0.0.1:{cls.port}"
        cls._wait_until_ready()

    @classmethod
    def tearDownClass(cls) -> None:
        if getattr(cls, "server", None) is not None:
            cls.server.terminate()
            try:
                cls.server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                cls.server.kill()
                cls.server.wait(timeout=5)

    @classmethod
    def _find_free_port(cls) -> int:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.bind(("127.0.0.1", 0))
            return int(sock.getsockname()[1])

    @classmethod
    def _wait_until_ready(cls) -> None:
        deadline = time.time() + 10
        last_error = None

        while time.time() < deadline:
            try:
                response = cls._request("/health")
                if response["status_code"] == 200:
                    return
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                time.sleep(0.2)

        output = ""
        if cls.server.stdout is not None:
            try:
                output = cls.server.stdout.read()
            except Exception:  # noqa: BLE001
                output = ""

        raise RuntimeError(
            f"No fue posible iniciar el servidor de smoke tests. "
            f"Ultimo error: {last_error}. Output: {output}"
        )

    @classmethod
    def _request(
        cls,
        path: str,
        method: str = "GET",
        headers: dict | None = None,
        json_body: dict | None = None,
    ) -> dict:
        data = None
        request_headers = headers.copy() if headers else {}

        if json_body is not None:
            data = json.dumps(json_body).encode("utf-8")
            request_headers["Content-Type"] = "application/json"

        request = urllib.request.Request(
            url=f"{cls.base_url}{path}",
            data=data,
            headers=request_headers,
            method=method,
        )

        try:
            with urllib.request.urlopen(request, timeout=5) as response:
                body = response.read().decode("utf-8")
                return {
                    "status_code": response.status,
                    "json": json.loads(body) if body else None,
                    "headers": dict(response.headers.items()),
                }
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8")
            return {
                "status_code": exc.code,
                "json": json.loads(body) if body else None,
                "headers": dict(exc.headers.items()),
            }

    def test_health_endpoint_returns_healthy(self) -> None:
        response = self._request("/health")

        self.assertEqual(response["status_code"], 200)
        self.assertEqual(response["json"]["status"], "healthy")
        self.assertIn("x-request-id", response["headers"])

    def test_root_endpoint_returns_running_status(self) -> None:
        response = self._request("/")

        self.assertEqual(response["status_code"], 200)
        self.assertEqual(response["json"]["message"], "Platform backend running")

    def test_platform_route_without_token_returns_401(self) -> None:
        response = self._request("/platform/ping-db")

        self.assertEqual(response["status_code"], 401)
        self.assertFalse(response["json"]["success"])
        self.assertEqual(
            response["json"]["detail"],
            "Authorization Bearer token requerido",
        )
        self.assertTrue(response["json"]["request_id"])
        self.assertIn("x-request-id", response["headers"])

    def test_tenant_route_without_token_returns_401(self) -> None:
        response = self._request("/tenant/me")

        self.assertEqual(response["status_code"], 401)
        self.assertFalse(response["json"]["success"])
        self.assertEqual(
            response["json"]["detail"],
            "Authorization Bearer token requerido",
        )
        self.assertTrue(response["json"]["request_id"])

    def test_platform_route_with_invalid_token_returns_401(self) -> None:
        response = self._request(
            "/platform/ping-db",
            headers={"Authorization": "Bearer invalid-token"},
        )

        self.assertEqual(response["status_code"], 401)
        self.assertFalse(response["json"]["success"])
        self.assertEqual(response["json"]["detail"], "Token inválido")
        self.assertTrue(response["json"]["request_id"])

    def test_tenant_route_with_invalid_token_returns_401(self) -> None:
        response = self._request(
            "/tenant/finance/summary",
            headers={"Authorization": "Bearer invalid-token"},
        )

        self.assertEqual(response["status_code"], 401)
        self.assertFalse(response["json"]["success"])
        self.assertEqual(response["json"]["detail"], "Token inválido")
        self.assertTrue(response["json"]["request_id"])

    def test_validation_error_includes_request_id(self) -> None:
        response = self._request(
            "/platform/auth/refresh",
            method="POST",
            json_body={},
        )

        self.assertEqual(response["status_code"], 422)
        self.assertFalse(response["json"]["success"])
        self.assertEqual(response["json"]["detail"], "Request validation failed")
        self.assertTrue(response["json"]["request_id"])


if __name__ == "__main__":
    unittest.main()
