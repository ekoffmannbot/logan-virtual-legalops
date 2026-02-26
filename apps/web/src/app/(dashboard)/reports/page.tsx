"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { StatCard } from "@/components/shared/stat-card";
import { Loader2, BarChart3, Users, DollarSign, TrendingUp } from "lucide-react";
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

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface DashboardStats {
  open_matters: number;
  active_leads: number;
  overdue_invoices: number;
  pending_tasks: number;
  total_invoiced: number;
  total_collected: number;
  matters_by_type: Record<string, number>;
  leads_by_status: Record<string, number>;
}

/* ------------------------------------------------------------------ */
/* Chart colors                                                        */
/* ------------------------------------------------------------------ */

const CHART_COLORS = ["#6366f1", "#2dd4bf", "#f59e0b", "#ec4899", "#a855f7", "#64748b"];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ReportsPage() {
  const { data: stats, isLoading, isError } = useQuery<DashboardStats>({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get("/dashboards/stats"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--primary-color)" }} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2" style={{ color: "var(--danger)" }}>
        <BarChart3 className="h-8 w-8" />
        <p style={{ fontSize: "14px" }}>Error al cargar reportes</p>
      </div>
    );
  }

  // Build chart data from stats
  const mattersByType = stats?.matters_by_type
    ? Object.entries(stats.matters_by_type).map(([name, value]) => ({ name, value }))
    : [];

  const leadsByStatus = stats?.leads_by_status
    ? Object.entries(stats.leads_by_status).map(([name, value]) => ({ name, value }))
    : [];

  const collectionRate = stats?.total_invoiced
    ? Math.round(((stats.total_collected || 0) / stats.total_invoiced) * 100)
    : 0;

  return (
    <div className="space-y-6 p-1">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Causas Abiertas"
          value={stats?.open_matters ?? 0}
          icon={BarChart3}
          variant="info"
        />
        <StatCard
          title="Leads Activos"
          value={stats?.active_leads ?? 0}
          icon={Users}
          variant="success"
        />
        <StatCard
          title="Facturas Vencidas"
          value={stats?.overdue_invoices ?? 0}
          icon={DollarSign}
          variant="danger"
        />
        <StatCard
          title="Tasa de Cobro"
          value={`${collectionRate}%`}
          icon={TrendingUp}
          variant="warning"
          description={
            stats?.total_invoiced
              ? `$${(stats.total_collected || 0).toLocaleString("es-CL")} de $${stats.total_invoiced.toLocaleString("es-CL")}`
              : undefined
          }
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Matters by Type */}
        <div
          className="rounded-xl p-6"
          style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)" }}
        >
          <h3
            className="text-lg font-bold mb-4"
            style={{ color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
          >
            Causas por Tipo
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={mattersByType}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 12 }} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: 8,
                  color: "var(--text-primary)",
                }}
              />
              <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Leads Funnel */}
        <div
          className="rounded-xl p-6"
          style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)" }}
        >
          <h3
            className="text-lg font-bold mb-4"
            style={{ color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
          >
            Leads por Estado
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={leadsByStatus}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {leadsByStatus.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--glass-border)",
                  borderRadius: 8,
                  color: "var(--text-primary)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
