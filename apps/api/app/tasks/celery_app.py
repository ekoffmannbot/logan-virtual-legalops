from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "logan_virtual",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone=settings.APP_TIMEZONE,
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)

celery_app.conf.beat_schedule = {
    "expire-proposals-hourly": {
        "task": "app.tasks.proposal_tasks.expire_proposals",
        "schedule": 3600.0,  # every hour
    },
    "check-email-sla-15min": {
        "task": "app.tasks.sla_tasks.check_email_sla",
        "schedule": 900.0,  # every 15 min
    },
    "generate-collection-reminders-daily": {
        "task": "app.tasks.collection_tasks.generate_collection_reminders",
        "schedule": {
            "hour": 7,
            "minute": 0,
        },
    },
    "generate-notary-contact-tasks-daily": {
        "task": "app.tasks.notary_tasks.generate_notary_contact_tasks",
        "schedule": {
            "hour": 9,
            "minute": 0,
        },
    },
}

# Use crontab for daily schedules
from celery.schedules import crontab

celery_app.conf.beat_schedule["generate-collection-reminders-daily"]["schedule"] = crontab(hour=7, minute=0)
celery_app.conf.beat_schedule["generate-notary-contact-tasks-daily"]["schedule"] = crontab(hour=9, minute=0)

# Daily digest with AI summary + email to managers
celery_app.conf.beat_schedule["daily-digest-20h"] = {
    "task": "app.tasks.digest_tasks.daily_digest",
    "schedule": crontab(hour=20, minute=0),
}

# Agent health check every 5 minutes
celery_app.conf.beat_schedule["agent-health-check-5min"] = {
    "task": "app.tasks.agent_health_tasks.agent_health_check",
    "schedule": 300.0,  # every 5 min
}

# Explicit imports so the worker registers all tasks
import app.tasks.proposal_tasks  # noqa: F401
import app.tasks.sla_tasks  # noqa: F401
import app.tasks.collection_tasks  # noqa: F401
import app.tasks.notary_tasks  # noqa: F401
import app.tasks.digest_tasks  # noqa: F401
import app.tasks.agent_bus_tasks  # noqa: F401
import app.tasks.agent_health_tasks  # noqa: F401
