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
    AuditLog,
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

        db.commit()
        print("\nSeed completed successfully!")
        print("\nDemo accounts:")
        for email, name, role in users_data:
            print(f"  {email} / logan2024 ({role.value})")

    except Exception as e:
        db.rollback()
        print(f"Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
