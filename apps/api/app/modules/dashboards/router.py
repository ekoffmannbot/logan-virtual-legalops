from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.modules.dashboards import service
from app.modules.dashboards.schemas import DashboardOverview, ActionItemsResponse

router = APIRouter()


@router.get("/overview", response_model=DashboardOverview)
def get_overview(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return service.get_overview(db, current_user.organization_id)


@router.get("/action-items", response_model=ActionItemsResponse)
def get_action_items(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return service.get_action_items(db, current_user.organization_id)
