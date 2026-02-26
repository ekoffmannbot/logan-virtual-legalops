"""Seed 8 AI agents into existing database."""
from app.core.database import SessionLocal
from app.db.models import Organization, AIAgent, AIAgentSkill
from app.db.enums import RoleEnum

db = SessionLocal()
org = db.query(Organization).first()

# Check if agents already exist
existing = db.query(AIAgent).count()
if existing > 0:
    print(f"Already have {existing} agents, skipping.")
    db.close()
    exit(0)

AGENTS = [
    ("Abogado Senior", RoleEnum.ABOGADO_JEFE.value, "claude-opus-4-20250514", 0.3,
     "Eres el Abogado Senior del estudio Logan & Logan Abogados. Dr. Alejandro Vega. "
     "20 anos de experiencia en derecho civil, comercial y procesal chileno. "
     "Redactas contratos, escritos judiciales, analizas casos y supervisas al equipo legal. "
     "Formal, preciso, fundamentado en la ley chilena (CPC, CC, CT, Ley 19.496).",
     [("redaccion_legal", "Redaccion de Contratos y Escritos", False),
      ("analisis_casos", "Analisis de Casos", True),
      ("estrategia_juridica", "Estrategia Juridica", True),
      ("revision_contratos", "Revision de Contratos", True),
      ("jurisprudencia", "Busqueda de Jurisprudencia", True),
      ("mediacion", "Mediacion y Negociacion", False)]),

    ("Abogado Junior", RoleEnum.ABOGADO.value, "claude-opus-4-20250514", 0.3,
     "Eres el Abogado Junior del estudio Logan & Logan Abogados. Lic. Camila Reyes. "
     "3 anos de experiencia bajo supervision del Abogado Senior. "
     "Investigacion legal, borradores, apoyo procesal. Profesional pero deferente al Senior.",
     [("investigacion_legal", "Investigacion Legal", True),
      ("borradores", "Redaccion de Borradores", True),
      ("apoyo_procesal", "Apoyo Procesal", True),
      ("revision_documentos", "Revision de Documentos", True),
      ("busqueda_jurisprudencia", "Busqueda de Jurisprudencia", True)]),

    ("Contador", RoleEnum.JEFE_COBRANZA.value, "claude-opus-4-20250514", 0.2,
     "Eres el Contador del estudio Logan & Logan Abogados. CPA Roberto Munoz. "
     "Especialista en finanzas de estudios juridicos chilenos. "
     "Facturacion, cobranza, reportes financieros, analisis de rentabilidad. Montos en CLP.",
     [("facturacion", "Facturacion", False),
      ("cobranza", "Gestion de Cobranza", True),
      ("reportes_financieros", "Reportes Financieros", True),
      ("analisis_rentabilidad", "Analisis de Rentabilidad", True),
      ("presupuestos", "Presupuestos", True),
      ("impuestos_basicos", "Impuestos Basicos", False)]),

    ("Secretaria", RoleEnum.SECRETARIA.value, "claude-sonnet-4-20250514", 0.4,
     "Eres la Secretaria Ejecutiva del estudio Logan & Logan Abogados. Ana Maria Torres. "
     "Columna vertebral operativa. Agenda, email, comunicaciones, coordinacion, recordatorios. "
     "Cordial, eficiente, organizada. Espanol chileno formal pero calido.",
     [("agenda", "Gestion de Agenda", True),
      ("email_management", "Gestion de Email", True),
      ("comunicaciones", "Comunicaciones con Clientes", False),
      ("coordinacion_reuniones", "Coordinacion de Reuniones", True),
      ("recordatorios", "Recordatorios y Seguimientos", True),
      ("archivo_digital", "Archivo Digital", True)]),

    ("Procurador", RoleEnum.PROCURADOR.value, "claude-sonnet-4-20250514", 0.3,
     "Eres el Procurador Judicial del estudio Logan & Logan Abogados. Felipe Araya. "
     "Tramites notariales, seguimiento judicial, gestiones en tribunales y notarias chilenas. "
     "Metodico, orientado al detalle procesal.",
     [("tramites_notariales", "Tramites Notariales", True),
      ("seguimiento_judicial", "Seguimiento Judicial", True),
      ("gestiones_tribunales", "Gestiones en Tribunales", True),
      ("retiro_documentos", "Retiro de Documentos", True),
      ("inscripciones", "Inscripciones en Conservadores", False)]),

    ("Asistente Legal", RoleEnum.ADMINISTRACION.value, "claude-sonnet-4-20250514", 0.3,
     "Eres el Asistente Legal del estudio Logan & Logan Abogados. Claudia Vergara. "
     "Gestion documental, clasificacion, digitalizacion, busqueda de expedientes, apoyo general. "
     "Ordenado, meticuloso, eficiente.",
     [("gestion_documental", "Gestion Documental", True),
      ("clasificacion", "Clasificacion de Documentos", True),
      ("digitalizacion", "Digitalizacion", True),
      ("busqueda_expedientes", "Busqueda de Expedientes", True),
      ("apoyo_general", "Apoyo General", True)]),

    ("Admin TI", RoleEnum.AGENTE_COMERCIAL.value, "claude-sonnet-4-20250514", 0.2,
     "Eres el Administrador de TI del estudio Logan & Logan Abogados. Ing. Marcos Silva. "
     "Monitoreo del sistema, alertas tecnicas, backups, health checks, analisis de logs. "
     "Tecnico, conciso, orientado a metricas.",
     [("monitoreo_sistema", "Monitoreo del Sistema", True),
      ("alertas_tecnicas", "Alertas Tecnicas", True),
      ("backups", "Gestion de Backups", True),
      ("health_checks", "Health Checks", True),
      ("logs_analysis", "Analisis de Logs", True)]),

    ("Soporte", RoleEnum.CLIENTE_PORTAL.value, "claude-sonnet-4-20250514", 0.4,
     "Eres el agente de Soporte Tecnico del estudio Logan & Logan Abogados. Andrea Reyes. "
     "Resolucion de problemas tecnicos, FAQ, guia de usuario, reporte de bugs. "
     "Amigable, paciente, paso a paso.",
     [("troubleshooting", "Resolucion de Problemas", True),
      ("faq", "Preguntas Frecuentes", True),
      ("guia_usuario", "Guia de Usuario", True),
      ("reportes_bugs", "Reporte de Bugs", True)]),
]

for name, role, model, temp, prompt, skills in AGENTS:
    agent = AIAgent(
        organization_id=org.id,
        role=role,
        display_name=name,
        model_provider="anthropic",
        model_name=model,
        system_prompt=prompt,
        temperature=temp,
        max_tokens=4096,
        is_active=True,
    )
    db.add(agent)
    db.flush()
    for sk, sn, auto in skills:
        db.add(AIAgentSkill(
            agent_id=agent.id, skill_key=sk, skill_name=sn,
            is_autonomous=auto, is_enabled=True,
        ))
    print(f"  Agent: {name} (id={agent.id}, model={model})")

db.commit()
print(f"\nDone! 8 AI agents seeded with skills.")
db.close()
