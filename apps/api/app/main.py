"""
Logan Virtual — LegalOps OS for Chilean law firms.

Main FastAPI application factory with security middleware,
rate limiting, and all module routers.
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.middleware import RequestLoggingMiddleware, SecurityHeadersMiddleware
from app.core.rate_limiter import limiter, rate_limit_exceeded_handler


def create_app() -> FastAPI:
    application = FastAPI(
        title=settings.APP_NAME,
        version="0.2.0",
        description="Logan Virtual - LegalOps OS para estudios jurídicos",
        docs_url="/docs" if settings.APP_DEBUG else None,
        redoc_url="/redoc" if settings.APP_DEBUG else None,
    )

    # ── Rate limiter ─────────────────────────────────────────────
    application.state.limiter = limiter
    application.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

    # ── CORS ─────────────────────────────────────────────────────
    origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    extra_origins = os.getenv("CORS_ORIGINS", "")
    if extra_origins:
        origins.extend([o.strip() for o in extra_origins.split(",") if o.strip()])

    application.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_origin_regex=r"https://.*\.vercel\.app" if settings.APP_ENV != "production" else None,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID", "Server-Timing"],
    )

    # ── Security middleware ───────────────────────────────────────
    application.add_middleware(SecurityHeadersMiddleware)
    application.add_middleware(RequestLoggingMiddleware)

    # ── Routers ──────────────────────────────────────────────────
    register_routers(application)

    # ── WebSocket routes ─────────────────────────────────────────
    from app.modules.agents.websocket import ws_router
    application.include_router(ws_router)

    # ── Startup: auto-create tables & seed if empty ──────────
    @application.on_event("startup")
    def _init_db():
        import logging
        log = logging.getLogger("logan.startup")
        from app.db.base import Base
        from app.core.database import engine, SessionLocal
        import app.db.models  # noqa: F401 — register all models with Base
        Base.metadata.create_all(bind=engine)
        log.info("Database tables ensured (%d tables).", len(Base.metadata.tables))
        # Seed only when database is empty (first run)
        db = SessionLocal()
        try:
            from app.db.models import User
            if db.query(User).count() == 0:
                log.info("Empty database detected — running seed…")
                from app.db.seed import seed
                seed()
                log.info("Seed completed.")
            else:
                log.info("Database already seeded (%d users).", db.query(User).count())
        finally:
            db.close()

    return application


def register_routers(application: FastAPI) -> None:
    from app.modules.auth.router import router as auth_router
    from app.modules.orgs.router import router as orgs_router
    from app.modules.users.router import router as users_router
    from app.modules.leads.router import router as leads_router
    from app.modules.clients.router import router as clients_router
    from app.modules.matters.router import router as matters_router
    from app.modules.proposals.router import router as proposals_router
    from app.modules.contracts.router import router as contracts_router
    from app.modules.notary.router import router as notary_router
    from app.modules.case_review.router import router as case_review_router
    from app.modules.court_actions.router import router as court_actions_router
    from app.modules.communications.router import router as communications_router
    from app.modules.email_tickets.router import router as email_tickets_router
    from app.modules.collections.router import router as collections_router
    from app.modules.documents.router import router as documents_router
    from app.modules.templates.router import router as templates_router
    from app.modules.scraper_legalbot.router import router as scraper_router
    from app.modules.dashboards.router import router as dashboards_router
    from app.modules.ai_assistant.router import router as ai_router
    from app.modules.tasks.router import router as tasks_router
    from app.modules.admin.router import router as admin_router
    from app.modules.calendar.router import router as calendar_router
    from app.modules.agent_logs.router import router as agent_logs_router
    from app.modules.reports.router import router as reports_router
    from app.modules.search.router import router as search_router
    from app.modules.time_tracking.router import router as time_tracking_router
    from app.modules.notifications.router import router as notifications_router
    from app.modules.agents.router import router as agents_router

    prefix = "/api/v1"
    application.include_router(auth_router, prefix=f"{prefix}/auth", tags=["Auth"])
    application.include_router(orgs_router, prefix=f"{prefix}/orgs", tags=["Organizations"])
    application.include_router(users_router, prefix=f"{prefix}/users", tags=["Users"])
    application.include_router(leads_router, prefix=f"{prefix}/leads", tags=["Leads"])
    application.include_router(clients_router, prefix=f"{prefix}/clients", tags=["Clients"])
    application.include_router(matters_router, prefix=f"{prefix}/matters", tags=["Matters"])
    application.include_router(proposals_router, prefix=f"{prefix}/proposals", tags=["Proposals"])
    application.include_router(contracts_router, prefix=f"{prefix}/contracts", tags=["Contracts"])
    application.include_router(notary_router, prefix=f"{prefix}/notary", tags=["Notary"])
    application.include_router(case_review_router, prefix=f"{prefix}/case-review", tags=["Case Review"])
    application.include_router(court_actions_router, prefix=f"{prefix}/court-actions", tags=["Court Actions"])
    application.include_router(communications_router, prefix=f"{prefix}/communications", tags=["Communications"])
    application.include_router(email_tickets_router, prefix=f"{prefix}/email-tickets", tags=["Email Tickets"])
    application.include_router(collections_router, prefix=f"{prefix}/collections", tags=["Collections"])
    application.include_router(documents_router, prefix=f"{prefix}/documents", tags=["Documents"])
    application.include_router(templates_router, prefix=f"{prefix}/templates", tags=["Templates"])
    application.include_router(scraper_router, prefix=f"{prefix}/scraper", tags=["Scraper LegalBOT"])
    application.include_router(dashboards_router, prefix=f"{prefix}/dashboards", tags=["Dashboards"])
    application.include_router(ai_router, prefix=f"{prefix}/ai", tags=["AI Assistant"])
    application.include_router(tasks_router, prefix=f"{prefix}/tasks", tags=["Tasks"])
    application.include_router(admin_router, prefix=f"{prefix}/admin", tags=["Admin"])
    application.include_router(calendar_router, prefix=f"{prefix}/calendar", tags=["Calendar"])
    application.include_router(agent_logs_router, prefix=f"{prefix}/agent-logs", tags=["Agent Logs"])
    application.include_router(reports_router, prefix=f"{prefix}/reports", tags=["Reports"])
    application.include_router(search_router, prefix=f"{prefix}/search", tags=["Search"])
    application.include_router(time_tracking_router, prefix=f"{prefix}/time-tracking", tags=["Time Tracking"])
    application.include_router(notifications_router, prefix=f"{prefix}/notifications", tags=["Notifications"])
    application.include_router(agents_router, prefix=f"{prefix}/agents", tags=["Agents"])


app = create_app()


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "app": settings.APP_NAME, "version": "0.2.0"}
