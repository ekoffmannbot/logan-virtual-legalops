"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { KanbanBoard } from "@/components/shared/kanban-board";
import type { KanbanColumn } from "@/components/shared/kanban-board";
import { Drawer, useDrawer } from "@/components/layout/drawer";
import { PizzaTracker } from "@/components/shared/pizza-tracker";
import { Loader2, AlertCircle, FileText, Plus } from "lucide-react";
import { getProcessProgress } from "@/lib/process-status-map";
import { seguimientoPropuestasProcess } from "@/lib/process-definitions";
import { formatDate, formatCurrency } from "@/lib/utils";
import { PROPOSAL_STATUS_LABELS } from "@/lib/constants";

/* ------------------------------------------------------------------ */
/* TIPOS                                                               */
/* ------------------------------------------------------------------ */

interface Proposal {
  id: number;
  title: string;
  client_name: string;
  status: string;
  amount: number;
  currency: string;
  valid_until: string;
  assigned_to_name: string;
  process_id: string;
}

/* ------------------------------------------------------------------ */
/* HELPERS                                                             */
/* ------------------------------------------------------------------ */

const STATUS_BADGE_STYLES: Record<string, { bg: string; color: string }> = {
  draft: { bg: "rgba(100,116,139,0.15)", color: "var(--text-muted)" },
  sent: { bg: "rgba(99,102,241,0.15)", color: "var(--primary-color)" },
  accepted: { bg: "rgba(34,197,94,0.15)", color: "var(--success)" },
  rejected: { bg: "rgba(239,68,68,0.15)", color: "var(--danger)" },
  expired: { bg: "rgba(239,68,68,0.15)", color: "var(--danger)" },
};

/** Formato chileno: $1.800.000 */
function formatCLP(amount: number | null | undefined): string {
  if (amount == null) return "";
  return "$" + amount.toLocaleString("es-CL");
}

/**
 * Construye los pasos para el PizzaTracker a partir de la definicion
 * del proceso de seguimiento de propuestas.
 */
function buildPizzaSteps(processId: string, status: string) {
  const process = seguimientoPropuestasProcess;
  const taskSteps = process.steps.filter(
    (s) => s.type !== "start" && s.type !== "end" && s.type !== "decision"
  );

  const progress = getProcessProgress(
    processId || "seguimiento-propuestas",
    status
  );

  const allSteps = process.steps;
  const currentStepId =
    allSteps[progress.current]?.id || allSteps[0]?.id;

  let currentIndex = taskSteps.findIndex((s) => s.id === currentStepId);
  if (currentIndex === -1) {
    const currentAllIndex = allSteps.findIndex((s) => s.id === currentStepId);
    for (let i = currentAllIndex; i >= 0; i--) {
      const idx = taskSteps.findIndex((s) => s.id === allSteps[i].id);
      if (idx !== -1) {
        currentIndex = idx;
        break;
      }
    }
    if (currentIndex === -1) currentIndex = 0;
  }

  const steps = taskSteps.map((s) => ({
    id: s.id,
    label: s.label,
    description: s.description,
  }));

  return { steps, currentIndex, progress };
}

/* ------------------------------------------------------------------ */
/* PAGINA                                                              */
/* ------------------------------------------------------------------ */

export default function ProposalsPage() {
  const { data, isLoading, isError } = useQuery<{
    items: Proposal[];
    total: number;
  }>({
    queryKey: ["proposals"],
    queryFn: () => api.get("/proposals"),
  });

  const proposals = data?.items ?? [];

  const { isOpen, drawerTitle, drawerContent, openDrawer, closeDrawer } =
    useDrawer();

  // ----- Transformar propuestas en columnas Kanban -----
  const columns: KanbanColumn[] = useMemo(() => {
    const base: KanbanColumn[] = [
      { id: "draft", title: "Borrador", color: "border-t-gray-400", cards: [] },
      { id: "sent", title: "Enviada", color: "border-t-blue-500", cards: [] },
      { id: "accepted", title: "Aceptada", color: "border-t-green-500", cards: [] },
      { id: "rejected", title: "Rechazada", color: "border-t-red-500", cards: [] },
    ];

    const colMap = new Map(base.map((c) => [c.id, c]));

    for (const proposal of proposals) {
      const col = colMap.get(proposal.status);
      if (!col) continue;

      const statusLabel =
        PROPOSAL_STATUS_LABELS[proposal.status] || proposal.status;

      col.cards.push({
        id: String(proposal.id),
        title: proposal.title,
        subtitle: proposal.client_name,
        amount: proposal.amount ? formatCLP(proposal.amount) : undefined,
        badge: statusLabel,
        badgeColor:
          STATUS_BADGE_STYLES[proposal.status]?.bg || "var(--bg-tertiary)",
      });
    }

    return base;
  }, [proposals]);

  // ----- Abrir Drawer al hacer click en una tarjeta -----
  function handleCardClick(cardId: string) {
    const proposal = proposals.find((p) => String(p.id) === cardId);
    if (!proposal) return;

    const { steps, currentIndex, progress } = buildPizzaSteps(
      proposal.process_id,
      proposal.status
    );

    const statusLabel =
      PROPOSAL_STATUS_LABELS[proposal.status] || proposal.status;

    openDrawer(
      proposal.title,
      <div className="space-y-6">
        {/* Progreso visual */}
        <div>
          <p className="text-[14px] font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            Progreso de la propuesta
          </p>
          <p className="text-[13px] mb-4" style={{ color: "var(--text-muted)" }}>
            Paso {currentIndex + 1} de {steps.length}: {progress.stepLabel}
          </p>
          <PizzaTracker
            steps={steps}
            currentStepIndex={currentIndex}
          />
        </div>

        {/* Detalles de la propuesta */}
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: 16 }}
        >
          <h3 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Detalles
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <Detail label="Cliente" value={proposal.client_name} />
            <Detail label="Estado" value={statusLabel} />
            <Detail
              label="Monto"
              value={
                proposal.amount
                  ? formatCurrency(proposal.amount, proposal.currency)
                  : "-"
              }
            />
            <Detail
              label="Valida hasta"
              value={
                proposal.valid_until
                  ? formatDate(proposal.valid_until)
                  : "-"
              }
            />
            <Detail
              label="Asignado a"
              value={proposal.assigned_to_name || "-"}
            />
          </div>
        </div>
      </div>
    );
  }

  // ----- Estados de carga / error -----
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
        <AlertCircle className="h-8 w-8" />
        <p className="text-[14px]">Error al cargar propuestas</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---- HEADER ---- */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6" style={{ color: "var(--text-primary)" }} />
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}>
            Propuestas
          </h1>
          <span
            className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-[13px] font-semibold"
            style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)" }}
          >
            {proposals.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => openDrawer("Nueva Propuesta", <CreateProposalForm onSuccess={closeDrawer} />)}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: "var(--primary-color)" }}
        >
          <Plus className="h-4 w-4" />
          Nueva Propuesta
        </button>
      </div>

      {/* ---- KANBAN ---- */}
      <KanbanBoard columns={columns} onCardClick={handleCardClick} />

      {/* ---- DRAWER ---- */}
      <Drawer open={isOpen} onClose={closeDrawer} title={drawerTitle}>
        {drawerContent}
      </Drawer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Create Proposal Form                                                 */
/* ------------------------------------------------------------------ */

function CreateProposalForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    client_id: "",
    amount: "",
    description: "",
    valid_days: "30",
  });

  const mutation = useMutation({
    mutationFn: (body: { client_id: number; amount?: number; description?: string; valid_days?: number }) =>
      api.post("/proposals", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      onSuccess();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.client_id) return;
    mutation.mutate({
      client_id: parseInt(form.client_id, 10),
      amount: form.amount ? parseInt(form.amount, 10) : undefined,
      description: form.description || undefined,
      valid_days: form.valid_days ? parseInt(form.valid_days, 10) : undefined,
    });
  }

  const inputStyle = {
    background: "var(--bg-tertiary)",
    color: "var(--text-primary)",
    border: "1px solid var(--glass-border)",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>
          ID Cliente *
        </label>
        <input
          type="number"
          value={form.client_id}
          onChange={(e) => setForm({ ...form, client_id: e.target.value })}
          className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
          style={inputStyle}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>
            Monto (CLP)
          </label>
          <input
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
            style={inputStyle}
            placeholder="1800000"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>
            Dias de validez
          </label>
          <input
            type="number"
            value={form.valid_days}
            onChange={(e) => setForm({ ...form, valid_days: e.target.value })}
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
            style={inputStyle}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>
          Descripcion
        </label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={3}
          className="w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-y"
          style={inputStyle}
          placeholder="Resumen de la estrategia legal..."
        />
      </div>
      <button
        type="submit"
        disabled={mutation.isPending || !form.client_id}
        className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
        style={{ background: "var(--primary-color)" }}
      >
        {mutation.isPending ? "Creando..." : "Crear Propuesta"}
      </button>
      {mutation.isError && (
        <p className="text-xs text-center" style={{ color: "var(--danger)" }}>
          Error al crear la propuesta. Intente nuevamente.
        </p>
      )}
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* COMPONENTE AUXILIAR                                                  */
/* ------------------------------------------------------------------ */

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="text-[14px] mt-0.5" style={{ color: "var(--text-primary)" }}>{value}</p>
    </div>
  );
}
