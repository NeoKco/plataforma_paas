import argparse
import fcntl
from contextlib import contextmanager
from pathlib import Path

from app.common.config.settings import settings
from app.workers.provisioning_worker import ProvisioningWorker


@contextmanager
def worker_process_lock(lock_file_path: str):
    lock_path = Path(lock_file_path)
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    lock_handle = lock_path.open("w")

    try:
        fcntl.flock(lock_handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError as exc:
        lock_handle.close()
        raise RuntimeError(
            f"Provisioning worker already running; lock busy at {lock_file_path}",
        ) from exc

    try:
        yield
    finally:
        fcntl.flock(lock_handle.fileno(), fcntl.LOCK_UN)
        lock_handle.close()


def build_worker_lock_file_path(
    base_lock_file_path: str,
    job_types: list[str] | None = None,
    worker_profile: str | None = None,
) -> str:
    normalized: list[str] = []
    seen: set[str] = set()
    for item in job_types or []:
        value = item.strip()
        if not value or value in seen:
            continue
        seen.add(value)
        normalized.append(value)

    if not normalized and not worker_profile:
        return base_lock_file_path

    lock_path = Path(base_lock_file_path)
    suffix_parts: list[str] = []
    if worker_profile:
        suffix_parts.append(f"profile.{worker_profile.replace('/', '_').replace(' ', '_')}")
    suffix_parts.extend(
        item.replace("/", "_").replace(" ", "_") for item in sorted(normalized)
    )
    suffix = ".".join(suffix_parts)
    return str(lock_path.with_name(f"{lock_path.name}.{suffix}"))


def parse_worker_profiles(raw_profiles: str) -> dict[str, list[str]]:
    profiles: dict[str, list[str]] = {}
    if not raw_profiles.strip():
        return profiles

    for entry in raw_profiles.split(";"):
        item = entry.strip()
        if not item:
            continue
        if "=" not in item:
            raise ValueError(f"Invalid worker profile entry: {item}")

        profile_name, raw_job_types = item.split("=", 1)
        profile_name = profile_name.strip()
        if not profile_name:
            raise ValueError(f"Invalid worker profile entry: {item}")

        job_types = [
            value.strip()
            for value in raw_job_types.split(",")
            if value.strip()
        ]
        profiles[profile_name] = job_types

    return profiles


def resolve_worker_job_types(
    *,
    explicit_job_types: list[str] | None,
    worker_profile: str | None,
) -> list[str] | None:
    if explicit_job_types:
        return explicit_job_types

    if worker_profile:
        profiles = parse_worker_profiles(settings.WORKER_PROFILES)
        if worker_profile not in profiles:
            raise ValueError(f"Unknown worker profile: {worker_profile}")
        return profiles[worker_profile]

    return None


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run provisioning worker for pending platform jobs.",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Process pending jobs once and exit.",
    )
    parser.add_argument(
        "--max-jobs",
        type=int,
        default=settings.WORKER_MAX_JOBS_PER_CYCLE,
        help="Maximum number of jobs to process per cycle.",
    )
    parser.add_argument(
        "--poll-interval-seconds",
        type=int,
        default=settings.WORKER_POLL_INTERVAL_SECONDS,
        help="Polling interval when running continuously.",
    )
    parser.add_argument(
        "--max-failures",
        type=int,
        default=settings.WORKER_MAX_FAILURES_PER_CYCLE,
        help="Maximum failed jobs allowed before stopping a cycle.",
    )
    parser.add_argument(
        "--job-type",
        action="append",
        default=None,
        help="Filter pending jobs by job type. Can be used multiple times.",
    )
    parser.add_argument(
        "--profile",
        default=None,
        help="Named worker profile resolved from WORKER_PROFILES.",
    )
    args = parser.parse_args()

    worker = ProvisioningWorker()
    resolved_job_types = resolve_worker_job_types(
        explicit_job_types=args.job_type,
        worker_profile=args.profile,
    )
    lock_file_path = build_worker_lock_file_path(
        settings.WORKER_LOCK_FILE,
        resolved_job_types,
        worker_profile=args.profile,
    )

    try:
        with worker_process_lock(lock_file_path):
            if args.once:
                summary = worker.run_once_with_metrics(
                    max_jobs=args.max_jobs,
                    max_failures=args.max_failures,
                    job_types=resolved_job_types,
                    worker_profile=args.profile,
                )
                print(f"Provisioning worker summary: {summary.to_dict()}")
                return 0

            worker.run_forever(
                max_jobs=args.max_jobs,
                poll_interval_seconds=args.poll_interval_seconds,
                max_failures=args.max_failures,
                job_types=resolved_job_types,
                worker_profile=args.profile,
            )
    except (RuntimeError, ValueError) as exc:
        print(str(exc))
        return 0

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
