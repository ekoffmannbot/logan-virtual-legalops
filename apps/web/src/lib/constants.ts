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

/* ------------------------------------------------------------------ */
/* STATUS COLORS – Dark glassmorphism theme (CSS class pairs)          */
/* ------------------------------------------------------------------ */

export const STATUS_COLORS: Record<string, string> = {
  // Generic statuses
  new: "badge-new",
  open: "badge-new",
  draft: "badge-muted",
  sent: "badge-warning",
  accepted: "badge-success",
  approved: "badge-success",
  signed: "badge-success",
  complete: "badge-success",
  closed: "badge-muted",
  done: "badge-success",
  paid: "badge-success",
  rejected: "badge-danger",
  expired: "badge-danger",
  lost: "badge-danger",
  terminated: "badge-danger",
  overdue: "badge-danger",
  cancelled: "badge-muted",
  in_progress: "badge-warning",
  pending_review: "badge-warning",
  pending_data: "badge-warning",
  drafting: "badge-new",
  // SLA
  sla_breached_24h: "badge-warning",
  sla_breached_48h: "badge-danger",
  // Collection
  escalated: "badge-danger",
  suspended: "badge-warning",
  // Severity
  low: "badge-muted",
  med: "badge-warning",
  high: "badge-warning",
  critical: "badge-danger",
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

/* ------------------------------------------------------------------ */
/* URGENCY STYLING – Dark glassmorphism theme                          */
/* ------------------------------------------------------------------ */

export const URGENCY_STYLES = {
  urgent: {
    border: "border-red-500/30",
    bg: "bg-red-500/10",
    text: "text-red-400",
    badge: "badge-danger",
    dot: "bg-red-500",
    label: "Urgente",
  },
  warning: {
    border: "border-yellow-500/30",
    bg: "bg-yellow-500/10",
    text: "text-yellow-400",
    badge: "badge-warning",
    dot: "bg-yellow-500",
    label: "Atenci\u00f3n",
  },
  normal: {
    border: "border-slate-500/20",
    bg: "bg-slate-500/5",
    text: "text-slate-400",
    badge: "badge-muted",
    dot: "bg-slate-400",
    label: "Normal",
  },
} as const;

/* ------------------------------------------------------------------ */
/* AGENT CONSTANTS                                                      */
/* ------------------------------------------------------------------ */

export const AGENT_LABELS: Record<string, string> = {
  abogado_jefe: "Abogado Senior",
  abogado: "Abogado Junior",
  jefe_cobranza: "Contador",
  secretaria: "Secretaria",
  procurador: "Procurador",
  administracion: "Asistente Legal",
  agente_comercial: "Admin TI",
  cliente_portal: "Soporte",
};

export const AGENT_COLORS: Record<string, string> = {
  abogado_jefe: "#6366f1",
  abogado: "#818cf8",
  jefe_cobranza: "#2dd4bf",
  secretaria: "#f59e0b",
  procurador: "#a855f7",
  administracion: "#3b82f6",
  agente_comercial: "#ec4899",
  cliente_portal: "#64748b",
};

export const AGENT_EMOJIS: Record<string, string> = {
  abogado_jefe: "\u2696\uFE0F",
  abogado: "\uD83D\uDCDA",
  jefe_cobranza: "\uD83D\uDCB0",
  secretaria: "\uD83D\uDCCB",
  procurador: "\uD83C\uDFDB\uFE0F",
  administracion: "\uD83D\uDCC2",
  agente_comercial: "\uD83D\uDDA5\uFE0F",
  cliente_portal: "\uD83D\uDEE0\uFE0F",
};

export const MODEL_LABELS: Record<string, string> = {
  "claude-opus-4-20250514": "Claude Opus 4",
  "claude-sonnet-4-20250514": "Claude Sonnet 4",
};

export const SKILL_DESCRIPTIONS: Record<string, string> = {
  // Abogado Senior
  redaccion_legal: "Redacción de contratos, escritos judiciales y documentos legales complejos",
  analisis_casos: "Análisis estratégico de causas con fundamentación normativa",
  estrategia_juridica: "Diseño de estrategia procesal y recomendaciones jurídicas",
  revision_contratos: "Revisión de calidad y consistencia en contratos",
  jurisprudencia: "Búsqueda de jurisprudencia relevante en bases de datos legales",
  mediacion: "Mediación y negociación con contrapartes",
  // Abogado Junior
  investigacion_legal: "Investigación legal en normativa y doctrina chilena",
  borradores: "Redacción de borradores para revisión del Senior",
  apoyo_procesal: "Preparación de audiencias y apoyo procesal",
  revision_documentos: "Revisión de consistencia normativa en documentos",
  busqueda_jurisprudencia: "Búsqueda de precedentes y jurisprudencia aplicable",
  // Contador
  facturacion: "Emisión de facturas y boletas electrónicas vía SII",
  cobranza: "Gestión de cobranza con protocolo escalonado (30/60/90 días)",
  reportes_financieros: "Reportes financieros mensuales del estudio",
  analisis_rentabilidad: "Análisis de rentabilidad por caso y cliente",
  presupuestos: "Presupuestos y proyecciones de flujo de caja",
  impuestos_basicos: "Cálculo de IVA, retenciones y boletas de honorarios",
  // Secretaria
  agenda: "Gestión de agenda, audiencias y reuniones del estudio",
  email_management: "Administración de bandeja de email y SLA de respuesta",
  comunicaciones: "Comunicaciones formales con clientes, tribunales y notarías",
  coordinacion_reuniones: "Coordinación de reuniones (sala, zoom, disponibilidad)",
  recordatorios: "Recordatorios automáticos y seguimientos según protocolo SLA",
  archivo_digital: "Archivo digital y organización de expedientes",
  // Procurador
  tramites_notariales: "Gestión de protocolizaciones, legalizaciones y poderes",
  seguimiento_judicial: "Seguimiento diario de causas en tribunales",
  gestiones_tribunales: "Gestiones presenciales en tribunales civiles y JPL",
  retiro_documentos: "Retiro de documentos judiciales y notificaciones",
  inscripciones: "Inscripciones en Conservador de Bienes Raíces",
  // Asistente Legal
  gestion_documental: "Gestión documental y archivo de expedientes digitales",
  clasificacion: "Clasificación e indexación de documentos entrantes",
  digitalizacion: "Digitalización y organización de archivos físicos",
  busqueda_expedientes: "Búsqueda rápida de documentos en expedientes",
  apoyo_general: "Apoyo general al equipo legal y administrativo",
  // Admin TI
  monitoreo_sistema: "Monitoreo proactivo de API, DB, Redis y Celery",
  alertas_tecnicas: "Alertas técnicas con severidad (info/warning/critical)",
  backups: "Gestión de backups automáticos de base de datos",
  health_checks: "Health checks periódicos de todos los servicios",
  logs_analysis: "Análisis de logs para detectar anomalías",
  // Soporte
  troubleshooting: "Resolución de problemas técnicos del sistema",
  faq: "Respuestas a preguntas frecuentes con ejemplos",
  guia_usuario: "Guía paso a paso de funcionalidades del sistema",
  reportes_bugs: "Reporte y seguimiento de bugs al Admin TI",
};

export const AGENT_TASK_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  running: "Ejecutando",
  completed: "Completado",
  failed: "Fallido",
  escalated: "Escalado",
};

export const AGENT_TASK_STATUS_COLORS: Record<string, string> = {
  pending: "var(--text-muted)",
  running: "var(--primary-color)",
  completed: "var(--success)",
  failed: "var(--danger)",
  escalated: "var(--warning)",
};
