// Mock data for demo mode (no backend required)

const today = new Date().toISOString().split("T")[0];
const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
const lastWeek = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
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
    { status: "qualified", count: 5 },
    { status: "proposal_sent", count: 3 },
    { status: "converted", count: 15 },
    { status: "lost", count: 4 },
  ],
  matters_by_type: [
    { type: "civil", count: 14 },
    { type: "laboral", count: 9 },
    { type: "penal", count: 5 },
    { type: "familia", count: 4 },
    { type: "corporativo", count: 2 },
  ],
  overdue_tasks: [
    { id: 1, title: "Revisar contrato Pérez SpA", due_date: yesterday, assigned_to_name: "María Fernández", matter_title: "Pérez SpA vs Banco Central" },
    { id: 2, title: "Preparar escrito demanda", due_date: lastWeek, assigned_to_name: "Carlos Logan", matter_title: "Rojas c/ Inmobiliaria Sur" },
    { id: 3, title: "Enviar notificación notarial", due_date: yesterday, assigned_to_name: "Ana Torres", matter_title: "Herencia González" },
  ],
  critical_deadlines: [
    { id: 1, title: "Plazo contestación demanda", due_date: nextWeek, severity: "high", matter_title: "Pérez SpA vs Banco Central" },
    { id: 2, title: "Audiencia preparatoria", due_date: nextMonth, severity: "medium", matter_title: "Rojas c/ Inmobiliaria Sur" },
    { id: 3, title: "Vencimiento poder notarial", due_date: nextWeek, severity: "critical", matter_title: "Herencia González" },
  ],
};

// ─── Leads ───
const leads = {
  items: [
    { id: 1, full_name: "Roberto Sánchez", email: "rsanchez@empresa.cl", phone: "+56912345678", company: "Empresa Sánchez Ltda.", source: "referral", status: "new", notes: "Interesado en asesoría laboral", assigned_to_name: "María Fernández", created_at: today },
    { id: 2, full_name: "Patricia Muñoz", email: "pmunoz@gmail.com", phone: "+56987654321", company: "Muñoz & Asociados", source: "website", status: "contacted", notes: "Consulta por litigio comercial", assigned_to_name: "Carlos Logan", created_at: yesterday },
    { id: 3, full_name: "Diego Herrera", email: "dherrera@corp.cl", phone: "+56911223344", company: "Herrera Corp.", source: "referral", status: "qualified", notes: "Necesita representación en juicio civil", assigned_to_name: "María Fernández", created_at: lastWeek },
    { id: 4, full_name: "Camila Vega", email: "cvega@vegalaw.cl", phone: "+56955667788", company: null, source: "cold_call", status: "proposal_sent", notes: "Propuesta enviada para caso familia", assigned_to_name: "Carlos Logan", created_at: lastWeek },
    { id: 5, full_name: "Andrés Riquelme", email: "ariquelme@minera.cl", phone: "+56933445566", company: "Minera del Norte S.A.", source: "website", status: "new", notes: "Consulta por derecho minero", assigned_to_name: "María Fernández", created_at: today },
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

// ─── Matters ───
const matters = {
  items: [
    { id: 1, title: "Pérez SpA vs Banco Central", type: "civil", status: "active", client_name: "Pérez SpA", assigned_to_name: "Carlos Logan", court: "1er Juzgado Civil Santiago", rol: "C-1234-2024", created_at: lastWeek, next_hearing_date: nextMonth },
    { id: 2, title: "Rojas c/ Inmobiliaria Sur", type: "civil", status: "active", client_name: "Juan Rojas Muñoz", assigned_to_name: "María Fernández", court: "2do Juzgado Civil Santiago", rol: "C-5678-2024", created_at: lastWeek, next_hearing_date: nextWeek },
    { id: 3, title: "Herencia González", type: "familia", status: "active", client_name: "María González Torres", assigned_to_name: "Carlos Logan", court: "Juzgado de Familia Santiago", rol: "F-9012-2024", created_at: lastWeek, next_hearing_date: null },
    { id: 4, title: "Despido injustificado Muñoz", type: "laboral", status: "active", client_name: "Patricia Muñoz", assigned_to_name: "María Fernández", court: "1er Juzgado del Trabajo", rol: "T-3456-2024", created_at: lastWeek, next_hearing_date: nextMonth },
    { id: 5, title: "Constitución sociedad Herrera", type: "corporativo", status: "closed", client_name: "Herrera Corp.", assigned_to_name: "Carlos Logan", court: null, rol: null, created_at: lastWeek, next_hearing_date: null },
  ],
  total: 5,
};

// ─── Proposals ───
const proposals = {
  items: [
    { id: 1, title: "Propuesta asesoría laboral Sánchez", client_name: "Empresa Sánchez Ltda.", status: "draft", amount: 3500000, currency: "CLP", valid_until: nextMonth, assigned_to_name: "María Fernández", created_at: today },
    { id: 2, title: "Representación litigio comercial", client_name: "Muñoz & Asociados", status: "sent", amount: 8000000, currency: "CLP", valid_until: nextMonth, assigned_to_name: "Carlos Logan", created_at: yesterday },
    { id: 3, title: "Asesoría derecho minero", client_name: "Minera del Norte S.A.", status: "accepted", amount: 12000000, currency: "CLP", valid_until: nextMonth, assigned_to_name: "Carlos Logan", created_at: lastWeek },
    { id: 4, title: "Caso familia Vega", client_name: "Camila Vega", status: "rejected", amount: 2000000, currency: "CLP", valid_until: yesterday, assigned_to_name: "María Fernández", created_at: lastWeek },
  ],
  total: 4,
};

// ─── Contracts ───
const contracts = [
  { id: 1, title: "Contrato honorarios Pérez SpA", client_name: "Pérez SpA", type: "honorarios", status: "active", start_date: lastWeek, end_date: nextMonth, monthly_fee: 2500000, currency: "CLP", created_at: lastWeek },
  { id: 2, title: "Convenio Inmobiliaria Sur", client_name: "Inmobiliaria Sur Ltda.", type: "convenio", status: "active", start_date: lastWeek, end_date: nextMonth, monthly_fee: 1800000, currency: "CLP", created_at: lastWeek },
  { id: 3, title: "Poder amplio González", client_name: "María González Torres", type: "poder", status: "pending_signature", start_date: today, end_date: null, monthly_fee: null, currency: "CLP", created_at: today },
];

// ─── Notary ───
const notaryDocs = [
  { id: 1, document_type: "poder", title: "Poder notarial González", client_name: "María González Torres", notary_name: "Notaría 23 Santiago", status: "at_notary", submitted_date: yesterday, created_at: lastWeek },
  { id: 2, document_type: "escritura", title: "Escritura constitución Herrera Corp", client_name: "Herrera Corp.", notary_name: "Notaría 15 Santiago", status: "completed", submitted_date: lastWeek, created_at: lastWeek },
  { id: 3, document_type: "certificado", title: "Certificado vigencia Pérez SpA", client_name: "Pérez SpA", notary_name: "Notaría 8 Santiago", status: "pending", submitted_date: null, created_at: today },
];

const notaryStats = { total: 3, pending: 1, at_notary: 1, completed: 1 };

// ─── Collections ───
const invoices = [
  { id: 1, invoice_number: "FAC-001", client_name: "Pérez SpA", amount: 2500000, amount_paid: 2500000, currency: "CLP", status: "paid", due_date: lastWeek, issued_date: lastWeek, created_at: lastWeek },
  { id: 2, invoice_number: "FAC-002", client_name: "Inmobiliaria Sur Ltda.", amount: 1800000, amount_paid: 0, currency: "CLP", status: "overdue", due_date: yesterday, issued_date: lastWeek, created_at: lastWeek },
  { id: 3, invoice_number: "FAC-003", client_name: "Juan Rojas Muñoz", amount: 500000, amount_paid: 250000, currency: "CLP", status: "partial", due_date: nextWeek, issued_date: today, created_at: today },
  { id: 4, invoice_number: "FAC-004", client_name: "María González Torres", amount: 350000, amount_paid: 0, currency: "CLP", status: "pending", due_date: nextMonth, issued_date: today, created_at: today },
];

const collectionCases = [
  { id: 1, invoice_id: 2, client_name: "Inmobiliaria Sur Ltda.", status: "active", total_debt: 1800000, currency: "CLP", contact_attempts: 3, next_action: "Enviar carta certificada", next_action_date: nextWeek, created_at: yesterday },
];

const collectionStats = {
  total_invoices: 4,
  total_outstanding: 2650000,
  overdue_count: 1,
  overdue_amount: 1800000,
  collection_rate: 72.5,
};

// ─── Email Tickets ───
const emailTickets = [
  { id: 1, subject: "Consulta plazo contestación", from_email: "rsanchez@empresa.cl", from_name: "Roberto Sánchez", status: "open", priority: "high", assigned_to_name: "María Fernández", matter_title: "Pérez SpA vs Banco Central", created_at: today, sla_deadline: nextWeek },
  { id: 2, subject: "Envío documentos firmados", from_email: "mgonzalez@email.cl", from_name: "María González", status: "in_progress", priority: "medium", assigned_to_name: "Ana Torres", matter_title: "Herencia González", created_at: yesterday, sla_deadline: nextWeek },
  { id: 3, subject: "Solicitud reunión urgente", from_email: "legal@insur.cl", from_name: "Inmobiliaria Sur", status: "resolved", priority: "low", assigned_to_name: "Carlos Logan", matter_title: "Rojas c/ Inmobiliaria Sur", created_at: lastWeek, sla_deadline: null },
];

const emailTicketStats = { total: 3, open: 1, sla_at_risk: 0, sla_breached: 0, unassigned: 0 };

// ─── Case Review ───
const openMatters = [
  { id: 1, title: "Pérez SpA vs Banco Central", type: "civil", status: "active", client_name: "Pérez SpA", assigned_to_name: "Carlos Logan", last_movement_date: yesterday, days_without_movement: 1 },
  { id: 2, title: "Rojas c/ Inmobiliaria Sur", type: "civil", status: "active", client_name: "Juan Rojas Muñoz", assigned_to_name: "María Fernández", last_movement_date: lastWeek, days_without_movement: 7 },
  { id: 3, title: "Herencia González", type: "familia", status: "active", client_name: "María González Torres", assigned_to_name: "Carlos Logan", last_movement_date: lastWeek, days_without_movement: 7 },
  { id: 4, title: "Despido injustificado Muñoz", type: "laboral", status: "active", client_name: "Patricia Muñoz", assigned_to_name: "María Fernández", last_movement_date: yesterday, days_without_movement: 1 },
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
  { id: 3, title: "Enviar notificación notarial", description: "Enviar poder notarial firmado", status: "completed", type: "notification", priority: "medium", due_date: today, assigned_to_name: "Ana Torres", matter_title: "Herencia González", created_at: lastWeek },
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
  if (cleanPath === "/tasks") return tasks;
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
