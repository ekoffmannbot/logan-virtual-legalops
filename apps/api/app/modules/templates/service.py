from typing import Optional, List

import re

from fastapi import HTTPException
from jinja2 import TemplateSyntaxError, UndefinedError
from jinja2.sandbox import SandboxedEnvironment, SecurityError
from sqlalchemy.orm import Session

from app.db.models.template import Template
from app.db.enums import TemplateTypeEnum
from app.modules.templates.schemas import TemplateCreate, TemplateUpdate


def create_template(db: Session, data: TemplateCreate, org_id: int) -> Template:
    # Validate template_type
    try:
        tt = TemplateTypeEnum(data.template_type)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de plantilla inválido: {data.template_type}. "
            f"Valores permitidos: {[e.value for e in TemplateTypeEnum]}",
        )

    template = Template(
        organization_id=org_id,
        template_type=tt,
        name=data.name,
        content_text=data.content_text,
        variables_json=data.variables_json,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    return template


def list_templates(
    db: Session,
    org_id: int,
    template_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[Template]:
    q = db.query(Template).filter(Template.organization_id == org_id, Template.active.is_(True))
    if template_type:
        q = q.filter(Template.template_type == template_type)
    return q.order_by(Template.name.asc()).offset(skip).limit(limit).all()


def get_template(db: Session, template_id: int, org_id: int) -> Template:
    template = (
        db.query(Template)
        .filter(Template.id == template_id, Template.organization_id == org_id)
        .first()
    )
    if not template:
        raise HTTPException(status_code=404, detail="Plantilla no encontrada")
    return template


def update_template(
    db: Session,
    template_id: int,
    data: TemplateUpdate,
    org_id: int,
) -> Template:
    template = get_template(db, template_id, org_id)

    update_data = data.model_dump(exclude_unset=True)

    if "template_type" in update_data and update_data["template_type"] is not None:
        try:
            update_data["template_type"] = TemplateTypeEnum(update_data["template_type"])
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail=f"Tipo de plantilla inválido: {update_data['template_type']}",
            )

    for field, value in update_data.items():
        setattr(template, field, value)

    db.commit()
    db.refresh(template)
    return template


def delete_template(db: Session, template_id: int, org_id: int) -> None:
    template = get_template(db, template_id, org_id)
    template.active = False
    db.commit()


_sandbox_env = SandboxedEnvironment(autoescape=True)


def render_template(
    db: Session,
    template_id: int,
    variables: dict,
    org_id: int,
) -> str:
    """Render a template's content_text using sandboxed Jinja2 with the provided variables."""
    template = get_template(db, template_id, org_id)

    # Validate variable keys are safe identifiers
    for key in variables:
        if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', key):
            raise HTTPException(status_code=400, detail=f"Nombre de variable inválido: {key}")

    try:
        jinja_tmpl = _sandbox_env.from_string(template.content_text)
        rendered = jinja_tmpl.render(**variables)
    except TemplateSyntaxError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error de sintaxis en la plantilla: {str(e)}",
        )
    except UndefinedError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Variable no definida en la plantilla: {str(e)}",
        )
    except SecurityError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Operación no permitida en plantilla: {str(e)}",
        )

    return rendered
