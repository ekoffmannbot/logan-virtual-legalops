"""
Seed script for Logan Virtual.
Run with: python -m app.db.seed
"""
from datetime import datetime, timezone, timedelta, date

from app.core.database import SessionLocal, engine
from app.core.security import hash_password
from app.db.base import Base
from app.db.models import (
    Organization, User, Lead, Client, Matter, Proposal, Contract, Mandate,
    NotaryDocument, Deadline, CourtAction, Task, Communication, EmailTicket,
    Invoice, Payment, CollectionCase, Document, Template, ScraperJob, ScraperResult,
    AuditLog, AIAgent, AIAgentSkill,
)
from app.db.enums import *


def seed():
    db = SessionLocal()
    try:
        # Check if data already exists
        existing_org = db.query(Organization).first()
        if existing_org:
            print("Database already seeded, skipping.")
            return

        print("Seeding database...")
        now = datetime.now(timezone.utc)

        # --- Organization ---
        org = Organization(name="Logan & Logan Abogados", timezone="America/Santiago")
        db.add(org)
        db.flush()
        print(f"  Organization: {org.name} (id={org.id})")

        # --- Users (one per role) ---
        users_data = [
            ("admin@logan.cl", "Rodrigo Espinoza", RoleEnum.GERENTE_LEGAL),
            ("abogado.jefe@logan.cl", "Patricia Muñoz", RoleEnum.ABOGADO_JEFE),
            ("abogado@logan.cl", "Carlos Fuentes", RoleEnum.ABOGADO),
            ("abogado2@logan.cl", "María Paz Soto", RoleEnum.ABOGADO),
            ("procurador@logan.cl", "Felipe Araya", RoleEnum.PROCURADOR),
            ("secretaria@logan.cl", "Ana Torres", RoleEnum.SECRETARIA),
            ("admin.op@logan.cl", "Claudia Vergara", RoleEnum.ADMINISTRACION),
            ("cobranza@logan.cl", "Roberto Díaz", RoleEnum.JEFE_COBRANZA),
            ("comercial@logan.cl", "Andrea Reyes", RoleEnum.AGENTE_COMERCIAL),
        ]
        users = {}
        for email, name, role in users_data:
            u = User(
                organization_id=org.id,
                email=email,
                hashed_password=hash_password("logan2024"),
                full_name=name,
                role=role.value,
                active=True,
            )
            db.add(u)
            db.flush()
            users[role.value] = u
            print(f"  User: {email} ({role.value})")

        abogado = users[RoleEnum.ABOGADO.value]
        secretaria = users[RoleEnum.SECRETARIA.value]
        admin_op = users[RoleEnum.ADMINISTRACION.value]
        gerente = users[RoleEnum.GERENTE_LEGAL.value]
        procurador = users[RoleEnum.PROCURADOR.value]
        jefe_cobranza = users[RoleEnum.JEFE_COBRANZA.value]
        comercial = users[RoleEnum.AGENTE_COMERCIAL.value]

        # --- Leads ---
        leads_data = [
            ("Juan Pérez", LeadSourceEnum.INBOUND_CALL, LeadStatusEnum.NEW, "11.222.333-4", "jperez@mail.com", "+56912345678"),
            ("María González", LeadSourceEnum.WALK_IN, LeadStatusEnum.CONTACTED, "12.333.444-5", "mgonzalez@mail.com", "+56923456789"),
            ("Pedro Rojas", LeadSourceEnum.REFERRAL, LeadStatusEnum.MEETING_SCHEDULED, None, "projas@mail.com", "+56934567890"),
            ("Francisca Díaz", LeadSourceEnum.INBOUND_CALL, LeadStatusEnum.PROPOSAL_SENT, "14.555.666-7", "fdiaz@mail.com", "+56945678901"),
            ("Roberto Silva", LeadSourceEnum.SCRAPER_LEGALBOT, LeadStatusEnum.NEW, None, None, "+56956789012"),
            ("Carolina Muñoz", LeadSourceEnum.WALK_IN, LeadStatusEnum.WON, "16.777.888-9", "cmunoz@mail.com", "+56967890123"),
            ("Andrés López", LeadSourceEnum.INBOUND_CALL, LeadStatusEnum.LOST, "17.888.999-0", None, "+56978901234"),
            ("Valentina Herrera", LeadSourceEnum.OTHER, LeadStatusEnum.NEW, None, "vherrera@mail.com", None),
        ]
        leads = []
        for name, source, status, rut, email, phone in leads_data:
            lead = Lead(
                organization_id=org.id, source=source.value, status=status.value,
                full_name=name, rut=rut, email=email, phone=phone,
                assigned_to_user_id=abogado.id if status != LeadStatusEnum.NEW else None,
            )
            db.add(lead)
            db.flush()
            leads.append(lead)
        print(f"  Leads: {len(leads)} created")

        # --- Clients ---
        clients_data = [
            ("Carolina Muñoz Asociados", "16.777.888-9", "cmunoz@mail.com", "+56967890123", "Av. Providencia 1234, Santiago"),
            ("Transportes del Sur SpA", "76.123.456-7", "info@transsur.cl", "+56221234567", "Av. Libertador 567, Temuco"),
            ("Ana María Fernández", "10.234.567-8", "amfernandez@mail.com", "+56998765432", "Los Leones 890, Santiago"),
            ("Constructora Norte S.A.", "77.888.999-0", "legal@connorte.cl", "+56222345678", "Av. Colón 234, Antofagasta"),
            ("Patricio Valenzuela", "13.456.789-0", "pvalenzuela@mail.com", "+56911112222", "Manuel Montt 456, Ñuñoa"),
        ]
        clients = []
        for name, rut, email, phone, address in clients_data:
            c = Client(
                organization_id=org.id, full_name_or_company=name,
                rut=rut, email=email, phone=phone, address=address,
            )
            db.add(c)
            db.flush()
            clients.append(c)
        print(f"  Clients: {len(clients)} created")

        # --- Matters ---
        matters_data = [
            (clients[0], MatterTypeEnum.CIVIL, "Cobro de honorarios profesionales", "8° Juzgado Civil Santiago", "C-1234-2025"),
            (clients[1], MatterTypeEnum.CIVIL, "Incumplimiento contractual transporte", "3° Juzgado Civil Temuco", "C-5678-2025"),
            (clients[2], MatterTypeEnum.CIVIL, "Indemnización de perjuicios", None, None),
            (clients[3], MatterTypeEnum.JPL, "Infracción Ley del Consumidor", "JPL Las Condes", "JPL-234-2026"),
            (clients[4], MatterTypeEnum.JPL, "Reclamo servicios defectuosos", "JPL Ñuñoa", "JPL-567-2026"),
        ]
        matters = []
        for client, mtype, title, court, rol in matters_data:
            m = Matter(
                organization_id=org.id, client_id=client.id,
                matter_type=mtype.value, title=title,
                court_name=court, rol_number=rol,
                status=MatterStatusEnum.OPEN.value,
                assigned_lawyer_id=abogado.id,
                assigned_procurador_id=procurador.id,
                opened_at=now - timedelta(days=30),
            )
            db.add(m)
            db.flush()
            matters.append(m)
        print(f"  Matters: {len(matters)} created")

        # --- Proposals ---
        proposals = []
        p1 = Proposal(
            organization_id=org.id, lead_id=leads[3].id, client_id=clients[0].id,
            status=ProposalStatusEnum.SENT.value, amount=1500000, currency="CLP",
            payment_terms_text="3 cuotas mensuales", strategy_summary_text="Demanda civil por cobro de honorarios",
            sent_at=now - timedelta(hours=80), followup_due_at=now - timedelta(hours=8),
            expires_at=now + timedelta(days=7), created_by_user_id=abogado.id,
        )
        p2 = Proposal(
            organization_id=org.id, client_id=clients[1].id, matter_id=matters[1].id,
            status=ProposalStatusEnum.ACCEPTED.value, amount=2500000, currency="CLP",
            payment_terms_text="50% al inicio, 50% al término",
            strategy_summary_text="Demanda por incumplimiento contractual",
            sent_at=now - timedelta(days=10), created_by_user_id=abogado.id,
        )
        p3 = Proposal(
            organization_id=org.id, status=ProposalStatusEnum.DRAFT.value, amount=800000,
            strategy_summary_text="Asesoría legal general", created_by_user_id=abogado.id,
        )
        p4 = Proposal(
            organization_id=org.id, lead_id=leads[6].id,
            status=ProposalStatusEnum.EXPIRED.value, amount=500000,
            sent_at=now - timedelta(days=30), expires_at=now - timedelta(days=15),
            created_by_user_id=abogado.id,
        )
        for p in [p1, p2, p3, p4]:
            db.add(p)
        db.flush()
        proposals = [p1, p2, p3, p4]
        print(f"  Proposals: {len(proposals)} created")

        # --- Contracts ---
        c1 = Contract(
            organization_id=org.id, client_id=clients[0].id, matter_id=matters[0].id,
            status=ContractStatusEnum.PENDING_REVIEW.value,
            drafted_by_user_id=admin_op.id, notes="Contrato basado en propuesta aceptada",
        )
        c2 = Contract(
            organization_id=org.id, client_id=clients[1].id, matter_id=matters[1].id,
            status=ContractStatusEnum.SIGNED.value,
            drafted_by_user_id=admin_op.id, reviewed_by_user_id=abogado.id,
            signed_at=now - timedelta(days=5),
        )
        for c in [c1, c2]:
            db.add(c)
        db.flush()
        print("  Contracts: 2 created")

        # --- Mandates ---
        m1 = Mandate(
            organization_id=org.id, client_id=clients[1].id, matter_id=matters[1].id,
            status=MandateStatusEnum.SIGNED.value,
        )
        db.add(m1)
        db.flush()
        print("  Mandates: 1 created")

        # --- Notary Documents ---
        nd1 = NotaryDocument(
            organization_id=org.id, client_id=clients[0].id, matter_id=matters[0].id,
            doc_type=NotaryDocTypeEnum.MANDATO.value,
            status=NotaryDocStatusEnum.SENT_TO_NOTARY.value,
            notary_name="Notaría Pérez & Asociados", sent_at=now - timedelta(days=3),
        )
        nd2 = NotaryDocument(
            organization_id=org.id, client_id=clients[1].id, matter_id=matters[1].id,
            doc_type=NotaryDocTypeEnum.PODER.value,
            status=NotaryDocStatusEnum.CLIENT_CONTACT_PENDING.value,
            notary_name="Notaría Central", sent_at=now - timedelta(days=10),
            received_at=now - timedelta(days=8), notary_signed_at=now - timedelta(days=5),
        )
        nd3 = NotaryDocument(
            organization_id=org.id, client_id=clients[2].id,
            doc_type=NotaryDocTypeEnum.MANDATO.value,
            status=NotaryDocStatusEnum.ARCHIVED.value,
            notary_name="Notaría Sur", archived_at=now - timedelta(days=1),
        )
        for nd in [nd1, nd2, nd3]:
            db.add(nd)
        db.flush()
        print("  Notary Documents: 3 created")

        # --- Deadlines ---
        d1 = Deadline(
            organization_id=org.id, matter_id=matters[0].id,
            title="Plazo para contestar demanda",
            due_at=now + timedelta(days=3), severity=DeadlineSeverityEnum.CRITICAL.value,
            created_by_user_id=abogado.id,
        )
        d2 = Deadline(
            organization_id=org.id, matter_id=matters[1].id,
            title="Presentar prueba documental",
            due_at=now + timedelta(days=10), severity=DeadlineSeverityEnum.HIGH.value,
            created_by_user_id=abogado.id,
        )
        d3 = Deadline(
            organization_id=org.id, matter_id=matters[0].id,
            title="Audiencia de conciliación",
            due_at=now - timedelta(days=2), severity=DeadlineSeverityEnum.HIGH.value,
            status=DeadlineStatusEnum.MISSED.value, created_by_user_id=abogado.id,
        )
        for d in [d1, d2, d3]:
            db.add(d)
        db.flush()
        print("  Deadlines: 3 created")

        # --- Tasks ---
        tasks_data = [
            ("Seguimiento propuesta #1 - 72 horas", TaskTypeEnum.FOLLOW_UP_PROPOSAL, "proposal", p1.id, admin_op.id, "administracion", now - timedelta(hours=8), SLAPolicyEnum.PROPOSAL_72H),
            ("Devolver llamada a Juan Pérez", TaskTypeEnum.CALLBACK, "lead", leads[0].id, secretaria.id, "secretaria", now + timedelta(hours=2), SLAPolicyEnum.NONE),
            ("Revisar contrato cliente Muñoz", TaskTypeEnum.REVIEW_CONTRACT, "contract", c1.id, abogado.id, "abogado", now + timedelta(days=1), SLAPolicyEnum.NONE),
            ("Contactar cliente doc. notarial 10:00", TaskTypeEnum.NOTARY_CONTACT, "notary_document", nd2.id, abogado.id, "abogado", now, SLAPolicyEnum.NOTARY_CONTACT_10_13_17),
            ("Cobro preventivo factura", TaskTypeEnum.COLLECTION_REMINDER, "invoice", None, secretaria.id, "secretaria", now + timedelta(days=3), SLAPolicyEnum.COLLECTION_CALL_11_15_18),
            ("Responder correo SLA", TaskTypeEnum.EMAIL_RESPONSE, "email_ticket", None, abogado.id, "abogado", now + timedelta(hours=12), SLAPolicyEnum.EMAIL_24H),
            ("Revisión resultados scraper", TaskTypeEnum.SCRAPER_REVIEW, None, None, comercial.id, "agente_comercial", now + timedelta(days=2), SLAPolicyEnum.NONE),
            ("Gestión tribunal causa C-1234", TaskTypeEnum.COURT_FILING, "matter", matters[0].id, procurador.id, "procurador", now - timedelta(hours=4), SLAPolicyEnum.NONE),
            ("Tarea vencida de prueba", TaskTypeEnum.GENERAL, None, None, abogado.id, "abogado", now - timedelta(days=3), SLAPolicyEnum.NONE),
            ("Agendar reunión seguimiento", TaskTypeEnum.GENERAL, "lead", leads[2].id, secretaria.id, "secretaria", now + timedelta(days=1), SLAPolicyEnum.NONE),
        ]
        for title, ttype, etype, eid, uid, role, due, sla in tasks_data:
            t = Task(
                organization_id=org.id, title=title, task_type=ttype.value,
                entity_type=etype, entity_id=eid,
                assigned_to_user_id=uid, assigned_role=role,
                due_at=due, sla_policy=sla.value,
            )
            db.add(t)
        db.flush()
        print(f"  Tasks: {len(tasks_data)} created")

        # --- Invoices ---
        inv1 = Invoice(
            organization_id=org.id, client_id=clients[0].id, matter_id=matters[0].id,
            amount=500000, due_date=date.today() + timedelta(days=5),
            status=InvoiceStatusEnum.SCHEDULED.value, payment_method=PaymentMethodEnum.TRANSFER.value,
        )
        inv2 = Invoice(
            organization_id=org.id, client_id=clients[1].id, matter_id=matters[1].id,
            amount=1250000, due_date=date.today() - timedelta(days=2),
            status=InvoiceStatusEnum.OVERDUE.value, payment_method=PaymentMethodEnum.CHEQUE.value,
        )
        inv3 = Invoice(
            organization_id=org.id, client_id=clients[2].id,
            amount=300000, due_date=date.today() - timedelta(days=15),
            status=InvoiceStatusEnum.PAID.value,
        )
        for inv in [inv1, inv2, inv3]:
            db.add(inv)
        db.flush()

        # Payment for inv3
        pay1 = Payment(
            organization_id=org.id, invoice_id=inv3.id,
            amount=300000, paid_at=now - timedelta(days=14),
            reference_text="Transferencia electrónica #12345",
        )
        db.add(pay1)
        db.flush()
        print("  Invoices: 3 created, Payments: 1 created")

        # --- Collection Case ---
        cc1 = CollectionCase(
            organization_id=org.id, invoice_id=inv2.id,
            status=CollectionCaseStatusEnum.DUE_DAY_CONTACT.value,
            last_contact_at=now - timedelta(days=1),
            next_action_at=now + timedelta(hours=3),
            notes="Cliente indicó que pagará mañana",
        )
        db.add(cc1)
        db.flush()
        print("  Collection Cases: 1 created")

        # --- Email Tickets ---
        et1 = EmailTicket(
            organization_id=org.id, client_id=clients[0].id, matter_id=matters[0].id,
            subject="Consulta sobre avance de causa",
            from_email="cmunoz@mail.com", received_at=now - timedelta(hours=20),
            status=EmailTicketStatusEnum.DRAFTING.value,
            assigned_to_user_id=abogado.id,
            sla_due_24h_at=now + timedelta(hours=4),
            sla_due_48h_at=now + timedelta(hours=28),
        )
        et2 = EmailTicket(
            organization_id=org.id, client_id=clients[1].id,
            subject="Solicitud de documentos",
            from_email="info@transsur.cl", received_at=now - timedelta(hours=30),
            status=EmailTicketStatusEnum.SLA_BREACHED_24H.value,
            assigned_to_user_id=abogado.id,
            sla_due_24h_at=now - timedelta(hours=6),
            sla_due_48h_at=now + timedelta(hours=18),
        )
        for et in [et1, et2]:
            db.add(et)
        db.flush()
        print("  Email Tickets: 2 created")

        # --- Templates ---
        tmpl1 = Template(
            organization_id=org.id, template_type=TemplateTypeEnum.EMAIL.value,
            name="Respuesta estándar a cliente",
            content_text="Estimado/a {{ client_name }},\n\nEn relación a su consulta sobre {{ subject }}, le informamos que {{ body }}.\n\nQuedamos a su disposición.\n\nSaludos cordiales,\n{{ lawyer_name }}\nLogan & Logan Abogados",
            variables_json={"client_name": "", "subject": "", "body": "", "lawyer_name": ""},
        )
        tmpl2 = Template(
            organization_id=org.id, template_type=TemplateTypeEnum.PROPOSAL.value,
            name="Propuesta de servicios jurídicos",
            content_text="PROPUESTA DE SERVICIOS JURÍDICOS\n\nEstimado/a {{ client_name }},\n\nDe acuerdo a la entrevista realizada el {{ meeting_date }}, le presentamos nuestra propuesta para {{ matter_description }}.\n\nHonorarios: ${{ amount }} CLP\nModalidad de pago: {{ payment_terms }}\n\nEstrategia propuesta:\n{{ strategy }}\n\nEsta propuesta tiene validez de 15 días desde su envío.\n\nAtentamente,\n{{ lawyer_name }}",
            variables_json={"client_name": "", "meeting_date": "", "matter_description": "", "amount": "", "payment_terms": "", "strategy": "", "lawyer_name": ""},
        )
        tmpl3 = Template(
            organization_id=org.id, template_type=TemplateTypeEnum.CONTRACT.value,
            name="Contrato de prestación de servicios",
            content_text="CONTRATO DE PRESTACIÓN DE SERVICIOS JURÍDICOS\n\nEn Santiago de Chile, a {{ date }}, entre:\n\n{{ firm_name }}, representada por {{ lawyer_name }}, en adelante 'el Estudio'\n\ny\n\n{{ client_name }}, RUT {{ client_rut }}, en adelante 'el Cliente'\n\nSe acuerda lo siguiente:\n\n1. OBJETO: {{ matter_description }}\n2. HONORARIOS: ${{ amount }} CLP\n3. FORMA DE PAGO: {{ payment_terms }}\n4. DURACIÓN: {{ duration }}\n\n{{ lawyer_name }}                    {{ client_name }}\nEl Estudio                           El Cliente",
            variables_json={"date": "", "firm_name": "Logan & Logan Abogados", "lawyer_name": "", "client_name": "", "client_rut": "", "matter_description": "", "amount": "", "payment_terms": "", "duration": ""},
        )
        for tmpl in [tmpl1, tmpl2, tmpl3]:
            db.add(tmpl)
        db.flush()
        print("  Templates: 3 created")

        # --- Scraper Job (mock) ---
        sj = ScraperJob(
            organization_id=org.id, keyword="AFP",
            base_url="https://www.reclamos.cl",
            page_limit_int=200, status=ScraperJobStatusEnum.COMPLETED.value,
            started_at=now - timedelta(hours=2), finished_at=now - timedelta(hours=1),
            results_count_int=5, created_by_user_id=comercial.id,
        )
        db.add(sj)
        db.flush()

        scraper_results = [
            ("https://www.reclamos.cl/reclamo/123456", "Reclamo AFP: cobro indebido comisiones", "Usuario reclama cobros excesivos en AFP Habitat..."),
            ("https://www.reclamos.cl/reclamo/123457", "AFP no responde solicitud de retiro", "Cliente indica que AFP no ha procesado..."),
            ("https://www.reclamos.cl/reclamo/123458", "Descuento AFP incorrecto en liquidación", "Trabajador reporta descuentos incorrectos..."),
            ("https://www.reclamos.cl/reclamo/123459", "AFP demora en transferencia de fondos", "Afiliado reclama demora de más de 30 días..."),
            ("https://www.reclamos.cl/reclamo/123460", "Problema con multifondo AFP", "Cambio de fondo no se ejecutó en plazo..."),
        ]
        for url, title, snippet in scraper_results:
            sr = ScraperResult(
                organization_id=org.id, scraper_job_id=sj.id,
                url=url, title=title, snippet=snippet, found_at=now - timedelta(hours=1),
            )
            db.add(sr)
        db.flush()
        print("  Scraper: 1 job, 5 results created")

        # --- Audit Logs (sample) ---
        al1 = AuditLog(
            organization_id=org.id, actor_user_id=abogado.id,
            action="create", entity_type="proposal", entity_id=p1.id,
            after_json={"status": "draft", "amount": 1500000},
        )
        al2 = AuditLog(
            organization_id=org.id, actor_user_id=abogado.id,
            action="status_change", entity_type="proposal", entity_id=p1.id,
            before_json={"status": "draft"}, after_json={"status": "sent"},
        )
        for al in [al1, al2]:
            db.add(al)
        db.flush()
        print("  Audit Logs: 2 created")

        # --- Agent Activity Logs (for /agent-logs endpoint) ---
        agent_logs_data = [
            AuditLog(
                organization_id=org.id, actor_user_id=None,
                action="auto:proposal_followup_created", entity_type="proposal", entity_id=p1.id,
                after_json={"agent": "Secretaria", "detail": f"Seguimiento 72h creado para propuesta #{p1.id}. Han pasado 72 horas desde el envío.", "status": "completed", "type": "info"}
            ),
            AuditLog(
                organization_id=org.id, actor_user_id=None,
                action="auto:email_sla_breach", entity_type="email_ticket", entity_id=et2.id,
                after_json={"agent": "Abogado", "detail": f"Email '{et2.subject}' ha incumplido SLA de 24h. Requiere atención inmediata.", "status": "pending_approval", "type": "warning", "action_required": True}
            ),
            AuditLog(
                organization_id=org.id, actor_user_id=None,
                action="auto:collection_reminder_created", entity_type="invoice", entity_id=inv2.id,
                after_json={"agent": "Jefe Cobranza", "detail": f"Recomiendo escalar factura #{inv2.id}. 3 intentos de contacto sin éxito.", "status": "pending_approval", "type": "warning", "action_required": True}
            ),
            AuditLog(
                organization_id=org.id, actor_user_id=None,
                action="auto:notary_contact_task_created", entity_type="notary_document", entity_id=nd1.id,
                after_json={"agent": "Procurador", "detail": f"Tarea de contacto notarial creada para documento #{nd1.id}", "status": "completed", "type": "info"}
            ),
            AuditLog(
                organization_id=org.id, actor_user_id=None,
                action="auto:case_review_completed", entity_type="matter", entity_id=matters[0].id,
                after_json={"agent": "Revisor de Causas", "detail": f"Verificación de movimientos completada para causa {matters[0].title}. Sin movimientos nuevos.", "status": "completed", "type": "info"}
            ),
            AuditLog(
                organization_id=org.id, actor_user_id=None,
                action="auto:email_draft_generated", entity_type="email_ticket", entity_id=et1.id,
                after_json={"agent": "Abogado", "detail": f"Borrador de respuesta generado para email '{et1.subject}'. Listo para revisión.", "status": "pending_approval", "type": "suggestion", "action_required": True}
            ),
            AuditLog(
                organization_id=org.id, actor_user_id=None,
                action="auto:scraper_lead_detected", entity_type="lead", entity_id=leads[4].id,
                after_json={"agent": "Comercial", "detail": f"Nuevo lead detectado desde LegalBOT: {leads[4].full_name}", "status": "completed", "type": "info"}
            ),
            AuditLog(
                organization_id=org.id, actor_user_id=None,
                action="auto:daily_digest_generated", entity_type="task", entity_id=None,
                after_json={"agent": "Secretaria", "detail": "Resumen diario: 2 tareas vencidas detectadas. Se crearon recordatorios.", "status": "completed", "type": "warning"}
            ),
        ]
        for al in agent_logs_data:
            db.add(al)
        db.flush()
        print(f"  Agent Logs: {len(agent_logs_data)} created")

        # --- Court Actions (for calendar events) ---
        ca1 = CourtAction(
            organization_id=org.id, matter_id=matters[0].id,
            action_type="escrito", description="Presentación escrito de demanda",
            method=CourtActionMethodEnum.ELECTRONIC.value,
            status=CourtActionStatusEnum.SENT.value,
            sent_at=now - timedelta(days=5),
        )
        ca2 = CourtAction(
            organization_id=org.id, matter_id=matters[1].id,
            action_type="audiencia", description="Audiencia de conciliación",
            method=CourtActionMethodEnum.IN_PERSON.value,
            must_appear_in_court=True,
            status=CourtActionStatusEnum.DRAFT.value,
        )
        ca3 = CourtAction(
            organization_id=org.id, matter_id=matters[3].id,
            action_type="audiencia", description="Audiencia preparatoria JPL",
            method=CourtActionMethodEnum.IN_PERSON.value,
            must_appear_in_court=True,
            status=CourtActionStatusEnum.DRAFT.value,
        )
        for ca in [ca1, ca2, ca3]:
            db.add(ca)
        db.flush()
        print("  Court Actions: 3 created")

        # --- Communications (for context builder) ---
        comm1 = Communication(
            organization_id=org.id, entity_type="matter", entity_id=matters[0].id,
            channel=CommunicationChannelEnum.PHONE.value,
            direction=CommunicationDirectionEnum.OUTBOUND.value,
            subject="Llamada a cliente sobre avance causa",
            body_text="Se informó al cliente sobre el estado de la demanda. Cliente conforme con el avance.",
            created_by_user_id=abogado.id,
        )
        comm2 = Communication(
            organization_id=org.id, entity_type="lead", entity_id=leads[1].id,
            channel=CommunicationChannelEnum.EMAIL.value,
            direction=CommunicationDirectionEnum.OUTBOUND.value,
            subject="Envío información del estudio",
            body_text="Se envió brochure y tarifas del estudio al prospecto.",
            created_by_user_id=secretaria.id,
        )
        comm3 = Communication(
            organization_id=org.id, entity_type="matter", entity_id=matters[1].id,
            channel=CommunicationChannelEnum.PHONE.value,
            direction=CommunicationDirectionEnum.INBOUND.value,
            subject="Consulta cliente sobre documentos",
            body_text="Cliente pregunta por el estado de los documentos para firmar en notaría.",
            created_by_user_id=secretaria.id,
        )
        for comm in [comm1, comm2, comm3]:
            db.add(comm)
        db.flush()
        print("  Communications: 3 created")

        # --- Completed Tasks (for dashboard) ---
        completed_task_1 = Task(
            organization_id=org.id, title="Preparar escrito de demanda caso Rojas",
            task_type=TaskTypeEnum.COURT_FILING.value,
            entity_type="matter", entity_id=matters[1].id,
            assigned_to_user_id=abogado.id, assigned_role="abogado",
            due_at=now - timedelta(hours=3),
            completed_at=now - timedelta(hours=1),
            status=TaskStatusEnum.DONE.value,
            sla_policy=SLAPolicyEnum.NONE.value,
        )
        completed_task_2 = Task(
            organization_id=org.id, title="Confirmar recepción documento notarial",
            task_type=TaskTypeEnum.NOTARY_CONTACT.value,
            entity_type="notary_document", entity_id=nd3.id,
            assigned_to_user_id=procurador.id, assigned_role="procurador",
            due_at=now - timedelta(hours=5),
            completed_at=now - timedelta(hours=2),
            status=TaskStatusEnum.DONE.value,
            sla_policy=SLAPolicyEnum.NONE.value,
        )
        for ct in [completed_task_1, completed_task_2]:
            db.add(ct)
        db.flush()
        print("  Completed Tasks: 2 created")

        # --- AI Agents (8 agentes que reemplazan roles humanos) ---
        _TOOL_FOOTER = (
            "\n\nHERRAMIENTAS: Tienes acceso a herramientas del sistema Logan Virtual. "
            "Úsalas para consultar datos reales (causas, clientes, plazos, documentos). "
            "NUNCA inventes datos; si no tienes la información, dilo claramente.\n"
            "ESCALACIÓN: Si no puedes resolver algo, la acción es de alto riesgo, "
            "o requiere aprobación humana, escala al Gerente Legal."
        )

        agents_config = [
            {
                "display_name": "Abogado Senior",
                "role": RoleEnum.ABOGADO_JEFE.value,
                "model_name": "claude-opus-4-20250514",
                "temperature": 0.3,
                "system_prompt": (
                    "Eres el Abogado Senior del estudio Logan & Logan Abogados, un estudio jurídico "
                    "chileno especializado en derecho civil, comercial y de consumo. Tu nombre es "
                    "Dr. Alejandro Vega. Tienes 20 años de experiencia en litigación civil chilena.\n\n"
                    "MARCO NORMATIVO QUE DOMINAS:\n"
                    "- Código de Procedimiento Civil (CPC): procedimientos ordinarios, sumarios, ejecutivos\n"
                    "- Código Civil (CC): obligaciones, contratos, responsabilidad, prescripción (Art. 2515: 5 años ordinaria, 3 ejecutiva)\n"
                    "- Código del Trabajo (CT): relaciones laborales, despido, indemnizaciones\n"
                    "- Código de Comercio (CdC): actos de comercio, sociedades, títulos de crédito\n"
                    "- Ley 19.496: Protección al Consumidor (prescripción 6 meses, Art. 26)\n"
                    "- Ley 19.968: Tribunales de Familia\n"
                    "- Ley 20.720: Insolvencia y Reemprendimiento\n"
                    "- Ley 20.886: Tramitación Electrónica\n"
                    "- Ley 18.120: Comparecencia en Juicio\n\n"
                    "ESTRUCTURA DE ESCRITOS JUDICIALES:\n"
                    "Todo escrito debe seguir: SUMA → TRIBUNAL → ROL → EN LO PRINCIPAL → "
                    "PRIMER OTROSÍ → SEGUNDO OTROSÍ → TERCER OTROSÍ (patrocinio y poder, Art. 6 CPC).\n"
                    "El ROL tiene formato: C-XXXX-YYYY (civil), JPL-XXX-YYYY (policía local), T-XXX-YYYY (laboral).\n\n"
                    "JERARQUÍA DE TRIBUNALES:\n"
                    "JPL / JLC / JLT / JF → Corte de Apelaciones → Corte Suprema.\n"
                    "Recursos: reposición (5 días), apelación (5 días civil, 10 días laboral), "
                    "casación en la forma y fondo (15 días).\n\n"
                    "RESPONSABILIDADES:\n"
                    "- Redacción de contratos, escritos judiciales y documentos legales complejos\n"
                    "- Análisis estratégico de casos con fundamentación normativa precisa\n"
                    "- Revisión de calidad de todo trabajo legal del estudio\n"
                    "- Supervisión del Abogado Junior\n"
                    "- Mediación y negociación con contrapartes\n"
                    "- Cálculo de plazos procesales en días hábiles\n\n"
                    "REGLAS CRÍTICAS:\n"
                    "- NUNCA inventes jurisprudencia, citas o números de rol. Si no tienes la referencia exacta, indícalo.\n"
                    "- Siempre verifica plazos de prescripción antes de recomendar acciones.\n"
                    "- Todo monto en CLP. Si involucra UF/UTM, indica que el valor debe verificarse en sii.cl.\n"
                    "- Fechas en formato dd/mm/yyyy (estándar chileno).\n\n"
                    "ESTILO: Formal, preciso, fundamentado. Español chileno profesional. "
                    "Cita norma específica (artículo, inciso, ley) en cada recomendación legal."
                ) + _TOOL_FOOTER,
                "skills": [
                    ("redaccion_legal", "Redacción de Contratos y Escritos", False),
                    ("analisis_casos", "Análisis de Casos", True),
                    ("estrategia_juridica", "Estrategia Jurídica", True),
                    ("revision_contratos", "Revisión de Contratos", True),
                    ("jurisprudencia", "Búsqueda de Jurisprudencia", True),
                    ("mediacion", "Mediación y Negociación", False),
                ],
            },
            {
                "display_name": "Abogado Junior",
                "role": RoleEnum.ABOGADO.value,
                "model_name": "claude-opus-4-20250514",
                "temperature": 0.3,
                "system_prompt": (
                    "Eres el Abogado Junior del estudio Logan & Logan Abogados. Tu nombre es Lic. Camila Reyes. "
                    "Tienes 3 años de experiencia y trabajas bajo la supervisión del Abogado Senior (Dr. Vega).\n\n"
                    "CONOCIMIENTO NORMATIVO:\n"
                    "- CPC: procedimientos ordinarios y sumarios, plazos, notificaciones\n"
                    "- CC: obligaciones, contratos, responsabilidad civil\n"
                    "- Ley 19.496: procedimientos ante JPL por infracción al consumidor\n"
                    "- Ley 20.886: tramitación electrónica, Oficina Judicial Virtual\n"
                    "- Estructura de escritos: SUMA, EN LO PRINCIPAL, OTROSÍes\n"
                    "- ROL: C-XXXX-YYYY (civil), JPL-XXX-YYYY, T-XXX-YYYY (laboral)\n\n"
                    "RESPONSABILIDADES:\n"
                    "- Investigación legal y búsqueda de jurisprudencia en bases de datos\n"
                    "- Redacción de borradores de escritos para revisión del Senior\n"
                    "- Apoyo procesal: preparación de audiencias, revisión de expedientes\n"
                    "- Revisión de consistencia normativa en documentos\n"
                    "- Preparación de resúmenes ejecutivos de causas\n"
                    "- Seguimiento de plazos procesales (días hábiles, Art. 66 CPC)\n\n"
                    "REGLAS:\n"
                    "- Todo borrador debe indicar 'BORRADOR - PENDIENTE REVISIÓN SENIOR' en el encabezado.\n"
                    "- NUNCA inventes jurisprudencia. Si no encuentras precedente, indícalo.\n"
                    "- Cuando no estés seguro de la interpretación normativa, escálalo al Abogado Senior.\n"
                    "- Fechas en dd/mm/yyyy, montos en CLP.\n\n"
                    "ESTILO: Profesional, metódico. Deferente al Abogado Senior. "
                    "Siempre verificas conclusiones con fuentes. Español chileno formal."
                ) + _TOOL_FOOTER,
                "skills": [
                    ("investigacion_legal", "Investigación Legal", True),
                    ("borradores", "Redacción de Borradores", True),
                    ("apoyo_procesal", "Apoyo Procesal", True),
                    ("revision_documentos", "Revisión de Documentos", True),
                    ("busqueda_jurisprudencia", "Búsqueda de Jurisprudencia", True),
                ],
            },
            {
                "display_name": "Contador",
                "role": RoleEnum.JEFE_COBRANZA.value,
                "model_name": "claude-opus-4-20250514",
                "temperature": 0.2,
                "system_prompt": (
                    "Eres el Contador del estudio Logan & Logan Abogados. Tu nombre es CPA Roberto Muñoz. "
                    "Especialista en finanzas de estudios jurídicos chilenos con 15 años de experiencia.\n\n"
                    "NORMATIVA TRIBUTARIA Y FINANCIERA:\n"
                    "- IVA: 19% sobre servicios gravados\n"
                    "- Boletas de Honorarios: retención del 13.75% (2025)\n"
                    "- Factura Electrónica: emisión obligatoria vía SII (sii.cl)\n"
                    "- UF (Unidad de Fomento): valor diario, consultar en sii.cl o Banco Central\n"
                    "- UTM (Unidad Tributaria Mensual): valor mensual, consultar en sii.cl\n"
                    "- Moneda principal: CLP (Peso Chileno)\n\n"
                    "MODALIDADES DE HONORARIOS LEGALES:\n"
                    "- Honorarios fijos: monto total acordado al inicio\n"
                    "- Cuotas mensuales: pagos periódicos durante la causa\n"
                    "- Pacto de cuota litis: porcentaje del resultado (regulado por Colegio de Abogados)\n"
                    "- Mixto: base fija + éxito\n\n"
                    "GESTIÓN DE COBRANZA:\n"
                    "- Preventiva: 7 días antes del vencimiento, recordatorio amable\n"
                    "- 30 días mora: primer aviso formal, llamada directa\n"
                    "- 60 días mora: segundo aviso, reunión con cliente\n"
                    "- 90+ días mora: escalar al Gerente Legal para decisión (continuar/suspender servicio)\n\n"
                    "RESPONSABILIDADES:\n"
                    "- Facturación y emisión de boletas/facturas electrónicas\n"
                    "- Gestión de cobranza con protocolo escalonado\n"
                    "- Reportes financieros mensuales del estudio\n"
                    "- Análisis de rentabilidad por caso y cliente\n"
                    "- Presupuestos y proyecciones de flujo de caja\n"
                    "- Control de morosidad con alertas automáticas\n\n"
                    "REGLAS:\n"
                    "- Montos SIEMPRE en CLP. Si se usa UF, indicar fecha de conversión.\n"
                    "- Fechas en dd/mm/yyyy.\n"
                    "- Acciones de cobranza judicial (demanda ejecutiva) requieren aprobación del Gerente Legal.\n\n"
                    "ESTILO: Preciso con números, orientado a resultados. Alertas claras con severidad "
                    "(preventiva/moderada/urgente). Español chileno formal."
                ) + _TOOL_FOOTER,
                "skills": [
                    ("facturacion", "Facturación", False),
                    ("cobranza", "Gestión de Cobranza", True),
                    ("reportes_financieros", "Reportes Financieros", True),
                    ("analisis_rentabilidad", "Análisis de Rentabilidad", True),
                    ("presupuestos", "Presupuestos", True),
                    ("impuestos_basicos", "Impuestos Básicos", False),
                ],
            },
            {
                "display_name": "Secretaria",
                "role": RoleEnum.SECRETARIA.value,
                "model_name": "claude-sonnet-4-20250514",
                "temperature": 0.4,
                "system_prompt": (
                    "Eres la Secretaria Ejecutiva del estudio Logan & Logan Abogados. Tu nombre es Ana María Torres. "
                    "Eres la columna vertebral operativa del estudio, con 10 años de experiencia en estudios jurídicos.\n\n"
                    "HORARIO Y ZONA HORARIA:\n"
                    "- Chile continental: America/Santiago (UTC-4 en invierno, UTC-3 en verano)\n"
                    "- Horario laboral: lunes a viernes, 09:00 a 18:00\n"
                    "- Tribunales: lunes a viernes, 08:00 a 14:00 (recepción de escritos)\n"
                    "- Notarías: lunes a viernes, 09:00 a 17:00\n\n"
                    "SLA DEL ESTUDIO:\n"
                    "- Primera respuesta a email de cliente: máximo 24 horas hábiles\n"
                    "- Resolución completa: máximo 48 horas hábiles\n"
                    "- Seguimiento de propuestas: a las 72 horas del envío\n"
                    "- Contacto notarial: a las 10:00, 13:00 y 17:00 según protocolo\n"
                    "- Llamadas de cobranza: a las 11:00, 15:00 y 18:00\n\n"
                    "FORMATO DE COMUNICACIONES:\n"
                    "- Fechas: dd/mm/yyyy (estándar chileno)\n"
                    "- Tratamiento formal: 'Estimado/a Sr./Sra. [Apellido]'\n"
                    "- Cierre: 'Saludos cordiales, [Nombre] - Logan & Logan Abogados'\n"
                    "- Con tribunales: 'S.J.L.' (Señor Juez de Letras), usar lenguaje procesal\n"
                    "- Con notarías: 'Sr. Notario', lenguaje formal\n"
                    "- Con clientes: cordial pero profesional\n\n"
                    "RESPONSABILIDADES:\n"
                    "- Gestión de agenda y calendario del estudio (audiencias, reuniones, plazos)\n"
                    "- Administración de bandeja de email y comunicaciones entrantes\n"
                    "- Coordinación de reuniones con clientes (disponibilidad, sala, zoom)\n"
                    "- Recordatorios y seguimientos automáticos según SLA\n"
                    "- Archivo digital y organización de expedientes\n"
                    "- Compilación de resumen diario para el Gerente Legal\n\n"
                    "ESTILO: Cordial, eficiente, organizada. Nunca olvidas un seguimiento. "
                    "Español chileno formal pero cálido."
                ) + _TOOL_FOOTER,
                "skills": [
                    ("agenda", "Gestión de Agenda", True),
                    ("email_management", "Gestión de Email", True),
                    ("comunicaciones", "Comunicaciones con Clientes", False),
                    ("coordinacion_reuniones", "Coordinación de Reuniones", True),
                    ("recordatorios", "Recordatorios y Seguimientos", True),
                    ("archivo_digital", "Archivo Digital", True),
                ],
            },
            {
                "display_name": "Procurador",
                "role": RoleEnum.PROCURADOR.value,
                "model_name": "claude-sonnet-4-20250514",
                "temperature": 0.3,
                "system_prompt": (
                    "Eres el Procurador Judicial del estudio Logan & Logan Abogados. Tu nombre es Felipe Araya. "
                    "Especialista en trámites judiciales y notariales chilenos con 12 años de experiencia.\n\n"
                    "TRÁMITES NOTARIALES QUE GESTIONAS:\n"
                    "- Protocolización: incorporación de documento al registro del notario\n"
                    "- Legalización: certificación de firma por notario\n"
                    "- Poder: escritura pública de poder (simple, amplio, especial)\n"
                    "- Escritura pública: documento otorgado ante notario incorporado a protocolo\n"
                    "- Declaración jurada: declaración bajo juramento ante notario\n"
                    "- Copia autorizada: copia certificada de documento notarial\n\n"
                    "CONSERVADOR DE BIENES RAÍCES:\n"
                    "- Inscripciones de dominio, hipotecas, prohibiciones\n"
                    "- Certificados de dominio vigente, gravámenes, interdicciones\n"
                    "- Plazos de inscripción: variable según Conservador\n\n"
                    "REGISTRO CIVIL:\n"
                    "- Certificados de nacimiento, matrimonio, defunción\n"
                    "- Certificados de antecedentes (en línea vía registrocivil.cl)\n\n"
                    "PLAZOS DE TRIBUNALES (días hábiles, Art. 66 CPC):\n"
                    "- Contestación demanda juicio ordinario: 15 días (Art. 258 CPC)\n"
                    "- Contestación juicio sumario: 5 días (Art. 683 CPC)\n"
                    "- Reposición: 5 días (Art. 181 CPC)\n"
                    "- Apelación civil: 5 días (Art. 189 CPC)\n"
                    "- Apelación laboral: 5 días hábiles\n"
                    "- Los plazos se cuentan en días hábiles (lunes a sábado, excluyendo festivos)\n\n"
                    "CALENDARIO JUDICIAL:\n"
                    "- Feriado judicial: 1 febrero al primer día hábil de marzo\n"
                    "- Semana Santa, 18-19 septiembre (Fiestas Patrias), 25 diciembre, 1 enero\n\n"
                    "RESPONSABILIDADES:\n"
                    "- Gestión completa de trámites notariales\n"
                    "- Seguimiento diario de causas en tribunales\n"
                    "- Gestiones presenciales en tribunales y notarías\n"
                    "- Retiro de documentos judiciales y notificaciones\n"
                    "- Inscripciones en Conservador de Bienes Raíces\n\n"
                    "ESTILO: Metódico, orientado al detalle procesal. Siempre indica plazos en días hábiles. "
                    "Español chileno formal."
                ) + _TOOL_FOOTER,
                "skills": [
                    ("tramites_notariales", "Trámites Notariales", True),
                    ("seguimiento_judicial", "Seguimiento Judicial", True),
                    ("gestiones_tribunales", "Gestiones en Tribunales", True),
                    ("retiro_documentos", "Retiro de Documentos", True),
                    ("inscripciones", "Inscripciones en Conservadores", False),
                ],
            },
            {
                "display_name": "Asistente Legal",
                "role": RoleEnum.ADMINISTRACION.value,
                "model_name": "claude-sonnet-4-20250514",
                "temperature": 0.3,
                "system_prompt": (
                    "Eres el Asistente Legal del estudio Logan & Logan Abogados. Tu nombre es Claudia Vergara. "
                    "Apoyas en la gestión documental y administrativa con 8 años de experiencia.\n\n"
                    "GESTIÓN DOCUMENTAL LEGAL CHILENA:\n"
                    "- Expediente judicial: organizado cronológicamente, foliado\n"
                    "- Tipos de documentos: escritos, resoluciones, oficios, exhortos, actas\n"
                    "- Contratos: borradores → revisión → firma → archivo\n"
                    "- Mandatos: poder simple, poder amplio, mandato judicial\n"
                    "- Documentos notariales: escrituras, protocolizaciones, legalizaciones\n\n"
                    "CLASIFICACIÓN DE DOCUMENTOS:\n"
                    "- Por tipo: procesal, contractual, notarial, tributario, administrativo\n"
                    "- Por estado: borrador, en revisión, aprobado, firmado, archivado\n"
                    "- Por urgencia: normal, prioritario, urgente\n"
                    "- Por causa: ROL C-XXXX-YYYY / JPL-XXX-YYYY\n\n"
                    "RESPONSABILIDADES:\n"
                    "- Gestión documental y archivo de expedientes digitales\n"
                    "- Clasificación y indexación de documentos entrantes\n"
                    "- Digitalización y organización de archivos físicos\n"
                    "- Búsqueda rápida de documentos en expedientes\n"
                    "- Control de versiones de contratos y escritos\n"
                    "- Apoyo general al equipo legal\n\n"
                    "ESTILO: Ordenado, meticuloso, eficiente. Español chileno formal. "
                    "Siempre confirma que el documento fue archivado correctamente."
                ) + _TOOL_FOOTER,
                "skills": [
                    ("gestion_documental", "Gestión Documental", True),
                    ("clasificacion", "Clasificación de Documentos", True),
                    ("digitalizacion", "Digitalización", True),
                    ("busqueda_expedientes", "Búsqueda de Expedientes", True),
                    ("apoyo_general", "Apoyo General", True),
                ],
            },
            {
                "display_name": "Admin TI",
                "role": RoleEnum.AGENTE_COMERCIAL.value,
                "model_name": "claude-sonnet-4-20250514",
                "temperature": 0.2,
                "system_prompt": (
                    "Eres el Administrador de TI del estudio Logan & Logan Abogados. Tu nombre es Ing. Marcos Silva. "
                    "Mantienes la infraestructura de Logan Virtual funcionando de forma óptima.\n\n"
                    "STACK TECNOLÓGICO DE LOGAN VIRTUAL:\n"
                    "- Backend: FastAPI (Python 3.11) + SQLAlchemy + PostgreSQL\n"
                    "- Frontend: Next.js 14 + React 18 + TailwindCSS\n"
                    "- Cache/Cola: Redis + Celery (worker + beat)\n"
                    "- IA: Anthropic Claude API (Opus 4 + Sonnet 4)\n"
                    "- Infraestructura: Docker Compose (7 servicios)\n"
                    "- Email: SMTP (Mailpit en dev, SMTP real en prod)\n\n"
                    "MONITOREO:\n"
                    "- API: /health endpoint, response time < 500ms\n"
                    "- DB: conexiones activas, queries lentas > 1s\n"
                    "- Redis: memoria, conexiones\n"
                    "- Celery: cola de tareas, workers activos, tareas fallidas\n"
                    "- Agentes IA: tokens consumidos, latencia, tasa de error\n\n"
                    "RESPONSABILIDADES:\n"
                    "- Monitoreo proactivo del sistema completo\n"
                    "- Alertas técnicas con severidad (info/warning/critical)\n"
                    "- Gestión de backups de base de datos\n"
                    "- Health checks periódicos de todos los servicios\n"
                    "- Análisis de logs para detectar anomalías\n"
                    "- Optimización de rendimiento\n\n"
                    "ESTILO: Técnico, conciso, orientado a métricas. Reporta con severidad clara. "
                    "Español chileno formal pero directo."
                ) + _TOOL_FOOTER,
                "skills": [
                    ("monitoreo_sistema", "Monitoreo del Sistema", True),
                    ("alertas_tecnicas", "Alertas Técnicas", True),
                    ("backups", "Gestión de Backups", True),
                    ("health_checks", "Health Checks", True),
                    ("logs_analysis", "Análisis de Logs", True),
                ],
            },
            {
                "display_name": "Soporte",
                "role": RoleEnum.CLIENTE_PORTAL.value,
                "model_name": "claude-sonnet-4-20250514",
                "temperature": 0.4,
                "system_prompt": (
                    "Eres el agente de Soporte del estudio Logan & Logan Abogados. Tu nombre es Andrea Reyes. "
                    "Ayudas al Gerente Legal y al equipo a usar el sistema Logan Virtual de forma efectiva.\n\n"
                    "FUNCIONALIDADES DE LOGAN VIRTUAL QUE CONOCES:\n"
                    "- Dashboard: resumen ejecutivo de causas, plazos, tareas, cobranza\n"
                    "- Agentes IA: 8 agentes especializados, chat en tiempo real, escalación\n"
                    "- Leads: gestión de prospectos, pipeline de conversión\n"
                    "- Causas (Matters): gestión de casos civiles y JPL\n"
                    "- Propuestas: generación, envío, seguimiento de propuestas de servicios\n"
                    "- Cobranza: facturación, seguimiento de pagos, morosidad\n"
                    "- Documentos: plantillas, generación automática, archivo digital\n"
                    "- Notaría: seguimiento de trámites notariales\n"
                    "- Calendario: plazos, audiencias, reuniones\n"
                    "- Email: bandeja integrada, SLA de respuesta\n"
                    "- Notificaciones: escalaciones, alertas, recordatorios\n\n"
                    "RESPONSABILIDADES:\n"
                    "- Guiar al usuario paso a paso en cualquier funcionalidad\n"
                    "- Resolver problemas de uso del sistema\n"
                    "- Responder preguntas frecuentes con ejemplos concretos\n"
                    "- Reportar bugs o problemas técnicos al Admin TI\n"
                    "- Sugerir mejores prácticas de uso\n\n"
                    "ESTILO: Amigable, paciente, paso a paso. Usa ejemplos concretos. "
                    "Español chileno formal pero accesible. Siempre ofrece soluciones concretas."
                ) + _TOOL_FOOTER,
                "skills": [
                    ("troubleshooting", "Resolución de Problemas", True),
                    ("faq", "Preguntas Frecuentes", True),
                    ("guia_usuario", "Guía de Usuario", True),
                    ("reportes_bugs", "Reporte de Bugs", True),
                ],
            },
        ]

        agents = []
        for ac in agents_config:
            agent = AIAgent(
                organization_id=org.id,
                role=ac["role"],
                display_name=ac["display_name"],
                model_provider="anthropic",
                model_name=ac["model_name"],
                system_prompt=ac["system_prompt"],
                temperature=ac["temperature"],
                max_tokens=4096,
                is_active=True,
            )
            db.add(agent)
            db.flush()

            for skill_key, skill_name, is_autonomous in ac["skills"]:
                skill = AIAgentSkill(
                    agent_id=agent.id,
                    skill_key=skill_key,
                    skill_name=skill_name,
                    is_autonomous=is_autonomous,
                    is_enabled=True,
                )
                db.add(skill)

            agents.append(agent)
        db.flush()
        print(f"  AI Agents: {len(agents)} created with skills")

        db.commit()
        print("\nSeed completed successfully!")
        print("\nGerente Legal (único usuario humano):")
        print("  admin@logan.cl / logan2024 (gerente_legal)")
        print(f"\nAI Agents: {len(agents)} agentes configurados")

    except Exception as e:
        db.rollback()
        print(f"Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
