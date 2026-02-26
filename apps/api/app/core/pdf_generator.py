"""
PDF generation for legal documents using reportlab.

Generates professional PDF documents for contracts, proposals,
notary documents, invoices, and court filings.
"""

from __future__ import annotations

import io
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


def _get_reportlab():
    """Import reportlab lazily."""
    try:
        from reportlab.lib.pagesizes import LETTER
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch, cm
        from reportlab.lib.colors import HexColor
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
        from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_JUSTIFY
        return True
    except ImportError:
        return False


def generate_pdf(
    title: str,
    content_blocks: list[dict],
    metadata: dict | None = None,
) -> bytes:
    """
    Generate a professional PDF document.

    Args:
        title: Document title
        content_blocks: List of content sections, each with:
            - type: "heading" | "paragraph" | "table" | "spacer"
            - text: For heading/paragraph
            - data: For table (list of rows, first row = headers)
            - height: For spacer (points)
        metadata: Optional dict with author, date, reference_number, etc.

    Returns:
        PDF bytes
    """
    try:
        from reportlab.lib.pagesizes import LETTER
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch, cm
        from reportlab.lib.colors import HexColor
        from reportlab.platypus import (
            SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
            PageBreak, Image
        )
        from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_JUSTIFY
    except ImportError:
        # Fallback: generate a simple text-based PDF without reportlab
        return _generate_simple_pdf(title, content_blocks, metadata)

    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
        pagesize=LETTER,
        topMargin=1.5 * cm,
        bottomMargin=2 * cm,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    styles.add(ParagraphStyle(
        name="DocTitle",
        parent=styles["Title"],
        fontSize=18,
        textColor=HexColor("#1a365d"),
        spaceAfter=20,
        alignment=TA_CENTER,
    ))
    styles.add(ParagraphStyle(
        name="SectionHeading",
        parent=styles["Heading2"],
        fontSize=13,
        textColor=HexColor("#2c5282"),
        spaceBefore=15,
        spaceAfter=8,
    ))
    styles.add(ParagraphStyle(
        name="BodyText2",
        parent=styles["BodyText"],
        fontSize=10,
        leading=14,
        alignment=TA_JUSTIFY,
    ))
    styles.add(ParagraphStyle(
        name="SmallText",
        parent=styles["Normal"],
        fontSize=8,
        textColor=HexColor("#666666"),
    ))

    elements = []

    # Header
    now = datetime.now(timezone.utc)
    meta = metadata or {}

    elements.append(Paragraph("LOGAN & LOGAN ABOGADOS", styles["SmallText"]))
    elements.append(Spacer(1, 5))
    elements.append(Paragraph(title.upper(), styles["DocTitle"]))

    if meta.get("reference_number"):
        elements.append(Paragraph(
            f"Ref: {meta['reference_number']}",
            styles["SmallText"],
        ))
    elements.append(Paragraph(
        f"Fecha: {meta.get('date', now.strftime('%d/%m/%Y'))}",
        styles["SmallText"],
    ))
    elements.append(Spacer(1, 20))

    # Content blocks
    for block in content_blocks:
        btype = block.get("type", "paragraph")

        if btype == "heading":
            elements.append(Paragraph(block.get("text", ""), styles["SectionHeading"]))

        elif btype == "paragraph":
            text = block.get("text", "").replace("\n", "<br/>")
            elements.append(Paragraph(text, styles["BodyText2"]))

        elif btype == "table":
            data = block.get("data", [])
            if data:
                table = Table(data)
                table.setStyle(TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), HexColor("#2c5282")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
                    ("FONTSIZE", (0, 0), (-1, 0), 10),
                    ("FONTSIZE", (0, 1), (-1, -1), 9),
                    ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#cccccc")),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#f7fafc"), HexColor("#ffffff")]),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ]))
                elements.append(table)

        elif btype == "spacer":
            elements.append(Spacer(1, block.get("height", 20)))

        elif btype == "page_break":
            elements.append(PageBreak())

    # Footer
    elements.append(Spacer(1, 40))
    elements.append(Paragraph(
        "Este documento fue generado por Logan Virtual - LegalOps OS",
        styles["SmallText"],
    ))
    elements.append(Paragraph(
        f"Generado: {now.strftime('%d/%m/%Y %H:%M UTC')} | Confidencial",
        styles["SmallText"],
    ))

    doc.build(elements)
    buffer.seek(0)
    return buffer.read()


def _generate_simple_pdf(title: str, content_blocks: list[dict], metadata: dict | None = None) -> bytes:
    """
    Fallback PDF generator using only Python stdlib.
    Creates a minimal but valid PDF with text content.
    """
    now = datetime.now(timezone.utc)
    meta = metadata or {}

    lines = []
    lines.append(f"LOGAN & LOGAN ABOGADOS")
    lines.append(f"{'=' * 50}")
    lines.append(f"{title.upper()}")
    if meta.get("reference_number"):
        lines.append(f"Ref: {meta['reference_number']}")
    lines.append(f"Fecha: {meta.get('date', now.strftime('%d/%m/%Y'))}")
    lines.append(f"{'=' * 50}")
    lines.append("")

    for block in content_blocks:
        btype = block.get("type", "paragraph")
        if btype == "heading":
            lines.append(f"\n--- {block.get('text', '')} ---\n")
        elif btype == "paragraph":
            lines.append(block.get("text", ""))
            lines.append("")
        elif btype == "table":
            data = block.get("data", [])
            for row in data:
                lines.append(" | ".join(str(cell) for cell in row))
            lines.append("")
        elif btype == "spacer":
            lines.append("")

    lines.append(f"\n{'=' * 50}")
    lines.append(f"Generado por Logan Virtual - {now.strftime('%d/%m/%Y %H:%M UTC')}")

    text_content = "\n".join(lines)

    # Create minimal valid PDF
    pdf_lines = []
    pdf_lines.append(b"%PDF-1.4")

    # Object 1: Catalog
    pdf_lines.append(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj")

    # Object 2: Pages
    pdf_lines.append(b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj")

    # Object 4: Font
    pdf_lines.append(b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj")

    # Object 5: Stream content
    content_lines = text_content.encode("latin-1", errors="replace")
    stream_parts = [b"BT\n/F1 10 Tf\n"]
    y = 750
    for line in text_content.split("\n"):
        safe_line = line.encode("latin-1", errors="replace").decode("latin-1")
        safe_line = safe_line.replace("(", "\\(").replace(")", "\\)")
        stream_parts.append(f"1 0 0 1 50 {y} Tm\n({safe_line}) Tj\n".encode())
        y -= 14
        if y < 50:
            break
    stream_parts.append(b"ET")
    stream_content = b"".join(stream_parts)

    pdf_lines.append(
        f"5 0 obj\n<< /Length {len(stream_content)} >>\nstream\n".encode() +
        stream_content +
        b"\nendstream\nendobj"
    )

    # Object 3: Page
    pdf_lines.append(
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>\nendobj"
    )

    body = b"\n".join(pdf_lines)

    xref_offset = len(body) + 1
    xref = b"\nxref\n0 6\n"
    xref += b"0000000000 65535 f \n"

    offset = len(b"%PDF-1.4\n")
    for i in range(1, 6):
        xref += f"{offset:010d} 00000 n \n".encode()
        obj_marker = f"{i} 0 obj".encode()
        pos = body.find(obj_marker, offset)
        if pos >= 0:
            offset = pos
        xref += b""

    # Simplified xref
    trailer = f"\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF".encode()

    return body + xref + trailer


# ── Document-specific generators ──────────────────────────────────────────────

def generate_proposal_pdf(proposal_data: dict) -> bytes:
    """Generate a proposal PDF from proposal data."""
    blocks = [
        {"type": "heading", "text": "PROPUESTA DE SERVICIOS JURÍDICOS"},
        {"type": "paragraph", "text": f"Cliente: {proposal_data.get('client_name', 'N/A')}"},
        {"type": "paragraph", "text": f"Materia: {proposal_data.get('matter_type', 'N/A')}"},
        {"type": "spacer", "height": 10},
        {"type": "heading", "text": "Descripción del Servicio"},
        {"type": "paragraph", "text": proposal_data.get("description", "")},
        {"type": "heading", "text": "Honorarios"},
        {"type": "table", "data": [
            ["Concepto", "Monto", "Modalidad"],
            [
                proposal_data.get("service_type", "Asesoría Legal"),
                f"${proposal_data.get('amount', 0):,.0f} CLP",
                proposal_data.get("payment_mode", "Cuotas mensuales"),
            ],
        ]},
        {"type": "spacer", "height": 20},
        {"type": "paragraph", "text": "Esta propuesta tiene una validez de 15 días hábiles desde su fecha de emisión."},
    ]

    return generate_pdf(
        title="Propuesta de Servicios Jurídicos",
        content_blocks=blocks,
        metadata={
            "reference_number": f"PROP-{proposal_data.get('id', '000')}",
            "date": proposal_data.get("date", ""),
        },
    )


def generate_contract_pdf(contract_data: dict) -> bytes:
    """Generate a contract PDF."""
    blocks = [
        {"type": "heading", "text": "CONTRATO DE SERVICIOS JURÍDICOS"},
        {"type": "paragraph", "text": f"Entre: Logan & Logan Abogados (en adelante 'el Estudio')"},
        {"type": "paragraph", "text": f"Y: {contract_data.get('client_name', 'N/A')} (en adelante 'el Cliente')"},
        {"type": "spacer", "height": 10},
        {"type": "heading", "text": "PRIMERO: Objeto del Contrato"},
        {"type": "paragraph", "text": contract_data.get("description", "Prestación de servicios jurídicos.")},
        {"type": "heading", "text": "SEGUNDO: Honorarios"},
        {"type": "paragraph", "text": f"Monto: ${contract_data.get('amount', 0):,.0f} CLP"},
        {"type": "heading", "text": "TERCERO: Vigencia"},
        {"type": "paragraph", "text": contract_data.get("duration", "Según avance del caso.")},
        {"type": "spacer", "height": 40},
        {"type": "table", "data": [
            ["Logan & Logan Abogados", "El Cliente"],
            ["________________________", "________________________"],
            ["Firma", "Firma"],
        ]},
    ]

    return generate_pdf(
        title="Contrato de Servicios Jurídicos",
        content_blocks=blocks,
        metadata={"reference_number": f"CTR-{contract_data.get('id', '000')}"},
    )


def generate_invoice_pdf(invoice_data: dict) -> bytes:
    """Generate an invoice PDF."""
    blocks = [
        {"type": "heading", "text": "FACTURA"},
        {"type": "table", "data": [
            ["Campo", "Detalle"],
            ["Cliente", invoice_data.get("client_name", "N/A")],
            ["RUT", invoice_data.get("rut", "N/A")],
            ["Materia", invoice_data.get("matter_title", "N/A")],
            ["Monto", f"${invoice_data.get('amount', 0):,.0f} CLP"],
            ["Vencimiento", invoice_data.get("due_date", "N/A")],
            ["Estado", invoice_data.get("status", "N/A")],
        ]},
        {"type": "spacer", "height": 20},
        {"type": "paragraph", "text": "Forma de pago: Transferencia bancaria"},
        {"type": "paragraph", "text": "Banco: Banco de Chile | Cuenta Corriente: XXXXX | RUT: XX.XXX.XXX-X"},
    ]

    return generate_pdf(
        title="Factura de Servicios Legales",
        content_blocks=blocks,
        metadata={"reference_number": f"INV-{invoice_data.get('id', '000')}"},
    )
