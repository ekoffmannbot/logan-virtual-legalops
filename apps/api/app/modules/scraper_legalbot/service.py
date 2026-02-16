import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.scraper import ScraperJob, ScraperResult
from app.db.models.lead import Lead
from app.db.enums import ScraperJobStatusEnum, LeadSourceEnum, LeadStatusEnum
from app.modules.scraper_legalbot.schemas import ScraperJobCreate


FIXTURES_DIR = Path(__file__).parent / "fixtures"


def create_job(
    db: Session,
    data: ScraperJobCreate,
    user_id: int,
    org_id: int,
) -> ScraperJob:
    job = ScraperJob(
        organization_id=org_id,
        keyword=data.keyword,
        base_url=data.base_url,
        page_limit_int=data.page_limit_int or 200,
        status=ScraperJobStatusEnum.QUEUED,
        created_by_user_id=user_id,
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


def run_job(db: Session, job_id: int, org_id: int) -> ScraperJob:
    job = get_job(db, job_id, org_id)

    if job.status not in (ScraperJobStatusEnum.QUEUED, ScraperJobStatusEnum.FAILED):
        raise HTTPException(
            status_code=400,
            detail=f"El job no puede ejecutarse en estado '{job.status}'",
        )

    job.status = ScraperJobStatusEnum.RUNNING
    job.started_at = datetime.now(timezone.utc)
    db.commit()

    try:
        if settings.SCRAPER_MODE == "mock":
            results = _run_mock(db, job, org_id)
        else:
            results = _run_real(db, job, org_id)

        job.status = ScraperJobStatusEnum.COMPLETED
        job.results_count_int = len(results)
        job.finished_at = datetime.now(timezone.utc)
    except Exception as e:
        job.status = ScraperJobStatusEnum.FAILED
        job.finished_at = datetime.now(timezone.utc)
        db.commit()
        raise HTTPException(status_code=500, detail=f"Error al ejecutar scraper: {str(e)}")

    db.commit()
    db.refresh(job)
    return job


def _run_mock(db: Session, job: ScraperJob, org_id: int) -> List[ScraperResult]:
    """Read from fixtures/mock_page.html and extract fake results."""
    mock_file = FIXTURES_DIR / "mock_page.html"
    if not mock_file.exists():
        raise FileNotFoundError("Archivo mock no encontrado: fixtures/mock_page.html")

    html_content = mock_file.read_text(encoding="utf-8")

    # Parse the mock HTML for result items
    results = []
    now = datetime.now(timezone.utc)

    # Simple regex to extract links and text from the mock HTML
    link_pattern = re.compile(
        r'<a href="([^"]+)">([^<]+)</a>\s*<p>([^<]+)</p>',
        re.DOTALL,
    )

    for match in link_pattern.finditer(html_content):
        url = match.group(1)
        title = match.group(2).strip()
        snippet = match.group(3).strip()

        result = ScraperResult(
            organization_id=org_id,
            scraper_job_id=job.id,
            url=url,
            title=title,
            snippet=snippet,
            found_at=now,
        )
        db.add(result)
        results.append(result)

    db.flush()
    return results


def _run_real(db: Session, job: ScraperJob, org_id: int) -> List[ScraperResult]:
    """Actually scrape the base_url with rate limiting. Requires httpx + beautifulsoup4."""
    try:
        import httpx
        from bs4 import BeautifulSoup
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="Dependencias de scraping no instaladas (httpx, beautifulsoup4)",
        )

    results = []
    now = datetime.now(timezone.utc)
    headers = {"User-Agent": settings.SCRAPER_USER_AGENT}
    pages_scraped = 0

    with httpx.Client(headers=headers, timeout=30, follow_redirects=True) as client:
        url = job.base_url
        while url and pages_scraped < job.page_limit_int:
            # Rate limiting
            time.sleep(settings.SCRAPER_RATE_LIMIT_SECONDS)

            response = client.get(url)
            if response.status_code != 200:
                break

            soup = BeautifulSoup(response.text, "html.parser")

            # Look for links containing the keyword
            for link in soup.find_all("a", href=True):
                text = link.get_text(strip=True)
                if job.keyword.lower() in text.lower():
                    # Get surrounding text as snippet
                    parent = link.parent
                    snippet_text = parent.get_text(strip=True)[:500] if parent else text

                    result = ScraperResult(
                        organization_id=org_id,
                        scraper_job_id=job.id,
                        url=link["href"],
                        title=text[:500],
                        snippet=snippet_text,
                        found_at=now,
                    )
                    db.add(result)
                    results.append(result)

            pages_scraped += 1

            # Look for a "next page" link
            next_link = soup.find("a", string=re.compile(r"siguiente|next|>>", re.IGNORECASE))
            url = next_link["href"] if next_link and next_link.get("href") else None

    db.flush()
    return results


def list_jobs(
    db: Session,
    org_id: int,
    skip: int = 0,
    limit: int = 50,
) -> List[ScraperJob]:
    return (
        db.query(ScraperJob)
        .filter(ScraperJob.organization_id == org_id)
        .order_by(ScraperJob.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_job(db: Session, job_id: int, org_id: int) -> ScraperJob:
    job = (
        db.query(ScraperJob)
        .filter(ScraperJob.id == job_id, ScraperJob.organization_id == org_id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job de scraping no encontrado")
    return job


def list_results(
    db: Session,
    job_id: int,
    org_id: int,
    skip: int = 0,
    limit: int = 50,
) -> List[ScraperResult]:
    # Verify job belongs to org
    get_job(db, job_id, org_id)
    return (
        db.query(ScraperResult)
        .filter(ScraperResult.scraper_job_id == job_id)
        .order_by(ScraperResult.found_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def convert_to_lead(
    db: Session,
    result_id: int,
    org_id: int,
) -> Lead:
    """Convert a scraper result into a Lead."""
    result = (
        db.query(ScraperResult)
        .filter(ScraperResult.id == result_id, ScraperResult.organization_id == org_id)
        .first()
    )
    if not result:
        raise HTTPException(status_code=404, detail="Resultado de scraping no encontrado")

    if result.converted_lead_id:
        raise HTTPException(
            status_code=400,
            detail="Este resultado ya fue convertido a lead",
        )

    lead = Lead(
        organization_id=org_id,
        source=LeadSourceEnum.SCRAPER_LEGALBOT,
        status=LeadStatusEnum.NEW,
        full_name=result.title or "Lead desde scraper",
        notes=f"URL: {result.url}\nSnippet: {result.snippet or ''}",
    )
    db.add(lead)
    db.flush()

    result.converted_lead_id = lead.id
    db.commit()
    db.refresh(lead)
    return lead
