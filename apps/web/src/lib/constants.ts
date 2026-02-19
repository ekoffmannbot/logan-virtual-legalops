export const ROLE_LABELS: Record<string, string> = {
  secretaria: "Secretaria",
  administracion: "Administración",
  abogado: "Abogado",
  abogado_jefe: "Abogado Jefe",
  procurador: "Procurador",
  gerente_legal: "Gerente Legal",
  jefe_cobranza: "Jefe de Cobranza",
  agente_comercial: "Agente Comercial",
  cliente_portal: "Portal Cliente",
};

export const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  meeting_scheduled: "Reunión Agendada",
  proposal_sent: "Propuesta Enviada",
  won: "Ganado",
  lost: "Perdido",
};

export const LEAD_SOURCE_LABELS: Record<string, string> = {
  inbound_call: "Llamada",
  walk_in: "Visita",
  scraper_legalbot: "LegalBOT",
  referral: "Referido",
  other: "Otro",
};

export const PROPOSAL_STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  sent: "Enviada",
  accepted: "Aceptada",
  rejected: "Rechazada",
  expired: "Expirada",
};

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  pending_data: "Datos Pendientes",
  drafting: "En Redacción",
  pending_review: "Revisión Pendiente",
  changes_requested: "Cambios Solicitados",
  approved: "Aprobado",
  uploaded_for_signing: "Subido para Firma",
  signed: "Firmado",
  scanned_uploaded: "Escaneado Subido",
  complete: "Completo",
};

export const MATTER_STATUS_LABELS: Record<string, string> = {
  open: "Abierto",
  suspended_nonpayment: "Suspendido por Impago",
  closed: "Cerrado",
  terminated: "Terminado",
};

export const MATTER_TYPE_LABELS: Record<string, string> = {
  civil: "Civil",
  jpl: "JPL",
  other: "Otro",
};

export const NOTARY_STATUS_LABELS: Record<string, string> = {
  antecedents_requested: "Antecedentes Solicitados",
  antecedents_complete: "Antecedentes Completos",
  drafting: "En Redacción",
  sent_to_notary: "Enviado a Notaría",
  notary_received: "Recepcionado",
  notary_signed: "Firmado por Notaría",
  client_contact_pending: "Contacto Cliente Pendiente",
  document_available: "Documento Disponible",
  client_signed: "Firmado por Cliente",
  retrieved_by_procurador: "Retirado por Procurador",
  archived: "Archivado",
  reported_to_manager: "Informado al Gerente",
};

export const EMAIL_TICKET_STATUS_LABELS: Record<string, string> = {
  new: "Nuevo",
  drafting: "En Redacción",
  waiting_manager_approval: "Esperando VB",
  sent: "Enviado",
  receipt_confirmed: "Recepción Confirmada",
  closed: "Cerrado",
  sla_breached_24h: "SLA 24h Excedido",
  sla_breached_48h: "SLA 48h Excedido",
};

export const COLLECTION_STATUS_LABELS: Record<string, string> = {
  cheques_pending: "Cheques Pendientes",
  pre_due_contact: "Contacto Pre-Vencimiento",
  due_day_contact: "Contacto Día Vencimiento",
  waiting_payment_48h: "Esperando Pago 48h",
  escalated: "Escalado",
  suspended: "Suspendido",
  terminated: "Terminado",
  paid: "Pagado",
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  scheduled: "Programada",
  due: "Por Vencer",
  overdue: "Vencida",
  paid: "Pagada",
  cancelled: "Cancelada",
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  open: "Abierta",
  in_progress: "En Progreso",
  done: "Completada",
  cancelled: "Cancelada",
};

export const DEADLINE_SEVERITY_LABELS: Record<string, string> = {
  low: "Baja",
  med: "Media",
  high: "Alta",
  critical: "Crítica",
};

export const STATUS_COLORS: Record<string, string> = {
  // Generic statuses
  new: "bg-blue-100 text-blue-800",
  open: "bg-blue-100 text-blue-800",
  draft: "bg-gray-100 text-gray-800",
  sent: "bg-yellow-100 text-yellow-800",
  accepted: "bg-green-100 text-green-800",
  approved: "bg-green-100 text-green-800",
  signed: "bg-green-100 text-green-800",
  complete: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
  done: "bg-green-100 text-green-800",
  paid: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-red-100 text-red-800",
  lost: "bg-red-100 text-red-800",
  terminated: "bg-red-100 text-red-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  pending_review: "bg-yellow-100 text-yellow-800",
  pending_data: "bg-orange-100 text-orange-800",
  drafting: "bg-blue-100 text-blue-800",
  // SLA
  sla_breached_24h: "bg-orange-100 text-orange-800",
  sla_breached_48h: "bg-red-100 text-red-800",
  // Collection
  escalated: "bg-red-100 text-red-800",
  suspended: "bg-orange-100 text-orange-800",
  // Severity
  low: "bg-gray-100 text-gray-800",
  med: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

export const SIDEBAR_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Leads", href: "/leads", icon: "UserPlus" },
  { label: "Clientes", href: "/clients", icon: "Users" },
  { label: "Casos", href: "/matters", icon: "Briefcase" },
  { label: "Propuestas", href: "/proposals", icon: "FileText" },
  { label: "Contratos", href: "/contracts", icon: "FileSignature" },
  { label: "Notaría", href: "/notary", icon: "Stamp" },
  { label: "Revisión Causas", href: "/case-review", icon: "ClipboardCheck" },
  { label: "Cobranza", href: "/collections", icon: "DollarSign" },
  { label: "Correos", href: "/email-tickets", icon: "Mail" },
  { label: "Scraper", href: "/scraper", icon: "Search" },
  { label: "Tareas", href: "/tasks", icon: "CheckSquare" },
  { label: "Documentos", href: "/documents", icon: "FolderOpen" },
  { label: "IA Asistente", href: "/ai", icon: "Bot" },
  { label: "Admin", href: "/admin", icon: "Settings" },
];

/* ------------------------------------------------------------------ */
/* SIDEBAR RAIL (v3 – 5 items, 64px icon rail)                        */
/* ------------------------------------------------------------------ */

export const SIDEBAR_RAIL_ITEMS = [
  { label: "Inicio", href: "/dashboard", icon: "Home" },
  { label: "Mis Cosas", href: "/bandeja", icon: "Inbox" },
  { label: "Calendario", href: "/calendar", icon: "Calendar" },
  { label: "Agentes", href: "/agents", icon: "Bot" },
  { label: "Config", href: "/admin", icon: "Settings" },
] as const;

/* Entity type icons – used by inbox items and drawers */
export const ENTITY_ICONS: Record<string, string> = {
  lead: "UserPlus",
  email_ticket: "Mail",
  contract: "FileSignature",
  proposal: "FileText",
  matter: "Briefcase",
  notary: "Stamp",
  collection: "DollarSign",
  invoice: "DollarSign",
  case_review: "ClipboardCheck",
  task: "CheckSquare",
  scraper: "Search",
};

/* ------------------------------------------------------------------ */
/* URGENCY STYLING                                                     */
/* ------------------------------------------------------------------ */

export const URGENCY_STYLES = {
  urgent: {
    border: "border-red-300",
    bg: "bg-red-50",
    text: "text-red-700",
    badge: "bg-red-100 text-red-800",
    dot: "bg-red-500",
    label: "Urgente",
  },
  warning: {
    border: "border-yellow-300",
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    badge: "bg-yellow-100 text-yellow-800",
    dot: "bg-yellow-500",
    label: "Atención",
  },
  normal: {
    border: "border-gray-200",
    bg: "bg-white",
    text: "text-gray-700",
    badge: "bg-gray-100 text-gray-800",
    dot: "bg-gray-400",
    label: "Normal",
  },
} as const;
