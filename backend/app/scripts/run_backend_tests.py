import argparse
import os
import sys
import unittest
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


def _ordered_unique(modules: list[str]) -> list[str]:
    return list(dict.fromkeys(modules))


FOUNDATIONAL_TEST_MODULES = [
    "app.tests.test_app_startup_flow",
    "app.tests.test_db_url_factory",
    "app.tests.test_error_handling",
    "app.tests.test_installer_root_lifecycle",
    "app.tests.test_migration_flow",
    "app.tests.test_observability",
    "app.tests.test_postgres_bootstrap_service",
    "app.tests.test_security_hardening",
]

AUTH_TEST_MODULES = [
    "app.tests.test_security_hardening",
    "app.tests.test_error_handling",
    "app.tests.test_platform_flow",
    "app.tests.test_tenant_flow",
]

TENANT_TEST_MODULES = [
    "app.tests.test_tenant_flow",
    "app.tests.test_tenant_integration_flow",
    "app.tests.test_tenant_lifecycle_integration_flow",
]

FINANCE_TEST_MODULES = [
    "app.tests.test_tenant_finance_flow",
    "app.tests.test_finance_catalog_repositories",
    "app.tests.test_finance_catalog_routes",
    "app.tests.test_finance_catalog_services",
    "app.tests.test_finance_transaction_core",
    "app.tests.test_finance_budget_core",
    "app.tests.test_finance_loan_core",
    "app.tests.test_finance_planning_core",
    "app.tests.test_finance_reports_core",
    "app.tests.test_migration_flow",
]

PROVISIONING_TEST_MODULES = [
    "app.tests.test_provisioning_worker",
    "app.tests.test_tenant_lifecycle_integration_flow",
    "app.tests.test_platform_flow",
    "app.tests.test_platform_integration_flow",
]

PLATFORM_TEST_MODULES = [
    "app.tests.test_platform_flow",
    "app.tests.test_platform_integration_flow",
    "app.tests.test_installer_root_lifecycle",
    "app.tests.test_app_startup_flow",
    "app.tests.test_postgres_bootstrap_service",
    "app.tests.test_migration_flow",
]

POSTGRES_TARGET_MODULES = {
    "tenant": ["app.tests.test_tenant_postgres_integration_flow"],
    "platform": ["app.tests.test_platform_postgres_integration_flow"],
}

TARGET_MODULES = {
    "auth": _ordered_unique(AUTH_TEST_MODULES),
    "tenant": _ordered_unique(TENANT_TEST_MODULES),
    "finance": _ordered_unique(FINANCE_TEST_MODULES),
    "provisioning": _ordered_unique(PROVISIONING_TEST_MODULES),
    "platform": _ordered_unique(PLATFORM_TEST_MODULES),
}

HTTP_SMOKE_TEST_MODULES = [
    "app.tests.test_http_smoke",
]

POSTGRES_TEST_MODULES = _ordered_unique(
    POSTGRES_TARGET_MODULES["tenant"] + POSTGRES_TARGET_MODULES["platform"]
)

BASE_TEST_MODULES = _ordered_unique(
    FOUNDATIONAL_TEST_MODULES
    + TARGET_MODULES["tenant"]
    + TARGET_MODULES["finance"]
    + TARGET_MODULES["platform"]
    + TARGET_MODULES["provisioning"]
)


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
    target: str,
    include_http_smoke: bool,
    include_postgres: bool,
) -> list[str]:
    if target == "all":
        modules = list(BASE_TEST_MODULES)
    else:
        modules = list(TARGET_MODULES[target])
        if target in {"tenant", "platform"}:
            modules = _ordered_unique(FOUNDATIONAL_TEST_MODULES + modules)

    if include_http_smoke and (target == "all" or target == "auth"):
        modules.extend(HTTP_SMOKE_TEST_MODULES)

    if include_postgres:
        if target == "all":
            modules.extend(POSTGRES_TEST_MODULES)
        elif target in POSTGRES_TARGET_MODULES:
            modules.extend(POSTGRES_TARGET_MODULES[target])

    return _ordered_unique(modules)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run backend test suites for platform_paas."
    )
    parser.add_argument(
        "--target",
        choices=("all", "auth", "tenant", "finance", "provisioning", "platform"),
        default="all",
        help=(
            "Select a backend baseline subset. `all` keeps the full baseline, "
            "while the other options focus on a specific domain."
        ),
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
        target=args.target,
        include_http_smoke=include_http_smoke,
        include_postgres=include_postgres,
    )

    print(f"Running backend test suites for target: {args.target}")
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
