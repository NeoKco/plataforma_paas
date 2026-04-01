#!/usr/bin/env python3
import argparse
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


def _read_env(name: str) -> str | None:
    value = os.getenv(name)
    return value if value else None


def _request(
    base_url: str,
    path: str,
    *,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    json_body: dict[str, Any] | None = None,
    timeout: int = 15,
) -> dict[str, Any]:
    def _parse_json_body(body: str) -> Any:
        if not body:
            return None
        try:
            return json.loads(body)
        except json.JSONDecodeError:
            return None

    request_headers = dict(headers or {})
    data = None

    if json_body is not None:
        data = json.dumps(json_body).encode("utf-8")
        request_headers["Content-Type"] = "application/json"

    request = urllib.request.Request(
        url=f"{base_url.rstrip('/')}{path}",
        data=data,
        headers=request_headers,
        method=method,
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode("utf-8")
            return {
                "status_code": response.status,
                "json": _parse_json_body(body),
                "text": body,
                "headers": dict(response.headers.items()),
            }
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        return {
            "status_code": exc.code,
            "json": _parse_json_body(body),
            "text": body,
            "headers": dict(exc.headers.items()),
        }


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(message)


def _write_report(report_path: str | None, payload: dict[str, Any]) -> None:
    if not report_path:
        return

    path = Path(report_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")


def _append_check(
    report_payload: dict[str, Any],
    *,
    name: str,
    method: str,
    path: str,
    response: dict[str, Any],
    ok: bool,
    detail: str | None = None,
) -> None:
    report_payload.setdefault("checks", []).append(
        {
            "name": name,
            "method": method,
            "path": path,
            "status_code": response.get("status_code"),
            "ok": ok,
            "detail": detail,
        }
    )


def _run_with_retries(attempts: int, delay_seconds: int, callback, label: str) -> None:
    last_error: Exception | None = None

    for attempt in range(1, attempts + 1):
        try:
            callback()
            return
        except BaseException as exc:  # noqa: BLE001
            last_error = exc
            if attempt == attempts:
                break
            print(
                f"[smoke] {label} failed on attempt {attempt}/{attempts}: {exc}. "
                f"Retrying in {delay_seconds}s..."
            )
            time.sleep(delay_seconds)

    raise SystemExit(str(last_error) if last_error is not None else f"{label} failed")


def _run_base_smoke(base_url: str, timeout: int, report_payload: dict[str, Any]) -> None:
    print(f"[smoke] GET {base_url.rstrip('/')}/health")
    health = _request(base_url, "/health", timeout=timeout)
    health_payload = health["json"] or {}
    health_ok = health["status_code"] == 200 and health_payload.get("status") in {"healthy", "ok"}
    _append_check(
        report_payload,
        name="health",
        method="GET",
        path="/health",
        response=health,
        ok=health_ok,
        detail=None if health_ok else "Health endpoint did not return a healthy payload",
    )
    _require(health["status_code"] == 200, f"Healthcheck failed: {health}")
    _require(
        health_payload.get("status") in {"healthy", "ok"},
        f"Unexpected health payload: {health_payload}",
    )

    print(f"[smoke] GET {base_url.rstrip('/')}/")
    root = _request(base_url, "/", timeout=timeout)
    root_ok = root["status_code"] == 200
    _append_check(
        report_payload,
        name="root",
        method="GET",
        path="/",
        response=root,
        ok=root_ok,
        detail=None if root_ok else "Root endpoint did not return HTTP 200",
    )
    _require(root["status_code"] == 200, f"Root endpoint failed: {root}")


def _run_platform_smoke(
    base_url: str,
    timeout: int,
    email: str,
    password: str,
    report_payload: dict[str, Any],
) -> None:
    print("[smoke] POST /platform/auth/login")
    login_response = _request(
        base_url,
        "/platform/auth/login",
        method="POST",
        json_body={"email": email, "password": password},
        timeout=timeout,
    )
    login_payload = login_response["json"] or {}
    login_ok = login_response["status_code"] == 200 and bool(login_payload.get("access_token"))
    _append_check(
        report_payload,
        name="platform_login",
        method="POST",
        path="/platform/auth/login",
        response=login_response,
        ok=login_ok,
        detail=None if login_ok else "Platform login did not return an access token",
    )
    _require(
        login_response["status_code"] == 200,
        f"Platform login failed: {login_response}",
    )
    token = login_payload.get("access_token")
    _require(token, f"Platform login did not return access token: {login_payload}")

    print("[smoke] GET /platform/ping-db")
    ping_response = _request(
        base_url,
        "/platform/ping-db",
        headers={"Authorization": f"Bearer {token}"},
        timeout=timeout,
    )
    ping_payload = ping_response["json"] or {}
    ping_ok = ping_response["status_code"] == 200 and ping_payload.get("status") == "ok"
    _append_check(
        report_payload,
        name="platform_ping_db",
        method="GET",
        path="/platform/ping-db",
        response=ping_response,
        ok=ping_ok,
        detail=None if ping_ok else "Platform ping-db did not return status ok",
    )
    _require(
        ping_response["status_code"] == 200,
        f"Platform ping-db failed: {ping_response}",
    )
    _require(
        ping_payload.get("status") == "ok",
        f"Unexpected platform ping payload: {ping_payload}",
    )


def _run_tenant_smoke(
    base_url: str,
    timeout: int,
    tenant_slug: str,
    email: str,
    password: str,
    report_payload: dict[str, Any],
) -> None:
    print("[smoke] POST /tenant/auth/login")
    login_response = _request(
        base_url,
        "/tenant/auth/login",
        method="POST",
        json_body={
            "tenant_slug": tenant_slug,
            "email": email,
            "password": password,
        },
        timeout=timeout,
    )
    login_payload = login_response["json"] or {}
    login_ok = login_response["status_code"] == 200 and bool(login_payload.get("access_token"))
    _append_check(
        report_payload,
        name="tenant_login",
        method="POST",
        path="/tenant/auth/login",
        response=login_response,
        ok=login_ok,
        detail=None if login_ok else "Tenant login did not return an access token",
    )
    _require(
        login_response["status_code"] == 200,
        f"Tenant login failed: {login_response}",
    )
    token = login_payload.get("access_token")
    _require(token, f"Tenant login did not return access token: {login_payload}")

    auth_headers = {"Authorization": f"Bearer {token}"}

    print("[smoke] GET /tenant/me")
    me_response = _request(
        base_url,
        "/tenant/me",
        headers=auth_headers,
        timeout=timeout,
    )
    me_payload = me_response["json"] or {}
    me_ok = (
        me_response["status_code"] == 200
        and me_payload.get("success") is True
        and ((me_payload.get("data") or {}).get("tenant_slug") == tenant_slug)
    )
    _append_check(
        report_payload,
        name="tenant_me",
        method="GET",
        path="/tenant/me",
        response=me_response,
        ok=me_ok,
        detail=None if me_ok else "Tenant /me did not return the expected tenant slug",
    )
    _require(me_response["status_code"] == 200, f"Tenant /me failed: {me_response}")
    _require(me_payload.get("success") is True, f"Unexpected tenant /me payload: {me_payload}")
    _require(
        ((me_payload.get("data") or {}).get("tenant_slug") == tenant_slug),
        f"Unexpected tenant slug in /tenant/me: {me_payload}",
    )

    print("[smoke] GET /tenant/info")
    info_response = _request(
        base_url,
        "/tenant/info",
        headers=auth_headers,
        timeout=timeout,
    )
    info_payload = info_response["json"] or {}
    info_ok = info_response["status_code"] == 200 and info_payload.get("success") is True
    _append_check(
        report_payload,
        name="tenant_info",
        method="GET",
        path="/tenant/info",
        response=info_response,
        ok=info_ok,
        detail=None if info_ok else "Tenant /info did not return success=true",
    )
    _require(
        info_response["status_code"] == 200,
        f"Tenant /info failed: {info_response}",
    )
    _require(
        info_payload.get("success") is True,
        f"Unexpected tenant /info payload: {info_payload}",
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Run remote backend smoke checks.")
    parser.add_argument("--base-url", default=_read_env("SMOKE_BASE_URL"))
    parser.add_argument(
        "--target",
        choices=("all", "base", "platform", "tenant"),
        default=_read_env("SMOKE_TARGET") or "all",
        help="Select the remote smoke subset to run.",
    )
    parser.add_argument("--timeout", type=int, default=int(_read_env("SMOKE_TIMEOUT_SECONDS") or "15"))
    parser.add_argument(
        "--attempts",
        type=int,
        default=int(_read_env("SMOKE_ATTEMPTS") or "3"),
        help="How many times to retry the selected smoke before failing.",
    )
    parser.add_argument(
        "--retry-delay",
        type=int,
        default=int(_read_env("SMOKE_RETRY_DELAY_SECONDS") or "5"),
        help="Seconds to wait between smoke retries.",
    )
    parser.add_argument("--skip-platform", action="store_true")
    parser.add_argument("--skip-tenant", action="store_true")
    parser.add_argument("--platform-email", default=_read_env("SMOKE_PLATFORM_EMAIL"))
    parser.add_argument("--platform-password", default=_read_env("SMOKE_PLATFORM_PASSWORD"))
    parser.add_argument("--tenant-slug", default=_read_env("SMOKE_TENANT_SLUG"))
    parser.add_argument("--tenant-email", default=_read_env("SMOKE_TENANT_EMAIL"))
    parser.add_argument("--tenant-password", default=_read_env("SMOKE_TENANT_PASSWORD"))
    parser.add_argument(
        "--report-path",
        default=_read_env("SMOKE_REPORT_PATH"),
        help="Optional JSON report path for the remote smoke result.",
    )
    args = parser.parse_args()

    _require(args.base_url, "Missing smoke base URL. Use --base-url or SMOKE_BASE_URL.")
    _require(args.attempts >= 1, "--attempts must be at least 1.")
    _require(args.retry_delay >= 0, "--retry-delay must be 0 or greater.")

    run_platform = not args.skip_platform and args.target in {"all", "platform"}
    run_tenant = not args.skip_tenant and args.target in {"all", "tenant"}
    report_payload: dict[str, Any] = {
        "base_url": args.base_url,
        "target": args.target,
        "timeout": args.timeout,
        "attempts": args.attempts,
        "retry_delay": args.retry_delay,
        "run_platform": run_platform,
        "run_tenant": run_tenant,
        "status": "running",
        "checks": [],
    }

    def _execute_selected_smoke() -> None:
        report_payload["checks"] = []
        _run_base_smoke(args.base_url, args.timeout, report_payload)

        if run_platform:
            _require(
                args.platform_email and args.platform_password,
                "Missing platform smoke credentials. Use --platform-email/--platform-password or SMOKE_PLATFORM_*.",
            )
            _run_platform_smoke(
                args.base_url,
                args.timeout,
                args.platform_email,
                args.platform_password,
                report_payload,
            )
        else:
            print("[smoke] Platform auth smoke skipped")

        tenant_values = [args.tenant_slug, args.tenant_email, args.tenant_password]
        if run_tenant:
            if any(tenant_values) and not all(tenant_values):
                raise SystemExit(
                    "Incomplete tenant smoke credentials. Provide slug, email and password together."
                )
            if all(tenant_values):
                _run_tenant_smoke(
                    args.base_url,
                    args.timeout,
                    args.tenant_slug,
                    args.tenant_email,
                    args.tenant_password,
                    report_payload,
                )
            else:
                print("[smoke] Tenant auth smoke skipped because no tenant credentials were provided")
        else:
            print("[smoke] Tenant auth smoke skipped")

    try:
        _run_with_retries(
            attempts=args.attempts,
            delay_seconds=args.retry_delay,
            callback=_execute_selected_smoke,
            label=f"remote smoke target={args.target}",
        )
        report_payload["status"] = "passed"
        report_payload["checks_passed"] = sum(1 for item in report_payload["checks"] if item.get("ok"))
        report_payload["checks_failed"] = sum(1 for item in report_payload["checks"] if not item.get("ok"))
    except BaseException as exc:  # noqa: BLE001
        report_payload["status"] = "failed"
        report_payload["error"] = str(exc)
        report_payload["checks_passed"] = sum(1 for item in report_payload["checks"] if item.get("ok"))
        report_payload["checks_failed"] = sum(1 for item in report_payload["checks"] if not item.get("ok"))
        _write_report(args.report_path, report_payload)
        raise

    _write_report(args.report_path, report_payload)
    print("[smoke] Remote backend smoke completed successfully")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
