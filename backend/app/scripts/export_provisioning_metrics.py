from app.apps.platform_control.services.provisioning_metrics_export_service import (
    ProvisioningMetricsExportService,
)
from app.common.db.control_database import ControlSessionLocal


def main() -> int:
    db = ControlSessionLocal()
    try:
        service = ProvisioningMetricsExportService()
        exported = service.export_current_summary(db)
        print(f"Provisioning metrics exported for {exported} tenant(s)")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
