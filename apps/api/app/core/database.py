import logging
from typing import Generator

from sqlalchemy import create_engine, inspect
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


def ensure_tables():
    """Create all tables if they don't exist and seed if empty."""
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


# Auto-run on import — guarantees tables exist before any request
ensure_tables()
