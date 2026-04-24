from app.apps.tenant_modules.techdocs.services.dossier_service import TechDocsDossierService


class TechDocsOverviewService:
    def __init__(self) -> None:
        self.dossier_service = TechDocsDossierService()

    def build_overview(self, tenant_db) -> dict:
        recent_dossiers = self.dossier_service.list_dossiers(
            tenant_db,
            include_inactive=True,
            include_archived=True,
        )[:8]
        recent_evidences = self.dossier_service.list_recent_evidences(tenant_db, limit=8)
        return {
            "metrics": self.dossier_service.build_overview_metrics(tenant_db),
            "recent_dossiers": recent_dossiers,
            "recent_evidences": recent_evidences,
        }
