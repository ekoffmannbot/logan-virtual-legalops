"""
RBAC (Role-Based Access Control) for Logan Virtual.

Provides fine-grained permission checking via decorators and dependencies.
Uses the RoleEnum from db.enums and enforces organization-level data isolation.
"""

from __future__ import annotations

from enum import Enum
from functools import wraps
from typing import Any, Callable

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.db.enums import RoleEnum


# ── Permission Actions ────────────────────────────────────────────────────────

class Action(str, Enum):
    READ = "read"
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    TRANSITION = "transition"  # status changes
    EXPORT = "export"
    ADMIN = "admin"
    ASSIGN = "assign"


# ── Role-Permission Matrix ───────────────────────────────────────────────────
# Maps module → action → set of allowed roles.
# If a module/action combo is not listed, only GERENTE_LEGAL has access.

_ALL_INTERNAL = {
    RoleEnum.SECRETARIA, RoleEnum.ADMINISTRACION, RoleEnum.ABOGADO,
    RoleEnum.ABOGADO_JEFE, RoleEnum.PROCURADOR, RoleEnum.GERENTE_LEGAL,
    RoleEnum.JEFE_COBRANZA, RoleEnum.AGENTE_COMERCIAL,
}

_LEGAL_TEAM = {
    RoleEnum.ABOGADO, RoleEnum.ABOGADO_JEFE, RoleEnum.PROCURADOR,
    RoleEnum.GERENTE_LEGAL,
}

_MANAGEMENT = {
    RoleEnum.ABOGADO_JEFE, RoleEnum.GERENTE_LEGAL, RoleEnum.ADMINISTRACION,
}

_FINANCIAL = {
    RoleEnum.ADMINISTRACION, RoleEnum.JEFE_COBRANZA, RoleEnum.GERENTE_LEGAL,
}

PERMISSION_MATRIX: dict[str, dict[Action, set[RoleEnum]]] = {
    # ── Sales & Clients ──
    "leads": {
        Action.READ: _ALL_INTERNAL,
        Action.CREATE: {RoleEnum.SECRETARIA, RoleEnum.AGENTE_COMERCIAL, RoleEnum.GERENTE_LEGAL, RoleEnum.ADMINISTRACION},
        Action.UPDATE: {RoleEnum.SECRETARIA, RoleEnum.AGENTE_COMERCIAL, RoleEnum.GERENTE_LEGAL, RoleEnum.ADMINISTRACION},
        Action.TRANSITION: {RoleEnum.SECRETARIA, RoleEnum.AGENTE_COMERCIAL, RoleEnum.GERENTE_LEGAL, RoleEnum.ABOGADO_JEFE},
        Action.DELETE: _MANAGEMENT,
    },
    "clients": {
        Action.READ: _ALL_INTERNAL,
        Action.CREATE: {RoleEnum.SECRETARIA, RoleEnum.AGENTE_COMERCIAL, RoleEnum.GERENTE_LEGAL, RoleEnum.ADMINISTRACION},
        Action.UPDATE: {RoleEnum.SECRETARIA, RoleEnum.AGENTE_COMERCIAL, RoleEnum.GERENTE_LEGAL, RoleEnum.ADMINISTRACION},
        Action.DELETE: _MANAGEMENT,
    },
    # ── Matters & Legal ──
    "matters": {
        Action.READ: _ALL_INTERNAL,
        Action.CREATE: _LEGAL_TEAM | {RoleEnum.SECRETARIA},
        Action.UPDATE: _LEGAL_TEAM | {RoleEnum.SECRETARIA},
        Action.TRANSITION: _LEGAL_TEAM,
        Action.ASSIGN: {RoleEnum.ABOGADO_JEFE, RoleEnum.GERENTE_LEGAL},
    },
    "proposals": {
        Action.READ: _ALL_INTERNAL,
        Action.CREATE: {RoleEnum.ABOGADO, RoleEnum.ABOGADO_JEFE, RoleEnum.GERENTE_LEGAL, RoleEnum.AGENTE_COMERCIAL},
        Action.UPDATE: {RoleEnum.ABOGADO, RoleEnum.ABOGADO_JEFE, RoleEnum.GERENTE_LEGAL, RoleEnum.AGENTE_COMERCIAL},
        Action.TRANSITION: {RoleEnum.ABOGADO_JEFE, RoleEnum.GERENTE_LEGAL, RoleEnum.AGENTE_COMERCIAL},
    },
    "contracts": {
        Action.READ: _ALL_INTERNAL,
        Action.CREATE: _LEGAL_TEAM | {RoleEnum.SECRETARIA},
        Action.UPDATE: _LEGAL_TEAM | {RoleEnum.SECRETARIA},
        Action.TRANSITION: {RoleEnum.ABOGADO_JEFE, RoleEnum.GERENTE_LEGAL, RoleEnum.ABOGADO},
    },
    # ── Court & Notary ──
    "court_actions": {
        Action.READ: _ALL_INTERNAL,
        Action.CREATE: _LEGAL_TEAM,
        Action.UPDATE: _LEGAL_TEAM,
        Action.TRANSITION: _LEGAL_TEAM,
    },
    "notary": {
        Action.READ: _ALL_INTERNAL,
        Action.CREATE: _LEGAL_TEAM | {RoleEnum.SECRETARIA},
        Action.UPDATE: _LEGAL_TEAM | {RoleEnum.SECRETARIA, RoleEnum.PROCURADOR},
        Action.TRANSITION: _LEGAL_TEAM | {RoleEnum.SECRETARIA, RoleEnum.PROCURADOR},
    },
    "case_review": {
        Action.READ: _ALL_INTERNAL,
        Action.CREATE: _LEGAL_TEAM,
        Action.UPDATE: _LEGAL_TEAM,
    },
    # ── Financial ──
    "collections": {
        Action.READ: _ALL_INTERNAL,
        Action.CREATE: _FINANCIAL,
        Action.UPDATE: _FINANCIAL,
        Action.TRANSITION: _FINANCIAL,
    },
    # ── Communication & Email ──
    "email_tickets": {
        Action.READ: _ALL_INTERNAL,
        Action.CREATE: {RoleEnum.SECRETARIA, RoleEnum.ADMINISTRACION, RoleEnum.GERENTE_LEGAL},
        Action.UPDATE: {RoleEnum.SECRETARIA, RoleEnum.ADMINISTRACION, RoleEnum.GERENTE_LEGAL, RoleEnum.ABOGADO},
        Action.TRANSITION: {RoleEnum.SECRETARIA, RoleEnum.ADMINISTRACION, RoleEnum.GERENTE_LEGAL, RoleEnum.ABOGADO_JEFE},
    },
    "communications": {
        Action.READ: _ALL_INTERNAL,
        Action.CREATE: _ALL_INTERNAL,
    },
    # ── Documents & Templates ──
    "documents": {
        Action.READ: _ALL_INTERNAL,
        Action.CREATE: _ALL_INTERNAL,
        Action.DELETE: _MANAGEMENT,
    },
    "templates": {
        Action.READ: _ALL_INTERNAL,
        Action.CREATE: _MANAGEMENT,
        Action.UPDATE: _MANAGEMENT,
        Action.DELETE: _MANAGEMENT,
    },
    # ── Tasks ──
    "tasks": {
        Action.READ: _ALL_INTERNAL,
        Action.CREATE: _ALL_INTERNAL,
        Action.UPDATE: _ALL_INTERNAL,
        Action.DELETE: _ALL_INTERNAL,
    },
    # ── Dashboards & Calendar ──
    "dashboards": {
        Action.READ: _ALL_INTERNAL,
    },
    "calendar": {
        Action.READ: _ALL_INTERNAL,
    },
    # ── AI & Scraper ──
    "ai_assistant": {
        Action.READ: _ALL_INTERNAL,
        Action.CREATE: _ALL_INTERNAL,
    },
    "scraper": {
        Action.READ: _ALL_INTERNAL,
        Action.CREATE: {RoleEnum.SECRETARIA, RoleEnum.AGENTE_COMERCIAL, RoleEnum.GERENTE_LEGAL, RoleEnum.ADMINISTRACION},
        Action.TRANSITION: {RoleEnum.SECRETARIA, RoleEnum.AGENTE_COMERCIAL, RoleEnum.GERENTE_LEGAL},
    },
    # ── Admin (already protected by require_role in router) ──
    "admin": {
        Action.READ: _MANAGEMENT,
        Action.CREATE: _MANAGEMENT,
        Action.UPDATE: _MANAGEMENT,
        Action.DELETE: {RoleEnum.GERENTE_LEGAL},
    },
    "orgs": {
        Action.READ: {RoleEnum.GERENTE_LEGAL},
        Action.CREATE: {RoleEnum.GERENTE_LEGAL},
        Action.UPDATE: {RoleEnum.GERENTE_LEGAL},
    },
    "users": {
        Action.READ: _MANAGEMENT,
        Action.CREATE: _MANAGEMENT,
        Action.UPDATE: _MANAGEMENT,
    },
    "agent_logs": {
        Action.READ: _ALL_INTERNAL,
    },
    # ── Reports ──
    "reports": {
        Action.READ: _MANAGEMENT | {RoleEnum.JEFE_COBRANZA},
        Action.EXPORT: _MANAGEMENT,
    },
    # ── Time Tracking ──
    "time_tracking": {
        Action.READ: _ALL_INTERNAL,
        Action.CREATE: _LEGAL_TEAM | {RoleEnum.SECRETARIA},
        Action.UPDATE: _LEGAL_TEAM | {RoleEnum.SECRETARIA},
        Action.DELETE: _MANAGEMENT,
    },
}


# ── Dependency Factory ────────────────────────────────────────────────────────

def check_permission(module: str, action: Action):
    """
    FastAPI dependency that checks if the current user has permission
    to perform `action` on `module`.

    Usage in router:
        @router.post("/", dependencies=[Depends(check_permission("leads", Action.CREATE))])
        def create_lead(...):
            ...

    Or as parameter:
        def create_lead(user=Depends(check_permission("leads", Action.CREATE))):
            ...
    """

    def dependency(current_user=Depends(get_current_user)):
        user_role = current_user.role
        if isinstance(user_role, str):
            try:
                user_role = RoleEnum(user_role)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Rol desconocido: {current_user.role}",
                )

        # GERENTE_LEGAL always has full access
        if user_role == RoleEnum.GERENTE_LEGAL:
            return current_user

        # Check the matrix
        module_perms = PERMISSION_MATRIX.get(module)
        if module_perms is None:
            # Module not in matrix → only GERENTE_LEGAL (already checked above)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No tiene permisos para acceder a {module}",
            )

        allowed_roles = module_perms.get(action)
        if allowed_roles is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acción '{action.value}' no permitida en {module}",
            )

        if user_role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Su rol ({user_role.value}) no tiene permiso para {action.value} en {module}",
            )

        return current_user

    return dependency


def require_org_access(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Ensures the user belongs to an organization and returns org_id.
    Used as a building block for multi-tenant data isolation.
    """
    if not current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario no asociado a ninguna organización",
        )
    return current_user
