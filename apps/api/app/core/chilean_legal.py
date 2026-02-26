"""
Chilean legal constants, validators, and reference data for AI agents.

Provides authoritative legal references for the Logan Virtual agent system,
covering statutes of limitations, court hierarchy, document structures,
RUT/ROL validation, and financial constants.
"""

import re


# ── Plazos de Prescripción (Statute of Limitations) ─────────────────────────

STATUTE_OF_LIMITATIONS = {
    "civil_ordinaria": {
        "plazo": "5 años",
        "norma": "Art. 2515 inc. 1° CC",
        "descripcion": "Acciones ordinarias civiles",
    },
    "civil_ejecutiva": {
        "plazo": "3 años",
        "norma": "Art. 2515 inc. 2° CC",
        "descripcion": "Acciones ejecutivas civiles",
    },
    "extracontractual": {
        "plazo": "4 años",
        "norma": "Art. 2332 CC",
        "descripcion": "Responsabilidad extracontractual",
    },
    "laboral": {
        "plazo": "6 meses (derechos), 2 años (prestaciones)",
        "norma": "Art. 480 CT",
        "descripcion": "Acciones laborales",
    },
    "consumidor": {
        "plazo": "6 meses",
        "norma": "Art. 26 Ley 19.496",
        "descripcion": "Infracciones Ley del Consumidor",
    },
    "familia": {
        "plazo": "Variable según acción",
        "norma": "Ley 19.968",
        "descripcion": "Acciones de familia",
    },
    "penal_falta": {
        "plazo": "6 meses",
        "norma": "Art. 94 CP",
        "descripcion": "Faltas penales",
    },
    "penal_simple": {
        "plazo": "5 años",
        "norma": "Art. 94 CP",
        "descripcion": "Simples delitos",
    },
    "penal_crimen": {
        "plazo": "10 años",
        "norma": "Art. 94 CP",
        "descripcion": "Crímenes",
    },
}


# ── Códigos y Leyes Principales ─────────────────────────────────────────────

MAIN_CODES = {
    "CC": "Código Civil",
    "CPC": "Código de Procedimiento Civil",
    "CT": "Código del Trabajo",
    "CdC": "Código de Comercio",
    "CP": "Código Penal",
    "CPP": "Código Procesal Penal",
    "COT": "Código Orgánico de Tribunales",
}

KEY_LAWS = {
    "19.496": "Ley de Protección al Consumidor",
    "19.968": "Ley de Tribunales de Familia",
    "20.720": "Ley de Insolvencia y Reemprendimiento",
    "20.393": "Ley de Responsabilidad Penal de Personas Jurídicas",
    "19.628": "Ley de Protección de Datos Personales",
    "20.886": "Ley de Tramitación Electrónica",
    "18.101": "Ley de Arrendamiento de Predios Urbanos",
    "18.120": "Ley de Comparecencia en Juicio",
}


# ── Jerarquía de Tribunales ─────────────────────────────────────────────────

COURT_HIERARCHY = {
    "JPL": {
        "nombre": "Juzgado de Policía Local",
        "competencia": "Infracciones Ley del Consumidor, tránsito, ordenanzas municipales",
        "apelacion": "Corte de Apelaciones respectiva",
    },
    "JLC": {
        "nombre": "Juzgado de Letras Civil",
        "competencia": "Causas civiles de mayor y menor cuantía",
        "apelacion": "Corte de Apelaciones respectiva",
    },
    "JLT": {
        "nombre": "Juzgado de Letras del Trabajo",
        "competencia": "Causas laborales",
        "apelacion": "Corte de Apelaciones respectiva",
    },
    "JF": {
        "nombre": "Juzgado de Familia",
        "competencia": "Alimentos, cuidado personal, adopción, violencia intrafamiliar",
        "apelacion": "Corte de Apelaciones respectiva",
    },
    "CA": {
        "nombre": "Corte de Apelaciones",
        "competencia": "Apelaciones, recursos de protección, amparos",
        "apelacion": "Corte Suprema",
    },
    "CS": {
        "nombre": "Corte Suprema",
        "competencia": "Casación, unificación de jurisprudencia",
        "apelacion": None,
    },
}


# ── Estructura de Escritos Judiciales ────────────────────────────────────────

ESCRITO_STRUCTURE = [
    "SUMA: [Tipo de escrito y resumen]",
    "TRIBUNAL: [Nombre del tribunal]",
    "ROL: [Número de rol]",
    "MATERIA: [Tipo de causa]",
    "",
    "EN LO PRINCIPAL: [Petición principal]",
    "PRIMER OTROSÍ: [Primera petición accesoria]",
    "SEGUNDO OTROSÍ: [Segunda petición accesoria]",
    "TERCER OTROSÍ: [Patrocinio y poder - Art. 6 CPC]",
]


# ── Constantes Financieras ───────────────────────────────────────────────────

FINANCIAL_CONSTANTS = {
    "IVA": "19%",
    "boleta_honorarios_retencion": "13.75% (2025)",
    "moneda_principal": "CLP (Peso Chileno)",
    "unidades_reajustables": ["UF (Unidad de Fomento)", "UTM (Unidad Tributaria Mensual)"],
    "nota": (
        "Los valores de UF y UTM cambian diariamente/mensualmente. "
        "Siempre verificar en sii.cl antes de calcular montos."
    ),
}


# ── Trámites Notariales ─────────────────────────────────────────────────────

NOTARY_PROCEDURES = {
    "protocolizacion": "Incorporación de documento al registro del notario",
    "legalizacion": "Certificación de firma por notario",
    "poder": "Escritura pública de poder (simple, amplio, especial)",
    "escritura_publica": "Documento otorgado ante notario e incorporado a su protocolo",
    "declaracion_jurada": "Declaración bajo juramento ante notario",
    "copia_autorizada": "Copia certificada de documento notarial",
}


# ── Validadores ──────────────────────────────────────────────────────────────

def validate_rut(rut: str) -> bool:
    """Validate a Chilean RUT using módulo 11 algorithm.

    Accepts formats: 12.345.678-9, 12345678-9, 123456789
    """
    # Clean input
    clean = rut.replace(".", "").replace("-", "").replace(" ", "").upper()
    if len(clean) < 2:
        return False

    body = clean[:-1]
    dv = clean[-1]

    if not body.isdigit():
        return False

    # Calculate check digit (módulo 11)
    total = 0
    multiplier = 2
    for digit in reversed(body):
        total += int(digit) * multiplier
        multiplier = multiplier + 1 if multiplier < 7 else 2

    remainder = 11 - (total % 11)
    if remainder == 11:
        expected = "0"
    elif remainder == 10:
        expected = "K"
    else:
        expected = str(remainder)

    return dv == expected


def validate_rol(rol: str) -> bool:
    """Validate a Chilean court ROL number.

    Accepts formats: C-1234-2025, JPL-234-2026, T-567-2025
    """
    return bool(re.match(r'^[A-Z]{1,4}-\d{1,6}-\d{4}$', rol.strip().upper()))


def format_rut(rut: str) -> str:
    """Format a RUT to standard Chilean format (12.345.678-9)."""
    clean = rut.replace(".", "").replace("-", "").replace(" ", "").upper()
    if len(clean) < 2:
        return rut
    body = clean[:-1]
    dv = clean[-1]
    # Add dots
    formatted = ""
    for i, digit in enumerate(reversed(body)):
        if i > 0 and i % 3 == 0:
            formatted = "." + formatted
        formatted = digit + formatted
    return f"{formatted}-{dv}"
