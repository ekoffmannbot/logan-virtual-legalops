"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  Search,
  Filter,
  ChevronDown,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  Calendar,
  Tag,
  ExternalLink,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatDate } from "@/lib/utils";
import { TASK_STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";

interface Task {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  due_date: string | null;
  entity_type: string | null;
  entity_id: string | null;
  entity_label: string | null;
  priority: string;
  created_at: string;
}

const TASK_TYPE_LABELS: Record<string, string> = {
  general: "General",
  legal: "Legal",
  administrative: "Administrativo",
  follow_up: "Seguimiento",
  review: "Revisión",
  deadline: "Plazo",
  billing: "Facturación",
  contact: "Contacto",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

export default function TasksPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"all" | "mine">("mine");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", statusFilter, typeFilter, viewMode],
    queryFn: () =>
      api.get<Task[]>(
        (() => {
          const params = new URLSearchParams();
          if (statusFilter !== "all") params.set("status", statusFilter);
          if (typeFilter !== "all") params.set("type", typeFilter);
          if (viewMode === "mine" && user?.id) params.set("assigned_to", String(user.id));
          const qs = params.toString();
          return qs ? `/tasks?${qs}` : "/tasks";
        })()
      ),
  });

  const { data: stats } = useQuery({
    queryKey: ["tasks", "stats", viewMode],
    queryFn: () =>
      api.get<{
        total: number;
        pending: number;
        in_progress: number;
        completed: number;
        overdue: number;
      }>(viewMode === "mine" && user?.id ? `/tasks/stats?assigned_to=${user.id}` : "/tasks/stats"),
  });

  const filteredTasks = tasks.filter(
    (task) =>
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.entity_label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.assigned_to_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      key: "title",
      label: "Título",
      render: (task: Task) => (
        <div className="max-w-xs">
          <p className="font-medium text-gray-900 truncate">{task.title}</p>
          {task.description && (
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {task.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "type",
      label: "Tipo",
      render: (task: Task) => (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
          <Tag className="h-3 w-3" />
          {TASK_TYPE_LABELS[task.type] || task.type}
        </span>
      ),
    },
    {
      key: "status",
      label: "Estado",
      render: (task: Task) => (
        <StatusBadge
          status={task.status}
          labels={TASK_STATUS_LABELS}
          colors={STATUS_COLORS}
        />
      ),
    },
    {
      key: "priority",
      label: "Prioridad",
      render: (task: Task) => (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
            task.priority === "urgent" && "bg-red-100 text-red-700",
            task.priority === "high" && "bg-orange-100 text-orange-700",
            task.priority === "medium" && "bg-yellow-100 text-yellow-700",
            task.priority === "low" && "bg-gray-100 text-gray-600"
          )}
        >
          {PRIORITY_LABELS[task.priority] || task.priority}
        </span>
      ),
    },
    {
      key: "assigned_to",
      label: "Asignado",
      render: (task: Task) => (
        <span className="text-sm text-gray-700">
          {task.assigned_to_name || (
            <span className="text-gray-400">Sin asignar</span>
          )}
        </span>
      ),
    },
    {
      key: "due_date",
      label: "Vence",
      render: (task: Task) => {
        if (!task.due_date) return <span className="text-gray-400">—</span>;
        const isOverdue =
          new Date(task.due_date) < new Date() &&
          task.status !== "completed" &&
          task.status !== "cancelled";
        return (
          <span
            className={cn(
              "text-sm",
              isOverdue ? "text-red-600 font-medium" : "text-gray-600"
            )}
          >
            {formatDate(task.due_date)}
          </span>
        );
      },
    },
    {
      key: "entity_label",
      label: "Entidad",
      render: (task: Task) =>
        task.entity_label ? (
          <span className="inline-flex items-center gap-1 text-sm text-blue-600">
            <ExternalLink className="h-3.5 w-3.5" />
            {task.entity_label}
          </span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tareas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestión y seguimiento de tareas
          </p>
        </div>
        <button
          onClick={() => router.push("/tasks/new")}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nueva Tarea
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Total"
            value={stats.total}
            icon={ClipboardList}
          />
          <StatCard
            title="Pendientes"
            value={stats.pending}
            icon={Clock}
            variant="warning"
          />
          <StatCard
            title="En Progreso"
            value={stats.in_progress}
            icon={AlertCircle}
            variant="info"
          />
          <StatCard
            title="Completadas"
            value={stats.completed}
            icon={CheckCircle2}
            variant="success"
          />
          <StatCard
            title="Vencidas"
            value={stats.overdue}
            icon={AlertCircle}
            variant="danger"
          />
        </div>
      )}

      {/* View Toggle + Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* View Toggle */}
        <div className="inline-flex rounded-lg border border-gray-300 p-0.5">
          <button
            onClick={() => setViewMode("mine")}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              viewMode === "mine"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            Mis tareas
          </button>
          <button
            onClick={() => setViewMode("all")}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
              viewMode === "all"
                ? "bg-blue-600 text-white"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            Todas
          </button>
        </div>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar tareas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none rounded-lg border border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">Todos los estados</option>
            {Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="appearance-none rounded-lg border border-gray-300 py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">Todos los tipos</option>
            {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No hay tareas"
          description={
            viewMode === "mine"
              ? "No tienes tareas asignadas con los filtros aplicados."
              : "No se encontraron tareas con los filtros aplicados."
          }
          actionLabel="Nueva Tarea"
          onAction={() => router.push("/tasks/new")}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredTasks}
          onRowClick={(task) => router.push(`/tasks/${task.id}`)}
        />
      )}
    </div>
  );
}
