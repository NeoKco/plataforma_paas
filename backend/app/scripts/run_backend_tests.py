import argparse
import os
import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


BASE_TEST_MODULES = [
    "app.tests.test_error_handling",
    "app.tests.test_observability",
    "app.tests.test_tenant_flow",
    "app.tests.test_tenant_finance_flow",
    "app.tests.test_platform_flow",
    "app.tests.test_provisioning_worker",
    "app.tests.test_tenant_integration_flow",
    "app.tests.test_platform_integration_flow",
    "app.tests.test_migration_flow",
    "app.tests.test_security_hardening",
]

HTTP_SMOKE_TEST_MODULES = [
    "app.tests.test_http_smoke",
]

POSTGRES_TEST_MODULES = [
    "app.tests.test_tenant_postgres_integration_flow",
    "app.tests.test_platform_postgres_integration_flow",
]


def _postgres_test_configured() -> bool:
    return all(
        os.getenv(name)
        for name in (
            "PGTEST_HOST",
            "PGTEST_ADMIN_USER",
            "PGTEST_ADMIN_PASSWORD",
        )
    )


def _build_test_modules(
    include_http_smoke: bool,
    include_postgres: bool,
) -> list[str]:
    modules = list(BASE_TEST_MODULES)

    if include_http_smoke:
        modules.extend(HTTP_SMOKE_TEST_MODULES)

    if include_postgres:
        modules.extend(POSTGRES_TEST_MODULES)

    return modules


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run backend test suites for platform_paas."
    )
    parser.add_argument(
        "--skip-http-smoke",
        action="store_true",
        help="Skip HTTP smoke tests that start a temporary Uvicorn process.",
    )
    parser.add_argument(
        "--with-postgres",
        action="store_true",
        help="Force PostgreSQL integration suites. Requires PGTEST_* variables.",
    )
    parser.add_argument(
        "--skip-postgres",
        action="store_true",
        help="Skip PostgreSQL integration suites even if PGTEST_* is configured.",
    )
    args = parser.parse_args()

    postgres_configured = _postgres_test_configured()
    if args.with_postgres and not postgres_configured:
        print(
            "Cannot run PostgreSQL integration suites: PGTEST_HOST, "
            "PGTEST_ADMIN_USER and PGTEST_ADMIN_PASSWORD are required.",
            file=sys.stderr,
        )
        return 2

    include_http_smoke = not args.skip_http_smoke
    include_postgres = not args.skip_postgres and (
        args.with_postgres or postgres_configured
    )

    test_modules = _build_test_modules(
        include_http_smoke=include_http_smoke,
        include_postgres=include_postgres,
    )

    print("Running backend test suites:")
    for module in test_modules:
        print(f"- {module}")

    suite = unittest.defaultTestLoader.loadTestsFromNames(test_modules)
    result = unittest.TextTestRunner(verbosity=2).run(suite)

    if include_postgres:
        print("PostgreSQL integration suites included.")
    else:
        print("PostgreSQL integration suites skipped.")

    if include_http_smoke:
        print("HTTP smoke suite included.")
    else:
        print("HTTP smoke suite skipped.")

    return 0 if result.wasSuccessful() else 1


if __name__ == "__main__":
    raise SystemExit(main())
