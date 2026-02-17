/**
 * Process-Status Mapping Utility
 * Bridges BPMN process definitions with actual entity statuses
 */
import {
  recepcionVisitaProcess,
  recepcionTelefonoProcess,
  seguimientoPropuestasProcess,
  contratoMandatoProcess,
  documentosNotarialesProcess,
  respuestaCorreosProcess,
  procesoCobranzaProcess,
  causasJPLProcess,
  revisionCausasProcess,
  legalbotScraperProcess,
  ALL_PROCESSES,
} from "./process-definitions";
import type { ProcessDefinition, ProcessAgent, ProcessStep } from "@/components/shared/process-flow";

/* ------------------------------------------------------------------ */
/* STATUS → BPMN STEP MAPPING                                         */
/* ------------------------------------------------------------------ */

export const STATUS_TO_STEP: Record<string, Record<string, string>> = {
  "recepcion-visita": {
    new: "v-start",
    contacted: "v-recepcion",
    meeting_scheduled: "v-derivar",
    proposal_sent: "v-analisis",
    won: "v-end",
    lost: "v-end",
  },
  "recepcion-telefono": {
    new: "t-start",
    contacted: "t-atencion",
    meeting_scheduled: "t-agendar",
    won: "t-end-contactado",
    lost: "t-end-no",
  },
  "seguimiento-propuestas": {
    draft: "sp-start",
    sent: "sp-redactar",
    follow_up_pending: "sp-contacto-72",
    accepted: "sp-agendar-firma",
    rejected: "sp-end",
    expired: "sp-end",
  },
  "contrato-mandato": {
    pending_data: "cm-datos-check",
    drafting: "cm-confeccionar",
    pending_review: "cm-verificar",
    changes_requested: "cm-modificar",
    approved: "cm-subir",
    uploaded_for_signing: "cm-mandato",
    signed: "cm-escanear",
    scanned_uploaded: "cm-escanear",
    complete: "cm-end",
  },
  "documentos-notariales": {
    antecedents_requested: "dn-antecedentes",
    antecedents_complete: "dn-check-antecedentes",
    drafting: "dn-redactar",
    sent_to_notary: "dn-envio-notaria",
    notary_received: "dn-recepcion",
    notary_signed: "dn-firma-notaria",
    client_contact_pending: "dn-contacto-cliente",
    document_available: "dn-firma-cliente",
    client_signed: "dn-archivar",
    retrieved_by_procurador: "dn-archivar",
    archived: "dn-end",
    reported_to_manager: "dn-end",
  },
  "respuesta-correos": {
    new: "rc-start",
    drafting: "rc-analizar",
    waiting_manager_approval: "rc-jefe",
    sent: "rc-redactar",
    receipt_confirmed: "rc-confirmar",
    closed: "rc-end",
    sla_breached_24h: "rc-redactar",
    sla_breached_48h: "rc-jefe",
  },
  "proceso-cobranza": {
    cheques_pending: "pc-cheques",
    pre_due_contact: "pc-contacto-pre",
    due_day_contact: "pc-dia-vencimiento",
    waiting_payment_48h: "pc-plazo48",
    escalated: "pc-escalar",
    suspended: "pc-cese",
    terminated: "pc-terminar",
    paid: "pc-end",
  },
  "causas-jpl": {
    screening: "jpl-start",
    requirements_met: "jpl-requisitos",
    client_contacted: "jpl-contacto",
    meeting_scheduled: "jpl-datos",
    proposal_delivered: "jpl-propuesta",
    accepted: "jpl-contrato",
    case_started: "jpl-inicio-causa",
    commission_paid: "jpl-comision",
    rejected: "jpl-end",
  },
  "revision-causas": {
    pending_review: "rv-start",
    reviewing: "rv-revisar",
    movement_found: "rv-informar",
    no_movement: "rv-sin-mov",
    filing: "rv-tribunal",
    client_notified: "rv-contactar",
    completed: "rv-end",
  },
  "legalbot-scraper": {
    pending: "lb-start",
    running: "lb-ejecutar",
    processing: "lb-resultados",
    completed: "lb-revisar",
    derived: "lb-derivar",
  },
};

/* ------------------------------------------------------------------ */
/* ENTITY → PROCESS MAPPING                                            */
/* ------------------------------------------------------------------ */

export const ENTITY_PROCESS_MAP: Record<string, string> = {
  lead: "recepcion-visita",
  proposal: "seguimiento-propuestas",
  contract: "contrato-mandato",
  notary: "documentos-notariales",
  email_ticket: "respuesta-correos",
  collection: "proceso-cobranza",
  matter: "causas-jpl",
  case_review: "revision-causas",
  scraper: "legalbot-scraper",
};

/* ------------------------------------------------------------------ */
/* PROGRESS COMPUTATION                                                */
/* ------------------------------------------------------------------ */

export interface ProcessProgress {
  current: number;
  total: number;
  percentage: number;
  stepLabel: string;
  stepDescription: string;
  agentName: string;
  agentColor: string;
  processName: string;
}

export function getProcessProgress(
  processId: string,
  currentStatus: string
): ProcessProgress {
  const process = ALL_PROCESSES[processId] ||
    Object.values(ALL_PROCESSES).find(p => p.id === processId);

  if (!process) {
    return {
      current: 0, total: 1, percentage: 0,
      stepLabel: currentStatus, stepDescription: "",
      agentName: "", agentColor: "slate", processName: "",
    };
  }

  const stepMap = STATUS_TO_STEP[process.id] || {};
  const stepId = stepMap[currentStatus] || process.steps[0]?.id;

  const taskSteps = process.steps.filter(s => s.type !== "start" && s.type !== "end");
  const allSteps = process.steps;
  const stepIndex = allSteps.findIndex(s => s.id === stepId);
  const step = allSteps[stepIndex] || allSteps[0];
  const agent = process.agents.find(a => a.id === step?.agentId) || process.agents[0];

  return {
    current: Math.max(0, stepIndex),
    total: allSteps.length,
    percentage: allSteps.length > 0 ? Math.round((stepIndex / (allSteps.length - 1)) * 100) : 0,
    stepLabel: step?.label || currentStatus,
    stepDescription: step?.description || "",
    agentName: agent?.name || "",
    agentColor: agent?.color || "slate",
    processName: process.name,
  };
}

/* ------------------------------------------------------------------ */
/* URGENCY COMPUTATION                                                 */
/* ------------------------------------------------------------------ */

export type UrgencyLevel = "normal" | "warning" | "urgent";

export function computeUrgency(entity: Record<string, any>): UrgencyLevel {
  const now = new Date();

  // Check due dates
  if (entity.due_date) {
    const due = new Date(entity.due_date);
    const daysUntil = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntil < 0) return "urgent";
    if (daysUntil < 3) return "warning";
  }

  // Check SLA deadlines
  if (entity.sla_24h_deadline) {
    const sla = new Date(entity.sla_24h_deadline);
    const hoursUntil = (sla.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntil < 0) return "urgent";
    if (hoursUntil < 4) return "warning";
  }

  // Check age (items without contact for too long)
  if (entity.created_at && entity.status === "new") {
    const created = new Date(entity.created_at);
    const hoursOld = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    if (hoursOld > 4) return "urgent";
    if (hoursOld > 2) return "warning";
  }

  // Check last movement for cases
  if (entity.last_movement_at) {
    const lastMov = new Date(entity.last_movement_at);
    const daysSince = (now.getTime() - lastMov.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 7) return "urgent";
    if (daysSince > 3) return "warning";
  }

  // Check overdue status
  if (entity.status === "overdue" || entity.status === "sla_breached_24h" || entity.status === "sla_breached_48h") {
    return "urgent";
  }
  if (entity.status === "escalated" || entity.status === "suspended") {
    return "urgent";
  }

  return "normal";
}

/* ------------------------------------------------------------------ */
/* AGENT SUGGESTIONS                                                   */
/* ------------------------------------------------------------------ */

export function getAgentSuggestions(
  processId: string,
  currentStatus: string,
  entity: Record<string, any>
): string[] {
  const suggestions: string[] = [];
  const urgency = computeUrgency(entity);
  const name = entity.full_name || entity.client_name || entity.subject || entity.title || "";

  switch (processId) {
    case "recepcion-visita":
    case "recepcion-telefono":
      if (currentStatus === "new") {
        suggestions.push(`${name} espera ser contactado. Priorizar llamada.`);
      }
      if (currentStatus === "contacted") {
        suggestions.push(`Agendar reunion con ${name} para presentar propuesta.`);
      }
      if (currentStatus === "meeting_scheduled") {
        suggestions.push(`Preparar propuesta para la reunion con ${name}.`);
      }
      if (currentStatus === "proposal_sent") {
        suggestions.push(`Hacer seguimiento de la propuesta enviada a ${name}.`);
      }
      break;

    case "seguimiento-propuestas":
      if (currentStatus === "draft") {
        suggestions.push(`Completar y enviar la propuesta a ${name}.`);
      }
      if (currentStatus === "sent") {
        suggestions.push(`Han pasado las 72 horas. Contactar a ${name} para confirmar recepcion.`);
      }
      if (currentStatus === "accepted") {
        suggestions.push(`${name} acepto la propuesta. Agendar firma de contrato.`);
      }
      break;

    case "contrato-mandato":
      if (currentStatus === "pending_data") {
        suggestions.push(`Faltan datos para el contrato de ${name}. Solicitar al abogado.`);
      }
      if (currentStatus === "pending_review") {
        suggestions.push(`El contrato de ${name} espera revision del abogado.`);
      }
      if (currentStatus === "approved") {
        suggestions.push(`Contrato aprobado. Subir a intranet y citar a ${name} para firma.`);
      }
      break;

    case "respuesta-correos":
      if (currentStatus === "new" || currentStatus === "drafting") {
        suggestions.push(`Responder el correo de ${name} antes del plazo de 24 horas.`);
      }
      if (currentStatus === "sla_breached_24h") {
        suggestions.push(`SLA de 24h superado para ${name}. Responder urgentemente.`);
      }
      if (currentStatus === "sent") {
        suggestions.push(`Confirmar que ${name} recibio la respuesta por telefono.`);
      }
      break;

    case "proceso-cobranza":
      if (currentStatus === "pre_due_contact") {
        suggestions.push(`Contactar a ${name} 5 dias antes del vencimiento.`);
      }
      if (currentStatus === "due_day_contact") {
        suggestions.push(`Hoy vence la factura de ${name}. Llamar ahora.`);
      }
      if (currentStatus === "escalated") {
        suggestions.push(`Caso de ${name} escalado. Enviar correo de cese de servicio.`);
      }
      break;

    case "revision-causas":
      if (currentStatus === "pending_review") {
        suggestions.push(`Revisar expediente electronico de ${name}.`);
      }
      break;

    default:
      break;
  }

  // Generic urgency-based suggestions
  if (urgency === "urgent" && suggestions.length === 0) {
    suggestions.push(`Atencion urgente requerida para ${name}.`);
  }

  return suggestions;
}

/* ------------------------------------------------------------------ */
/* NEXT ACTION LABEL                                                   */
/* ------------------------------------------------------------------ */

export function getNextActionLabel(processId: string, currentStatus: string): string {
  const labels: Record<string, Record<string, string>> = {
    "recepcion-visita": {
      new: "Contactar",
      contacted: "Agendar Reunion",
      meeting_scheduled: "Enviar Propuesta",
      proposal_sent: "Cerrar como Cliente",
    },
    "recepcion-telefono": {
      new: "Atender Llamada",
      contacted: "Agendar Reunion",
    },
    "seguimiento-propuestas": {
      draft: "Enviar Propuesta",
      sent: "Hacer Seguimiento",
      accepted: "Agendar Firma",
    },
    "contrato-mandato": {
      pending_data: "Completar Datos",
      drafting: "Enviar a Revision",
      pending_review: "Revisar Contrato",
      changes_requested: "Aplicar Cambios",
      approved: "Subir a Intranet",
      uploaded_for_signing: "Enviar a Notaria",
      signed: "Escanear Documento",
    },
    "documentos-notariales": {
      antecedents_requested: "Verificar Antecedentes",
      drafting: "Enviar a Notaria",
      sent_to_notary: "Confirmar Recepcion",
      notary_signed: "Contactar Cliente",
      client_contact_pending: "Llamar Cliente",
      client_signed: "Archivar",
    },
    "respuesta-correos": {
      new: "Redactar Respuesta",
      drafting: "Enviar Respuesta",
      waiting_manager_approval: "Solicitar VB",
      sent: "Confirmar Recepcion",
    },
    "proceso-cobranza": {
      pre_due_contact: "Llamar Cliente",
      due_day_contact: "Cobrar Hoy",
      waiting_payment_48h: "Verificar Pago",
      escalated: "Enviar Cese",
    },
    "causas-jpl": {
      screening: "Verificar Requisitos",
      requirements_met: "Contactar Cliente",
      client_contacted: "Agendar Cita",
      proposal_delivered: "Esperar Aceptacion",
      accepted: "Firmar Contrato",
    },
    "revision-causas": {
      pending_review: "Iniciar Revision",
      reviewing: "Registrar Movimiento",
      movement_found: "Gestionar Tramite",
      filing: "Presentar en Tribunal",
      client_notified: "Completar",
    },
    "legalbot-scraper": {
      pending: "Iniciar Busqueda",
      running: "En Progreso...",
      completed: "Revisar Resultados",
    },
  };

  return labels[processId]?.[currentStatus] || "Ver Detalle";
}

/* ------------------------------------------------------------------ */
/* TIME HELPERS                                                        */
/* ------------------------------------------------------------------ */

export function getRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 0) {
    const absMins = Math.abs(diffMins);
    const absHours = Math.floor(absMins / 60);
    const absDays = Math.floor(absHours / 24);
    if (absDays > 0) return `en ${absDays} dia${absDays > 1 ? "s" : ""}`;
    if (absHours > 0) return `en ${absHours} hora${absHours > 1 ? "s" : ""}`;
    return `en ${absMins} min`;
  }

  if (diffDays > 0) return `hace ${diffDays} dia${diffDays > 1 ? "s" : ""}`;
  if (diffHours > 0) return `hace ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
  if (diffMins > 0) return `hace ${diffMins} min`;
  return "ahora";
}

export function getTimeUntil(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    const overdueDays = Math.abs(diffDays);
    if (overdueDays > 0) return `Vencido hace ${overdueDays} dia${overdueDays > 1 ? "s" : ""}`;
    const overdueHours = Math.abs(diffHours);
    return `Vencido hace ${overdueHours}h`;
  }

  if (diffDays > 0) return `${diffDays} dia${diffDays > 1 ? "s" : ""} restante${diffDays > 1 ? "s" : ""}`;
  if (diffHours > 0) return `${diffHours}h restante${diffHours > 1 ? "s" : ""}`;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  return `${diffMins} min restantes`;
}
