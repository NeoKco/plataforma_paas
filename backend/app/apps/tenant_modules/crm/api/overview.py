from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.apps.tenant_modules.crm.api.serializers import build_opportunity_item, build_quote_item
from app.apps.tenant_modules.crm.dependencies import (
    build_crm_requested_by,
    require_crm_read,
)
from app.apps.tenant_modules.crm.schemas import CRMModuleOverviewResponse
from app.apps.tenant_modules.crm.services import (
    CRMOpportunityService,
    CRMOverviewService,
    CRMQuoteService,
)
from app.common.db.session_manager import get_tenant_db

router = APIRouter(prefix="/tenant/crm", tags=["Tenant CRM"])
overview_service = CRMOverviewService()
opportunity_service = CRMOpportunityService()
quote_service = CRMQuoteService()


@router.get("/overview", response_model=CRMModuleOverviewResponse)
def get_crm_module_overview(
    current_user=Depends(require_crm_read),
    tenant_db: Session = Depends(get_tenant_db),
) -> CRMModuleOverviewResponse:
    opportunity_rows = opportunity_service.list_opportunities(
        tenant_db,
        include_inactive=False,
    )[:5]
    quote_rows = quote_service.list_quotes(
        tenant_db,
        include_inactive=False,
    )[:5]
    client_display_map = quote_service.get_client_display_map(
        tenant_db,
        [item.client_id for item in opportunity_rows + quote_rows if item.client_id],
    )
    opportunity_title_map = quote_service.get_opportunity_title_map(
        tenant_db,
        [item.opportunity_id for item in quote_rows if item.opportunity_id],
    )
    line_map = quote_service.get_quote_lines(tenant_db, [item.id for item in quote_rows])
    section_map = quote_service.get_quote_sections(tenant_db, [item.id for item in quote_rows])
    section_ids = [
        section.id
        for sections in section_map.values()
        for section in sections
    ]
    section_line_map = quote_service.get_section_lines(tenant_db, section_ids)
    product_name_map = quote_service.get_product_name_map(
        tenant_db,
        [
            line.product_id
            for lines in line_map.values()
            for line in lines
            if line.product_id
        ]
        + [
            line.product_id
            for lines in section_line_map.values()
            for line in lines
            if line.product_id
        ],
    )
    return CRMModuleOverviewResponse(
        success=True,
        message="Resumen CRM recuperado correctamente",
        requested_by=build_crm_requested_by(current_user),
        metrics=overview_service.build_overview(tenant_db),
        recent_opportunities=[
            build_opportunity_item(
                item,
                client_display_name=client_display_map.get(item.client_id),
            )
            for item in opportunity_rows
        ],
        recent_quotes=[
            build_quote_item(
                item,
                client_display_name=client_display_map.get(item.client_id),
                opportunity_title=opportunity_title_map.get(item.opportunity_id),
                lines=line_map.get(item.id, []),
                sections=section_map.get(item.id, []),
                section_lines_map=section_line_map,
                product_name_map=product_name_map,
            )
            for item in quote_rows
        ],
    )
