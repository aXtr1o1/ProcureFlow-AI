from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.database.database import get_db
from app.database.models import User

from app.schemas.dashboard_schema import (
    DashboardOverviewResponse,
    DashboardFunnelResponse,
    DashboardSpendResponse,
)

from app.services.dashboard_service import DashboardService


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


# ==========================================================
# Dashboard Overview
# ==========================================================

@router.get(
    "/overview",
    response_model=DashboardOverviewResponse,
)
def get_dashboard_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return complete dashboard data.

    Includes:
        - KPIs
        - Workflow status counts
        - Procurement funnel
        - Spend information
    """

    service = DashboardService(db)

    try:
        return service.get_overview()

    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to load dashboard data: {str(error)}",
        )


# ==========================================================
# Dashboard Funnel
# ==========================================================

@router.get(
    "/funnel",
    response_model=DashboardFunnelResponse,
)
def get_dashboard_funnel(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return procurement lifecycle funnel data.
    """

    service = DashboardService(db)

    try:
        return service.get_funnel()

    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to load dashboard funnel: {str(error)}",
        )


# ==========================================================
# Dashboard Spend
# ==========================================================

@router.get(
    "/spend",
    response_model=DashboardSpendResponse,
)
def get_dashboard_spend(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Return procurement and payment financial metrics.
    """

    service = DashboardService(db)

    try:
        return service.get_spend()

    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unable to load dashboard spend data: {str(error)}",
        )