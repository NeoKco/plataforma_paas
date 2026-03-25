from fastapi import APIRouter, HTTPException

from app.apps.installer.schemas import InstallRequest, InstallResponse
from app.apps.installer.services.installer_service import InstallerService
from app.bootstrap.install_checker import is_platform_installed

router = APIRouter(prefix="/install", tags=["installer"])


@router.get("/", response_model=InstallResponse)
def installer_status() -> InstallResponse:
    if is_platform_installed():
        return InstallResponse(
            success=True,
            message="Platform already installed",
        )

    return InstallResponse(
        success=True,
        message="Installer available",
    )


@router.post("/setup", response_model=InstallResponse)
def run_installation(payload: InstallRequest) -> InstallResponse:
    if is_platform_installed():
        raise HTTPException(status_code=400, detail="Platform already installed")

    try:
        service = InstallerService()
        result = service.run_installation(payload)
        return InstallResponse(
            success=True,
            message="Platform installed successfully",
            initial_superadmin_email=result["initial_superadmin_email"],
            recovery_key=result["recovery_key"],
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
