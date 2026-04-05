import re

from sqlalchemy.orm import Session

from app.apps.tenant_modules.business_core.models import (
    BusinessFunctionProfile,
    BusinessTaskType,
    BusinessTaskTypeFunctionProfile,
    BusinessWorkGroupMember,
)

_ALLOWED_PROFILES_PATTERN = re.compile(
    r"(?:^|\n)\s*(?:profiles|compat_profiles)\s*:\s*([^\n]+)",
    re.IGNORECASE,
)


def normalize_capability_token(value: str | None) -> str:
    if not value:
        return ""
    normalized = re.sub(r"[^a-z0-9]+", "_", value.strip().lower())
    return normalized.strip("_")


def parse_task_type_allowed_profile_names(description: str | None) -> list[str]:
    if not description:
        return []
    match = _ALLOWED_PROFILES_PATTERN.search(description)
    if match is None:
        return []
    return [item.strip() for item in match.group(1).split(",") if item.strip()]


def get_task_type_assignment_rule(
    tenant_db: Session,
    task_type_id: int | None,
) -> dict | None:
    if task_type_id is None:
        return None
    task_type = (
        tenant_db.query(BusinessTaskType)
        .filter(BusinessTaskType.id == task_type_id)
        .first()
    )
    if task_type is None:
        return None
    compatible_profiles = []
    try:
        compatible_profiles = (
            tenant_db.query(BusinessFunctionProfile)
            .join(
                BusinessTaskTypeFunctionProfile,
                BusinessTaskTypeFunctionProfile.function_profile_id == BusinessFunctionProfile.id,
            )
            .filter(BusinessTaskTypeFunctionProfile.task_type_id == task_type_id)
            .order_by(BusinessFunctionProfile.sort_order.asc(), BusinessFunctionProfile.name.asc())
            .all()
        )
    except AttributeError:
        compatible_profiles = []
    allowed_profile_names = [item.name for item in compatible_profiles]
    if not allowed_profile_names:
        allowed_profile_names = parse_task_type_allowed_profile_names(
            getattr(task_type, "description", None)
        )
    return {
        "task_type": task_type,
        "allowed_profile_names": allowed_profile_names,
        "allowed_profile_tokens": {
            normalize_capability_token(item) for item in allowed_profile_names if item.strip()
        },
    }


def validate_membership_task_type_capability(
    tenant_db: Session,
    *,
    task_type_id: int | None,
    membership: BusinessWorkGroupMember | None,
) -> None:
    if task_type_id is None or membership is None:
        return

    rule = get_task_type_assignment_rule(tenant_db, task_type_id)
    if rule is None:
        return

    task_type = rule["task_type"]
    allowed_profile_names: list[str] = rule["allowed_profile_names"]
    allowed_profile_tokens: set[str] = rule["allowed_profile_tokens"]

    function_profile_id = getattr(membership, "function_profile_id", None)
    if function_profile_id is None:
        if allowed_profile_names:
            raise ValueError(
                f'El tipo de tarea "{task_type.name}" solo permite perfiles funcionales compatibles: {", ".join(allowed_profile_names)}. El tecnico responsable debe tener uno declarado en el grupo responsable'
            )
        raise ValueError(
            f'El tipo de tarea "{task_type.name}" exige compatibilidad de perfil funcional y el tecnico responsable debe tener un perfil funcional declarado en el grupo responsable'
        )

    if not allowed_profile_tokens:
        return

    profile = (
        tenant_db.query(BusinessFunctionProfile)
        .filter(BusinessFunctionProfile.id == function_profile_id)
        .first()
    )
    if profile is None:
        raise ValueError(
            f'El tipo de tarea "{task_type.name}" requiere un perfil funcional compatible y el perfil asociado ya no existe en el catálogo'
        )

    profile_tokens = {
        normalize_capability_token(getattr(profile, "name", None)),
        normalize_capability_token(getattr(profile, "code", None)),
    }
    profile_tokens.discard("")
    if profile_tokens.isdisjoint(allowed_profile_tokens):
        raise ValueError(
            f'El tipo de tarea "{task_type.name}" solo permite perfiles funcionales compatibles: {", ".join(allowed_profile_names)}'
        )