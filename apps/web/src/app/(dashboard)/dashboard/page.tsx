"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDate } from "@/lib/utils";
import { getProcessProgress } from "@/lib/process-status-map";
import { UrgencyCard } from "@/components/shared/urgency-card";
import { CompactCard } from "@/components/shared/item-card";
import { AgentMessageList } from "@/components/shared/agent-message";
import { ProcessStepIndicator } from "@/components/shared/process-step-indicator";
import { ActionItemsSection } from "@/components/shared/urgency-section";
import {
  AlertTriangle,
  CalendarClock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  UserPlus,
  FileText,
  Briefcase,
  DollarSign,
  Zap,
} from "lucide-react";
import Link from "next/link";

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

export default function DashboardPage() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery<ActionItems>({
    queryKey: ["dashboard-action-items"],
    queryFn: () => api.get("/dashboards/action-items"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <p className="text-lg font-medium">Error al cargar el dashboard</p>
        <p className="text-sm text-muted-foreground mt-1">
          No se pudo obtener la informacion. Intente nuevamente.
        </p>
      </div>
    );
  }

  const totalActions = data.urgent.length + data.today.length;
  const todayStr = formatDate(new Date().toISOString());
  const firstName = user?.full_name?.split(" ")[0] || "Usuario";

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Buenos dias, {firstName}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalActions > 0 ? (
              <>Tienes <span className="font-semibold text-gray-700">{totalActions} cosas</span> que requieren tu atención</>
            ) : (
              "Todo al día. No hay tareas pendientes."
            )}
          </p>
        </div>
        <span className="text-sm text-gray-400">{todayStr}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column: Action Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* URGENT */}
          {data.urgent.length > 0 && (
            <ActionItemsSection
              title="Urgente"
              urgency="urgent"
              count={data.urgent.length}
              icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
            >
              <div className="space-y-3">
                {data.urgent.map((item) => (
                  <UrgencyCard
                    key={item.id}
                    title={item.title}
                    subtitle={item.subtitle}
                    urgency="urgent"
                    urgencyText={item.urgencyText}
                    icon={AlertTriangle}
                    actionLabel={item.actionLabel}
                    actionHref={item.actionHref}
                    secondaryLabel={item.secondaryLabel}
                    secondaryHref={item.secondaryHref}
                    amount={item.amount}
                  />
                ))}
              </div>
            </ActionItemsSection>
          )}

          {/* TODAY */}
          {data.today.length > 0 && (
            <ActionItemsSection
              title="Por hacer hoy"
              urgency="warning"
              count={data.today.length}
              icon={<CalendarClock className="h-4 w-4 text-yellow-600" />}
            >
              <div className="space-y-2">
                {data.today.map((item) => (
                  <CompactCard
                    key={item.id}
                    title={item.title}
                    subtitle={item.subtitle}
                    urgency="warning"
                    actionLabel={item.actionLabel}
                    actionHref={item.actionHref}
                  />
                ))}
              </div>
            </ActionItemsSection>
          )}

          {/* IN PROGRESS */}
          {data.inProgress.length > 0 && (
            <ActionItemsSection
              title="En progreso"
              urgency="normal"
              count={data.inProgress.length}
              icon={<TrendingUp className="h-4 w-4 text-blue-600" />}
            >
              <div className="space-y-2">
                {data.inProgress.map((item) => {
                  const progress = getProcessProgress(item.processId, item.status);
                  return (
                    <Link
                      key={item.id}
                      href={item.href || "#"}
                      className="block rounded-lg border border-gray-200 bg-white p-3 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {item.title}
                          </h4>
                          {item.subtitle && (
                            <p className="text-xs text-gray-500 mt-0.5">{item.subtitle}</p>
                          )}
                        </div>
                        <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 rounded-full px-2 py-0.5 flex-shrink-0">
                          {progress.percentage}%
                        </span>
                      </div>
                      <div className="mt-2">
                        <ProcessStepIndicator
                          current={progress.current}
                          total={progress.total}
                          percentage={progress.percentage}
                          stepLabel={progress.stepLabel}
                          agentName={progress.agentName}
                          agentColor={progress.agentColor}
                          size="sm"
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </ActionItemsSection>
          )}

          {/* COMPLETED */}
          {data.completed.length > 0 && (
            <ActionItemsSection
              title="Completado hoy"
              urgency="normal"
              count={data.completed.length}
              icon={<CheckCircle2 className="h-4 w-4 text-green-600" />}
              defaultOpen={false}
            >
              <div className="space-y-1">
                {data.completed.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg bg-green-50/50 border border-green-100 px-3 py-2"
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{item.title}</p>
                      {item.subtitle && (
                        <p className="text-[10px] text-gray-400">{item.subtitle}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ActionItemsSection>
          )}
        </div>

        {/* Right Column: Agent Insights + Quick Numbers */}
        <div className="space-y-6">
          {/* Agent Insights */}
          {data.agentInsights.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <AgentMessageList messages={data.agentInsights} maxVisible={5} />
            </div>
          )}

          {/* Quick Numbers */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Números rápidos</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <QuickNumberCard
                label="Leads"
                value={data.quickNumbers.leads}
                icon={UserPlus}
                href="/leads"
                color="blue"
              />
              <QuickNumberCard
                label="Propuestas"
                value={data.quickNumbers.proposals}
                icon={FileText}
                href="/proposals"
                color="green"
              />
              <QuickNumberCard
                label="Casos"
                value={data.quickNumbers.matters}
                icon={Briefcase}
                href="/matters"
                color="purple"
              />
              <QuickNumberCard
                label="Vencidos"
                value={data.quickNumbers.overdue}
                icon={DollarSign}
                href="/collections"
                color="red"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* QUICK NUMBER CARD                                                   */
/* ------------------------------------------------------------------ */

function QuickNumberCard({
  label,
  value,
  icon: Icon,
  href,
  color,
}: {
  label: string;
  value: number;
  icon: any;
  href: string;
  color: string;
}) {
  const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
    blue:   { bg: "hover:bg-blue-50", text: "text-blue-700", iconBg: "bg-blue-100" },
    green:  { bg: "hover:bg-green-50", text: "text-green-700", iconBg: "bg-green-100" },
    purple: { bg: "hover:bg-purple-50", text: "text-purple-700", iconBg: "bg-purple-100" },
    red:    { bg: "hover:bg-red-50", text: "text-red-700", iconBg: "bg-red-100" },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg border border-gray-100 p-3 transition-colors ${c.bg}`}
    >
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.iconBg}`}>
        <Icon className={`h-4 w-4 ${c.text}`} />
      </div>
      <div>
        <p className={`text-lg font-bold ${c.text}`}>{value}</p>
        <p className="text-[10px] text-gray-500">{label}</p>
      </div>
    </Link>
  );
}
