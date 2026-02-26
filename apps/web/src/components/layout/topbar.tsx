"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Bell, Search, Menu, X } from "lucide-react";

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
  "/notary": "Notaría",
  "/case-review": "Revisión de Causas",
  "/collections": "Cobranza",
  "/email-tickets": "Correos",
  "/scraper": "Scraper",
  "/agents": "Agentes IA",
  "/bandeja": "Bandeja",
  "/admin": "Administración",
  "/notifications": "Notificaciones",
  "/reports": "Reportes",
  "/documents": "Documentos",
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

interface TopbarProps {
  onToggleSidebar?: () => void;
}

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const title = getPageTitle(pathname);

  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  // Dynamic notification count
  const { data: notifData } = useQuery<{ count: number }>({
    queryKey: ["notifications-unread-count"],
    queryFn: () => api.get("/notifications/unread-count"),
    refetchInterval: 30000,
  });
  const unreadCount = notifData?.count ?? 0;

  // Cmd+K shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setSearchQuery("");
        searchRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-8"
      style={{
        height: "var(--header-height)",
        background: "rgba(17, 24, 39, 0.8)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--glass-border)",
      }}
    >
      {/* Left: mobile menu + page title */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          className="flex items-center justify-center rounded-xl lg:hidden"
          style={{
            width: 40,
            height: 40,
            background: "var(--bg-card)",
            border: "1px solid var(--glass-border)",
            color: "var(--text-secondary)",
          }}
          onClick={onToggleSidebar}
          aria-label="Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <h1
          className="text-xl md:text-2xl font-bold"
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
      <div className="flex items-center gap-3">
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
            ref={searchRef}
            type="text"
            placeholder="Buscar... (Ctrl+K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: "var(--text-primary)" }}
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                searchRef.current?.focus();
              }}
              className="flex-shrink-0"
            >
              <X className="h-3.5 w-3.5" style={{ color: "var(--text-muted)" }} />
            </button>
          )}
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
          onClick={() => router.push("/notifications")}
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
          {unreadCount > 0 && (
            <span
              className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
              style={{ background: "var(--danger)" }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
