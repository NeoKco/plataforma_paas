import re

from sqlalchemy import (
    Column,
    DateTime,
    ForeignKey,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    UniqueConstraint,
    func,
    select,
)

MIGRATION_ID = "0029_business_task_type_function_profiles"
DESCRIPTION = "Create dedicated task type to function profile compatibility table"

metadata = MetaData()

business_task_types = Table(
    "business_task_types",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("description", Text),
)

business_function_profiles = Table(
    "business_function_profiles",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("code", String(60)),
    Column("name", String(150)),
)

business_task_type_function_profiles = Table(
    "business_task_type_function_profiles",
    metadata,
    Column("id", Integer, primary_key=True),
    Column(
        "task_type_id",
        Integer,
        ForeignKey("business_task_types.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    ),
    Column(
        "function_profile_id",
        Integer,
        ForeignKey("business_function_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    ),
    Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now(), index=True),
    UniqueConstraint(
        "task_type_id",
        "function_profile_id",
        name="uq_business_task_type_function_profile",
    ),
)

_ALLOWED_PROFILES_PATTERN = re.compile(
    r"(?:^|\n)\s*(?:profiles|compat_profiles)\s*:\s*([^\n]+)",
    re.IGNORECASE,
)


def _normalize_token(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")


def _parse_allowed_profiles(description: str | None) -> list[str]:
    if not description:
        return []
    match = _ALLOWED_PROFILES_PATTERN.search(description)
    if match is None:
        return []
    return [item.strip() for item in match.group(1).split(",") if item.strip()]


def upgrade(connection) -> None:
    business_task_type_function_profiles.create(connection, checkfirst=True)

    task_types = connection.execute(
        select(business_task_types.c.id, business_task_types.c.description)
    ).fetchall()
    profiles = connection.execute(
        select(
            business_function_profiles.c.id,
            business_function_profiles.c.code,
            business_function_profiles.c.name,
        )
    ).fetchall()

    profile_by_token = {}
    for profile in profiles:
        profile_id = profile[0]
        profile_by_token[_normalize_token(profile[1])] = profile_id
        profile_by_token[_normalize_token(profile[2])] = profile_id

    seen_pairs: set[tuple[int, int]] = set()
    for task_type_id, description in task_types:
        for profile_name in _parse_allowed_profiles(description):
            profile_id = profile_by_token.get(_normalize_token(profile_name))
            if profile_id is None:
                continue
            pair = (task_type_id, profile_id)
            if pair in seen_pairs:
                continue
            seen_pairs.add(pair)
            connection.execute(
                business_task_type_function_profiles.insert().values(
                    task_type_id=task_type_id,
                    function_profile_id=profile_id,
                )
            )


def downgrade(connection) -> None:
    business_task_type_function_profiles.drop(connection, checkfirst=True)