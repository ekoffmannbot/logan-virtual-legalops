from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, OrgMixin, PgEnum
from app.db.enums import ScraperJobStatusEnum


class ScraperJob(TimestampMixin, OrgMixin, Base):
    __tablename__ = "scraper_jobs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    keyword: Mapped[str] = mapped_column(String(255), nullable=False)
    base_url: Mapped[str] = mapped_column(String(1000), nullable=False)
    page_limit_int: Mapped[int] = mapped_column(Integer, default=200)
    status: Mapped[str] = mapped_column(
        PgEnum(ScraperJobStatusEnum, name="scraper_job_status_enum"),
        default=ScraperJobStatusEnum.QUEUED, nullable=False, index=True
    )
    started_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    results_count_int: Mapped[int] = mapped_column(Integer, default=0)
    created_by_user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)


class ScraperResult(TimestampMixin, OrgMixin, Base):
    __tablename__ = "scraper_results"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    scraper_job_id: Mapped[int] = mapped_column(Integer, ForeignKey("scraper_jobs.id"), nullable=False, index=True)
    url: Mapped[str] = mapped_column(String(2000), nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    snippet: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    found_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    converted_lead_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("leads.id"), nullable=True)
