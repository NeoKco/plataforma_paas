from app.common.db.migration_service import run_control_migrations


def main() -> None:
    applied = run_control_migrations()
    if applied:
        print(f"Control database migrations applied: {', '.join(applied)}")
    else:
        print("Control database already up to date.")


if __name__ == "__main__":
    main()
