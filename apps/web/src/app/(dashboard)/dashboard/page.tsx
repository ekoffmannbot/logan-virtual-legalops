"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate, formatCurrency } from "@/lib/utils";
import { LEAD_STATUS_LABELS, MATTER_TYPE_LABELS, DEADLINE_SEVERITY_LABELS, STATUS_COLORS } from "@/lib/constants";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  UserPlus,
  FileText,
  Briefcase,
  AlertCircle,
  Clock,
  CalendarClock,
  Loader2,
  Zap,
  Bot,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DashboardOverview {
  kpis: {
    new_leads: number;
    active_proposals: number;
    open_matters: number;
    overdue_invoices: number;
  };
  leads_by_status: Array<{ status: string; count: number }>;
  matters_by_type: Array<{ type: string; count: number }>;
  overdue_tasks: Array<{
    id: number;
    title: string;
    due_date: string;
    assigned_to_name: string;
    matter_title?: string;
  }>;
  critical_deadlines: Array<{
    id: number;
    title: string;
    due_date: string;
    severity: string;
    matter_title?: string;
  }>;
}

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery<DashboardOverview>({
    queryKey: ["dashboard-overview"],
    queryFn: () => api.get("/dashboards/overview"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
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

  if (!data) return null;

  const leadsChartData = data.leads_by_status.map((item) => ({
    name: LEAD_STATUS_LABELS[item.status] || item.status,
    cantidad: item.count,
  }));

  const mattersChartData = data.matters_by_type.map((item) => ({
    name: MATTER_TYPE_LABELS[item.type] || item.type,
    value: item.count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Resumen general del estudio</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Leads nuevos"
          value={data.kpis.new_leads}
          icon={UserPlus}
          description="Este mes"
        />
        <StatCard
          title="Propuestas activas"
          value={data.kpis.active_proposals}
          icon={FileText}
          description="Enviadas y pendientes"
        />
        <StatCard
          title="Casos abiertos"
          value={data.kpis.open_matters}
          icon={Briefcase}
          description="En curso"
        />
        <StatCard
          title="Facturas vencidas"
          value={data.kpis.overdue_invoices}
          icon={AlertCircle}
          description="Requieren atencion"
          className={data.kpis.overdue_invoices > 0 ? "border-red-200 bg-red-50/50" : ""}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bar Chart - Leads by Status */}
        <div className="rounded-xl border bg-white p-6">
          <h3 className="text-base font-semibold mb-4">Leads por estado</h3>
          {leadsChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={leadsChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Sin datos de leads disponibles
            </p>
          )}
        </div>

        {/* Pie Chart - Matters by Type */}
        <div className="rounded-xl border bg-white p-6">
          <h3 className="text-base font-semibold mb-4">Casos por tipo</h3>
          {mattersChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={mattersChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {mattersChartData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Sin datos de casos disponibles
            </p>
          )}
        </div>
      </div>

      {/* Process Map */}
      <div className="rounded-xl border bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="text-base font-semibold">Procesos del Estudio</h3>
          <span className="text-xs text-muted-foreground ml-2">
            Haz clic en un proceso para ver su flujo completo con agentes
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {[
            { name: "Recepción Visita", href: "/leads", agents: ["Secretaria", "Abogado"], color: "blue" },
            { name: "Recepción Teléfono", href: "/leads", agents: ["Secretaria"], color: "cyan" },
            { name: "Seguimiento Propuestas", href: "/proposals", agents: ["Abogado Jefe", "Abogado", "Administración"], color: "green" },
            { name: "Contrato y Mandato", href: "/contracts", agents: ["Abogado", "Administración", "Notaría"], color: "amber" },
            { name: "Docs Notariales", href: "/notary", agents: ["Gerente Legal", "Abogado", "Notaría", "Cliente"], color: "purple" },
            { name: "Correos Abogados", href: "/email-tickets", agents: ["Abogado", "Abogado Jefe"], color: "rose" },
            { name: "Cobranza", href: "/collections", agents: ["Secretaria", "Jefe Cobranza"], color: "red" },
            { name: "Causas JPL", href: "/matters", agents: ["Agente Comercial", "Administración", "Abogado JPL"], color: "teal" },
            { name: "Revisión Causas", href: "/case-review", agents: ["Abogado", "Procurador"], color: "indigo" },
            { name: "LegalBOT Scraper", href: "/scraper", agents: ["Agente Comercial", "Bot Scraper"], color: "slate" },
          ].map((process) => (
            <Link
              key={process.name}
              href={process.href}
              className="group flex flex-col gap-2 rounded-lg border border-gray-200 p-3 hover:border-primary/50 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-xs font-semibold text-gray-900 leading-tight">{process.name}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {process.agents.map((agent) => (
                  <span key={agent} className="inline-flex items-center rounded-full bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-600">
                    {agent}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Ver flujo <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Bottom Lists Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Overdue Tasks */}
        <div className="rounded-xl border bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-orange-500" />
            <h3 className="text-base font-semibold">Tareas vencidas</h3>
          </div>
          {data.overdue_tasks.length > 0 ? (
            <div className="space-y-3">
              {data.overdue_tasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  className="flex items-start justify-between rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{task.assigned_to_name}</span>
                      {task.matter_title && (
                        <>
                          <span>·</span>
                          <span className="truncate">{task.matter_title}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="ml-2 text-xs text-red-600 whitespace-nowrap">
                    {formatDate(task.due_date)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hay tareas vencidas
            </p>
          )}
        </div>

        {/* Critical Deadlines */}
        <div className="rounded-xl border bg-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock className="h-5 w-5 text-red-500" />
            <h3 className="text-base font-semibold">Plazos criticos</h3>
          </div>
          {data.critical_deadlines.length > 0 ? (
            <div className="space-y-3">
              {data.critical_deadlines.slice(0, 5).map((deadline) => (
                <div
                  key={deadline.id}
                  className="flex items-start justify-between rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{deadline.title}</p>
                    {deadline.matter_title && (
                      <p className="mt-1 text-xs text-muted-foreground truncate">
                        {deadline.matter_title}
                      </p>
                    )}
                  </div>
                  <div className="ml-2 flex flex-col items-end gap-1">
                    <StatusBadge
                      status={deadline.severity}
                      label={DEADLINE_SEVERITY_LABELS[deadline.severity] || deadline.severity}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(deadline.due_date)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No hay plazos criticos
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
