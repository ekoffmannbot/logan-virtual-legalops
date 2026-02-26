"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, agentApi } from "@/lib/api";
import type { AIAgent } from "@/lib/types";
import { AGENT_COLORS, AGENT_EMOJIS, MODEL_LABELS } from "@/lib/constants";
import { useAuth } from "@/lib/auth";
import { getProcessProgress } from "@/lib/process-status-map";
import { Drawer, useDrawer } from "@/components/layout/drawer";
import { PizzaTracker } from "@/components/shared/pizza-tracker";
import { ApprovePanel } from "@/components/shared/approve-panel";
import {
  AlertTriangle,
  UserPlus,
  FileText,
  Briefcase,
  DollarSign,
  Loader2,
  Bot,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Clock,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface ActionItems {
  urgent: Array<{
    id: string;
    type: string;
    title: string;
    subtitle?: string;
    urgencyText?: string;
    actionLabel: string;
    actionHref?: string;
    secondaryLabel?: string;
    secondaryHref?: string;
    amount?: string;
  }>;
  today: Array<{
    id: string;
    type: string;
    title: string;
    subtitle?: string;
    actionLabel: string;
    actionHref?: string;
  }>;
  inProgress: Array<{
    id: string;
    type: string;
    title: string;
    subtitle?: string;
    processId: string;
    status: string;
    href?: string;
  }>;
  completed: Array<{
    id: string;
    title: string;
    subtitle?: string;
    type: string;
  }>;
  agentInsights: Array<{
    agentName: string;
    message: string;
    type: "suggestion" | "warning" | "info" | "insight";
  }>;
  quickNumbers: {
    leads: number;
    proposals: number;
    matters: number;
    overdue: number;
  };
}

/* ------------------------------------------------------------------ */
/* Stat card config                                                    */
/* ------------------------------------------------------------------ */

interface StatConfig {
  label: string;
  key: keyof ActionItems["quickNumbers"];
  trendKey?: string;
  icon: React.ReactNode;
  iconBg: string;
}

const STAT_CARDS: StatConfig[] = [
  {
    label: "Leads Activos",
    key: "leads",
    trendKey: "leads",
    icon: <UserPlus className="h-6 w-6" style={{ color: "#6366f1" }} />,
    iconBg: "rgba(99, 102, 241, 0.2)",
  },
  {
    label: "Propuestas",
    key: "proposals",
    icon: <FileText className="h-6 w-6" style={{ color: "#2dd4bf" }} />,
    iconBg: "rgba(45, 212, 191, 0.2)",
  },
  {
    label: "Casos Abiertos",
    key: "matters",
    trendKey: "matters",
    icon: <Briefcase className="h-6 w-6" style={{ color: "#f59e0b" }} />,
    iconBg: "rgba(245, 158, 11, 0.2)",
  },
  {
    label: "Vencidos",
    key: "overdue",
    icon: <DollarSign className="h-6 w-6" style={{ color: "#ef4444" }} />,
    iconBg: "rgba(239, 68, 68, 0.2)",
  },
];

/* ------------------------------------------------------------------ */
/* Process card config                                                 */
/* ------------------------------------------------------------------ */

interface ProcessConfig {
  title: string;
  desc: string;
  emoji: string;
  iconBg: string;
  href: string;
  roles: string[];
}

const PROCESS_CARDS: ProcessConfig[] = [
  {
    title: "Recepci\u00f3n de Clientes",
    desc: "Gesti\u00f3n de leads, agendamiento y primer contacto",
    emoji: "\u{1F4CB}",
    iconBg: "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(99,102,241,0.1))",
    href: "/leads",
    roles: ["Secretaria", "Agente IA"],
  },
  {
    title: "Atenci\u00f3n Telef\u00f3nica",
    desc: "Llamadas, seguimiento y derivaci\u00f3n",
    emoji: "\u{1F4DE}",
    iconBg: "linear-gradient(135deg, rgba(45,212,191,0.3), rgba(45,212,191,0.1))",
    href: "/matters",
    roles: ["Secretaria"],
  },
  {
    title: "Propuestas",
    desc: "Creaci\u00f3n, env\u00edo y seguimiento de propuestas",
    emoji: "\u{1F4DD}",
    iconBg: "linear-gradient(135deg, rgba(245,158,11,0.3), rgba(245,158,11,0.1))",
    href: "/proposals",
    roles: ["Abogado", "Agente IA"],
  },
  {
    title: "Contratos",
    desc: "Redacci\u00f3n, revisi\u00f3n y firma de contratos",
    emoji: "\u{1F4C4}",
    iconBg: "linear-gradient(135deg, rgba(236,72,153,0.3), rgba(236,72,153,0.1))",
    href: "/contracts",
    roles: ["Abogado", "Admin"],
  },
  {
    title: "Notar\u00eda",
    desc: "Gesti\u00f3n notarial y documentos legales",
    emoji: "\u{1F3DB}\u{FE0F}",
    iconBg: "linear-gradient(135deg, rgba(168,85,247,0.3), rgba(168,85,247,0.1))",
    href: "/notary",
    roles: ["Procurador", "Notario"],
  },
  {
    title: "Correos & Tickets",
    desc: "Emails, SLA y gesti\u00f3n de tickets",
    emoji: "\u{1F4E7}",
    iconBg: "linear-gradient(135deg, rgba(59,130,246,0.3), rgba(59,130,246,0.1))",
    href: "/email-tickets",
    roles: ["Secretaria", "Agente IA"],
  },
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const { user } = useAuth();
  const { isOpen, drawerContent, drawerTitle, openDrawer, closeDrawer } =
    useDrawer();

  const { data, isLoading, error } = useQuery<ActionItems>({
    queryKey: ["dashboard-action-items"],
    queryFn: () => api.get("/dashboards/action-items"),
    refetchInterval: 30000,
  });

  const { data: agents = [] } = useQuery<AIAgent[]>({
    queryKey: ["agents"],
    queryFn: () => agentApi.list(),
  });

  const { data: stats } = useQuery<{
    trends?: { leads?: number; matters?: number };
  }>({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get("/dashboards/stats"),
    refetchInterval: 60000,
  });

  /* ---- Loading ---- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--primary-color)" }} />
      </div>
    );
  }

  /* ---- Error ---- */
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="mb-3 h-10 w-10" style={{ color: "var(--danger)" }} />
        <p className="text-lg font-medium" style={{ color: "var(--text-primary)" }}>
          Error al cargar el panel
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          No se pudo obtener la informaci{"\u00f3"}n. Intente nuevamente.
        </p>
      </div>
    );
  }

  const firstName = user?.full_name?.split(" ")[0] || "Usuario";
  const totalPendientes = data.urgent.length + data.today.length + data.inProgress.length;

  /* ---- Drawer handlers ---- */
  function handleTaskClick(item: { id: string; type: string; title: string; subtitle?: string; processId?: string; status?: string; amount?: string }) {
    if (item.processId && item.status) {
      const progress = getProcessProgress(item.processId, item.status);
      const steps = Array.from({ length: progress.total }, (_, i) => ({
        id: `step-${i}`,
        label:
          i === progress.current
            ? progress.stepLabel
            : i < progress.current
              ? `Paso ${i + 1} completado`
              : `Paso ${i + 1}`,
        description:
          i === progress.current ? progress.stepDescription : undefined,
      }));

      openDrawer(item.title, (
        <div className="space-y-6">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {item.subtitle}
          </p>
          <PizzaTracker steps={steps} currentStepIndex={progress.current} />
        </div>
      ));
      return;
    }

    const insight = data?.agentInsights?.find(
      (ins) => ins.type === "warning" || ins.type === "suggestion"
    );
    if (insight) {
      openDrawer(item.title, (
        <ApprovePanel
          agentName={insight.agentName}
          agentAction={insight.message}
          content={`${item.title}\n\n${item.subtitle || ""}${item.amount ? `\n\nMonto: ${item.amount}` : ""}`}
          onApprove={() => closeDrawer()}
          onModify={() => closeDrawer()}
          onReject={() => closeDrawer()}
        />
      ));
      return;
    }

    openDrawer(item.title, (
      <div className="space-y-4">
        <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
          {item.subtitle}
        </p>
        {item.amount && (
          <p className="font-semibold" style={{ color: "var(--accent-color)", fontSize: 16 }}>
            Monto: {item.amount}
          </p>
        )}
      </div>
    ));
  }

  /* ================================================================ */
  /* RENDER                                                            */
  /* ================================================================ */

  return (
    <div className="space-y-8">
      {/* ============================================================ */}
      {/* Welcome Banner                                                */}
      {/* ============================================================ */}
      <div
        className="animate-fade-in-up flex flex-col items-start justify-between gap-6 rounded-3xl p-8 md:flex-row md:items-center"
        style={{
          background: "linear-gradient(135deg, rgba(99,102,241,0.2), rgba(45,212,191,0.1))",
          border: "1px solid var(--glass-border)",
        }}
      >
        <div>
          <h1
            className="mb-2 text-[28px] font-extrabold"
            style={{
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: "-0.5px",
              color: "var(--text-primary)",
            }}
          >
            Buenos d{"\u00ed"}as, {firstName}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
            {totalPendientes > 0
              ? `Tienes ${totalPendientes} tareas pendientes. ${data.urgent.length > 0 ? `${data.urgent.length} urgentes.` : ""}`
              : "Todo al d\u00eda. Sin tareas pendientes."}
          </p>
        </div>

        {/* Welcome quick stats */}
        <div className="flex gap-8">
          <div className="text-center">
            <div
              className="text-[32px] font-extrabold"
              style={{
                fontFamily: "'Outfit', sans-serif",
                color: "var(--accent-color)",
              }}
            >
              {totalPendientes}
            </div>
            <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              Pendientes
            </div>
          </div>
          <div className="text-center">
            <div
              className="text-[32px] font-extrabold"
              style={{
                fontFamily: "'Outfit', sans-serif",
                color: "var(--accent-color)",
              }}
            >
              {data.urgent.length}
            </div>
            <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              Urgentes
            </div>
          </div>
          <div className="text-center">
            <div
              className="text-[32px] font-extrabold"
              style={{
                fontFamily: "'Outfit', sans-serif",
                color: "var(--accent-color)",
              }}
            >
              {data.completed.length}
            </div>
            <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              Completado
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Stat Cards Grid                                               */}
      {/* ============================================================ */}
      <div className="stats-grid-4 grid grid-cols-4 gap-6">
        {STAT_CARDS.map((stat, i) => {
          const trendValue = stat.trendKey
            ? (stats?.trends as Record<string, number> | undefined)?.[stat.trendKey] ?? null
            : null;
          const trendUp = trendValue !== null ? trendValue >= 0 : true;
          const trendLabel = trendValue !== null
            ? `${trendValue >= 0 ? "+" : ""}${trendValue}%`
            : null;

          return (
            <div
              key={stat.key}
              className="glass-card glass-card-interactive animate-fade-in-up relative overflow-hidden p-6"
              style={{ animationDelay: `${(i + 1) * 0.1}s` }}
            >
              <div
                className="absolute left-0 top-0 h-1 w-full opacity-0 transition-opacity duration-300"
                style={{
                  background: "linear-gradient(90deg, var(--primary-color), var(--accent-color))",
                }}
              />

              <div
                className="mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-[14px]"
                style={{ background: stat.iconBg }}
              >
                {stat.icon}
              </div>

              <div
                className="mb-1 text-4xl font-extrabold"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  letterSpacing: "-1px",
                  color: "var(--text-primary)",
                }}
              >
                {data.quickNumbers[stat.key]}
              </div>
              <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {stat.label}
              </div>

              {trendLabel && (
                <div
                  className="absolute right-6 top-6 flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold"
                  style={{
                    background: trendUp
                      ? "rgba(34, 197, 94, 0.15)"
                      : "rgba(239, 68, 68, 0.15)",
                    color: trendUp ? "var(--success)" : "var(--danger)",
                  }}
                >
                  {trendUp ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {trendLabel}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* Agent Fleet Status                                            */}
      {/* ============================================================ */}
      {agents.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" style={{ color: "var(--primary-color)" }} />
              <h2
                className="text-lg font-bold"
                style={{ fontFamily: "'Outfit', sans-serif", color: "var(--text-primary)" }}
              >
                Flota de Agentes
              </h2>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{ background: "rgba(34,197,94,0.2)", color: "var(--success)" }}
              >
                {agents.filter((a) => a.is_active).length} activos
              </span>
            </div>
            <Link
              href="/agents"
              className="flex items-center gap-1.5 text-[13px] transition-all hover:gap-2.5"
              style={{ color: "var(--primary-color)" }}
            >
              Gestionar <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-3 lg:grid-cols-8">
            {agents.map((agent) => {
              const color = AGENT_COLORS[agent.role] || "#6366f1";
              const emoji = AGENT_EMOJIS[agent.role] || "\uD83E\uDD16";
              return (
                <Link
                  key={agent.id}
                  href="/agents"
                  className="glass-card glass-card-interactive flex flex-col items-center gap-2 p-3 text-center"
                >
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                    style={{ background: `${color}20` }}
                  >
                    {emoji}
                  </div>
                  <p
                    className="text-[11px] font-semibold leading-tight truncate w-full"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {agent.display_name.split(" ")[0]}
                  </p>
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: agent.is_active ? "var(--success)" : "var(--text-muted)",
                      boxShadow: agent.is_active ? "0 0 6px var(--success)" : undefined,
                    }}
                  />
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/* Processes Grid                                                */}
      {/* ============================================================ */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2
            className="text-lg font-bold"
            style={{
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: "-0.3px",
              color: "var(--text-primary)",
            }}
          >
            Procesos
          </h2>
          <span
            className="flex cursor-pointer items-center gap-1.5 text-[13px] transition-all hover:gap-2.5"
            style={{ color: "var(--primary-color)" }}
          >
            Ver todos <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>

        <div className="process-grid-3 grid grid-cols-3 gap-5">
          {PROCESS_CARDS.map((proc, i) => (
            <Link
              key={proc.href}
              href={proc.href}
              className="glass-card glass-card-interactive animate-fade-in-up group relative cursor-pointer p-6"
              style={{ animationDelay: `${(i + 2) * 0.1}s` }}
            >
              <div
                className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-[28px] transition-transform duration-300 group-hover:rotate-[5deg] group-hover:scale-110"
                style={{ background: proc.iconBg }}
              >
                {proc.emoji}
              </div>

              <h3
                className="mb-2 text-base font-bold"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  color: "var(--text-primary)",
                }}
              >
                {proc.title}
              </h3>
              <p
                className="mb-4 text-[13px] leading-relaxed"
                style={{ color: "var(--text-secondary)" }}
              >
                {proc.desc}
              </p>

              <div className="flex flex-wrap gap-2">
                {proc.roles.map((role) => (
                  <span
                    key={role}
                    className="rounded-lg px-2.5 py-1 text-[11px] font-semibold"
                    style={{
                      background: "var(--bg-tertiary)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {role}
                  </span>
                ))}
              </div>

              {/* Arrow */}
              <div
                className="absolute bottom-6 right-6 flex h-8 w-8 items-center justify-center rounded-[10px] transition-all duration-300 group-hover:translate-x-1"
                style={{
                  background: "var(--bg-tertiary)",
                  color: "var(--text-muted)",
                }}
              >
                <ArrowRight className="h-4 w-4 transition-colors group-hover:text-white" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/* Two-column: Tasks + Deadlines                                 */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* --- Urgent / Today tasks --- */}
        <div
          className="glass-card animate-fade-in-up overflow-hidden"
          style={{ animationDelay: "0.5s" }}
        >
          <div
            className="flex items-center gap-3 px-6 py-5"
            style={{ borderBottom: "1px solid var(--glass-border)" }}
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-[10px] text-lg"
              style={{ background: "rgba(245, 158, 11, 0.2)" }}
            >
              <Clock className="h-5 w-5" style={{ color: "#f59e0b" }} />
            </div>
            <h3
              className="text-base font-bold"
              style={{ fontFamily: "'Outfit', sans-serif", color: "var(--text-primary)" }}
            >
              Tareas Pendientes
            </h3>
          </div>

          <div className="max-h-80 overflow-y-auto p-3">
            {[...data.urgent, ...data.today].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  handleTaskClick({
                    id: item.id,
                    type: item.type,
                    title: item.title,
                    subtitle: item.subtitle,
                    amount: "amount" in item ? (item as { amount?: string }).amount : undefined,
                  })
                }
                className="mb-1 flex w-full items-center gap-3.5 rounded-[14px] px-4 py-3.5 text-left transition-all duration-200"
                style={{ color: "var(--text-primary)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "";
                }}
              >
                <div
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{
                    background:
                      "urgencyText" in item
                        ? "var(--danger)"
                        : "var(--warning)",
                    boxShadow:
                      "urgencyText" in item
                        ? "0 0 10px var(--danger)"
                        : "0 0 10px var(--warning)",
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {item.title}
                  </p>
                  <p
                    className="flex items-center gap-2 text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {item.subtitle && (
                      <span style={{ color: "var(--text-secondary)" }}>
                        {item.subtitle}
                      </span>
                    )}
                  </p>
                </div>
                <span
                  className="shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold"
                  style={{
                    background:
                      "urgencyText" in item
                        ? "rgba(239, 68, 68, 0.15)"
                        : "rgba(245, 158, 11, 0.15)",
                    color:
                      "urgencyText" in item
                        ? "var(--danger)"
                        : "var(--warning)",
                  }}
                >
                  {"urgencyText" in item ? "Urgente" : "Hoy"}
                </span>
              </button>
            ))}

            {data.urgent.length === 0 && data.today.length === 0 && (
              <div className="py-8 text-center" style={{ color: "var(--text-muted)" }}>
                <p className="text-4xl mb-3 opacity-50">{"\u2705"}</p>
                <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  Sin tareas pendientes
                </p>
              </div>
            )}
          </div>
        </div>

        {/* --- In Progress --- */}
        <div
          className="glass-card animate-fade-in-up overflow-hidden"
          style={{ animationDelay: "0.6s" }}
        >
          <div
            className="flex items-center gap-3 px-6 py-5"
            style={{ borderBottom: "1px solid var(--glass-border)" }}
          >
            <div
              className="flex h-9 w-9 items-center justify-center rounded-[10px] text-lg"
              style={{ background: "rgba(99, 102, 241, 0.2)" }}
            >
              <TrendingUp className="h-5 w-5" style={{ color: "#6366f1" }} />
            </div>
            <h3
              className="text-base font-bold"
              style={{ fontFamily: "'Outfit', sans-serif", color: "var(--text-primary)" }}
            >
              En Progreso
            </h3>
          </div>

          <div className="max-h-80 overflow-y-auto p-3">
            {data.inProgress.map((item) => {
              const progress = getProcessProgress(item.processId, item.status);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    handleTaskClick({
                      id: item.id,
                      type: item.type,
                      title: item.title,
                      subtitle: item.subtitle,
                      processId: item.processId,
                      status: item.status,
                    })
                  }
                  className="mb-1 flex w-full items-center gap-3.5 rounded-[14px] px-4 py-3.5 text-left transition-all duration-200"
                  style={{ color: "var(--text-primary)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "";
                  }}
                >
                  <div
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{
                      background: "var(--primary-color)",
                      boxShadow: "0 0 10px var(--primary-color)",
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {item.title}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {progress.stepLabel} &middot; {progress.percentage}%
                    </p>
                  </div>
                  <span
                    className="shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold"
                    style={{
                      background: "var(--bg-tertiary)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    {progress.percentage}%
                  </span>
                </button>
              );
            })}

            {data.inProgress.length === 0 && (
              <div className="py-8 text-center" style={{ color: "var(--text-muted)" }}>
                <p className="text-4xl mb-3 opacity-50">{"\uD83D\uDCAD"}</p>
                <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
                  Sin procesos activos
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* Drawer                                                        */}
      {/* ============================================================ */}
      <Drawer open={isOpen} onClose={closeDrawer} title={drawerTitle}>
        {drawerContent}
      </Drawer>
    </div>
  );
}
