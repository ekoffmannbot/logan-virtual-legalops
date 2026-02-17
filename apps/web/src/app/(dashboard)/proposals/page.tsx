"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import { PROPOSAL_STATUS_LABELS } from "@/lib/constants";
import { DataTable, Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  FileText,
  Plus,
  Loader2,
  X,
  AlertCircle,
  LayoutGrid,
  List,
} from "lucide-react";
import { ProcessFlow } from "@/components/shared/process-flow";
import { seguimientoPropuestasProcess } from "@/lib/process-definitions";

interface Proposal {
  id: number;
  client_name: string;
  client_id: number;
  amount: number;
  status: string;
  sent_at?: string;
  expires_at?: string;
  created_by_name?: string;
  created_at: string;
}

interface CreateProposalPayload {
  client_id: number;
  amount: number;
  description?: string;
  valid_days?: number;
}

const PIPELINE_ORDER = ["draft", "sent", "accepted", "rejected", "expired"];

export default function ProposalsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<"pipeline" | "list">("pipeline");
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState<CreateProposalPayload>({
    client_id: 0,
    amount: 0,
    description: "",
    valid_days: 30,
  });
  const [formError, setFormError] = useState("");

  const { data, isLoading, error } = useQuery<{ items: Proposal[]; total: number }>({
    queryKey: ["proposals"],
    queryFn: () => api.get("/proposals"),
  });
  const proposals = data?.items ?? [];

  const createMutation = useMutation({
    mutationFn: (payload: CreateProposalPayload) => api.post("/proposals", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      setShowCreate(false);
      setFormData({ client_id: 0, amount: 0, description: "", valid_days: 30 });
      setFormError("");
    },
    onError: (err: any) => {
      setFormError(err.message || "Error al crear la propuesta");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.client_id) {
      setFormError("El cliente es obligatorio");
      return;
    }
    if (!formData.amount || formData.amount <= 0) {
      setFormError("El monto debe ser mayor a 0");
      return;
    }
    setFormError("");
    createMutation.mutate(formData);
  };

  const columns: Column<Proposal>[] = [
    {
      key: "client_name",
      label: "Cliente",
      sortable: true,
      render: (p) => <span className="font-medium">{p.client_name}</span>,
    },
    {
      key: "amount",
      label: "Monto",
      sortable: true,
      render: (p) => formatCurrency(p.amount),
    },
    {
      key: "status",
      label: "Estado",
      render: (p) => (
        <StatusBadge
          status={p.status}
          label={PROPOSAL_STATUS_LABELS[p.status] || p.status}
        />
      ),
    },
    {
      key: "sent_at",
      label: "Enviada",
      render: (p) => formatDate(p.sent_at),
    },
    {
      key: "expires_at",
      label: "Vence",
      render: (p) => formatDate(p.expires_at),
    },
    {
      key: "created_by_name",
      label: "Creada por",
      render: (p) => p.created_by_name || "-",
    },
  ];

  // Group proposals by status for pipeline view
  const groupedByStatus = PIPELINE_ORDER.reduce<Record<string, Proposal[]>>((acc, status) => {
    acc[status] = proposals.filter((p) => p.status === status);
    return acc;
  }, {});

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
        <p className="text-lg font-medium">Error al cargar las propuestas</p>
        <p className="text-sm text-muted-foreground mt-1">
          No se pudo obtener la informacion. Intente nuevamente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Propuestas</h1>
          <p className="text-muted-foreground">Pipeline de propuestas comerciales</p>
        </div>
        <div className="flex items-center gap-3">

          {/* View Toggle */}
          <div className="flex rounded-lg border bg-white p-1">
            <button
              onClick={() => setViewMode("pipeline")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === "pipeline"
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              Pipeline
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                viewMode === "list"
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <List className="h-4 w-4" />
              Lista
            </button>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Nueva Propuesta
          </button>
        </div>
      </div>

      {/* Process Flow */}
      <ProcessFlow process={seguimientoPropuestasProcess} />

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <div className="relative z-50 w-full max-w-lg rounded-xl border bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Nueva Propuesta</h2>
              <button onClick={() => setShowCreate(false)} className="rounded-lg p-1 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">ID del Cliente *</label>
                <input
                  type="number"
                  value={formData.client_id || ""}
                  onChange={(e) => setFormData({ ...formData, client_id: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="ID del cliente"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Monto (CLP) *</label>
                  <input
                    type="number"
                    value={formData.amount || ""}
                    onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Vigencia (dias)</label>
                  <input
                    type="number"
                    value={formData.valid_days || ""}
                    onChange={(e) => setFormData({ ...formData, valid_days: parseInt(e.target.value) || 30 })}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="30"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripcion</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  rows={3}
                  placeholder="Descripcion de la propuesta..."
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
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Crear Propuesta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {proposals.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No hay propuestas"
          description="Crea tu primera propuesta comercial para un cliente."
          action={
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Nueva Propuesta
            </button>
          }
        />
      ) : viewMode === "list" ? (
        <DataTable
          data={proposals}
          columns={columns}
          searchKey="client_name"
          searchPlaceholder="Buscar por cliente..."
          onRowClick={(p) => router.push(`/proposals/${p.id}`)}
        />
      ) : (
        /* Pipeline / Kanban View */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_ORDER.map((status) => {
            const items = groupedByStatus[status] || [];
            const totalAmount = items.reduce((sum, p) => sum + (p.amount || 0), 0);
            return (
              <div
                key={status}
                className="flex-shrink-0 w-72 rounded-xl border bg-muted/30"
              >
                {/* Column Header */}
                <div className="p-4 border-b bg-white rounded-t-xl">
                  <div className="flex items-center justify-between mb-1">
                    <StatusBadge
                      status={status}
                      label={PROPOSAL_STATUS_LABELS[status] || status}
                    />
                    <span className="text-xs font-medium text-muted-foreground">
                      {items.length}
                    </span>
                  </div>
                  {totalAmount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Total: {formatCurrency(totalAmount)}
                    </p>
                  )}
                </div>
                {/* Column Items */}
                <div className="p-2 space-y-2 min-h-[100px]">
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      Sin propuestas
                    </p>
                  ) : (
                    items.map((proposal) => (
                      <div
                        key={proposal.id}
                        onClick={() => router.push(`/proposals/${proposal.id}`)}
                        className="rounded-lg border bg-white p-3 cursor-pointer hover:shadow-md transition-shadow"
                      >
                        <p className="text-sm font-medium truncate">
                          {proposal.client_name}
                        </p>
                        <p className="text-lg font-bold text-primary mt-1">
                          {formatCurrency(proposal.amount)}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{proposal.created_by_name || "-"}</span>
                          <span>{formatDate(proposal.created_at)}</span>
                        </div>
                        {proposal.expires_at && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Vence: {formatDate(proposal.expires_at)}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
