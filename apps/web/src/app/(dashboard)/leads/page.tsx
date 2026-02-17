"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";
import { LEAD_STATUS_LABELS, LEAD_SOURCE_LABELS } from "@/lib/constants";
import { AgentStatusBar } from "@/components/shared/agent-message";
import { ItemCard } from "@/components/shared/item-card";
import { ProcessStepIndicator } from "@/components/shared/process-step-indicator";
import {
  getProcessProgress,
  computeUrgency,
  getAgentSuggestions,
  getNextActionLabel,
} from "@/lib/process-status-map";
import { EmptyState } from "@/components/shared/empty-state";
import { ProcessFlow } from "@/components/shared/process-flow";
import {
  recepcionVisitaProcess,
  recepcionTelefonoProcess,
} from "@/lib/process-definitions";
import {
  UserPlus,
  Plus,
  Loader2,
  X,
  AlertCircle,
  Phone,
  Mail,
  Search,
  Eye,
  EyeOff,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* TYPES                                                               */
/* ------------------------------------------------------------------ */

interface Lead {
  id: number;
  full_name: string;
  source: string;
  status: string;
  phone?: string;
  email?: string;
  assigned_to_name?: string;
  created_at: string;
  process_id: string;
}

interface CreateLeadPayload {
  full_name: string;
  email?: string;
  phone?: string;
  source: string;
  notes?: string;
}

/* ------------------------------------------------------------------ */
/* PAGE                                                                */
/* ------------------------------------------------------------------ */

export default function LeadsPage() {
  const queryClient = useQueryClient();

  // UI state
  const [showCreate, setShowCreate] = useState(false);
  const [showFlow, setShowFlow] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState<CreateLeadPayload>({
    full_name: "",
    email: "",
    phone: "",
    source: "inbound_call",
    notes: "",
  });
  const [formError, setFormError] = useState("");

  // Data fetching
  const { data, isLoading, error } = useQuery<{ items: Lead[]; total: number }>(
    {
      queryKey: ["leads"],
      queryFn: () => api.get("/leads"),
    }
  );

  const leads = data?.items ?? [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateLeadPayload) => api.post("/leads", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setShowCreate(false);
      setFormData({
        full_name: "",
        email: "",
        phone: "",
        source: "inbound_call",
        notes: "",
      });
      setFormError("");
    },
    onError: (err: any) => {
      setFormError(err.message || "Error al crear el lead");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      setFormError("El nombre es obligatorio");
      return;
    }
    setFormError("");
    createMutation.mutate(formData);
  };

  // Computed data
  const filteredLeads = useMemo(() => {
    if (!searchQuery.trim()) return leads;
    const q = searchQuery.toLowerCase();
    return leads.filter(
      (lead) =>
        lead.full_name.toLowerCase().includes(q) ||
        (lead.phone && lead.phone.toLowerCase().includes(q)) ||
        (lead.email && lead.email.toLowerCase().includes(q)) ||
        (lead.assigned_to_name &&
          lead.assigned_to_name.toLowerCase().includes(q))
    );
  }, [leads, searchQuery]);

  const urgentLeads = useMemo(
    () => filteredLeads.filter((lead) => computeUrgency(lead) === "urgent"),
    [filteredLeads]
  );

  const nonUrgentLeads = useMemo(
    () => filteredLeads.filter((lead) => computeUrgency(lead) !== "urgent"),
    [filteredLeads]
  );

  // Agent status counts
  const agentCounts = useMemo(() => {
    const secretariaStatuses = new Set(["new", "contacted", "meeting_scheduled"]);
    const abogadoStatuses = new Set(["proposal_sent", "won", "lost"]);

    let secretariaCount = 0;
    let abogadoCount = 0;

    for (const lead of leads) {
      if (secretariaStatuses.has(lead.status)) {
        secretariaCount++;
      }
      if (abogadoStatuses.has(lead.status)) {
        abogadoCount++;
      }
    }

    return [
      { name: "Secretaria", count: secretariaCount, color: "blue" },
      { name: "Abogado", count: abogadoCount, color: "green" },
    ];
  }, [leads]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <p className="text-lg font-medium">Error al cargar los leads</p>
        <p className="text-sm text-muted-foreground mt-1">
          No se pudo obtener la informacion. Intente nuevamente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---- HEADER ---- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recepcion</h1>
          <p className="text-muted-foreground">
            Gestion de prospectos y oportunidades
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFlow((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-muted transition-colors"
          >
            {showFlow ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            Ver Flujo
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nuevo Lead
          </button>
        </div>
      </div>

      {/* ---- AGENT STATUS BAR ---- */}
      <AgentStatusBar agents={agentCounts} />

      {/* ---- SEARCH INPUT ---- */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border pl-10 pr-4 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          placeholder="Buscar por nombre, telefono, email o asignado..."
        />
      </div>

      {/* ---- PROCESS FLOW DIALOG ---- */}
      {showFlow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowFlow(false)}
          />
          <div className="relative z-50 w-full max-w-5xl max-h-[85vh] overflow-y-auto rounded-xl border bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                Flujos de Recepcion
              </h2>
              <button
                onClick={() => setShowFlow(false)}
                className="rounded-lg p-1 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <ProcessFlow process={recepcionVisitaProcess} />
              <ProcessFlow process={recepcionTelefonoProcess} />
            </div>
          </div>
        </div>
      )}

      {/* ---- CREATE LEAD MODAL ---- */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setShowCreate(false)}
          />
          <div className="relative z-50 w-full max-w-lg rounded-xl border bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Nuevo Lead</h2>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg p-1 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="Nombre del prospecto"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="email@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Telefono
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="+56 9 1234 5678"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Fuente
                </label>
                <select
                  value={formData.source}
                  onChange={(e) =>
                    setFormData({ ...formData, source: e.target.value })
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  {Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notas</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  rows={3}
                  placeholder="Notas adicionales..."
                />
              </div>
              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {createMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Crear Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- CONTENT ---- */}
      {filteredLeads.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="No hay leads"
          description={
            searchQuery
              ? "No se encontraron resultados para tu busqueda."
              : "Agrega tu primer prospecto para comenzar a gestionar oportunidades."
          }
          action={
            !searchQuery ? (
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Nuevo Lead
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* URGENT SECTION */}
          {urgentLeads.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Atencion Urgente ({urgentLeads.length})
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {urgentLeads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} />
                ))}
              </div>
            </div>
          )}

          {/* REST OF LEADS */}
          {nonUrgentLeads.length > 0 && (
            <div className="space-y-3">
              {urgentLeads.length > 0 && (
                <h2 className="text-sm font-semibold text-gray-600">
                  Todos los leads ({nonUrgentLeads.length})
                </h2>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {nonUrgentLeads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* LEAD CARD                                                           */
/* ------------------------------------------------------------------ */

function LeadCard({ lead }: { lead: Lead }) {
  const urgency = computeUrgency(lead);
  const progress = getProcessProgress(lead.process_id, lead.status);
  const actionLabel = getNextActionLabel(lead.process_id, lead.status);

  const sourceLabel = LEAD_SOURCE_LABELS[lead.source] || lead.source;
  const subtitle = lead.assigned_to_name
    ? `${sourceLabel} \u00B7 ${lead.assigned_to_name}`
    : sourceLabel;

  const meta: Array<{ icon?: typeof Phone; label: string }> = [];
  if (lead.phone) {
    meta.push({ icon: Phone, label: lead.phone });
  }
  if (lead.email) {
    meta.push({ icon: Mail, label: lead.email });
  }

  return (
    <ItemCard
      title={lead.full_name}
      subtitle={subtitle}
      statusLabel={LEAD_STATUS_LABELS[lead.status] || lead.status}
      statusKey={lead.status}
      urgency={urgency}
      progress={{
        current: progress.current,
        total: progress.total,
        percentage: progress.percentage,
        stepLabel: progress.stepLabel,
        agentName: progress.agentName,
        agentColor: progress.agentColor,
      }}
      actionLabel={actionLabel}
      actionHref={`/leads/${lead.id}`}
      meta={meta}
    />
  );
}
