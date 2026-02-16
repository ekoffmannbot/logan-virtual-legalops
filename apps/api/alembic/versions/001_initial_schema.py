"""Initial schema - all tables

Revision ID: 001
Revises:
Create Date: 2026-02-11
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Organizations
    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("timezone", sa.String(50), server_default="America/Santiago"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )

    # Users
    role_enum = postgresql.ENUM(
        "secretaria", "administracion", "abogado", "abogado_jefe", "procurador",
        "gerente_legal", "jefe_cobranza", "agente_comercial", "cliente_portal",
        name="role_enum", create_type=False,
    )
    role_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("role", role_enum, nullable=False),
        sa.Column("active", sa.Boolean(), server_default="true"),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_users_organization_id", "users", ["organization_id"])
    op.create_index("ix_users_email", "users", ["email"])

    # Audit Logs
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("actor_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("entity_type", sa.String(100), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("before_json", postgresql.JSONB(), nullable=True),
        sa.Column("after_json", postgresql.JSONB(), nullable=True),
        sa.Column("ip", sa.String(50), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_audit_logs_organization_id", "audit_logs", ["organization_id"])
    op.create_index("ix_audit_logs_entity_type", "audit_logs", ["entity_type"])
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])

    # Leads
    lead_source_enum = postgresql.ENUM("inbound_call", "walk_in", "scraper_legalbot", "referral", "other", name="lead_source_enum", create_type=False)
    lead_status_enum = postgresql.ENUM("new", "contacted", "meeting_scheduled", "proposal_sent", "won", "lost", name="lead_status_enum", create_type=False)
    lead_source_enum.create(op.get_bind(), checkfirst=True)
    lead_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "leads",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("source", lead_source_enum, nullable=False),
        sa.Column("status", lead_status_enum, server_default="new", nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("rut", sa.String(20), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("assigned_to_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_leads_organization_id", "leads", ["organization_id"])
    op.create_index("ix_leads_status", "leads", ["status"])

    # Clients
    op.create_table(
        "clients",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("full_name_or_company", sa.String(255), nullable=False),
        sa.Column("rut", sa.String(20), nullable=True),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("address", sa.Text(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_clients_organization_id", "clients", ["organization_id"])
    op.create_index("ix_clients_rut", "clients", ["rut"])

    # Matters
    matter_type_enum = postgresql.ENUM("civil", "jpl", "other", name="matter_type_enum", create_type=False)
    matter_status_enum = postgresql.ENUM("open", "suspended_nonpayment", "closed", "terminated", name="matter_status_enum", create_type=False)
    matter_type_enum.create(op.get_bind(), checkfirst=True)
    matter_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "matters",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("matter_type", matter_type_enum, nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("court_name", sa.String(255), nullable=True),
        sa.Column("rol_number", sa.String(100), nullable=True),
        sa.Column("status", matter_status_enum, server_default="open", nullable=False),
        sa.Column("assigned_lawyer_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("assigned_procurador_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("opened_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_matters_organization_id", "matters", ["organization_id"])
    op.create_index("ix_matters_client_id", "matters", ["client_id"])
    op.create_index("ix_matters_status", "matters", ["status"])

    # Proposals
    proposal_status_enum = postgresql.ENUM("draft", "sent", "accepted", "rejected", "expired", name="proposal_status_enum", create_type=False)
    proposal_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "proposals",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("lead_id", sa.Integer(), sa.ForeignKey("leads.id"), nullable=True),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=True),
        sa.Column("matter_id", sa.Integer(), sa.ForeignKey("matters.id"), nullable=True),
        sa.Column("status", proposal_status_enum, server_default="draft", nullable=False),
        sa.Column("amount", sa.Integer(), nullable=True),
        sa.Column("currency", sa.String(10), server_default="CLP"),
        sa.Column("payment_terms_text", sa.Text(), nullable=True),
        sa.Column("strategy_summary_text", sa.Text(), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("followup_due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_proposals_organization_id", "proposals", ["organization_id"])
    op.create_index("ix_proposals_status", "proposals", ["status"])

    # Contracts
    contract_status_enum = postgresql.ENUM(
        "pending_data", "drafting", "pending_review", "changes_requested",
        "approved", "uploaded_for_signing", "signed", "scanned_uploaded", "complete",
        name="contract_status_enum", create_type=False,
    )
    contract_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "contracts",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("matter_id", sa.Integer(), sa.ForeignKey("matters.id"), nullable=True),
        sa.Column("status", contract_status_enum, server_default="pending_data", nullable=False),
        sa.Column("drafted_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("reviewed_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("signed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_contracts_organization_id", "contracts", ["organization_id"])
    op.create_index("ix_contracts_status", "contracts", ["status"])
    op.create_index("ix_contracts_client_id", "contracts", ["client_id"])

    # Mandates
    mandate_status_enum = postgresql.ENUM("drafting", "sent_to_notary", "signed", "uploaded", "complete", name="mandate_status_enum", create_type=False)
    mandate_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "mandates",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("matter_id", sa.Integer(), sa.ForeignKey("matters.id"), nullable=True),
        sa.Column("status", mandate_status_enum, server_default="drafting", nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_mandates_organization_id", "mandates", ["organization_id"])
    op.create_index("ix_mandates_status", "mandates", ["status"])

    # Notary Documents
    notary_doc_type_enum = postgresql.ENUM("mandato", "poder", "otro", name="notary_doc_type_enum", create_type=False)
    notary_doc_status_enum = postgresql.ENUM(
        "antecedents_requested", "antecedents_complete", "drafting", "sent_to_notary",
        "notary_received", "notary_signed", "client_contact_pending", "document_available",
        "client_signed", "retrieved_by_procurador", "archived", "reported_to_manager",
        name="notary_doc_status_enum", create_type=False,
    )
    notary_doc_type_enum.create(op.get_bind(), checkfirst=True)
    notary_doc_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "notary_documents",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("matter_id", sa.Integer(), sa.ForeignKey("matters.id"), nullable=True),
        sa.Column("doc_type", notary_doc_type_enum, nullable=False),
        sa.Column("status", notary_doc_status_enum, server_default="antecedents_requested", nullable=False),
        sa.Column("notary_name", sa.String(255), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notary_signed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("client_signed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notary_documents_organization_id", "notary_documents", ["organization_id"])
    op.create_index("ix_notary_documents_status", "notary_documents", ["status"])

    # Deadlines
    deadline_severity_enum = postgresql.ENUM("low", "med", "high", "critical", name="deadline_severity_enum", create_type=False)
    deadline_status_enum = postgresql.ENUM("open", "handled", "missed", name="deadline_status_enum", create_type=False)
    deadline_severity_enum.create(op.get_bind(), checkfirst=True)
    deadline_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "deadlines",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("matter_id", sa.Integer(), sa.ForeignKey("matters.id"), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("severity", deadline_severity_enum, server_default="med", nullable=False),
        sa.Column("status", deadline_status_enum, server_default="open", nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_deadlines_organization_id", "deadlines", ["organization_id"])
    op.create_index("ix_deadlines_matter_id", "deadlines", ["matter_id"])
    op.create_index("ix_deadlines_due_at", "deadlines", ["due_at"])
    op.create_index("ix_deadlines_status", "deadlines", ["status"])

    # Documents (must be before court_actions due to FK)
    document_type_enum = postgresql.ENUM("proposal_pdf", "contract_pdf", "mandate_pdf", "notary_pdf", "court_filing_pdf", "email_attachment", "other", name="document_type_enum", create_type=False)
    document_status_enum = postgresql.ENUM("draft", "final", "signed", name="document_status_enum", create_type=False)
    document_type_enum.create(op.get_bind(), checkfirst=True)
    document_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "documents",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("entity_type", sa.String(100), nullable=True),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("doc_type", document_type_enum, nullable=False),
        sa.Column("file_name", sa.String(500), nullable=False),
        sa.Column("storage_path", sa.String(1000), nullable=False),
        sa.Column("version_int", sa.Integer(), server_default="1"),
        sa.Column("status", document_status_enum, server_default="draft", nullable=False),
        sa.Column("uploaded_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("metadata_json", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_documents_organization_id", "documents", ["organization_id"])
    op.create_index("ix_documents_entity_type", "documents", ["entity_type"])

    # Court Actions
    court_action_method_enum = postgresql.ENUM("electronic", "in_person", name="court_action_method_enum", create_type=False)
    court_action_status_enum = postgresql.ENUM("draft", "sent", "receipt_pending", "receipt_confirmed", "filed", "archived", name="court_action_status_enum", create_type=False)
    court_action_method_enum.create(op.get_bind(), checkfirst=True)
    court_action_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "court_actions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("matter_id", sa.Integer(), sa.ForeignKey("matters.id"), nullable=False),
        sa.Column("action_type", sa.String(255), nullable=False),
        sa.Column("method", court_action_method_enum, nullable=False),
        sa.Column("must_appear_in_court", sa.Boolean(), server_default="false"),
        sa.Column("status", court_action_status_enum, server_default="draft", nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("receipt_confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("evidence_document_id", sa.Integer(), sa.ForeignKey("documents.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_court_actions_organization_id", "court_actions", ["organization_id"])
    op.create_index("ix_court_actions_matter_id", "court_actions", ["matter_id"])
    op.create_index("ix_court_actions_status", "court_actions", ["status"])

    # Tasks
    task_type_enum = postgresql.ENUM(
        "follow_up_proposal", "callback", "review_contract", "notary_contact",
        "court_filing", "collection_reminder", "email_response", "scraper_review", "general",
        name="task_type_enum", create_type=False,
    )
    task_status_enum = postgresql.ENUM("open", "in_progress", "done", "cancelled", name="task_status_enum", create_type=False)
    sla_policy_enum = postgresql.ENUM(
        "none", "email_24h", "email_48h", "proposal_72h",
        "notary_contact_10_13_17", "collection_call_11_15_18",
        name="sla_policy_enum", create_type=False,
    )
    task_type_enum.create(op.get_bind(), checkfirst=True)
    task_status_enum.create(op.get_bind(), checkfirst=True)
    sla_policy_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "tasks",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("entity_type", sa.String(100), nullable=True),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("task_type", task_type_enum, server_default="general", nullable=False),
        sa.Column("status", task_status_enum, server_default="open", nullable=False),
        sa.Column("assigned_to_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("assigned_role", sa.String(50), nullable=True),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sla_policy", sla_policy_enum, server_default="none", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_tasks_organization_id", "tasks", ["organization_id"])
    op.create_index("ix_tasks_status", "tasks", ["status"])
    op.create_index("ix_tasks_assigned_to_user_id", "tasks", ["assigned_to_user_id"])
    op.create_index("ix_tasks_due_at", "tasks", ["due_at"])
    op.create_index("ix_tasks_entity_type", "tasks", ["entity_type"])

    # Communications
    comm_channel_enum = postgresql.ENUM("phone", "email", "whatsapp", "in_person", name="comm_channel_enum", create_type=False)
    comm_direction_enum = postgresql.ENUM("inbound", "outbound", name="comm_direction_enum", create_type=False)
    comm_status_enum = postgresql.ENUM("logged", "sent", "delivered", "failed", name="comm_status_enum", create_type=False)
    comm_channel_enum.create(op.get_bind(), checkfirst=True)
    comm_direction_enum.create(op.get_bind(), checkfirst=True)
    comm_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "communications",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("entity_type", sa.String(100), nullable=True),
        sa.Column("entity_id", sa.Integer(), nullable=True),
        sa.Column("channel", comm_channel_enum, nullable=False),
        sa.Column("direction", comm_direction_enum, nullable=False),
        sa.Column("subject", sa.String(500), nullable=True),
        sa.Column("body_text", sa.Text(), nullable=True),
        sa.Column("from_value", sa.String(255), nullable=True),
        sa.Column("to_value", sa.String(255), nullable=True),
        sa.Column("status", comm_status_enum, server_default="logged", nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("external_message_id", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_communications_organization_id", "communications", ["organization_id"])
    op.create_index("ix_communications_entity_type", "communications", ["entity_type"])

    # Email Tickets
    email_ticket_status_enum = postgresql.ENUM(
        "new", "drafting", "waiting_manager_approval", "sent",
        "receipt_confirmed", "closed", "sla_breached_24h", "sla_breached_48h",
        name="email_ticket_status_enum", create_type=False,
    )
    email_ticket_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "email_tickets",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=True),
        sa.Column("matter_id", sa.Integer(), sa.ForeignKey("matters.id"), nullable=True),
        sa.Column("subject", sa.String(500), nullable=False),
        sa.Column("from_email", sa.String(255), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("status", email_ticket_status_enum, server_default="new", nullable=False),
        sa.Column("assigned_to_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("sla_due_24h_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("sla_due_48h_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_outbound_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_email_tickets_organization_id", "email_tickets", ["organization_id"])
    op.create_index("ix_email_tickets_status", "email_tickets", ["status"])

    # Invoices
    invoice_status_enum = postgresql.ENUM("scheduled", "due", "overdue", "paid", "cancelled", name="invoice_status_enum", create_type=False)
    payment_method_enum = postgresql.ENUM("cheque", "transfer", "cash", "other", name="payment_method_enum", create_type=False)
    invoice_status_enum.create(op.get_bind(), checkfirst=True)
    payment_method_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "invoices",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("client_id", sa.Integer(), sa.ForeignKey("clients.id"), nullable=False),
        sa.Column("matter_id", sa.Integer(), sa.ForeignKey("matters.id"), nullable=True),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(10), server_default="CLP"),
        sa.Column("due_date", sa.Date(), nullable=False),
        sa.Column("status", invoice_status_enum, server_default="scheduled", nullable=False),
        sa.Column("payment_method", payment_method_enum, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_invoices_organization_id", "invoices", ["organization_id"])
    op.create_index("ix_invoices_due_date", "invoices", ["due_date"])
    op.create_index("ix_invoices_status", "invoices", ["status"])
    op.create_index("ix_invoices_client_id", "invoices", ["client_id"])

    # Payments
    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("invoice_id", sa.Integer(), sa.ForeignKey("invoices.id"), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("reference_text", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_payments_organization_id", "payments", ["organization_id"])
    op.create_index("ix_payments_invoice_id", "payments", ["invoice_id"])

    # Collection Cases
    collection_case_status_enum = postgresql.ENUM(
        "cheques_pending", "pre_due_contact", "due_day_contact", "waiting_payment_48h",
        "escalated", "suspended", "terminated", "paid",
        name="collection_case_status_enum", create_type=False,
    )
    collection_case_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "collection_cases",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("invoice_id", sa.Integer(), sa.ForeignKey("invoices.id"), nullable=False),
        sa.Column("status", collection_case_status_enum, server_default="cheques_pending", nullable=False),
        sa.Column("last_contact_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_action_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("suspended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("terminated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_collection_cases_organization_id", "collection_cases", ["organization_id"])
    op.create_index("ix_collection_cases_status", "collection_cases", ["status"])
    op.create_index("ix_collection_cases_next_action_at", "collection_cases", ["next_action_at"])

    # Templates
    template_type_enum = postgresql.ENUM("email", "proposal", "contract", "mandate", name="template_type_enum", create_type=False)
    template_type_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "templates",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("template_type", template_type_enum, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("content_text", sa.Text(), nullable=False),
        sa.Column("variables_json", postgresql.JSONB(), nullable=True),
        sa.Column("active", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_templates_organization_id", "templates", ["organization_id"])

    # Scraper Jobs
    scraper_job_status_enum = postgresql.ENUM("queued", "running", "completed", "failed", name="scraper_job_status_enum", create_type=False)
    scraper_job_status_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "scraper_jobs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("keyword", sa.String(255), nullable=False),
        sa.Column("base_url", sa.String(1000), nullable=False),
        sa.Column("page_limit_int", sa.Integer(), server_default="200"),
        sa.Column("status", scraper_job_status_enum, server_default="queued", nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("results_count_int", sa.Integer(), server_default="0"),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_scraper_jobs_organization_id", "scraper_jobs", ["organization_id"])
    op.create_index("ix_scraper_jobs_status", "scraper_jobs", ["status"])

    # Scraper Results
    op.create_table(
        "scraper_results",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id"), nullable=False),
        sa.Column("scraper_job_id", sa.Integer(), sa.ForeignKey("scraper_jobs.id"), nullable=False),
        sa.Column("url", sa.String(2000), nullable=False),
        sa.Column("title", sa.String(500), nullable=True),
        sa.Column("snippet", sa.Text(), nullable=True),
        sa.Column("found_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("converted_lead_id", sa.Integer(), sa.ForeignKey("leads.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_scraper_results_organization_id", "scraper_results", ["organization_id"])
    op.create_index("ix_scraper_results_scraper_job_id", "scraper_results", ["scraper_job_id"])


def downgrade() -> None:
    tables = [
        "scraper_results", "scraper_jobs", "templates", "collection_cases",
        "payments", "invoices", "email_tickets", "communications", "tasks",
        "court_actions", "documents", "deadlines", "notary_documents",
        "mandates", "contracts", "proposals", "matters", "clients",
        "leads", "audit_logs", "users", "organizations",
    ]
    for t in tables:
        op.drop_table(t)

    enums = [
        "scraper_job_status_enum", "template_type_enum", "collection_case_status_enum",
        "payment_method_enum", "invoice_status_enum", "email_ticket_status_enum",
        "comm_status_enum", "comm_direction_enum", "comm_channel_enum",
        "sla_policy_enum", "task_status_enum", "task_type_enum",
        "court_action_status_enum", "court_action_method_enum",
        "document_status_enum", "document_type_enum",
        "deadline_status_enum", "deadline_severity_enum",
        "notary_doc_status_enum", "notary_doc_type_enum",
        "mandate_status_enum", "contract_status_enum",
        "proposal_status_enum", "matter_status_enum", "matter_type_enum",
        "lead_status_enum", "lead_source_enum", "role_enum",
    ]
    for e in enums:
        postgresql.ENUM(name=e).drop(op.get_bind(), checkfirst=True)
