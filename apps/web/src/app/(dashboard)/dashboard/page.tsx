"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getProcessProgress } from "@/lib/process-status-map";
import { InboxItem } from "@/components/shared/inbox-item";
import { AgentLog } from "@/components/shared/agent-log";
import type { AgentLogEntry } from "@/components/shared/agent-log";
import { Drawer, useDrawer } from "@/components/layout/drawer";
import { PizzaTracker } from "@/components/shared/pizza-tracker";
import { ApprovePanel } from "@/components/shared/approve-panel";
import {
  AlertTriangle,
  Mail,
  FileText,
  UserPlus,
  Briefcase,
  DollarSign,
  Stamp,
  ClipboardCheck,
  Loader2,
  Bot,
  Filter,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from "lucide-react";

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
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

type FilterMode = "todos" | "urgente" | "agentes";

const TYPE_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  email: Mail,
  email_ticket: Mail,
  proposal: FileText,
  lead: UserPlus,
  matter: Briefcase,
  collection: DollarSign,
  contract: Stamp,
  notary: Stamp,
  case_review: ClipboardCheck,
  scraper: Bot,
};

function getIconForType(type: string) {
  return TYPE_ICON_MAP[type] || FileText;
}

/* ------------------------------------------------------------------ */
/* Unified inbox item                                                  */
/* ------------------------------------------------------------------ */

interface UnifiedItem {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  actionLabel: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  timeText?: string;
  timeUrgent: boolean;
  badge?: string;
  badgeColor?: string;
  priority: number; // 0 = urgent, 1 = today, 2 = inProgress
  source: "urgent" | "today" | "inProgress";
  hasAgentInsight: boolean;
  // Extra data for drawer
  processId?: string;
  status?: string;
  amount?: string;
  agentInsight?: { agentName: string; message: string; type: string };
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function DashboardPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterMode>("todos");
  const [agentSectionOpen, setAgentSectionOpen] = useState(false);
  const [completedOpen, setCompletedOpen] = useState(false);

  const { isOpen, drawerContent, drawerTitle, openDrawer, closeDrawer } =
    useDrawer();

  const { data, isLoading, error } = useQuery<ActionItems>({
    queryKey: ["dashboard-action-items"],
    queryFn: () => api.get("/dashboards/action-items"),
  });

  /* ---- Loading ---- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ---- Error ---- */
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="h-10 w-10 text-red-500 mb-3" />
        <p className="text-lg font-medium" style={{ fontSize: "16px" }}>
          Error al cargar el panel
        </p>
        <p
          className="text-gray-500 mt-1"
          style={{ fontSize: "14px" }}
        >
          No se pudo obtener la informaci&oacute;n. Intente nuevamente.
        </p>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Build unified inbox list                                          */
  /* ---------------------------------------------------------------- */

  const firstName = user?.full_name?.split(" ")[0] || "Usuario";

  // Map agent insights by index for easy lookup
  const insightsByIndex = data.agentInsights;

  const urgentItems: UnifiedItem[] = data.urgent.map((item, i) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    subtitle: item.subtitle || item.urgencyText || "",
    actionLabel: item.actionLabel,
    icon: <AlertTriangle className="h-5 w-5" />,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    timeText: item.urgencyText,
    timeUrgent: true,
    badge: "Urgente",
    badgeColor: "bg-red-100 text-red-700",
    priority: 0,
    source: "urgent" as const,
    hasAgentInsight: i < insightsByIndex.length && insightsByIndex[i]?.type === "warning",
    amount: item.amount,
    agentInsight:
      i < insightsByIndex.length
        ? insightsByIndex[i]
        : undefined,
  }));

  const todayItems: UnifiedItem[] = data.today.map((item, i) => {
    const Icon = getIconForType(item.type);
    return {
      id: item.id,
      type: item.type,
      title: item.title,
      subtitle: item.subtitle || "",
      actionLabel: item.actionLabel,
      icon: <Icon className="h-5 w-5" />,
      iconBg: "bg-yellow-100",
      iconColor: "text-yellow-600",
      timeText: "Hoy",
      timeUrgent: false,
      badge: "Hoy",
      badgeColor: "bg-yellow-100 text-yellow-700",
      priority: 1,
      source: "today" as const,
      hasAgentInsight: insightsByIndex.some(
        (ins) => ins.type === "suggestion"
      ),
      agentInsight: insightsByIndex.find(
        (ins) => ins.type === "suggestion" || ins.type === "info"
      ),
    };
  });

  const inProgressItems: UnifiedItem[] = data.inProgress.map((item) => {
    const Icon = getIconForType(item.type);
    const progress = getProcessProgress(item.processId, item.status);
    return {
      id: item.id,
      type: item.type,
      title: item.title,
      subtitle: item.subtitle || `${progress.stepLabel} - ${progress.percentage}%`,
      actionLabel: "Ver progreso",
      icon: <Icon className="h-5 w-5" />,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      timeText: `${progress.percentage}%`,
      timeUrgent: false,
      badge: "En curso",
      badgeColor: "bg-blue-100 text-blue-700",
      priority: 2,
      source: "inProgress" as const,
      hasAgentInsight: false,
      processId: item.processId,
      status: item.status,
    };
  });

  const allItems: UnifiedItem[] = [
    ...urgentItems,
    ...todayItems,
    ...inProgressItems,
  ].sort((a, b) => a.priority - b.priority);

  /* ---- Filters ---- */
  const filteredItems =
    filter === "urgente"
      ? allItems.filter((i) => i.source === "urgent")
      : filter === "agentes"
        ? allItems.filter((i) => i.hasAgentInsight)
        : allItems;

  const totalPendientes = allItems.length;

  /* ---- Agent log entries ---- */
  const agentLogEntries: AgentLogEntry[] = data.agentInsights.map(
    (insight, i) => ({
      id: `agent-${i}`,
      agentName: insight.agentName,
      action: insight.message,
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      status:
        insight.type === "warning"
          ? ("pending_approval" as const)
          : ("completed" as const),
      actionRequired:
        insight.type === "warning" || insight.type === "suggestion",
    })
  );

  /* ---------------------------------------------------------------- */
  /* Drawer handlers                                                   */
  /* ---------------------------------------------------------------- */

  function handleCardClick(item: UnifiedItem) {
    if (item.source === "inProgress" && item.processId && item.status) {
      const progress = getProcessProgress(item.processId, item.status);

      // Build PizzaTracker steps from the process
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

      openDrawer(
        item.title,
        <div className="space-y-6">
          <div>
            <p
              className="text-gray-600 mb-4"
              style={{ fontSize: "14px" }}
            >
              {item.subtitle}
            </p>
            {progress.agentName && (
              <div className="flex items-center gap-2 mb-4">
                <Bot className="h-4 w-4 text-gray-400" />
                <span
                  className="text-gray-500"
                  style={{ fontSize: "13px" }}
                >
                  Agente: {progress.agentName}
                </span>
              </div>
            )}
          </div>
          <PizzaTracker
            steps={steps}
            currentStepIndex={progress.current}
          />
        </div>
      );
      return;
    }

    // Urgent or today items with agent insight -> ApprovePanel
    if (item.agentInsight) {
      openDrawer(
        item.title,
        <ApprovePanel
          agentName={item.agentInsight.agentName}
          agentAction={item.agentInsight.message}
          content={`${item.title}\n\n${item.subtitle}${item.amount ? `\n\nMonto: ${item.amount}` : ""}`}
          onApprove={() => closeDrawer()}
          onModify={() => closeDrawer()}
          onReject={() => closeDrawer()}
        />
      );
      return;
    }

    // Fallback: simple detail view
    openDrawer(
      item.title,
      <div className="space-y-4">
        <p className="text-gray-700" style={{ fontSize: "15px" }}>
          {item.subtitle}
        </p>
        {item.amount && (
          <p className="text-gray-900 font-semibold" style={{ fontSize: "16px" }}>
            Monto: {item.amount}
          </p>
        )}
        <p className="text-gray-400" style={{ fontSize: "13px" }}>
          Tipo: {item.type} &middot; {item.badge}
        </p>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      {/* ============================================================ */}
      {/* TOP: Greeting bar                                             */}
      {/* ============================================================ */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="font-bold text-gray-900"
            style={{ fontSize: "24px" }}
          >
            Buenos d&iacute;as, {firstName}
          </h1>
          <p
            className="mt-1 text-gray-500"
            style={{ fontSize: "15px" }}
          >
            {totalPendientes > 0
              ? `${totalPendientes} cosas pendientes`
              : "Todo al d\u00eda. Sin tareas pendientes."}
          </p>
        </div>

        {/* Filter chips */}
        <div className="flex shrink-0 items-center gap-2">
          {(
            [
              { key: "todos", label: "Todos" },
              { key: "urgente", label: "Urgente" },
              { key: "agentes", label: "Agentes" },
            ] as const
          ).map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => setFilter(chip.key)}
              className={[
                "rounded-full px-3 py-1 font-medium transition-colors",
                filter === chip.key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200",
              ].join(" ")}
              style={{ fontSize: "13px" }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* MIDDLE: The Inbox (bandeja)                                    */}
      {/* ============================================================ */}
      <section aria-label="Bandeja de entrada">
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 py-12 text-center">
            <Filter className="h-8 w-8 text-gray-300 mb-3" />
            <p
              className="text-gray-500 font-medium"
              style={{ fontSize: "15px" }}
            >
              No hay elementos con este filtro
            </p>
            <button
              type="button"
              onClick={() => setFilter("todos")}
              className="mt-2 text-blue-600 font-medium hover:underline"
              style={{ fontSize: "14px" }}
            >
              Ver todos
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <InboxItem
                key={item.id}
                id={item.id}
                icon={item.icon}
                iconBg={item.iconBg}
                iconColor={item.iconColor}
                title={item.title}
                subtitle={item.subtitle}
                badge={item.badge}
                badgeColor={item.badgeColor}
                timeText={item.timeText}
                timeUrgent={item.timeUrgent}
                actionLabel={item.actionLabel}
                onAction={() => handleCardClick(item)}
                onCardClick={() => handleCardClick(item)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ============================================================ */}
      {/* BOTTOM: Agent Activity (collapsible)                          */}
      {/* ============================================================ */}
      {agentLogEntries.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => setAgentSectionOpen((prev) => !prev)}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100">
                <Bot className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2
                  className="font-semibold text-gray-900"
                  style={{ fontSize: "16px" }}
                >
                  Actividad de Agentes
                </h2>
                {!agentSectionOpen && (
                  <p
                    className="text-gray-400 mt-0.5"
                    style={{ fontSize: "13px" }}
                  >
                    {agentLogEntries.length} acciones recientes
                  </p>
                )}
              </div>
            </div>
            {agentSectionOpen ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {agentSectionOpen && (
            <div className="border-t border-gray-100 px-5 py-4">
              <AgentLog entries={agentLogEntries} maxVisible={5} />
            </div>
          )}
        </section>
      )}

      {/* ============================================================ */}
      {/* COMPLETED section                                             */}
      {/* ============================================================ */}
      {data.completed.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white">
          <button
            type="button"
            onClick={() => setCompletedOpen((prev) => !prev)}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2
                  className="font-semibold text-gray-900"
                  style={{ fontSize: "16px" }}
                >
                  Completado hoy
                </h2>
                {!completedOpen && (
                  <p
                    className="text-gray-400 mt-0.5"
                    style={{ fontSize: "13px" }}
                  >
                    {data.completed.length} tareas completadas
                  </p>
                )}
              </div>
            </div>
            {completedOpen ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {completedOpen && (
            <div className="border-t border-gray-100 px-5 py-4">
              <div className="space-y-2">
                {data.completed.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg bg-green-50/50 border border-green-100 px-4 py-3"
                  >
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-gray-700 font-medium"
                        style={{ fontSize: "14px" }}
                      >
                        {item.title}
                      </p>
                      {item.subtitle && (
                        <p
                          className="text-gray-400 truncate"
                          style={{ fontSize: "13px" }}
                        >
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ============================================================ */}
      {/* Drawer                                                        */}
      {/* ============================================================ */}
      <Drawer open={isOpen} onClose={closeDrawer} title={drawerTitle}>
        {drawerContent}
      </Drawer>
    </div>
  );
}
