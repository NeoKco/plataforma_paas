#!/usr/bin/env python3
import argparse
import json
import os
import sys
import urllib.error
import urllib.request
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


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(message)


def _run_base_smoke(base_url: str, timeout: int) -> None:
    print(f"[smoke] GET {base_url.rstrip('/')}/health")
    health = _request(base_url, "/health", timeout=timeout)
    _require(health["status_code"] == 200, f"Healthcheck failed: {health}")
    health_payload = health["json"] or {}
    _require(
        health_payload.get("status") in {"healthy", "ok"},
        f"Unexpected health payload: {health_payload}",
    )

    print(f"[smoke] GET {base_url.rstrip('/')}/")
    root = _request(base_url, "/", timeout=timeout)
    _require(root["status_code"] == 200, f"Root endpoint failed: {root}")


def _run_platform_smoke(
    base_url: str,
    timeout: int,
    email: str,
    password: str,
) -> None:
    print("[smoke] POST /platform/auth/login")
    login_response = _request(
        base_url,
        "/platform/auth/login",
        method="POST",
        json_body={"email": email, "password": password},
        timeout=timeout,
    )
    _require(
        login_response["status_code"] == 200,
        f"Platform login failed: {login_response}",
    )
    payload = login_response["json"] or {}
    token = payload.get("access_token")
    _require(token, f"Platform login did not return access token: {payload}")

    print("[smoke] GET /platform/ping-db")
    ping_response = _request(
        base_url,
        "/platform/ping-db",
        headers={"Authorization": f"Bearer {token}"},
        timeout=timeout,
    )
    _require(
        ping_response["status_code"] == 200,
        f"Platform ping-db failed: {ping_response}",
    )
    ping_payload = ping_response["json"] or {}
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
    _require(
        login_response["status_code"] == 200,
        f"Tenant login failed: {login_response}",
    )
    payload = login_response["json"] or {}
    token = payload.get("access_token")
    _require(token, f"Tenant login did not return access token: {payload}")

    auth_headers = {"Authorization": f"Bearer {token}"}

    print("[smoke] GET /tenant/me")
    me_response = _request(
        base_url,
        "/tenant/me",
        headers=auth_headers,
        timeout=timeout,
    )
    _require(me_response["status_code"] == 200, f"Tenant /me failed: {me_response}")
    me_payload = me_response["json"] or {}
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
    _require(
        info_response["status_code"] == 200,
        f"Tenant /info failed: {info_response}",
    )
    info_payload = info_response["json"] or {}
    _require(
        info_payload.get("success") is True,
        f"Unexpected tenant /info payload: {info_payload}",
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Run remote backend smoke checks.")
    parser.add_argument("--base-url", default=_read_env("SMOKE_BASE_URL"))
    parser.add_argument("--timeout", type=int, default=int(_read_env("SMOKE_TIMEOUT_SECONDS") or "15"))
    parser.add_argument("--skip-platform", action="store_true")
    parser.add_argument("--skip-tenant", action="store_true")
    parser.add_argument("--platform-email", default=_read_env("SMOKE_PLATFORM_EMAIL"))
    parser.add_argument("--platform-password", default=_read_env("SMOKE_PLATFORM_PASSWORD"))
    parser.add_argument("--tenant-slug", default=_read_env("SMOKE_TENANT_SLUG"))
    parser.add_argument("--tenant-email", default=_read_env("SMOKE_TENANT_EMAIL"))
    parser.add_argument("--tenant-password", default=_read_env("SMOKE_TENANT_PASSWORD"))
    args = parser.parse_args()

    _require(args.base_url, "Missing smoke base URL. Use --base-url or SMOKE_BASE_URL.")

    _run_base_smoke(args.base_url, args.timeout)

    if not args.skip_platform:
        _require(
            args.platform_email and args.platform_password,
            "Missing platform smoke credentials. Use --platform-email/--platform-password or SMOKE_PLATFORM_*.",
        )
        _run_platform_smoke(
            args.base_url,
            args.timeout,
            args.platform_email,
            args.platform_password,
        )
    else:
        print("[smoke] Platform auth smoke skipped")

    tenant_values = [args.tenant_slug, args.tenant_email, args.tenant_password]
    if not args.skip_tenant:
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
            )
        else:
            print("[smoke] Tenant auth smoke skipped because no tenant credentials were provided")
    else:
        print("[smoke] Tenant auth smoke skipped")

    print("[smoke] Remote backend smoke completed successfully")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
