from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.dependencies import (
    build_finance_requested_by,
    require_finance_manage,
    require_finance_read,
)
from app.apps.tenant_modules.finance.schemas import (
    FinanceSettingCreateRequest,
    FinanceSettingItemResponse,
    FinanceSettingMutationResponse,
    FinanceSettingsResponse,
    FinanceSettingUpdateRequest,
    FinanceStatusUpdateRequest,
)
from app.apps.tenant_modules.finance.services import FinanceSettingsService
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/finance/settings", tags=["Tenant Finance"])
settings_service = FinanceSettingsService()


def _build_setting_item(setting) -> FinanceSettingItemResponse:
    return FinanceSettingItemResponse(
        id=setting.id,
        setting_key=setting.setting_key,
        setting_value=setting.setting_value,
        is_active=setting.is_active,
        created_at=setting.created_at,
        updated_at=setting.updated_at,
    )


@router.get("", response_model=FinanceSettingsResponse)
def list_finance_settings(
    include_inactive: bool = True,
    current_user=Depends(require_finance_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceSettingsResponse:
    settings = settings_service.list_settings(
        tenant_db,
        include_inactive=include_inactive,
    )
    return FinanceSettingsResponse(
        success=True,
        message="Configuraciones financieras recuperadas correctamente",
        requested_by=build_finance_requested_by(current_user),
        total=len(settings),
        data=[_build_setting_item(item) for item in settings],
    )


@router.post("", response_model=FinanceSettingMutationResponse)
def create_finance_setting(
    payload: FinanceSettingCreateRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceSettingMutationResponse:
    try:
        setting = settings_service.create_setting(tenant_db, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceSettingMutationResponse(
        success=True,
        message="Configuracion financiera creada correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_setting_item(setting),
    )


@router.put("/{setting_id}", response_model=FinanceSettingMutationResponse)
def update_finance_setting(
    setting_id: int,
    payload: FinanceSettingUpdateRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceSettingMutationResponse:
    try:
        setting = settings_service.update_setting(tenant_db, setting_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceSettingMutationResponse(
        success=True,
        message="Configuracion financiera actualizada correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_setting_item(setting),
    )


@router.patch("/{setting_id}/status", response_model=FinanceSettingMutationResponse)
def update_finance_setting_status(
    setting_id: int,
    payload: FinanceStatusUpdateRequest,
    current_user=Depends(require_finance_manage),
    tenant_db: Session = Depends(get_tenant_db),
) -> FinanceSettingMutationResponse:
    try:
        setting = settings_service.set_setting_active(
            tenant_db,
            setting_id,
            payload.is_active,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return FinanceSettingMutationResponse(
        success=True,
        message="Estado de la configuracion financiera actualizado correctamente",
        requested_by=build_finance_requested_by(current_user),
        data=_build_setting_item(setting),
    )
