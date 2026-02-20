"use client";

import { usePathname } from "next/navigation";
import { Bell, Search, Menu } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Page title map                                                      */
/* ------------------------------------------------------------------ */

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/leads": "Leads",
  "/matters": "Casos",
  "/calendar": "Calendario",
  "/proposals": "Propuestas",
  "/contracts": "Contratos",
  "/notary": "Notar\u00eda",
  "/case-review": "Revisi\u00f3n de Causas",
  "/collections": "Cobranza",
  "/email-tickets": "Correos",
  "/scraper": "Scraper",
  "/agents": "Agentes IA",
  "/bandeja": "Bandeja",
  "/admin": "Administraci\u00f3n",
};

function getPageTitle(pathname: string): string {
  for (const [path, title] of Object.entries(PAGE_TITLES)) {
    if (pathname === path || pathname.startsWith(path + "/")) return title;
  }
  return "Logan Virtual";
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function Topbar() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-8"
      style={{
        height: "var(--header-height)",
        background: "rgba(17, 24, 39, 0.8)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--glass-border)",
      }}
    >
      {/* Left: page title */}
      <div className="flex items-center gap-4">
        {/* Mobile menu button (hidden on desktop) */}
        <button
          className="hidden items-center justify-center rounded-xl lg:hidden"
          style={{
            width: 44,
            height: 44,
            background: "var(--bg-card)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-secondary)",
          }}
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <h1
          className="text-2xl font-bold"
          style={{
            fontFamily: "'Outfit', sans-serif",
            letterSpacing: "-0.5px",
            color: "var(--text-primary)",
          }}
        >
          {title}
        </h1>
      </div>

      {/* Right: search + notifications */}
      <div className="flex items-center gap-4">
        {/* Search bar */}
        <div
          className="hidden items-center gap-3 rounded-xl px-4 py-2.5 md:flex"
          style={{
            width: 320,
            background: "var(--bg-card)",
            border: "1px solid var(--glass-border)",
            transition: "all 0.2s ease",
          }}
        >
          <Search className="h-4 w-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full bg-transparent text-sm outline-none"
            style={{
              color: "var(--text-primary)",
            }}
          />
        </div>

        {/* Notification bell */}
        <button
          className="relative flex items-center justify-center rounded-xl transition-all duration-200"
          style={{
            width: 44,
            height: 44,
            background: "var(--bg-card)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-secondary)",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = "var(--bg-card-hover)";
            el.style.color = "var(--text-primary)";
            el.style.transform = "translateY(-2px)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.background = "var(--bg-card)";
            el.style.color = "var(--text-secondary)";
            el.style.transform = "";
          }}
          aria-label="Notificaciones"
        >
          <Bell className="h-5 w-5" />
          <span
            className="absolute -right-1 -top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ background: "var(--danger)" }}
          >
            3
          </span>
        </button>
      </div>
    </header>
  );
}
