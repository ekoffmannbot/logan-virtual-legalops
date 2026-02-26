"""
Integration with Poder Judicial de Chile (PJUD).

Provides web scraping of Oficina Judicial Virtual for case tracking,
movement updates, and automated notifications.
"""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)


class PJUDClient:
    """Client for querying Chilean judiciary systems."""

    BASE_URL = "https://oficinajudicialvirtual.pjud.cl"
    CIVIL_URL = "https://civil.pjud.cl"

    def __init__(self, rate_limit_seconds: float = 2.0):
        self.rate_limit = rate_limit_seconds

    def search_causa(self, rol: str, tribunal: str = "") -> dict | None:
        """
        Search for a case by ROL number.

        Args:
            rol: Case ROL number (e.g., "C-1234-2024")
            tribunal: Optional tribunal name filter

        Returns:
            Case data dict or None if not found
        """
        try:
            import httpx
            import time

            time.sleep(self.rate_limit)

            # Parse ROL components
            match = re.match(r"([A-Z])-(\d+)-(\d{4})", rol.upper())
            if not match:
                logger.warning("Invalid ROL format: %s", rol)
                return None

            tipo, numero, anio = match.groups()

            with httpx.Client(timeout=30, follow_redirects=True) as client:
                # Query the civil court search
                response = client.get(
                    f"{self.CIVIL_URL}/CIVILPORWEB/AtendimientoCausas498.do",
                    params={
                        "TIP_Consulta": "1",
                        "TIP_Causa": tipo,
                        "ROL_Causa": numero,
                        "ERA_Causa": anio,
                        "COM_Tribunal": tribunal,
                    },
                    headers={"User-Agent": "LoganVirtual/1.0 (Legal Management)"},
                )

                if response.status_code != 200:
                    logger.warning("PJUD returned %d for ROL %s", response.status_code, rol)
                    return None

                return self._parse_causa_response(response.text, rol)

        except ImportError:
            logger.error("httpx not installed, cannot query PJUD")
            return None
        except Exception as exc:
            logger.error("PJUD query failed for %s: %s", rol, exc)
            return None

    def _parse_causa_response(self, html: str, rol: str) -> dict | None:
        """Parse PJUD HTML response to extract case data."""
        try:
            from bs4 import BeautifulSoup
        except ImportError:
            return None

        soup = BeautifulSoup(html, "html.parser")

        # Extract case header info
        data = {
            "rol": rol,
            "tribunal": "",
            "caratulado": "",
            "fecha_ingreso": "",
            "estado": "",
            "movimientos": [],
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }

        # Try to find tribunal info
        tribunal_td = soup.find("td", string=re.compile(r"Tribunal", re.IGNORECASE))
        if tribunal_td and tribunal_td.find_next_sibling("td"):
            data["tribunal"] = tribunal_td.find_next_sibling("td").get_text(strip=True)

        # Try to find caratulado
        car_td = soup.find("td", string=re.compile(r"Caratulado", re.IGNORECASE))
        if car_td and car_td.find_next_sibling("td"):
            data["caratulado"] = car_td.find_next_sibling("td").get_text(strip=True)

        # Extract movements table
        tables = soup.find_all("table")
        for table in tables:
            rows = table.find_all("tr")
            for row in rows[1:]:  # Skip header
                cells = row.find_all("td")
                if len(cells) >= 3:
                    data["movimientos"].append({
                        "fecha": cells[0].get_text(strip=True),
                        "tramite": cells[1].get_text(strip=True) if len(cells) > 1 else "",
                        "descripcion": cells[2].get_text(strip=True) if len(cells) > 2 else "",
                    })

        return data if data["tribunal"] or data["movimientos"] else None

    def get_last_movement(self, rol: str) -> dict | None:
        """Get the most recent movement for a case."""
        causa = self.search_causa(rol)
        if causa and causa.get("movimientos"):
            return causa["movimientos"][0]
        return None


# Singleton instance
pjud_client = PJUDClient()


def sync_matter_with_pjud(db, matter_id: int, org_id: int) -> dict:
    """
    Sync a matter with PJUD data.
    Updates the matter with latest court movements.
    """
    from app.db.models.matter import Matter

    matter = db.query(Matter).filter(
        Matter.id == matter_id, Matter.organization_id == org_id
    ).first()

    if not matter or not matter.rol:
        return {"status": "skipped", "reason": "No ROL assigned"}

    causa_data = pjud_client.search_causa(matter.rol)
    if not causa_data:
        return {"status": "not_found", "rol": matter.rol}

    return {
        "status": "synced",
        "rol": matter.rol,
        "data": causa_data,
    }
