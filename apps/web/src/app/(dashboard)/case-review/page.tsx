"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Scale,
  Search,
  ChevronDown,
  ChevronUp,
  FileText,
  AlertCircle,
  CheckCircle2,
  MinusCircle,
  Calendar,
  Building2,
  Hash,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { ProcessFlow } from "@/components/shared/process-flow";
import { revisionCausasProcess } from "@/lib/process-definitions";

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

export default function CaseReviewPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedMatter, setExpandedMatter] = useState<string | null>(null);
  const [movementForms, setMovementForms] = useState<
    Record<string, MovementForm>
  >({});

  const { data: matters = [], isLoading } = useQuery({
    queryKey: ["case-review", "open-matters"],
    queryFn: () => api.get<Matter[]>("/case-review/open-matters"),
  });

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

  const filteredMatters = matters.filter(
    (matter) =>
      matter.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      matter.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      matter.rol_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      matter.court.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Revisión Diaria de Causas
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Revisa los movimientos de las causas abiertas del día
        </p>
      </div>

      {/* Process Flow */}
      <ProcessFlow process={revisionCausasProcess} />

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Causas pendientes de revisión</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {matters.length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Fecha de revisión</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {formatDate(new Date().toISOString())}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Revisor</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {user?.full_name || "—"}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por título, cliente, rol o tribunal..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Matters List */}
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

            return (
              <div
                key={matter.id}
                className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
              >
                {/* Matter Header */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <Scale className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      <div>
                        <h3 className="font-medium text-gray-900 truncate">
                          {matter.title}
                        </h3>
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
                            Último mov:{" "}
                            {matter.last_movement_at
                              ? formatDate(matter.last_movement_at)
                              : "Sin movimientos"}
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
                          Descripción del movimiento
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
                          onClick={() => handleRegisterMovement(matter.id)}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
