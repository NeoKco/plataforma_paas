import argparse

from app.common.db.migration_service import run_tenant_migrations


def main() -> None:
    parser = argparse.ArgumentParser(description="Run tenant database migrations.")
    parser.add_argument("--host", required=True)
    parser.add_argument("--port", type=int, default=5432)
    parser.add_argument("--database", required=True)
    parser.add_argument("--username", required=True)
    parser.add_argument("--password", required=True)
    args = parser.parse_args()

    applied = run_tenant_migrations(
        host=args.host,
        port=args.port,
        database=args.database,
        username=args.username,
        password=args.password,
    )
    if applied:
        print(f"Applied tenant migrations: {', '.join(applied)}")
    else:
        print("No pending tenant migrations.")


if __name__ == "__main__":
    main()
