import logging
import time
from typing import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

log = logging.getLogger("logan.database")

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _wait_for_db(max_retries: int = 10, delay: float = 2.0) -> bool:
    """Wait until PostgreSQL is ready, with retries."""
    for attempt in range(1, max_retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return True
        except Exception as exc:
            log.warning(
                "⏳ Database not ready (attempt %d/%d): %s",
                attempt, max_retries, str(exc)[:120],
            )
            if attempt < max_retries:
                time.sleep(delay)
    log.error("❌ Database not reachable after %d attempts.", max_retries)
    return False


def ensure_tables():
    """Create all tables if they don't exist and seed if empty.

    Includes retry logic to handle race conditions during container startup
    or restarts where PostgreSQL may not be ready yet.
    """
    if not _wait_for_db():
        log.error("❌ Skipping table creation — database unreachable.")
        return

    try:
        from app.db.base import Base
        import app.db.models  # noqa: F401 — register all models with Base

        inspector = inspect(engine)
        existing = inspector.get_table_names()

        if "users" not in existing:
            log.warning("⚠️  Tables missing (%d found). Running create_all...", len(existing))
            Base.metadata.create_all(bind=engine)
            log.info("✅ Created %d tables.", len(Base.metadata.tables))

            # Seed if empty
            db = SessionLocal()
            try:
                from app.db.models import User
                if db.query(User).count() == 0:
                    log.info("Empty database — running seed...")
                    from app.db.seed import seed
                    seed()
                    log.info("✅ Seed completed.")
            finally:
                db.close()
        else:
            log.info("✅ Database OK (%d tables).", len(existing))
    except Exception as exc:
        log.error("❌ ensure_tables() failed: %s", exc, exc_info=True)


# Auto-run on import — guarantees tables exist before any request
ensure_tables()
