"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Scale,
  Search,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle2,
  MinusCircle,
  Calendar,
  Building2,
  Hash,
  Eye,
  EyeOff,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { ProcessFlow } from "@/components/shared/process-flow";
import { revisionCausasProcess } from "@/lib/process-definitions";
import { AgentStatusBar } from "@/components/shared/agent-message";
import { computeUrgency } from "@/lib/process-status-map";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Matter {
  id: string;
  title: string;
  court: string;
  rol_number: string;
  client_name: string;
  status: string;
  last_movement_at: string | null;
  assigned_to: string;
}

interface MovementForm {
  description: string;
  has_deadline: boolean;
  deadline_date?: string;
  complexity: "low" | "medium" | "high";
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Days elapsed since a given ISO date string. Returns Infinity when null. */
function daysSince(dateStr: string | null): number {
  if (!dateStr) return Infinity;
  const ms = Date.now() - new Date(dateStr).getTime();
  return ms / (1000 * 60 * 60 * 24);
}

/** Border colour class based on age of last movement. */
function movementBorderColor(lastMovementAt: string | null): string {
  const days = daysSince(lastMovementAt);
  if (days <= 3) return "border-green-400";
  if (days <= 7) return "border-yellow-400";
  return "border-red-400";
}

/** Thin left-accent colour for the card strip. */
function movementAccentColor(lastMovementAt: string | null): string {
  const days = daysSince(lastMovementAt);
  if (days <= 3) return "bg-green-400";
  if (days <= 7) return "bg-yellow-400";
  return "bg-red-400";
}

/* ------------------------------------------------------------------ */
/* Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function CaseReviewPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedMatter, setExpandedMatter] = useState<string | null>(null);
  const [showProcessFlow, setShowProcessFlow] = useState(false);
  const [movementForms, setMovementForms] = useState<
    Record<string, MovementForm>
  >({});

  /* ---- Data fetching ---- */

  const { data: matters = [], isLoading } = useQuery({
    queryKey: ["case-review", "open-matters"],
    queryFn: () => api.get<Matter[]>("/case-review/open-matters"),
  });

  /* ---- Mutations ---- */

  const registerMovementMutation = useMutation({
    mutationFn: ({
      matterId,
      data,
    }: {
      matterId: string;
      data: MovementForm;
    }) => api.post(`/case-review/${matterId}/movement`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["case-review"] });
      setExpandedMatter(null);
      setMovementForms((prev) => {
        const next = { ...prev };
        delete next[variables.matterId];
        return next;
      });
    },
  });

  const noMovementMutation = useMutation({
    mutationFn: (matterId: string) =>
      api.post(`/case-review/${matterId}/no-movement`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case-review"] });
    },
  });

  /* ---- Derived state ---- */

  const filteredMatters = matters.filter(
    (matter) =>
      matter.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      matter.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      matter.rol_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      matter.court.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /** Count how many matters have already been reviewed today (have a recent movement). */
  const reviewedCount = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return matters.filter((m) => {
      if (!m.last_movement_at) return false;
      return new Date(m.last_movement_at) >= todayStart;
    }).length;
  }, [matters]);

  /** Agent status counts. */
  const agentCounts = useMemo(() => {
    const abogadoSet = new Set<string>();
    const procuradorSet = new Set<string>();
    matters.forEach((m) => {
      const role = m.assigned_to?.toLowerCase() ?? "";
      if (role.includes("procurador")) {
        procuradorSet.add(m.assigned_to);
      } else {
        abogadoSet.add(m.assigned_to);
      }
    });
    return [
      { name: "Abogado", count: abogadoSet.size, color: "blue" },
      { name: "Procurador", count: procuradorSet.size, color: "green" },
    ];
  }, [matters]);

  /* ---- Form helpers ---- */

  const getFormForMatter = (matterId: string): MovementForm => {
    return (
      movementForms[matterId] || {
        description: "",
        has_deadline: false,
        complexity: "low" as const,
      }
    );
  };

  const updateForm = (matterId: string, updates: Partial<MovementForm>) => {
    setMovementForms((prev) => ({
      ...prev,
      [matterId]: { ...getFormForMatter(matterId), ...updates },
    }));
  };

  const handleRegisterMovement = (matterId: string) => {
    const form = getFormForMatter(matterId);
    if (!form.description.trim()) return;
    registerMovementMutation.mutate({ matterId, data: form });
  };

  /* ---- Progress percentage ---- */
  const progressPercent =
    matters.length > 0 ? Math.round((reviewedCount / matters.length) * 100) : 0;

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Revision Diaria de Causas
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Revisa los movimientos de las causas abiertas del dia
        </p>
      </div>

      {/* ---- Progreso del Dia ---- */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">
            Progreso del Dia
          </span>
          <span className="text-sm font-medium text-gray-900">
            {reviewedCount} de {matters.length} causa
            {matters.length !== 1 ? "s" : ""} revisada
            {reviewedCount !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              progressPercent === 100 ? "bg-green-500" : "bg-blue-500"
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-gray-400 text-right">
          {progressPercent}% completado
        </p>
      </div>

      {/* ---- Agent Status Bar ---- */}
      <AgentStatusBar agents={agentCounts} />

      {/* ---- Process Flow Toggle ---- */}
      <div>
        <button
          onClick={() => setShowProcessFlow((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {showProcessFlow ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          {showProcessFlow ? "Ocultar Flujo" : "Ver Flujo"}
        </button>

        {showProcessFlow && (
          <div className="mt-3">
            <ProcessFlow process={revisionCausasProcess} />
          </div>
        )}
      </div>

      {/* ---- Summary Cards ---- */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Causas pendientes de revision</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {matters.length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Fecha de revision</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {formatDate(new Date().toISOString())}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Revisor</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {user?.full_name || "\u2014"}
          </p>
        </div>
      </div>

      {/* ---- Search ---- */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por titulo, cliente, rol o tribunal..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* ---- Matters List ---- */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : filteredMatters.length === 0 ? (
        <EmptyState
          icon={Scale}
          title="No hay causas pendientes"
          description="Todas las causas han sido revisadas o no hay causas abiertas."
        />
      ) : (
        <div className="space-y-3">
          {filteredMatters.map((matter) => {
            const isExpanded = expandedMatter === matter.id;
            const form = getFormForMatter(matter.id);
            const borderColor = movementBorderColor(matter.last_movement_at);
            const accentColor = movementAccentColor(matter.last_movement_at);
            const urgency = computeUrgency(matter);

            return (
              <div
                key={matter.id}
                className={cn(
                  "rounded-xl border-2 bg-white shadow-sm overflow-hidden transition-colors",
                  borderColor
                )}
              >
                {/* Thin coloured accent strip on the left */}
                <div className="flex">
                  <div className={cn("w-1.5 flex-shrink-0", accentColor)} />

                  <div className="flex-1 min-w-0">
                    {/* Matter Header */}
                    <div className="flex items-center justify-between p-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <Scale className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-gray-900 truncate">
                                {matter.title}
                              </h3>
                              {urgency === "urgent" && (
                                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                                  Urgente
                                </span>
                              )}
                              {urgency === "warning" && (
                                <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-700">
                                  Atencion
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                              <span className="inline-flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5" />
                                {matter.court}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Hash className="h-3.5 w-3.5" />
                                {matter.rol_number}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                Ultimo mov:{" "}
                                {matter.last_movement_at
                                  ? formatDate(matter.last_movement_at)
                                  : "Sin movimientos"}
                              </span>
                              <span className="text-xs text-gray-400">
                                Cliente: {matter.client_name}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => noMovementMutation.mutate(matter.id)}
                          disabled={noMovementMutation.isPending}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                          <MinusCircle className="h-4 w-4" />
                          Sin Movimiento
                        </button>
                        <button
                          onClick={() =>
                            setExpandedMatter(isExpanded ? null : matter.id)
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                        >
                          <FileText className="h-4 w-4" />
                          Registrar Movimiento
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Form */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 bg-gray-50 p-4">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Descripcion del movimiento
                            </label>
                            <textarea
                              value={form.description}
                              onChange={(e) =>
                                updateForm(matter.id, {
                                  description: e.target.value,
                                })
                              }
                              rows={3}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="Describa el movimiento registrado..."
                            />
                          </div>

                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <div>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={form.has_deadline}
                                  onChange={(e) =>
                                    updateForm(matter.id, {
                                      has_deadline: e.target.checked,
                                    })
                                  }
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                  Tiene plazo
                                </span>
                              </label>
                              {form.has_deadline && (
                                <input
                                  type="date"
                                  value={form.deadline_date || ""}
                                  onChange={(e) =>
                                    updateForm(matter.id, {
                                      deadline_date: e.target.value,
                                    })
                                  }
                                  className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              )}
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Complejidad
                              </label>
                              <select
                                value={form.complexity}
                                onChange={(e) =>
                                  updateForm(matter.id, {
                                    complexity: e.target.value as
                                      | "low"
                                      | "medium"
                                      | "high",
                                  })
                                }
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              >
                                <option value="low">Baja</option>
                                <option value="medium">Media</option>
                                <option value="high">Alta</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 pt-2">
                            <button
                              onClick={() =>
                                handleRegisterMovement(matter.id)
                              }
                              disabled={
                                registerMovementMutation.isPending ||
                                !form.description.trim()
                              }
                              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              {registerMovementMutation.isPending
                                ? "Guardando..."
                                : "Confirmar Movimiento"}
                            </button>
                            <button
                              onClick={() => setExpandedMatter(null)}
                              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
