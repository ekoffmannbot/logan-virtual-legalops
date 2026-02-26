"""
Workflow definitions and executor for multi-agent orchestrated processes.

Each workflow defines a sequence of agents that collaborate to complete
a business process (e.g., new lead qualification, proposal preparation).
"""

import logging
from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy.orm import Session

from app.core.agent_bus import AgentBus

logger = logging.getLogger(__name__)


@dataclass
class WorkflowStep:
    agent_role: str
    instruction: str
    pass_output_to_next: bool = True


@dataclass
class WorkflowDefinition:
    key: str
    name: str
    description: str
    steps: list[WorkflowStep] = field(default_factory=list)


# ── Workflow Definitions ──────────────────────────────────────────────────────

WORKFLOWS: dict[str, WorkflowDefinition] = {
    "new_lead": WorkflowDefinition(
        key="new_lead",
        name="Calificación de Lead Nuevo",
        description="Secretaria califica → Junior evalúa → Senior revisa → Contador presupuesta → Secretaria contacta → Gerente aprueba",
        steps=[
            WorkflowStep("secretaria", "Un nuevo lead ha ingresado al sistema. Revisa sus datos, clasifica la urgencia y prepara un resumen inicial para el equipo legal."),
            WorkflowStep("abogado", "Evalúa este lead desde la perspectiva legal. ¿Es un caso viable? ¿Qué tipo de servicio necesita? Prepara una evaluación preliminar."),
            WorkflowStep("abogado_jefe", "Revisa la evaluación del Junior. ¿Aceptamos este caso? ¿Qué estrategia sugieres? Estima la complejidad y honorarios."),
            WorkflowStep("jefe_cobranza", "Basándote en la evaluación legal, prepara un estimado de honorarios y estructura de pagos para la propuesta."),
            WorkflowStep("secretaria", "Prepara un borrador de email de contacto para el cliente con la propuesta comercial y agenda una reunión."),
        ],
    ),
    "proposal_preparation": WorkflowDefinition(
        key="proposal_preparation",
        name="Preparación de Propuesta",
        description="Senior redacta → Contador estructura honorarios → Junior revisa → Secretaria envía",
        steps=[
            WorkflowStep("abogado_jefe", "Redacta la estrategia legal para la propuesta de servicios. Incluye análisis preliminar, normativa aplicable, y plan de acción."),
            WorkflowStep("jefe_cobranza", "Estructura los honorarios para esta propuesta. Define monto, cuotas, hitos de pago y condiciones comerciales."),
            WorkflowStep("abogado", "Revisa el borrador de propuesta. Verifica que la estrategia legal y los plazos sean correctos. Sugiere mejoras."),
            WorkflowStep("secretaria", "Formatea la propuesta final y prepara el email de envío al cliente. Incluye todos los documentos adjuntos necesarios."),
        ],
    ),
    "collections_flow": WorkflowDefinition(
        key="collections_flow",
        name="Flujo de Cobranza",
        description="Contador evalúa → Secretaria contacta → Senior interviene si es grave → Procurador si es judicial",
        steps=[
            WorkflowStep("jefe_cobranza", "Revisa las facturas vencidas. Clasifica por gravedad, calcula el monto total adeudado y recomienda acciones de cobranza."),
            WorkflowStep("secretaria", "Prepara comunicaciones de cobranza: emails de recordatorio, llamadas agendadas. Prioriza según gravedad."),
            WorkflowStep("abogado_jefe", "Si hay casos graves de morosidad, evalúa si procede acción legal. Prepara carta de cobranza formal si corresponde."),
        ],
    ),
    "notary_flow": WorkflowDefinition(
        key="notary_flow",
        name="Flujo Notarial",
        description="Senior prepara → Procurador tramita → Asistente archiva → Secretaria notifica",
        steps=[
            WorkflowStep("abogado_jefe", "Revisa los documentos notariales pendientes. Prepara los antecedentes necesarios y las instrucciones para el procurador."),
            WorkflowStep("procurador", "Gestiona los trámites notariales: envío a notaría, seguimiento de firmas, retiro de documentos. Reporta estado actual."),
            WorkflowStep("administracion", "Clasifica y archiva los documentos notariales completados. Actualiza el sistema con los estados correctos."),
            WorkflowStep("secretaria", "Notifica al cliente sobre el estado de sus documentos notariales. Agenda entregas o firmas pendientes."),
        ],
    ),
    "judicial_followup": WorkflowDefinition(
        key="judicial_followup",
        name="Seguimiento Judicial",
        description="Procurador verifica → Senior analiza → Junior documenta → Secretaria notifica",
        steps=[
            WorkflowStep("procurador", "Verifica el estado actual de las causas en tribunales. Revisa plazos pendientes, notificaciones judiciales y actuaciones recientes."),
            WorkflowStep("abogado_jefe", "Analiza las actuaciones judiciales recientes. ¿Se necesita acción inmediata? Prepara estrategia procesal."),
            WorkflowStep("abogado", "Documenta las actuaciones y prepara los escritos necesarios como borradores para revisión del Senior."),
            WorkflowStep("secretaria", "Notifica al cliente sobre avances en su causa. Agenda reuniones si hay decisiones pendientes."),
        ],
    ),
    "system_maintenance": WorkflowDefinition(
        key="system_maintenance",
        name="Mantenimiento del Sistema",
        description="Admin TI diagnostica → Soporte resuelve → Gerente si no se resuelve",
        steps=[
            WorkflowStep("agente_comercial", "Ejecuta un health check del sistema. Revisa logs, métricas, y alertas. Identifica problemas o anomalías."),
            WorkflowStep("cliente_portal", "Si hay problemas reportados, diagnostica la causa raíz. Sugiere soluciones y pasos de remediación."),
        ],
    ),
}


def execute_workflow(
    db: Session,
    org_id: int,
    workflow_key: str,
    context: Optional[dict] = None,
    message: Optional[str] = None,
) -> dict:
    """
    Execute a multi-agent workflow synchronously.

    Each step passes its output to the next agent as context.
    """
    if workflow_key not in WORKFLOWS:
        raise ValueError(f"Workflow '{workflow_key}' no encontrado. Disponibles: {list(WORKFLOWS.keys())}")

    workflow = WORKFLOWS[workflow_key]
    bus = AgentBus(db, org_id)

    results = []
    accumulated_context = context or {}
    previous_output = message or ""

    for i, step in enumerate(workflow.steps):
        step_message = step.instruction
        if previous_output:
            step_message += f"\n\nContexto del paso anterior:\n{previous_output[:2000]}"

        result = bus.send_message(
            from_agent_id=0,  # System-initiated
            to_agent_role=step.agent_role,
            message=step_message,
            context=accumulated_context,
        )

        results.append({
            "step": i + 1,
            "agent_role": step.agent_role,
            "agent_name": result.get("target_agent", {}).get("name", "Unknown"),
            "status": result.get("status", "unknown"),
            "response_preview": result.get("response", "")[:300],
        })

        if step.pass_output_to_next and result.get("status") == "completed":
            previous_output = result.get("response", "")

        # Stop workflow if a step fails or escalates
        if result.get("status") in ("failed", "escalated", "depth_exceeded"):
            break

    return {
        "workflow": workflow.key,
        "workflow_name": workflow.name,
        "steps_completed": len(results),
        "steps_total": len(workflow.steps),
        "results": results,
    }


def list_workflows() -> list[dict]:
    """List all available workflow definitions."""
    return [
        {
            "key": w.key,
            "name": w.name,
            "description": w.description,
            "steps": len(w.steps),
        }
        for w in WORKFLOWS.values()
    ]
