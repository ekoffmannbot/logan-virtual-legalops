from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.modules.scraper_legalbot import service
from app.modules.scraper_legalbot.schemas import (
    ScraperJobCreate,
    ScraperJobResponse,
    ScraperResultResponse,
    ConvertToLeadRequest,
)

router = APIRouter()


def _map_job(job) -> dict:
    """Map a ScraperJob ORM object to the frontend-expected shape with aliases."""
    status_val = job.status if isinstance(job.status, str) else job.status.value
    return {
        "id": job.id,
        "org_id": job.organization_id,
        "keyword": job.keyword,
        "base_url": job.base_url,
        "page_limit_int": job.page_limit_int,
        "status": status_val,
        "started_at": job.started_at,
        "finished_at": job.finished_at,
        "results_count_int": job.results_count_int,
        "created_by_user_id": job.created_by_user_id,
        "created_at": job.created_at,
        "updated_at": job.updated_at,
        # Frontend aliases
        "name": f"Búsqueda: {job.keyword}",
        "query": job.keyword,
        "court": None,
        "results_count": job.results_count_int,
        "completed_at": job.finished_at,
    }


def _map_result(r) -> dict:
    """Map a ScraperResult ORM object to the frontend-expected shape."""
    return {
        "id": r.id,
        "job_id": r.scraper_job_id,
        "name": r.title,
        "email": None,
        "phone": None,
        "website": None,
        "address": None,
        "description": r.snippet,
        "source_url": r.url,
        "converted_to_lead": r.converted_lead_id is not None,
        "lead_id": r.converted_lead_id,
        "created_at": r.created_at,
    }


@router.get("/jobs")
def list_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    jobs = service.list_jobs(db, current_user.organization_id, skip=skip, limit=limit)
    return [_map_job(j) for j in jobs]


@router.post("/jobs", response_model=ScraperJobResponse, status_code=201)
def create_job(
    data: ScraperJobCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return service.create_job(
        db, data, user_id=current_user.id, org_id=current_user.organization_id
    )


@router.get("/jobs/{job_id}")
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return _map_job(service.get_job(db, job_id, current_user.organization_id))


@router.post("/jobs/{job_id}/run")
def run_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return _map_job(service.run_job(db, job_id, current_user.organization_id))


@router.get("/jobs/{job_id}/results", response_model=List[ScraperResultResponse])
def list_results(
    job_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    results = service.list_results(
        db, job_id, current_user.organization_id, skip=skip, limit=limit
    )
    return [_map_result(r) for r in results]


@router.post("/results/{result_id}/convert-to-lead")
def convert_to_lead(
    result_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    lead = service.convert_to_lead(db, result_id, current_user.organization_id)
    return {
        "message": "Resultado convertido a lead exitosamente",
        "lead_id": lead.id,
    }
