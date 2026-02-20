"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Nav structure matching the reference design                         */
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
    label: "Principal",
    items: [
      { label: "Inicio", href: "/dashboard", emoji: "\u{1F3E0}", badge: 3 },
      { label: "Leads", href: "/leads", emoji: "\u{1F465}", badge: 5 },
      { label: "Casos", href: "/matters", emoji: "\u{2696}\u{FE0F}" },
      { label: "Calendario", href: "/calendar", emoji: "\u{1F4C5}" },
    ],
  },
  {
    label: "Gesti\u00f3n",
    items: [
      { label: "Propuestas", href: "/proposals", emoji: "\u{1F4DD}", badge: 8 },
      { label: "Contratos", href: "/contracts", emoji: "\u{1F4C4}" },
      { label: "Notar\u00eda", href: "/notary", emoji: "\u{1F3DB}\u{FE0F}" },
      { label: "Revisi\u00f3n Causas", href: "/case-review", emoji: "\u{1F50D}" },
      { label: "Cobranza", href: "/collections", emoji: "\u{1F4B0}", badge: 5 },
      { label: "Correos", href: "/email-tickets", emoji: "\u{1F4E7}" },
      { label: "Scraper", href: "/scraper", emoji: "\u{1F916}" },
    ],
  },
  {
    label: "Herramientas",
    items: [
      { label: "Agentes IA", href: "/agents", emoji: "\u{2728}" },
      { label: "Bandeja", href: "/bandeja", emoji: "\u{1F4E5}" },
      { label: "Admin", href: "/admin", emoji: "\u{2699}\u{FE0F}" },
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
  const roleName = user?.role ? ROLE_LABELS[user.role] || user.role : "";

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
        {NAV_GROUPS.map((group) => (
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
                  {/* Active indicator bar */}
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
              {user?.full_name || "Usuario"}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {roleName}
            </p>
          </div>
        </button>
      </div>
    </aside>
  );
}
