"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Nav structure — Agent command center layout                         */
/* ------------------------------------------------------------------ */

interface NavItemDef {
  label: string;
  href: string;
  emoji: string;
  badge?: number;
}

interface NavGroupDef {
  label: string;
  items: NavItemDef[];
}

const NAV_GROUPS: NavGroupDef[] = [
  {
    label: "Comando",
    items: [
      { label: "Panel Principal", href: "/dashboard", emoji: "\uD83C\uDFE0" },
      { label: "Mis Agentes", href: "/agents", emoji: "\u2728" },
      { label: "Notificaciones", href: "/notifications", emoji: "\uD83D\uDD14" },
    ],
  },
  {
    label: "Operaciones",
    items: [
      { label: "Leads", href: "/leads", emoji: "\uD83D\uDC65" },
      { label: "Casos", href: "/matters", emoji: "\u2696\uFE0F" },
      { label: "Propuestas", href: "/proposals", emoji: "\uD83D\uDCDD" },
      { label: "Contratos", href: "/contracts", emoji: "\uD83D\uDCC4" },
      { label: "Cobranza", href: "/collections", emoji: "\uD83D\uDCB0" },
      { label: "Correos", href: "/email-tickets", emoji: "\uD83D\uDCE7" },
    ],
  },
  {
    label: "Herramientas",
    items: [
      { label: "Documentos", href: "/documents", emoji: "\uD83D\uDCC2" },
      { label: "Notar\u00eda", href: "/notary", emoji: "\uD83C\uDFDB\uFE0F" },
      { label: "Calendario", href: "/calendar", emoji: "\uD83D\uDCC5" },
      { label: "Reportes", href: "/reports", emoji: "\uD83D\uDCCA" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const initials = user?.full_name ? getInitials(user.full_name) : "??";

  // Dynamic notification count for sidebar badge
  const { data: notifData } = useQuery<{ count: number }>({
    queryKey: ["notifications-unread-count"],
    queryFn: () => api.get("/notifications/unread-count"),
    refetchInterval: 30000,
  });
  const unreadCount = notifData?.count ?? 0;

  // Inject badge into nav groups
  const navGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.map((item) =>
      item.href === "/notifications" && unreadCount > 0
        ? { ...item, badge: unreadCount }
        : item
    ),
  }));

  return (
    <aside
      className="fixed left-0 top-0 z-[100] flex h-screen flex-col border-r"
      style={{
        width: "var(--sidebar-width)",
        background: "var(--bg-secondary)",
        borderColor: "var(--glass-border)",
      }}
    >
      {/* ---- Logo ---- */}
      <div
        className="flex items-center gap-3 px-6 py-6"
        style={{ borderBottom: "1px solid var(--glass-border)" }}
      >
        <div
          className="flex h-12 w-12 items-center justify-center rounded-[14px] text-xl font-extrabold text-white"
          style={{
            background: "linear-gradient(135deg, var(--primary-color), var(--accent-color))",
            boxShadow: "0 8px 24px var(--primary-glow)",
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          LV
        </div>
        <div>
          <span
            className="text-xl font-bold"
            style={{
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: "-0.5px",
              color: "var(--text-primary)",
            }}
          >
            Logan{" "}
            <span style={{ color: "var(--accent-color)" }}>Virtual</span>
          </span>
        </div>
      </div>

      {/* ---- Navigation ---- */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-2">
            <div
              className="mb-1 px-3 py-2 text-[11px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}
            >
              {group.label}
            </div>

            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group relative mb-1 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                    active
                      ? "text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  )}
                  style={{
                    background: active
                      ? "rgba(99, 102, 241, 0.15)"
                      : undefined,
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    if (!active)
                      (e.currentTarget as HTMLElement).style.background =
                        "var(--bg-card)";
                  }}
                  onMouseLeave={(e) => {
                    if (!active)
                      (e.currentTarget as HTMLElement).style.background = "";
                  }}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-1/2 h-[60%] w-[3px] -translate-y-1/2 rounded-r"
                      style={{ background: "var(--primary-color)" }}
                    />
                  )}

                  <span className="flex h-[22px] w-[22px] items-center justify-center text-lg">
                    {item.emoji}
                  </span>
                  <span className="flex-1 text-[14px]">{item.label}</span>

                  {item.badge && (
                    <span
                      className="min-w-[20px] rounded-[10px] px-2 py-[2px] text-center text-[11px] font-semibold text-white"
                      style={{ background: "var(--danger)" }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ---- User card ---- */}
      <div style={{ borderTop: "1px solid var(--glass-border)" }} className="p-4">
        <button
          onClick={logout}
          className="group flex w-full items-center gap-3 rounded-xl p-3 transition-all duration-200"
          style={{ color: "var(--text-primary)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--bg-card)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "";
          }}
          title="Cerrar sesi\u00f3n"
        >
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white"
            style={{
              background: "linear-gradient(135deg, var(--accent-color), var(--primary-color))",
            }}
          >
            {initials}
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {user?.full_name || "Gerente Legal"}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Gerente Legal
            </p>
          </div>
        </button>
      </div>
    </aside>
  );
}
