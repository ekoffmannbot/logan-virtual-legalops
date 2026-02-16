import enum


class RoleEnum(str, enum.Enum):
    SECRETARIA = "secretaria"
    ADMINISTRACION = "administracion"
    ABOGADO = "abogado"
    ABOGADO_JEFE = "abogado_jefe"
    PROCURADOR = "procurador"
    GERENTE_LEGAL = "gerente_legal"
    JEFE_COBRANZA = "jefe_cobranza"
    AGENTE_COMERCIAL = "agente_comercial"
    CLIENTE_PORTAL = "cliente_portal"


class LeadSourceEnum(str, enum.Enum):
    INBOUND_CALL = "inbound_call"
    WALK_IN = "walk_in"
    SCRAPER_LEGALBOT = "scraper_legalbot"
    REFERRAL = "referral"
    OTHER = "other"


class LeadStatusEnum(str, enum.Enum):
    NEW = "new"
    CONTACTED = "contacted"
    MEETING_SCHEDULED = "meeting_scheduled"
    PROPOSAL_SENT = "proposal_sent"
    WON = "won"
    LOST = "lost"


class MatterTypeEnum(str, enum.Enum):
    CIVIL = "civil"
    JPL = "jpl"
    OTHER = "other"


class MatterStatusEnum(str, enum.Enum):
    OPEN = "open"
    SUSPENDED_NONPAYMENT = "suspended_nonpayment"
    CLOSED = "closed"
    TERMINATED = "terminated"


class ProposalStatusEnum(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    EXPIRED = "expired"


class ContractStatusEnum(str, enum.Enum):
    PENDING_DATA = "pending_data"
    DRAFTING = "drafting"
    PENDING_REVIEW = "pending_review"
    CHANGES_REQUESTED = "changes_requested"
    APPROVED = "approved"
    UPLOADED_FOR_SIGNING = "uploaded_for_signing"
    SIGNED = "signed"
    SCANNED_UPLOADED = "scanned_uploaded"
    COMPLETE = "complete"


class MandateStatusEnum(str, enum.Enum):
    DRAFTING = "drafting"
    SENT_TO_NOTARY = "sent_to_notary"
    SIGNED = "signed"
    UPLOADED = "uploaded"
    COMPLETE = "complete"


class NotaryDocTypeEnum(str, enum.Enum):
    MANDATO = "mandato"
    PODER = "poder"
    OTRO = "otro"


class NotaryDocStatusEnum(str, enum.Enum):
    ANTECEDENTS_REQUESTED = "antecedents_requested"
    ANTECEDENTS_COMPLETE = "antecedents_complete"
    DRAFTING = "drafting"
    SENT_TO_NOTARY = "sent_to_notary"
    NOTARY_RECEIVED = "notary_received"
    NOTARY_SIGNED = "notary_signed"
    CLIENT_CONTACT_PENDING = "client_contact_pending"
    DOCUMENT_AVAILABLE = "document_available"
    CLIENT_SIGNED = "client_signed"
    RETRIEVED_BY_PROCURADOR = "retrieved_by_procurador"
    ARCHIVED = "archived"
    REPORTED_TO_MANAGER = "reported_to_manager"


class DeadlineSeverityEnum(str, enum.Enum):
    LOW = "low"
    MED = "med"
    HIGH = "high"
    CRITICAL = "critical"


class DeadlineStatusEnum(str, enum.Enum):
    OPEN = "open"
    HANDLED = "handled"
    MISSED = "missed"


class CourtActionMethodEnum(str, enum.Enum):
    ELECTRONIC = "electronic"
    IN_PERSON = "in_person"


class CourtActionStatusEnum(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    RECEIPT_PENDING = "receipt_pending"
    RECEIPT_CONFIRMED = "receipt_confirmed"
    FILED = "filed"
    ARCHIVED = "archived"


class TaskTypeEnum(str, enum.Enum):
    FOLLOW_UP_PROPOSAL = "follow_up_proposal"
    CALLBACK = "callback"
    REVIEW_CONTRACT = "review_contract"
    NOTARY_CONTACT = "notary_contact"
    COURT_FILING = "court_filing"
    COLLECTION_REMINDER = "collection_reminder"
    EMAIL_RESPONSE = "email_response"
    SCRAPER_REVIEW = "scraper_review"
    GENERAL = "general"


class TaskStatusEnum(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    CANCELLED = "cancelled"


class SLAPolicyEnum(str, enum.Enum):
    NONE = "none"
    EMAIL_24H = "email_24h"
    EMAIL_48H = "email_48h"
    PROPOSAL_72H = "proposal_72h"
    NOTARY_CONTACT_10_13_17 = "notary_contact_10_13_17"
    COLLECTION_CALL_11_15_18 = "collection_call_11_15_18"


class CommunicationChannelEnum(str, enum.Enum):
    PHONE = "phone"
    EMAIL = "email"
    WHATSAPP = "whatsapp"
    IN_PERSON = "in_person"


class CommunicationDirectionEnum(str, enum.Enum):
    INBOUND = "inbound"
    OUTBOUND = "outbound"


class CommunicationStatusEnum(str, enum.Enum):
    LOGGED = "logged"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"


class EmailTicketStatusEnum(str, enum.Enum):
    NEW = "new"
    DRAFTING = "drafting"
    WAITING_MANAGER_APPROVAL = "waiting_manager_approval"
    SENT = "sent"
    RECEIPT_CONFIRMED = "receipt_confirmed"
    CLOSED = "closed"
    SLA_BREACHED_24H = "sla_breached_24h"
    SLA_BREACHED_48H = "sla_breached_48h"


class InvoiceStatusEnum(str, enum.Enum):
    SCHEDULED = "scheduled"
    DUE = "due"
    OVERDUE = "overdue"
    PAID = "paid"
    CANCELLED = "cancelled"


class PaymentMethodEnum(str, enum.Enum):
    CHEQUE = "cheque"
    TRANSFER = "transfer"
    CASH = "cash"
    OTHER = "other"


class CollectionCaseStatusEnum(str, enum.Enum):
    CHEQUES_PENDING = "cheques_pending"
    PRE_DUE_CONTACT = "pre_due_contact"
    DUE_DAY_CONTACT = "due_day_contact"
    WAITING_PAYMENT_48H = "waiting_payment_48h"
    ESCALATED = "escalated"
    SUSPENDED = "suspended"
    TERMINATED = "terminated"
    PAID = "paid"


class DocumentTypeEnum(str, enum.Enum):
    PROPOSAL_PDF = "proposal_pdf"
    CONTRACT_PDF = "contract_pdf"
    MANDATE_PDF = "mandate_pdf"
    NOTARY_PDF = "notary_pdf"
    COURT_FILING_PDF = "court_filing_pdf"
    EMAIL_ATTACHMENT = "email_attachment"
    OTHER = "other"


class DocumentStatusEnum(str, enum.Enum):
    DRAFT = "draft"
    FINAL = "final"
    SIGNED = "signed"


class TemplateTypeEnum(str, enum.Enum):
    EMAIL = "email"
    PROPOSAL = "proposal"
    CONTRACT = "contract"
    MANDATE = "mandate"


class ScraperJobStatusEnum(str, enum.Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
