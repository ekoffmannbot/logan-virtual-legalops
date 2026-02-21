// Mock data for demo mode (no backend required)

const now = new Date();
const today = now.toISOString().split("T")[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split("T")[0];
const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0];
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
const in3Days = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];
const in4Hours = new Date(Date.now() + 4 * 3600000).toISOString();
const in1Hour = new Date(Date.now() + 1 * 3600000).toISOString();
const nextMonth = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

// ─── Dashboard ───
const dashboardOverview = {
  kpis: {
    new_leads: 12,
    active_proposals: 8,
    open_matters: 34,
    overdue_invoices: 5,
  },
  leads_by_status: [
    { status: "new", count: 12 },
    { status: "contacted", count: 8 },
    { status: "meeting_scheduled", count: 5 },
    { status: "proposal_sent", count: 3 },
    { status: "won", count: 15 },
    { status: "lost", count: 4 },
  ],
  matters_by_type: [
    { type: "civil", count: 14 },
    { type: "jpl", count: 9 },
    { type: "other", count: 5 },
  ],
  overdue_tasks: [
    { id: 1, title: "Revisar contrato Pérez SpA", due_date: yesterday, assigned_to_name: "María Fernández", matter_title: "Pérez SpA vs Banco Central" },
    { id: 2, title: "Preparar escrito demanda", due_date: lastWeek, assigned_to_name: "Carlos Logan", matter_title: "Rojas c/ Inmobiliaria Sur" },
    { id: 3, title: "Enviar notificación notarial", due_date: yesterday, assigned_to_name: "Ana Torres", matter_title: "Herencia González" },
  ],
  critical_deadlines: [
    { id: 1, title: "Plazo contestación demanda", due_date: nextWeek, severity: "high", matter_title: "Pérez SpA vs Banco Central" },
    { id: 2, title: "Audiencia preparatoria", due_date: nextMonth, severity: "med", matter_title: "Rojas c/ Inmobiliaria Sur" },
    { id: 3, title: "Vencimiento poder notarial", due_date: in3Days, severity: "critical", matter_title: "Herencia González" },
  ],
};

// ─── Dashboard Action Items (v2 – Mission Control) ───
const dashboardActionItems = {
  urgent: [
    {
      id: "u1",
      type: "invoice",
      title: "Factura vencida: Inmobiliaria Sur",
      subtitle: "FAC-002 · $1.800.000",
      urgencyText: "Vencida hace 2 días",
      actionLabel: "Gestionar Cobro",
      actionHref: "/collections",
      secondaryLabel: "Ver Factura",
      secondaryHref: "/collections",
      amount: "$1.800.000",
    },
    {
      id: "u2",
      type: "email_ticket",
      title: "SLA por vencer: Email Roberto Sánchez",
      subtitle: "Consulta plazo contestación",
      urgencyText: "Quedan 4h para responder",
      actionLabel: "Responder",
      actionHref: "/email-tickets",
    },
    {
      id: "u3",
      type: "lead",
      title: "Lead sin contactar: Andrés Riquelme",
      subtitle: "Minera del Norte · Derecho minero",
      urgencyText: "Sin contacto hace 5 horas",
      actionLabel: "Llamar",
      actionHref: "/leads/5",
    },
  ],
  today: [
    {
      id: "t1",
      type: "case_review",
      title: "Revisión diaria de causas",
      subtitle: "4 causas pendientes de revisión",
      actionLabel: "Iniciar Revisión",
      actionHref: "/case-review",
    },
    {
      id: "t2",
      type: "proposal",
      title: "Seguimiento 72h: Propuesta Sánchez",
      subtitle: "Asesoría laboral · $3.500.000",
      actionLabel: "Contactar",
      actionHref: "/proposals/1",
    },
    {
      id: "t3",
      type: "notary",
      title: "Retirar documento: Poder González",
      subtitle: "Notaría 23 Santiago",
      actionLabel: "Marcar Retirado",
      actionHref: "/notary/1",
    },
  ],
  inProgress: [
    {
      id: "p1",
      type: "contract",
      title: "Contrato Pérez SpA",
      subtitle: "En revisión por abogado jefe",
      processId: "contrato-mandato",
      status: "pending_review",
      href: "/contracts/1",
    },
    {
      id: "p2",
      type: "notary",
      title: "Escritura Herrera Corp",
      subtitle: "En notaría para firma",
      processId: "documentos-notariales",
      status: "sent_to_notary",
      href: "/notary/2",
    },
    {
      id: "p3",
      type: "matter",
      title: "Rojas c/ Inmobiliaria Sur",
      subtitle: "Preparando escrito de demanda",
      processId: "causas-jpl",
      status: "case_started",
      href: "/matters/2",
    },
  ],
  completed: [
    {
      id: "c1",
      title: "Escritura constitución Herrera Corp",
      subtitle: "Completado a las 10:30",
      type: "notary",
    },
    {
      id: "c2",
      title: "Pago recibido: Pérez SpA · FAC-001",
      subtitle: "Completado a las 09:15",
      type: "collection",
    },
  ],
  agentInsights: [
    {
      agentName: "Secretaria",
      message: "Auto-creé seguimiento para propuesta Sánchez. Han pasado 72 horas desde el envío.",
      type: "info" as const,
    },
    {
      agentName: "Jefe Cobranza",
      message: "Recomiendo escalar factura Inmobiliaria Sur. 3 intentos de contacto sin éxito.",
      type: "warning" as const,
    },
    {
      agentName: "Abogado",
      message: "El contrato Pérez SpA tiene una cláusula de indemnización que requiere revisión adicional.",
      type: "suggestion" as const,
    },
  ],
  quickNumbers: {
    leads: 12,
    proposals: 8,
    matters: 34,
    overdue: 5,
  },
};

// ─── Leads (enriched with process data) ───
const leads = {
  items: [
    { id: 1, full_name: "Roberto Sánchez", email: "rsanchez@empresa.cl", phone: "+56912345678", company: "Empresa Sánchez Ltda.", source: "walk_in", status: "new", notes: "Interesado en asesoría laboral", assigned_to_name: "María Fernández", created_at: today, process_id: "recepcion-visita" },
    { id: 2, full_name: "Patricia Muñoz", email: "pmunoz@gmail.com", phone: "+56987654321", company: "Muñoz & Asociados", source: "inbound_call", status: "contacted", notes: "Consulta por litigio comercial", assigned_to_name: "Carlos Logan", created_at: yesterday, process_id: "recepcion-telefono" },
    { id: 3, full_name: "Diego Herrera", email: "dherrera@corp.cl", phone: "+56911223344", company: "Herrera Corp.", source: "referral", status: "meeting_scheduled", notes: "Necesita representación en juicio civil", assigned_to_name: "María Fernández", created_at: lastWeek, process_id: "recepcion-visita" },
    { id: 4, full_name: "Camila Vega", email: "cvega@vegalaw.cl", phone: "+56955667788", company: null, source: "inbound_call", status: "proposal_sent", notes: "Propuesta enviada para caso familia", assigned_to_name: "Carlos Logan", created_at: lastWeek, process_id: "recepcion-visita" },
    { id: 5, full_name: "Andrés Riquelme", email: "ariquelme@minera.cl", phone: "+56933445566", company: "Minera del Norte S.A.", source: "scraper_legalbot", status: "new", notes: "Consulta por derecho minero", assigned_to_name: "María Fernández", created_at: today, process_id: "recepcion-visita" },
  ],
  total: 5,
};

// ─── Clients ───
const clients = [
  { id: 1, type: "empresa", name: "Pérez SpA", rut: "76.543.210-K", email: "contacto@perezpsa.cl", phone: "+56221234567", address: "Av. Providencia 1234, Santiago", active_matters_count: 3, total_billed: 15000000, created_at: lastWeek },
  { id: 2, type: "persona", name: "Juan Rojas Muñoz", rut: "12.345.678-9", email: "jrojas@gmail.com", phone: "+56912345678", address: "Los Leones 567, Providencia", active_matters_count: 1, total_billed: 3500000, created_at: lastWeek },
  { id: 3, type: "empresa", name: "Inmobiliaria Sur Ltda.", rut: "77.888.999-0", email: "legal@insur.cl", phone: "+56228765432", address: "Calle Sur 890, Concepción", active_matters_count: 2, total_billed: 8200000, created_at: lastWeek },
  { id: 4, type: "persona", name: "María González Torres", rut: "9.876.543-2", email: "mgonzalez@email.cl", phone: "+56998765432", address: "Manuel Montt 345, Ñuñoa", active_matters_count: 1, total_billed: 2100000, created_at: lastWeek },
];

// ─── Matters (enriched) ───
const matters = {
  items: [
    { id: 1, title: "Pérez SpA vs Banco Central", type: "civil", status: "open", client_name: "Pérez SpA", assigned_to_name: "Carlos Logan", court: "1er Juzgado Civil Santiago", rol: "C-1234-2024", created_at: lastWeek, next_hearing_date: nextMonth, last_movement_at: yesterday, process_id: "revision-causas" },
    { id: 2, title: "Rojas c/ Inmobiliaria Sur", type: "civil", status: "open", client_name: "Juan Rojas Muñoz", assigned_to_name: "María Fernández", court: "2do Juzgado Civil Santiago", rol: "C-5678-2024", created_at: lastWeek, next_hearing_date: in3Days, last_movement_at: lastWeek, process_id: "revision-causas" },
    { id: 3, title: "Herencia González", type: "other", status: "open", client_name: "María González Torres", assigned_to_name: "Carlos Logan", court: "Juzgado de Familia Santiago", rol: "F-9012-2024", created_at: twoWeeksAgo, next_hearing_date: null, last_movement_at: lastWeek, process_id: "revision-causas" },
    { id: 4, title: "Despido injustificado Muñoz", type: "jpl", status: "open", client_name: "Patricia Muñoz", assigned_to_name: "María Fernández", court: "1er Juzgado del Trabajo", rol: "T-3456-2024", created_at: lastWeek, next_hearing_date: nextMonth, last_movement_at: yesterday, process_id: "causas-jpl" },
    { id: 5, title: "Constitución sociedad Herrera", type: "other", status: "closed", client_name: "Herrera Corp.", assigned_to_name: "Carlos Logan", court: null, rol: null, created_at: twoWeeksAgo, next_hearing_date: null, last_movement_at: lastWeek, process_id: "revision-causas" },
  ],
  total: 5,
};

// ─── Proposals (enriched) ───
const proposals = {
  items: [
    { id: 1, title: "Propuesta asesoría laboral Sánchez", client_name: "Empresa Sánchez Ltda.", status: "draft", amount: 3500000, currency: "CLP", valid_until: nextMonth, assigned_to_name: "María Fernández", created_at: today, process_id: "seguimiento-propuestas" },
    { id: 2, title: "Representación litigio comercial", client_name: "Muñoz & Asociados", status: "sent", amount: 8000000, currency: "CLP", valid_until: nextMonth, assigned_to_name: "Carlos Logan", created_at: twoDaysAgo, process_id: "seguimiento-propuestas", sent_at: twoDaysAgo },
    { id: 3, title: "Asesoría derecho minero", client_name: "Minera del Norte S.A.", status: "accepted", amount: 12000000, currency: "CLP", valid_until: nextMonth, assigned_to_name: "Carlos Logan", created_at: lastWeek, process_id: "seguimiento-propuestas" },
    { id: 4, title: "Caso familia Vega", client_name: "Camila Vega", status: "rejected", amount: 2000000, currency: "CLP", valid_until: yesterday, assigned_to_name: "María Fernández", created_at: lastWeek, process_id: "seguimiento-propuestas" },
  ],
  total: 4,
};

// ─── Contracts (enriched) ───
const contracts = [
  { id: 1, title: "Contrato honorarios Pérez SpA", client_name: "Pérez SpA", type: "honorarios", status: "pending_review", start_date: lastWeek, end_date: nextMonth, monthly_fee: 2500000, currency: "CLP", created_at: lastWeek, process_id: "contrato-mandato" },
  { id: 2, title: "Convenio Inmobiliaria Sur", client_name: "Inmobiliaria Sur Ltda.", type: "convenio", status: "drafting", start_date: lastWeek, end_date: nextMonth, monthly_fee: 1800000, currency: "CLP", created_at: lastWeek, process_id: "contrato-mandato" },
  { id: 3, title: "Poder amplio González", client_name: "María González Torres", type: "poder", status: "pending_data", start_date: today, end_date: null, monthly_fee: null, currency: "CLP", created_at: today, process_id: "contrato-mandato" },
];

// ─── Notary (enriched) ───
const notaryDocs = [
  { id: 1, document_type: "poder", title: "Poder notarial González", client_name: "María González Torres", notary_name: "Notaría 23 Santiago", status: "sent_to_notary", submitted_date: yesterday, created_at: lastWeek, process_id: "documentos-notariales" },
  { id: 2, document_type: "escritura", title: "Escritura constitución Herrera Corp", client_name: "Herrera Corp.", notary_name: "Notaría 15 Santiago", status: "archived", submitted_date: lastWeek, created_at: twoWeeksAgo, process_id: "documentos-notariales" },
  { id: 3, document_type: "certificado", title: "Certificado vigencia Pérez SpA", client_name: "Pérez SpA", notary_name: "Notaría 8 Santiago", status: "antecedents_requested", submitted_date: null, created_at: today, process_id: "documentos-notariales" },
];

const notaryStats = { total: 3, pending: 1, at_notary: 1, completed: 1 };

// ─── Collections (enriched) ───
const invoices = [
  { id: 1, invoice_number: "FAC-001", client_name: "Pérez SpA", amount: 2500000, amount_paid: 2500000, currency: "CLP", status: "paid", due_date: lastWeek, issued_date: twoWeeksAgo, created_at: twoWeeksAgo, process_id: "proceso-cobranza" },
  { id: 2, invoice_number: "FAC-002", client_name: "Inmobiliaria Sur Ltda.", amount: 1800000, amount_paid: 0, currency: "CLP", status: "overdue", due_date: twoDaysAgo, issued_date: lastWeek, created_at: lastWeek, process_id: "proceso-cobranza" },
  { id: 3, invoice_number: "FAC-003", client_name: "Juan Rojas Muñoz", amount: 500000, amount_paid: 250000, currency: "CLP", status: "due", due_date: in3Days, issued_date: today, created_at: today, process_id: "proceso-cobranza" },
  { id: 4, invoice_number: "FAC-004", client_name: "María González Torres", amount: 350000, amount_paid: 0, currency: "CLP", status: "scheduled", due_date: nextMonth, issued_date: today, created_at: today, process_id: "proceso-cobranza" },
];

const collectionCases = [
  { id: 1, invoice_id: 2, client_name: "Inmobiliaria Sur Ltda.", status: "escalated", total_debt: 1800000, currency: "CLP", contact_attempts: 3, next_action: "Enviar carta certificada", next_action_date: in3Days, created_at: yesterday, process_id: "proceso-cobranza" },
];

const collectionStats = {
  total_invoices: 4,
  total_outstanding: 2650000,
  overdue_count: 1,
  overdue_amount: 1800000,
  collection_rate: 72.5,
};

// ─── Email Tickets (enriched) ───
const emailTickets = [
  { id: 1, subject: "Consulta plazo contestación", from_email: "rsanchez@empresa.cl", from_name: "Roberto Sánchez", status: "new", priority: "high", assigned_to_name: "María Fernández", matter_title: "Pérez SpA vs Banco Central", created_at: today, sla_deadline: in4Hours, sla_24h_deadline: in4Hours, process_id: "respuesta-correos" },
  { id: 2, subject: "Envío documentos firmados", from_email: "mgonzalez@email.cl", from_name: "María González", status: "drafting", priority: "medium", assigned_to_name: "Ana Torres", matter_title: "Herencia González", created_at: yesterday, sla_deadline: nextWeek, sla_24h_deadline: nextWeek, process_id: "respuesta-correos" },
  { id: 3, subject: "Solicitud reunión urgente", from_email: "legal@insur.cl", from_name: "Inmobiliaria Sur", status: "closed", priority: "low", assigned_to_name: "Carlos Logan", matter_title: "Rojas c/ Inmobiliaria Sur", created_at: lastWeek, sla_deadline: null, sla_24h_deadline: null, process_id: "respuesta-correos" },
  { id: 4, subject: "Solicitud copia expediente", from_email: "tribunal@pjud.cl", from_name: "Tribunal Civil", status: "new", priority: "high", assigned_to_name: "Carlos Logan", matter_title: "Pérez SpA vs Banco Central", created_at: today, sla_deadline: in1Hour, sla_24h_deadline: in1Hour, process_id: "respuesta-correos" },
];

const emailTicketStats = { total: 4, open: 2, sla_at_risk: 1, sla_breached: 0, unassigned: 0 };

// ─── Case Review (enriched) ───
const openMatters = [
  { id: "1", title: "Pérez SpA vs Banco Central", court: "1er Juzgado Civil Santiago", rol_number: "C-1234-2024", client_name: "Pérez SpA", status: "pending_review", assigned_to: "Carlos Logan", last_movement_at: yesterday },
  { id: "2", title: "Rojas c/ Inmobiliaria Sur", court: "2do Juzgado Civil Santiago", rol_number: "C-5678-2024", client_name: "Juan Rojas Muñoz", status: "pending_review", assigned_to: "María Fernández", last_movement_at: lastWeek },
  { id: "3", title: "Herencia González", court: "Juzgado de Familia Santiago", rol_number: "F-9012-2024", client_name: "María González Torres", status: "pending_review", assigned_to: "Carlos Logan", last_movement_at: twoWeeksAgo },
  { id: "4", title: "Despido injustificado Muñoz", court: "1er Juzgado del Trabajo", rol_number: "T-3456-2024", client_name: "Patricia Muñoz", status: "pending_review", assigned_to: "María Fernández", last_movement_at: yesterday },
];

// ─── Scraper ───
const scraperJobs = [
  { id: 1, name: "Búsqueda causas civiles Santiago", status: "completed", query: "Pérez SpA", court: "Juzgados Civiles Santiago", results_count: 3, created_at: yesterday, completed_at: yesterday },
  { id: 2, name: "Monitoreo causas laborales", status: "running", query: "Muñoz", court: "Juzgados del Trabajo", results_count: 0, created_at: today, completed_at: null },
];

const scraperResults = [
  { id: 1, job_id: 1, rol: "C-1234-2024", court: "1er Juzgado Civil Santiago", parties: "Pérez SpA vs Banco Central", status: "Vista", last_update: yesterday },
  { id: 2, job_id: 1, rol: "C-9999-2023", court: "3er Juzgado Civil Santiago", parties: "Pérez SpA vs Constructora Norte", status: "Sentenciada", last_update: lastWeek },
];

// ─── Tasks ───
const tasks = [
  { id: 1, title: "Revisar contrato Pérez SpA", description: "Revisión final del contrato de honorarios", status: "pending", type: "review", priority: "high", due_date: nextWeek, assigned_to_name: "María Fernández", matter_title: "Pérez SpA vs Banco Central", created_at: today },
  { id: 2, title: "Preparar escrito demanda", description: "Redactar escrito de demanda para caso Rojas", status: "in_progress", type: "draft", priority: "high", due_date: nextWeek, assigned_to_name: "Carlos Logan", matter_title: "Rojas c/ Inmobiliaria Sur", created_at: yesterday },
  { id: 3, title: "Enviar notificación notarial", description: "Enviar poder notarial firmado", status: "done", type: "notification", priority: "medium", due_date: today, assigned_to_name: "Ana Torres", matter_title: "Herencia González", created_at: lastWeek },
  { id: 4, title: "Agendar audiencia preparatoria", description: "Coordinar fecha con tribunal", status: "pending", type: "scheduling", priority: "medium", due_date: nextMonth, assigned_to_name: "María Fernández", matter_title: "Despido injustificado Muñoz", created_at: today },
];

const taskStats = { total: 4, pending: 2, in_progress: 1, completed: 1, overdue: 0 };

// ─── Documents ───
const documents = [
  { id: 1, name: "Contrato_Perez_SpA.pdf", entity_type: "matter", entity_id: "1", mime_type: "application/pdf", size: 245000, uploaded_by_name: "Carlos Logan", status: "active", created_at: lastWeek },
  { id: 2, name: "Poder_Gonzalez.pdf", entity_type: "notary", entity_id: "1", mime_type: "application/pdf", size: 120000, uploaded_by_name: "Ana Torres", status: "active", created_at: yesterday },
  { id: 3, name: "Demanda_Rojas.docx", entity_type: "matter", entity_id: "2", mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 89000, uploaded_by_name: "María Fernández", status: "draft", created_at: today },
];

// ─── Admin ───
const adminUsers = [
  { id: 1, email: "admin@logan.cl", full_name: "Carlos Logan", role: "gerente_legal", active: true, last_login: today, created_at: lastWeek },
  { id: 2, email: "abogado@logan.cl", full_name: "María Fernández", role: "abogado", active: true, last_login: yesterday, created_at: lastWeek },
  { id: 3, email: "secretaria@logan.cl", full_name: "Ana Torres", role: "secretaria", active: true, last_login: today, created_at: lastWeek },
];

const adminTemplates = [
  { id: 1, name: "Contrato de Honorarios", category: "contratos", status: "active", created_at: lastWeek },
  { id: 2, name: "Poder Simple", category: "notarial", status: "active", created_at: lastWeek },
  { id: 3, name: "Demanda Civil", category: "litigio", status: "active", created_at: lastWeek },
];

// ─── Timeline (generic for detail pages) ───
const timeline = [
  { id: 1, action: "Creación", description: "Registro creado en el sistema", user_name: "Carlos Logan", created_at: lastWeek },
  { id: 2, action: "Actualización", description: "Estado actualizado", user_name: "María Fernández", created_at: yesterday },
  { id: 3, action: "Comentario", description: "Se revisaron los documentos adjuntos", user_name: "Ana Torres", created_at: today },
];

// ─── Detail objects ───
const leadDetail = (id: string) => ({
  ...leads.items.find((l) => String(l.id) === id) || leads.items[0],
  interactions: [
    { id: 1, type: "call", notes: "Llamada inicial de consulta", created_by_name: "María Fernández", created_at: yesterday },
    { id: 2, type: "email", notes: "Envío de información del estudio", created_by_name: "Ana Torres", created_at: today },
  ],
});

const clientDetail = (id: string) => ({
  ...clients.find((c) => String(c.id) === id) || clients[0],
  matters: matters.items.slice(0, 2),
  invoices: invoices.slice(0, 2),
  contacts: [{ id: 1, name: "Juan Pérez", role: "Gerente General", email: "jperez@empresa.cl", phone: "+56912345678" }],
});

const matterDetail = (id: string) => ({
  ...matters.items.find((m) => String(m.id) === id) || matters.items[0],
  tasks: tasks.slice(0, 2),
  documents: documents.slice(0, 2),
  timeline,
});

const proposalDetail = (id: string) => ({
  ...proposals.items.find((p) => String(p.id) === id) || proposals.items[0],
  items: [
    { id: 1, description: "Asesoría legal mensual", quantity: 1, unit_price: 2000000, total: 2000000 },
    { id: 2, description: "Representación en audiencias", quantity: 3, unit_price: 500000, total: 1500000 },
  ],
});

const contractDetail = (id: string) => ({
  ...contracts.find((c) => String(c.id) === id) || contracts[0],
  clauses: [],
  attachments: documents.slice(0, 1),
});

const notaryDetail = (id: string) => ({
  ...notaryDocs.find((n) => String(n.id) === id) || notaryDocs[0],
  contact_attempts: [
    { id: 1, type: "phone", notes: "Llamada a notaría para consultar estado", result: "Documento en revisión", created_by_name: "Ana Torres", created_at: yesterday },
  ],
});

const invoiceDetail = (id: string) => ({
  ...invoices.find((i) => String(i.id) === id) || invoices[0],
  payments: [
    { id: 1, amount: 250000, method: "transfer", reference: "TRF-001", notes: "Abono parcial", created_at: yesterday },
  ],
  collection_case: id === "2" ? collectionCases[0] : null,
});

const emailTicketDetail = (id: string) => ({
  ...emailTickets.find((t) => String(t.id) === id) || emailTickets[0],
  messages: [
    { id: 1, from: "rsanchez@empresa.cl", body: "Estimados, necesito consultar sobre el plazo de contestación.", created_at: yesterday },
    { id: 2, from: "mfernandez@logan.cl", body: "Estimado Roberto, el plazo vence el próximo viernes.", created_at: today },
  ],
});

// ─── Agent Logs (v3 – agent activity feed) ───
const agentLogs = [
  { id: "al1", agentName: "Secretaria", action: "Auto-creó seguimiento para propuesta Sánchez", detail: "Han pasado 72 horas desde el envío. Se programó recordatorio.", timestamp: new Date(Date.now() - 30 * 60000).toISOString(), status: "completed" as const, entityType: "proposal", entityId: "1", actionRequired: false },
  { id: "al2", agentName: "Jefe Cobranza", action: "Recomienda escalar factura Inmobiliaria Sur", detail: "3 intentos de contacto sin respuesta. Deuda: $1.800.000", timestamp: new Date(Date.now() - 90 * 60000).toISOString(), status: "pending_approval" as const, entityType: "invoice", entityId: "2", actionRequired: true },
  { id: "al3", agentName: "Abogado", action: "Revisó cláusula de indemnización en contrato Pérez SpA", detail: "Encontró inconsistencia en el monto máximo. Requiere validación.", timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), status: "pending_approval" as const, entityType: "contract", entityId: "1", actionRequired: true },
  { id: "al4", agentName: "Revisor de Causas", action: "Verificó movimientos en Poder Judicial", detail: "Causa C-1234-2024: sin movimientos nuevos. Causa C-5678-2024: nueva resolución.", timestamp: new Date(Date.now() - 3 * 3600000).toISOString(), status: "completed" as const, entityType: "matter", entityId: "1", actionRequired: false },
  { id: "al5", agentName: "Secretaria", action: "Clasificó correo del Tribunal Civil como urgente", detail: "Solicitud de copia de expediente con plazo de 48 horas.", timestamp: new Date(Date.now() - 4 * 3600000).toISOString(), status: "completed" as const, entityType: "email_ticket", entityId: "4", actionRequired: false },
  { id: "al6", agentName: "Abogado", action: "Generó borrador de respuesta para correo Sánchez", detail: "Borrador listo para revisión. Incluye plazo de contestación.", timestamp: new Date(Date.now() - 5 * 3600000).toISOString(), status: "pending_approval" as const, entityType: "email_ticket", entityId: "1", actionRequired: true },
  { id: "al7", agentName: "Procurador", action: "Confirmó retiro de documento en Notaría 23", detail: "Poder notarial González retirado exitosamente.", timestamp: new Date(Date.now() - 6 * 3600000).toISOString(), status: "completed" as const, entityType: "notary", entityId: "1", actionRequired: false },
  { id: "al8", agentName: "Comercial", action: "Detectó nuevo lead desde LegalBOT", detail: "Andrés Riquelme - Minera del Norte - Consulta derecho minero", timestamp: new Date(Date.now() - 7 * 3600000).toISOString(), status: "completed" as const, entityType: "lead", entityId: "5", actionRequired: false },
];

// ─── Calendar Events (v3) ───
const calendarEvents = [
  { id: "ev1", title: "Audiencia preparatoria - Rojas c/ Inmobiliaria Sur", date: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0], time: "09:30", type: "audiencia", location: "2do Juzgado Civil Santiago", matterId: "2", color: "blue" },
  { id: "ev2", title: "Reunión con cliente - Minera del Norte", date: new Date(Date.now() + 1 * 86400000).toISOString().split("T")[0], time: "11:00", type: "reunion", location: "Oficina Logan", matterId: null, color: "green" },
  { id: "ev3", title: "Vencimiento poder notarial González", date: new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0], time: null, type: "plazo", location: null, matterId: null, color: "red" },
  { id: "ev4", title: "Plazo contestación demanda - Pérez SpA", date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0], time: "23:59", type: "plazo", location: "1er Juzgado Civil Santiago", matterId: "1", color: "red" },
  { id: "ev5", title: "Seguimiento propuesta Sánchez", date: new Date(Date.now() + 1 * 86400000).toISOString().split("T")[0], time: "15:00", type: "seguimiento", location: null, matterId: null, color: "yellow" },
  { id: "ev6", title: "Audiencia de juicio - Despido Muñoz", date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0], time: "10:00", type: "audiencia", location: "1er Juzgado del Trabajo", matterId: "4", color: "blue" },
];

// ─── Route matcher ───
export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem("demo_user");
}

export function getMockData(path: string): any {
  // Strip query params for matching
  const cleanPath = path.split("?")[0];

  // Dashboard
  if (cleanPath === "/dashboards/overview") return dashboardOverview;
  if (cleanPath === "/dashboards/action-items") return dashboardActionItems;

  // Leads
  if (cleanPath === "/leads") return leads;
  if (cleanPath.match(/^\/leads\/\d+$/)) return leadDetail(cleanPath.split("/")[2]);

  // Clients
  if (cleanPath === "/clients") return clients;
  if (cleanPath.match(/^\/clients\/\d+\/360$/)) return clientDetail(cleanPath.split("/")[2]);

  // Matters
  if (cleanPath === "/matters") return matters;
  if (cleanPath.match(/^\/matters\/\d+$/)) return matterDetail(cleanPath.split("/")[2]);

  // Proposals
  if (cleanPath === "/proposals") return proposals;
  if (cleanPath.match(/^\/proposals\/\d+$/)) return proposalDetail(cleanPath.split("/")[2]);

  // Contracts
  if (cleanPath === "/contracts") return contracts;
  if (cleanPath.match(/^\/contracts\/\d+$/)) return contractDetail(cleanPath.split("/")[2]);
  if (cleanPath.match(/^\/contracts\/\d+\/timeline$/)) return timeline;

  // Notary
  if (cleanPath === "/notary") return notaryDocs;
  if (cleanPath === "/notary/stats") return notaryStats;
  if (cleanPath.match(/^\/notary\/\d+$/)) return notaryDetail(cleanPath.split("/")[2]);
  if (cleanPath.match(/^\/notary\/\d+\/timeline$/)) return timeline;
  if (cleanPath.match(/^\/notary\/\d+\/contact-attempts$/)) return notaryDetail("1").contact_attempts;

  // Case Review
  if (cleanPath === "/case-review/open-matters") return openMatters;

  // Collections
  if (cleanPath === "/collections/invoices") return invoices;
  if (cleanPath === "/collections/cases") return collectionCases;
  if (cleanPath === "/collections/stats") return collectionStats;
  if (cleanPath.match(/^\/collections\/invoices\/\d+$/)) return invoiceDetail(cleanPath.split("/")[3]);
  if (cleanPath.match(/^\/collections\/invoices\/\d+\/payments$/)) return invoiceDetail("3").payments;

  // Email Tickets
  if (cleanPath === "/email-tickets") return emailTickets;
  if (cleanPath.match(/^\/email-tickets\/\d+$/)) return emailTicketDetail(cleanPath.split("/")[2]);
  if (cleanPath.match(/^\/email-tickets\/\d+\/timeline$/)) return timeline;
  if (cleanPath.match(/^\/email-tickets\/stats$/) || cleanPath === "/email-tickets/stats") return emailTicketStats;

  // Scraper
  if (cleanPath === "/scraper/jobs") return scraperJobs;
  if (cleanPath.match(/^\/scraper\/jobs\/\d+\/results$/)) return scraperResults;

  // Tasks
  if (cleanPath === "/tasks") return { items: tasks, total: tasks.length };
  if (cleanPath === "/tasks/stats") return taskStats;

  // Documents
  if (cleanPath === "/documents") return documents;

  // Admin
  if (cleanPath === "/admin/users") return adminUsers;
  if (cleanPath === "/admin/templates") return adminTemplates;

  // AI (matters list for AI page)
  if (cleanPath === "/ai/chat" || cleanPath === "/ai/draft-email" || cleanPath === "/ai/draft-proposal" || cleanPath === "/ai/summarize-case") {
    return { response: "Esta es una respuesta de demostración del asistente AI. En producción, esto estará conectado al modelo de lenguaje." };
  }

  // Agent Logs (v3)
  if (cleanPath === "/agent-logs") return agentLogs;

  // Calendar Events (v3)
  if (cleanPath === "/calendar/events") return calendarEvents;

  // Default: return empty
  return null;
}

// Mock for POST/PATCH operations — just return success
export function getMockMutationResponse(path: string, method: string): any {
  if (method === "POST" || method === "PATCH" || method === "PUT") {
    return { success: true, message: "Operación realizada (modo demo)" };
  }
  if (method === "DELETE") {
    return {};
  }
  return null;
}
