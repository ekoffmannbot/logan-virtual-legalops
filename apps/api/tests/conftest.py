"""
Test configuration for Logan Virtual.

Supports both PostgreSQL (CI/production) and SQLite (quick local tests).
Set DATABASE_URL env var to use PostgreSQL.
"""

import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.database import get_db
from app.core.security import hash_password
from app.db.base import Base
from app.db.models import Organization, User
from app.db.enums import RoleEnum


# ── Database Setup ───────────────────────────────────────────────────────────

_TEST_DB_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")

if _TEST_DB_URL.startswith("sqlite"):
    engine = create_engine(_TEST_DB_URL, connect_args={"check_same_thread": False})
else:
    # PostgreSQL — use transactions for test isolation
    engine = create_engine(_TEST_DB_URL, pool_pre_ping=True)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture(scope="function", autouse=True)
def setup_db():
    """Create all tables before each test, drop after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def org(db):
    org = Organization(name="Test Org", timezone="America/Santiago")
    db.add(org)
    db.commit()
    db.refresh(org)
    return org


@pytest.fixture
def admin_user(db, org):
    user = User(
        organization_id=org.id,
        email="admin@test.cl",
        hashed_password=hash_password("testpass"),
        full_name="Admin Test",
        role=RoleEnum.GERENTE_LEGAL.value,
        active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def abogado_user(db, org):
    user = User(
        organization_id=org.id,
        email="abogado@test.cl",
        hashed_password=hash_password("testpass"),
        full_name="Abogado Test",
        role=RoleEnum.ABOGADO.value,
        active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def secretaria_user(db, org):
    user = User(
        organization_id=org.id,
        email="secretaria@test.cl",
        hashed_password=hash_password("testpass"),
        full_name="Secretaria Test",
        role=RoleEnum.SECRETARIA.value,
        active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def jefe_cobranza_user(db, org):
    user = User(
        organization_id=org.id,
        email="cobranza@test.cl",
        hashed_password=hash_password("testpass"),
        full_name="Jefe Cobranza Test",
        role=RoleEnum.JEFE_COBRANZA.value,
        active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def cliente_portal_user(db, org):
    user = User(
        organization_id=org.id,
        email="cliente@test.cl",
        hashed_password=hash_password("testpass"),
        full_name="Cliente Portal Test",
        role=RoleEnum.CLIENTE_PORTAL.value,
        active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _get_auth_headers(test_client, email: str, password: str = "testpass") -> dict:
    """Helper to login and get auth headers."""
    response = test_client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
    )
    assert response.status_code == 200, f"Login failed for {email}: {response.text}"
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_headers(client, admin_user):
    return _get_auth_headers(client, admin_user.email)


@pytest.fixture
def abogado_headers(client, abogado_user):
    return _get_auth_headers(client, abogado_user.email)


@pytest.fixture
def secretaria_headers(client, secretaria_user):
    return _get_auth_headers(client, secretaria_user.email)


@pytest.fixture
def cobranza_headers(client, jefe_cobranza_user):
    return _get_auth_headers(client, jefe_cobranza_user.email)


@pytest.fixture
def cliente_headers(client, cliente_portal_user):
    return _get_auth_headers(client, cliente_portal_user.email)
