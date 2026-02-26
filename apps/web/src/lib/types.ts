// ============================================================
// TypeScript interfaces matching all backend schemas
// ============================================================

// ---------- Base ----------
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// ---------- Auth ----------
export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// ---------- Organization ----------
export interface Organization {
  id: string;
  name: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

// ---------- User ----------
export type RoleEnum =
  | "admin"
  | "abogado_jefe"
  | "abogado"
  | "procurador"
  | "asistente_legal"
  | "recepcion"
  | "administracion"
  | "cobranza"
  | "pasante";

export interface User {
  id: string;
  organization_id: string;
  email: string;
  full_name: string;
  role: RoleEnum;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserCreate {
  email: string;
  full_name: string;
  role: RoleEnum;
  password: string;
}

export interface UserUpdate {
  email?: string;
  full_name?: string;
  role?: RoleEnum;
  is_active?: boolean;
  password?: string;
}

// ---------- Lead ----------
export type LeadSource = "telefono" | "walk_in" | "web" | "referido" | "scraper" | "otro";
export type LeadStatus =
  | "nuevo"
  | "contacto_intentado"
  | "reunion_agendada"
  | "en_evaluacion"
  | "convertido"
  | "descartado";

export interface Lead {
  id: string;
  organization_id: string;
  source: LeadSource;
  status: LeadStatus;
  full_name: string;
  email: string | null;
  phone: string | null;
  rut: string | null;
  subject: string | null;
  notes: string | null;
  contact_attempts: number;
  last_contact_at: string | null;
  meeting_scheduled_at: string | null;
  assigned_to_user_id: string | null;
  assigned_to?: User;
  converted_client_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadCreate {
  source: LeadSource;
  full_name: string;
  email?: string;
  phone?: string;
  rut?: string;
  subject?: string;
  notes?: string;
}

export interface LeadUpdate {
  source?: LeadSource;
  status?: LeadStatus;
  full_name?: string;
  email?: string;
  phone?: string;
  rut?: string;
  subject?: string;
  notes?: string;
  assigned_to_user_id?: string;
}

// ---------- Client ----------
export interface Client {
  id: string;
  organization_id: string;
  full_name_or_company: string;
  rut: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  converted_from_lead_id: string | null;
  matters?: Matter[];
  created_at: string;
  updated_at: string;
}

export interface ClientCreate {
  full_name_or_company: string;
  rut?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface ClientUpdate {
  full_name_or_company?: string;
  rut?: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  is_active?: boolean;
}

// ---------- Matter ----------
export type MatterType = "civil" | "laboral" | "familia" | "penal" | "jpl" | "otro";
export type MatterStatus =
  | "abierto"
  | "en_tramite"
  | "en_revision"
  | "suspendido"
  | "cerrado_favorable"
  | "cerrado_desfavorable"
  | "archivado";

export interface Matter {
  id: string;
  organization_id: string;
  client_id: string;
  client?: Client;
  matter_type: MatterType;
  title: string;
  description: string | null;
  court_name: string | null;
  rol_number: string | null;
  status: MatterStatus;
  assigned_lawyer_id: string | null;
  assigned_lawyer?: User;
  assigned_procurador_id: string | null;
  assigned_procurador?: User;
  opened_at: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatterCreate {
  client_id: string;
  matter_type: MatterType;
  title: string;
  description?: string;
  court_name?: string;
  rol_number?: string;
}

export interface MatterUpdate {
  matter_type?: MatterType;
  title?: string;
  description?: string;
  court_name?: string;
  rol_number?: string;
  status?: MatterStatus;
}

// ---------- Proposal ----------
export type ProposalStatus = "borrador" | "enviada" | "aceptada" | "rechazada" | "expirada";

export interface Proposal {
  id: string;
  organization_id: string;
  lead_id: string | null;
  lead?: Lead;
  client_id: string | null;
  client?: Client;
  matter_id: string | null;
  matter?: Matter;
  status: ProposalStatus;
  title: string;
  strategy_summary: string | null;
  amount: number;
  currency: string;
  payment_terms: string | null;
  valid_until: string | null;
  sent_at: string | null;
  followup_due_at: string | null;
  expires_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_by_user_id: string | null;
  created_by?: User;
  created_at: string;
  updated_at: string;
}

export interface ProposalCreate {
  lead_id?: string;
  client_id?: string;
  matter_id?: string;
  title: string;
  strategy_summary?: string;
  amount: number;
  currency?: string;
  payment_terms?: string;
  valid_until?: string;
}

export interface ProposalUpdate {
  title?: string;
  strategy_summary?: string;
  amount?: number;
  currency?: string;
  payment_terms?: string;
  valid_until?: string;
}

// ---------- Contract ----------
export type ContractStatus =
  | "borrador"
  | "en_revision"
  | "aprobado"
  | "cambios_solicitados"
  | "firmado"
  | "scan_subido"
  | "anulado";

export interface Contract {
  id: string;
  organization_id: string;
  client_id: string;
  client?: Client;
  matter_id: string | null;
  matter?: Matter;
  contract_type: string;
  status: ContractStatus;
  title: string;
  content_text: string | null;
  amount: number | null;
  currency: string;
  drafted_by_user_id: string | null;
  drafted_by?: User;
  reviewed_by_user_id: string | null;
  reviewed_by?: User;
  signed_at: string | null;
  scan_uploaded_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---------- Mandate ----------
export type MandateStatus =
  | "borrador"
  | "en_revision"
  | "aprobado"
  | "firmado"
  | "scan_subido"
  | "anulado";

export interface Mandate {
  id: string;
  organization_id: string;
  client_id: string;
  client?: Client;
  matter_id: string | null;
  matter?: Matter;
  status: MandateStatus;
  mandate_type: string;
  content_text: string | null;
  signed_at: string | null;
  scan_uploaded_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---------- Notary Document ----------
export type NotaryDocType = "escritura_publica" | "protocolizacion" | "legalizacion" | "otro";
export type NotaryDocStatus =
  | "pendiente_notaria"
  | "en_notaria"
  | "observado"
  | "listo_para_firma"
  | "firma_cliente_pendiente"
  | "firmado"
  | "inscripcion_pendiente"
  | "inscrito"
  | "archivado";

export interface NotaryDocument {
  id: string;
  organization_id: string;
  client_id: string;
  client?: Client;
  matter_id: string | null;
  matter?: Matter;
  doc_type: NotaryDocType;
  status: NotaryDocStatus;
  title: string;
  notary_name: string | null;
  notary_contact: string | null;
  contact_attempts: number;
  last_contact_at: string | null;
  submitted_to_notary_at: string | null;
  ready_for_signature_at: string | null;
  client_signed_at: string | null;
  inscribed_at: string | null;
  archived_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ---------- Deadline ----------
export type DeadlineSeverity = "baja" | "media" | "alta" | "critica";
export type DeadlineStatus = "pendiente" | "cumplido" | "vencido" | "cancelado";

export interface Deadline {
  id: string;
  matter_id: string;
  title: string;
  description: string | null;
  due_at: string;
  severity: DeadlineSeverity;
  status: DeadlineStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---------- Court Action ----------
export type CourtActionMethod = "escrito" | "oral" | "electronico";
export type CourtActionStatus = "pendiente" | "presentado" | "acuse_recibo" | "resuelto";

export interface CourtAction {
  id: string;
  matter_id: string;
  matter?: Matter;
  action_type: string;
  description: string | null;
  method: CourtActionMethod;
  must_appear_in_court: boolean;
  court_date: string | null;
  status: CourtActionStatus;
  filed_at: string | null;
  receipt_confirmed_at: string | null;
  evidence_document_id: string | null;
  assigned_to_user_id: string | null;
  assigned_to?: User;
  created_at: string;
  updated_at: string;
}

// ---------- Task ----------
export type TaskType = "seguimiento" | "revision" | "plazo" | "cobranza" | "notarial" | "general";
export type TaskStatus = "pendiente" | "en_progreso" | "completada" | "cancelada" | "vencida";
export type SLAPolicy = "24h" | "48h" | "72h" | "semanal" | "sin_sla";

export interface Task {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  entity_type: string | null;
  entity_id: string | null;
  task_type: TaskType;
  status: TaskStatus;
  assigned_to_user_id: string | null;
  assigned_to?: User;
  assigned_role: RoleEnum | null;
  due_at: string | null;
  completed_at: string | null;
  sla_policy: SLAPolicy | null;
  created_at: string;
  updated_at: string;
}

// ---------- Communication ----------
export type CommunicationChannel = "telefono" | "email" | "whatsapp" | "presencial" | "otro";
export type CommunicationDirection = "entrante" | "saliente";

export interface Communication {
  id: string;
  organization_id: string;
  entity_type: string;
  entity_id: string;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  subject: string | null;
  body_text: string | null;
  from_contact: string | null;
  to_contact: string | null;
  logged_by_user_id: string | null;
  logged_by?: User;
  created_at: string;
}

// ---------- Email Ticket ----------
export type EmailTicketStatus =
  | "recibido"
  | "asignado"
  | "borrador_respuesta"
  | "respuesta_enviada"
  | "acuse_confirmado"
  | "cerrado"
  | "sla_riesgo"
  | "sla_incumplido";

export interface EmailTicket {
  id: string;
  organization_id: string;
  client_id: string | null;
  client?: Client;
  matter_id: string | null;
  matter?: Matter;
  subject: string;
  from_email: string;
  body_preview: string | null;
  status: EmailTicketStatus;
  assigned_to_user_id: string | null;
  assigned_to?: User;
  received_at: string;
  sla_due_24h_at: string;
  sla_due_48h_at: string;
  first_response_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ---------- Invoice ----------
export type InvoiceStatus = "borrador" | "emitida" | "pagada" | "parcial" | "vencida" | "anulada";
export type PaymentMethod = "transferencia" | "efectivo" | "cheque" | "tarjeta" | "otro";

export interface Invoice {
  id: string;
  organization_id: string;
  client_id: string;
  client?: Client;
  matter_id: string | null;
  matter?: Matter;
  invoice_number: string;
  status: InvoiceStatus;
  amount: number;
  currency: string;
  paid_amount: number;
  issued_at: string;
  due_at: string;
  paid_at: string | null;
  notes: string | null;
  payments?: Payment[];
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_method: PaymentMethod;
  reference: string | null;
  paid_at: string;
  notes: string | null;
  created_at: string;
}

// ---------- Collection Case ----------
export type CollectionCaseStatus =
  | "pre_cobro"
  | "cobro_activo"
  | "plan_pago"
  | "cobro_judicial"
  | "incobrable"
  | "resuelto";

export interface CollectionCase {
  id: string;
  organization_id: string;
  invoice_id: string;
  invoice?: Invoice;
  status: CollectionCaseStatus;
  contact_attempts: number;
  last_contact_at: string | null;
  next_action_at: string | null;
  notes: string | null;
  assigned_to_user_id: string | null;
  assigned_to?: User;
  created_at: string;
  updated_at: string;
}

// ---------- Document ----------
export type DocumentType = "contrato" | "mandato" | "escrito" | "evidencia" | "scan" | "otro";

export interface Document {
  id: string;
  organization_id: string;
  entity_type: string | null;
  entity_id: string | null;
  doc_type: DocumentType;
  file_name: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  version: number;
  uploaded_by_user_id: string | null;
  uploaded_by?: User;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ---------- Template ----------
export type TemplateType = "email" | "propuesta" | "contrato" | "mandato" | "otro";

export interface Template {
  id: string;
  organization_id: string;
  template_type: TemplateType;
  name: string;
  subject: string | null;
  content_text: string;
  variables_json: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ---------- Scraper ----------
export type ScraperJobStatus = "pendiente" | "ejecutando" | "completado" | "error";

export interface ScraperJob {
  id: string;
  organization_id: string;
  name: string;
  target_url: string;
  search_keywords: string[] | null;
  status: ScraperJobStatus;
  results_count: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScraperResult {
  id: string;
  job_id: string;
  title: string;
  url: string | null;
  snippet: string | null;
  source_type: string | null;
  relevance_score: number | null;
  converted_to_lead_id: string | null;
  raw_data_json: Record<string, unknown> | null;
  created_at: string;
}

// ---------- Dashboard ----------
export interface DashboardOverview {
  leads_nuevos: number;
  propuestas_pendientes: number;
  causas_activas: number;
  tareas_vencidas: number;
  email_sla_riesgo: number;
  cobranzas_activas: number;
  ingresos_mes: number;
  documentos_recientes: number;
}

export interface DashboardByRole {
  role: RoleEnum;
  kpis: Record<string, number>;
  pending_tasks: Task[];
  alerts: DashboardAlert[];
}

export interface DashboardAlert {
  type: "warning" | "danger" | "info";
  message: string;
  entity_type?: string;
  entity_id?: string;
}

// ---------- AI Assistant ----------
export interface AIRequest {
  prompt: string;
  matter_id?: string;
  context?: string;
}

export interface AIResponse {
  response: string;
  confidence: number;
  provider: string;
  tokens_used?: number;
}

// ---------- Audit Log ----------
export interface AuditLog {
  id: string;
  organization_id: string;
  actor_user_id: string | null;
  actor?: User;
  action: string;
  entity_type: string;
  entity_id: string;
  before_json: Record<string, unknown> | null;
  after_json: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ---------- AI Agent ----------
export type AgentTaskStatus = "pending" | "running" | "completed" | "failed" | "escalated";
export type AgentTaskTrigger = "scheduled" | "event" | "manual" | "agent_request";
export type AgentMessageRole = "system" | "user" | "assistant" | "tool";

export interface AIAgentSkill {
  id: number;
  agent_id: number;
  skill_key: string;
  skill_name: string;
  is_autonomous: boolean;
  is_enabled: boolean;
  config_json: Record<string, unknown> | null;
}

export interface AIAgent {
  id: number;
  organization_id: number;
  role: string;
  display_name: string;
  avatar_url: string | null;
  model_provider: string;
  model_name: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
  skills: AIAgentSkill[];
  created_at: string;
  updated_at: string;
}

export interface AIAgentTask {
  id: number;
  organization_id: number;
  agent_id: number;
  task_type: string;
  trigger_type: AgentTaskTrigger;
  status: AgentTaskStatus;
  input_data: Record<string, unknown> | null;
  output_data: Record<string, unknown> | null;
  error_message: string | null;
  escalation_reason: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentConversationMessage {
  id: number;
  thread_id: string;
  message_role: AgentMessageRole;
  content: string;
  tool_calls: Record<string, unknown>[] | null;
  token_count_input: number | null;
  token_count_output: number | null;
  model_used: string | null;
  latency_ms: number | null;
  created_at: string;
}

export interface AgentCostSummary {
  agent_id: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_tasks: number;
  estimated_cost_usd: number;
}

export interface AgentExecuteResponse {
  agent_id: number;
  task_id: number;
  thread_id: string;
  response: string;
  status: AgentTaskStatus;
  escalation_reason: string | null;
}

// ---------- Timeline Event (frontend composite) ----------
export interface TimelineEvent {
  id: string;
  type: "status_change" | "communication" | "task" | "audit" | "note";
  title: string;
  description?: string;
  timestamp: string;
  actor?: string;
  metadata?: Record<string, unknown>;
}
