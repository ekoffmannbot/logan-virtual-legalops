"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { KanbanBoard } from "@/components/shared/kanban-board";
import type { KanbanColumn } from "@/components/shared/kanban-board";
import { Drawer, useDrawer } from "@/components/layout/drawer";
import { PizzaTracker } from "@/components/shared/pizza-tracker";
import { Loader2, AlertCircle, FileSignature } from "lucide-react";
import { getProcessProgress } from "@/lib/process-status-map";
import { contratoMandatoProcess } from "@/lib/process-definitions";
import { formatDate, formatCurrency } from "@/lib/utils";
import { CONTRACT_STATUS_LABELS } from "@/lib/constants";

/* ------------------------------------------------------------------ */
/* TIPOS                                                               */
/* ------------------------------------------------------------------ */

interface Contract {
  id: number;
  title: string;
  client_name: string;
  type: string;
  status: string;
  start_date: string;
  end_date: string | null;
  monthly_fee: number | null;
  currency: string;
  process_id: string;
}

/* ------------------------------------------------------------------ */
/* HELPERS                                                             */
/* ------------------------------------------------------------------ */

const TYPE_LABELS: Record<string, string> = {
  honorarios: "Honorarios",
  convenio: "Convenio",
  poder: "Poder",
};

const TYPE_BADGE_COLORS: Record<string, string> = {
  honorarios: "bg-blue-100 text-blue-800",
  convenio: "bg-purple-100 text-purple-800",
  poder: "bg-amber-100 text-amber-800",
};

/** Formato chileno: $1.800.000 */
function formatCLP(amount: number | null | undefined): string {
  if (amount == null) return "";
  return "$" + amount.toLocaleString("es-CL");
}

/**
 * Construye los pasos para el PizzaTracker a partir de la definicion
 * del proceso, filtrando solo los pasos de tipo task/subprocess.
 */
function buildPizzaSteps(processId: string, status: string) {
  const process = contratoMandatoProcess;
  const taskSteps = process.steps.filter(
    (s) => s.type !== "start" && s.type !== "end" && s.type !== "decision"
  );

  const progress = getProcessProgress(
    processId || "contrato-mandato",
    status
  );

  // Buscar en que indice estamos dentro de los task steps
  const allSteps = process.steps;
  const currentStepId =
    allSteps[progress.current]?.id || allSteps[0]?.id;

  let currentIndex = taskSteps.findIndex((s) => s.id === currentStepId);
  if (currentIndex === -1) {
    // Fallback: buscar el paso mas cercano anterior
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

export default function ContractsPage() {
  const { data: contracts = [], isLoading, isError } = useQuery<Contract[]>({
    queryKey: ["contracts"],
    queryFn: () => api.get("/contracts"),
  });

  const { isOpen, drawerTitle, drawerContent, openDrawer, closeDrawer } =
    useDrawer();

  // ----- Transformar contratos en columnas Kanban -----
  const columns: KanbanColumn[] = useMemo(() => {
    const base: KanbanColumn[] = [
      { id: "pending_data", title: "Datos Pendientes", color: "border-t-orange-500", cards: [] },
      { id: "drafting", title: "En Redaccion", color: "border-t-blue-500", cards: [] },
      { id: "pending_review", title: "Revision", color: "border-t-yellow-500", cards: [] },
      { id: "approved", title: "Aprobado", color: "border-t-green-500", cards: [] },
      { id: "signed", title: "Firmado", color: "border-t-emerald-500", cards: [] },
    ];

    const colMap = new Map(base.map((c) => [c.id, c]));

    for (const contract of contracts) {
      const col = colMap.get(contract.status);
      if (!col) continue;

      col.cards.push({
        id: String(contract.id),
        title: contract.title,
        subtitle: contract.client_name,
        amount: contract.monthly_fee ? formatCLP(contract.monthly_fee) : undefined,
        badge: TYPE_LABELS[contract.type] || contract.type,
        badgeColor: TYPE_BADGE_COLORS[contract.type] || "bg-gray-100 text-gray-700",
      });
    }

    return base;
  }, [contracts]);

  // ----- Abrir Drawer al hacer click en una tarjeta -----
  function handleCardClick(cardId: string) {
    const contract = contracts.find((c) => String(c.id) === cardId);
    if (!contract) return;

    const { steps, currentIndex, progress } = buildPizzaSteps(
      contract.process_id,
      contract.status
    );

    const statusLabel =
      CONTRACT_STATUS_LABELS[contract.status] || contract.status;

    openDrawer(
      contract.title,
      <div className="space-y-6">
        {/* Progreso visual */}
        <div>
          <p className="text-[14px] font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            Progreso del contrato
          </p>
          <p className="text-[13px] mb-4" style={{ color: "var(--text-muted)" }}>
            Paso {currentIndex + 1} de {steps.length}: {progress.stepLabel}
          </p>
          <PizzaTracker
            steps={steps}
            currentStepIndex={currentIndex}
          />
        </div>

        {/* Detalles del contrato */}
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: 16 }}
        >
          <h3 className="text-[15px] font-semibold" style={{ color: "var(--text-primary)" }}>
            Detalles
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <Detail label="Cliente" value={contract.client_name} />
            <Detail label="Tipo" value={TYPE_LABELS[contract.type] || contract.type} />
            <Detail label="Estado" value={statusLabel} />
            <Detail
              label="Inicio"
              value={contract.start_date ? formatDate(contract.start_date) : "-"}
            />
            <Detail
              label="Termino"
              value={contract.end_date ? formatDate(contract.end_date) : "Indefinido"}
            />
            {contract.monthly_fee != null && (
              <Detail
                label="Honorario mensual"
                value={formatCurrency(contract.monthly_fee, contract.currency)}
              />
            )}
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
        <p className="text-[14px]">Error al cargar contratos</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---- HEADER ---- */}
      <div className="flex items-center gap-3">
        <FileSignature className="h-6 w-6" style={{ color: "var(--text-primary)" }} />
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}>
          Contratos
        </h1>
        <span
          className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-[13px] font-semibold"
          style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)", border: "1px solid var(--glass-border)" }}
        >
          {contracts.length}
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
