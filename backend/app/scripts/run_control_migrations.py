from app.common.db.migration_service import run_control_migrations


def main() -> None:
    applied = run_control_migrations()
    if applied:
        print(f"Applied control migrations: {', '.join(applied)}")
    else:
        print("No pending control migrations.")


if __name__ == "__main__":
    main()
