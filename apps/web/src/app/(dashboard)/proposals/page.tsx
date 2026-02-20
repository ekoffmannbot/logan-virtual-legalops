"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { KanbanBoard } from "@/components/shared/kanban-board";
import type { KanbanColumn } from "@/components/shared/kanban-board";
import { Drawer, useDrawer } from "@/components/layout/drawer";
import { PizzaTracker } from "@/components/shared/pizza-tracker";
import { Loader2, AlertCircle, FileText } from "lucide-react";
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

const STATUS_BADGE_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-red-100 text-red-800",
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
          STATUS_BADGE_COLORS[proposal.status] || "bg-gray-100 text-gray-700",
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
