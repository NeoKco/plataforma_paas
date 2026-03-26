from sqlalchemy.orm import Session

from app.apps.tenant_modules.finance.models import FinanceSetting
from app.apps.tenant_modules.finance.repositories import FinanceSettingsRepository
from app.apps.tenant_modules.finance.schemas import (
    FinanceSettingCreateRequest,
    FinanceSettingUpdateRequest,
)


class FinanceSettingsService:
    def __init__(
        self,
        settings_repository: FinanceSettingsRepository | None = None,
    ) -> None:
        self.settings_repository = settings_repository or FinanceSettingsRepository()

    def list_settings(
        self,
        tenant_db: Session,
        *,
        include_inactive: bool = True,
    ) -> list[FinanceSetting]:
        return self.settings_repository.list_all(
            tenant_db,
            include_inactive=include_inactive,
        )

    def create_setting(
        self,
        tenant_db: Session,
        payload: FinanceSettingCreateRequest,
    ) -> FinanceSetting:
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized)
        setting = FinanceSetting(**normalized)
        return self.settings_repository.save(tenant_db, setting)

    def update_setting(
        self,
        tenant_db: Session,
        setting_id: int,
        payload: FinanceSettingUpdateRequest,
    ) -> FinanceSetting:
        setting = self._get_or_raise(tenant_db, setting_id)
        normalized = self._normalize_payload(payload)
        self._validate_payload(tenant_db, normalized, current_item=setting)
        for field, value in normalized.items():
            setattr(setting, field, value)
        return self.settings_repository.save(tenant_db, setting)

    def set_setting_active(
        self,
        tenant_db: Session,
        setting_id: int,
        is_active: bool,
    ) -> FinanceSetting:
        setting = self._get_or_raise(tenant_db, setting_id)
        return self.settings_repository.set_active(tenant_db, setting, is_active)

    def _get_or_raise(self, tenant_db: Session, setting_id: int) -> FinanceSetting:
        setting = self.settings_repository.get_by_id(tenant_db, setting_id)
        if setting is None:
            raise ValueError("La configuracion financiera solicitada no existe")
        return setting

    def _normalize_payload(
        self,
        payload: FinanceSettingCreateRequest | FinanceSettingUpdateRequest,
    ) -> dict:
        return {
            "setting_key": payload.setting_key.strip(),
            "setting_value": payload.setting_value.strip(),
            "is_active": payload.is_active,
        }

    def _validate_payload(
        self,
        tenant_db: Session,
        payload: dict,
        *,
        current_item: FinanceSetting | None = None,
    ) -> None:
        if not payload["setting_key"]:
            raise ValueError("La clave de configuracion es obligatoria")
        if not payload["setting_value"]:
            raise ValueError("El valor de configuracion es obligatorio")
        existing = self.settings_repository.get_by_name(tenant_db, payload["setting_key"])
        if existing and (current_item is None or existing.id != current_item.id):
            raise ValueError("Ya existe una configuracion con esa clave")
