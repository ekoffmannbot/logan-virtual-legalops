"""
Integration with SII (Servicio de Impuestos Internos) de Chile.

Provides RUT validation and DTE (electronic invoice) preparation.
"""

from __future__ import annotations

import logging
import re

logger = logging.getLogger(__name__)


def validate_rut(rut: str) -> bool:
    """
    Validate a Chilean RUT (Rol Unico Tributario).

    Accepts formats: 12.345.678-9, 12345678-9, 123456789
    """
    # Clean the RUT
    rut = rut.replace(".", "").replace(" ", "").upper()

    if "-" in rut:
        body, dv = rut.rsplit("-", 1)
    else:
        body, dv = rut[:-1], rut[-1]

    if not body.isdigit():
        return False

    # Calculate verification digit
    reversed_digits = list(map(int, reversed(body)))
    factors = [2, 3, 4, 5, 6, 7]
    s = sum(d * factors[i % 6] for i, d in enumerate(reversed_digits))
    remainder = 11 - (s % 11)

    if remainder == 11:
        expected = "0"
    elif remainder == 10:
        expected = "K"
    else:
        expected = str(remainder)

    return dv == expected


def format_rut(rut: str) -> str:
    """Format a RUT with dots and dash: 12.345.678-9"""
    rut = rut.replace(".", "").replace("-", "").replace(" ", "").upper()

    if len(rut) < 2:
        return rut

    body, dv = rut[:-1], rut[-1]

    # Add dots every 3 digits from right
    formatted = ""
    for i, char in enumerate(reversed(body)):
        if i > 0 and i % 3 == 0:
            formatted = "." + formatted
        formatted = char + formatted

    return f"{formatted}-{dv}"


def prepare_dte(invoice_data: dict) -> dict:
    """
    Prepare a DTE (Documento Tributario Electronico) structure.

    This generates the XML-compatible structure for electronic invoicing.
    Actual sending to SII requires a certified provider (Bsale, Haulmer, etc.).
    """
    if not validate_rut(invoice_data.get("rut_emisor", "")):
        raise ValueError("RUT emisor invalido")
    if not validate_rut(invoice_data.get("rut_receptor", "")):
        raise ValueError("RUT receptor invalido")

    dte = {
        "tipo_dte": 33,  # Factura electronica
        "folio": invoice_data.get("folio", 0),
        "fecha_emision": invoice_data.get("fecha", ""),
        "emisor": {
            "rut": format_rut(invoice_data["rut_emisor"]),
            "razon_social": invoice_data.get("razon_social_emisor", "Logan & Logan Abogados"),
            "giro": "Servicios Juridicos",
            "direccion": invoice_data.get("direccion_emisor", ""),
            "comuna": invoice_data.get("comuna_emisor", "Santiago"),
        },
        "receptor": {
            "rut": format_rut(invoice_data["rut_receptor"]),
            "razon_social": invoice_data.get("razon_social_receptor", ""),
            "giro": invoice_data.get("giro_receptor", ""),
            "direccion": invoice_data.get("direccion_receptor", ""),
        },
        "detalle": invoice_data.get("detalle", []),
        "montos": {
            "neto": invoice_data.get("neto", 0),
            "iva": round(invoice_data.get("neto", 0) * 0.19),
            "total": round(invoice_data.get("neto", 0) * 1.19),
        },
    }

    return dte
