"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { InboxItem } from "@/components/shared/inbox-item";
import { Drawer, useDrawer } from "@/components/layout/drawer";
import { PizzaTracker } from "@/components/shared/pizza-tracker";
import {
  getProcessProgress,
  getNextActionLabel,
  computeUrgency,
  getTimeUntil,
} from "@/lib/process-status-map";
import { COLLECTION_STATUS_LABELS, INVOICE_STATUS_LABELS } from "@/lib/constants";
import { procesoCobranzaProcess } from "@/lib/process-definitions";
import { formatDate } from "@/lib/utils";
import { DollarSign, Loader2, AlertTriangle, CreditCard } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

interface Invoice {
  id: number;
  invoice_number: string;
  client_name: string;
  amount: number;
  amount_paid: number;
  currency: string;
  status: string;
  due_date: string;
  issued_date: string;
  created_at: string;
  process_id: string;
}

/* ------------------------------------------------------------------ */
/* Filtros                                                             */
/* ------------------------------------------------------------------ */

type FilterKey = "todos" | "vencidas" | "por_vencer" | "pagadas";

const FILTER_CHIPS: { key: FilterKey; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "vencidas", label: "Vencidas" },
  { key: "por_vencer", label: "Por Vencer" },
  { key: "pagadas", label: "Pagadas" },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Formato chileno: $1.800.000 */
function formatCLP(amount: number | null | undefined): string {
  if (amount == null) return "$0";
  return "$" + amount.toLocaleString("es-CL");
}

/** Icon background por status */
function getIconBg(status: string): string {
  switch (status) {
    case "overdue":
      return "bg-red-100";
    case "due":
      return "bg-yellow-100";
    case "paid":
      return "bg-green-100";
    default:
      return "bg-blue-100";
  }
}

/** Icon color por status */
function getIconColor(status: string): string {
  switch (status) {
    case "overdue":
      return "text-red-600";
    case "due":
      return "text-yellow-600";
    case "paid":
      return "text-green-600";
    default:
      return "text-blue-600";
  }
}

/** Badge color por status */
function getBadgeColor(status: string): string {
  switch (status) {
    case "overdue":
      return "bg-red-100 text-red-800";
    case "due":
      return "bg-yellow-100 text-yellow-800";
    case "paid":
      return "bg-green-100 text-green-800";
    case "scheduled":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

/** Action label por status */
function getActionLabel(status: string): string {
  switch (status) {
    case "overdue":
      return "Gestionar Cobro";
    case "due":
      return "Verificar";
    case "paid":
      return "Ver Detalle";
    default:
      return "Ver Detalle";
  }
}

/**
 * Construye los pasos para el PizzaTracker a partir del proceso de cobranza.
 */
function buildPizzaSteps(processId: string, status: string) {
  const process = procesoCobranzaProcess;
  const taskSteps = process.steps.filter(
    (s) => s.type !== "start" && s.type !== "end" && s.type !== "decision",
  );

  const progress = getProcessProgress(
    processId || "proceso-cobranza",
    status,
  );

  const allSteps = process.steps;
  const currentStepId = allSteps[progress.current]?.id || allSteps[0]?.id;

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
/* Pagina                                                              */
/* ------------------------------------------------------------------ */

export default function CollectionsPage() {
  const [filter, setFilter] = useState<FilterKey>("todos");
  const { isOpen, drawerTitle, drawerContent, openDrawer, closeDrawer } =
    useDrawer();

  /* ---- Fetch ---- */
  const {
    data: invoices = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["collections", "invoices"],
    queryFn: () => api.get<Invoice[]>("/collections/invoices"),
  });

  /* ---- Filtrado ---- */
  const filtered = useMemo(() => {
    switch (filter) {
      case "vencidas":
        return invoices.filter((inv) => inv.status === "overdue");
      case "por_vencer":
        return invoices.filter((inv) => inv.status === "due");
      case "pagadas":
        return invoices.filter((inv) => inv.status === "paid");
      default:
        return invoices;
    }
  }, [invoices, filter]);

  /* ---- Abrir drawer ---- */
  function handleOpen(invoice: Invoice) {
    const { steps, currentIndex, progress } = buildPizzaSteps(
      invoice.process_id,
      invoice.status,
    );

    openDrawer(
      `Factura ${invoice.invoice_number}`,
      <InvoiceDetail
        invoice={invoice}
        steps={steps}
        currentIndex={currentIndex}
        progress={progress}
      />,
    );
  }

  /* ---- Loading ---- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--primary-color)" }} />
      </div>
    );
  }

  /* ---- Error ---- */
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <AlertTriangle className="h-10 w-10" style={{ color: "var(--danger)" }} />
        <p className="font-medium" style={{ fontSize: "16px", color: "var(--text-primary)" }}>
          Error al cargar facturas
        </p>
      </div>
    );
  }

  /* ---- Render ---- */
  return (
    <div className="space-y-5">
      {/* ============ HEADER ============ */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "rgba(34,197,94,0.2)" }}
        >
          <DollarSign className="h-5 w-5" style={{ color: "var(--success)" }} />
        </div>
        <h1
          className="text-2xl font-bold"
          style={{ fontSize: "24px", color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
        >
          Cobranza
        </h1>
        <span
          className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 font-semibold"
          style={{ fontSize: "13px", background: "var(--bg-tertiary)", color: "var(--text-muted)" }}
        >
          {invoices.length}
        </span>
      </div>

      {/* ============ FILTER CHIPS ============ */}
      <div className="flex flex-wrap gap-2">
        {FILTER_CHIPS.map((chip) => {
          const active = filter === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => setFilter(chip.key)}
              className="rounded-full px-4 py-1.5 font-medium transition-colors"
              style={
                active
                  ? { fontSize: "14px", background: "var(--primary-color)", color: "#ffffff" }
                  : { fontSize: "14px", background: "var(--bg-tertiary)", color: "var(--text-muted)" }
              }
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* ============ LISTA / EMPTY ============ */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full mb-4"
            style={{ background: "var(--bg-tertiary)" }}
          >
            <DollarSign className="h-8 w-8" style={{ color: "var(--text-muted)" }} />
          </div>
          <p className="font-medium" style={{ fontSize: "16px", color: "var(--text-primary)" }}>
            No hay facturas en esta categoria
          </p>
          <p className="mt-1" style={{ fontSize: "14px", color: "var(--text-muted)" }}>
            Seleccione otro filtro o espere nuevas facturas.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((invoice) => {
            const statusLabel =
              INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status;

            return (
              <InboxItem
                key={invoice.id}
                id={String(invoice.id)}
                icon={<DollarSign className="h-5 w-5" />}
                iconBg={getIconBg(invoice.status)}
                iconColor={getIconColor(invoice.status)}
                title={`${invoice.invoice_number} \u00B7 ${invoice.client_name}`}
                subtitle={formatCLP(invoice.amount)}
                badge={statusLabel}
                badgeColor={getBadgeColor(invoice.status)}
                timeText={invoice.due_date ? getTimeUntil(invoice.due_date) : ""}
                timeUrgent={invoice.status === "overdue"}
                actionLabel={getActionLabel(invoice.status)}
                onAction={() => handleOpen(invoice)}
                onCardClick={() => handleOpen(invoice)}
              />
            );
          })}
        </div>
      )}

      {/* ============ DRAWER ============ */}
      <Drawer open={isOpen} onClose={closeDrawer} title={drawerTitle}>
        {drawerContent}
      </Drawer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Drawer content                                                      */
/* ------------------------------------------------------------------ */

function InvoiceDetail({
  invoice,
  steps,
  currentIndex,
  progress,
}: {
  invoice: Invoice;
  steps: { id: string; label: string; description?: string }[];
  currentIndex: number;
  progress: ReturnType<typeof getProcessProgress>;
}) {
  const balance = invoice.amount - invoice.amount_paid;
  const statusLabel =
    INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status;

  return (
    <div className="space-y-6">
      {/* ---- Progreso ---- */}
      <div>
        <p className="font-semibold mb-1" style={{ fontSize: "14px", color: "var(--text-primary)" }}>
          Progreso de cobranza
        </p>
        <p className="mb-4" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
          Paso {currentIndex + 1} de {steps.length}: {progress.stepLabel}
        </p>
        <PizzaTracker steps={steps} currentStepIndex={currentIndex} />
      </div>

      {/* ---- Datos de la factura ---- */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: 16 }}
      >
        <h3 className="font-semibold" style={{ fontSize: "15px", color: "var(--text-primary)" }}>
          Datos de la Factura
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Detail label="Cliente" value={invoice.client_name} />
          <Detail label="Estado" value={statusLabel} />
          <Detail label="Monto total" value={formatCLP(invoice.amount)} />
          <Detail label="Pagado" value={formatCLP(invoice.amount_paid)} />
          <Detail
            label="Pendiente"
            value={formatCLP(balance)}
            highlight={balance > 0}
          />
          <Detail label="Moneda" value={invoice.currency || "CLP"} />
          <Detail label="Fecha emision" value={formatDate(invoice.issued_date)} />
          <Detail label="Fecha vencimiento" value={formatDate(invoice.due_date)} />
        </div>
      </div>

      {/* ---- Historial de pagos ---- */}
      {invoice.amount_paid > 0 && (
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: 16 }}
        >
          <h3 className="font-semibold" style={{ fontSize: "15px", color: "var(--text-primary)" }}>
            Historial de Pagos
          </h3>
          <div
            className="flex items-center gap-3 rounded-lg p-3"
            style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)" }}
          >
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: "rgba(34,197,94,0.2)" }}
            >
              <CreditCard className="h-4 w-4" style={{ color: "var(--success)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium" style={{ fontSize: "14px", color: "var(--text-primary)" }}>
                Abono registrado
              </p>
              <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                {formatCLP(invoice.amount_paid)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Componente auxiliar                                                  */
/* ------------------------------------------------------------------ */

function Detail({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p
        className="font-medium uppercase tracking-wide"
        style={{ fontSize: "13px", color: "var(--text-muted)" }}
      >
        {label}
      </p>
      <p
        className={["mt-0.5", highlight ? "font-semibold" : ""].join(" ")}
        style={{
          fontSize: "14px",
          color: highlight ? "var(--danger)" : "var(--text-primary)",
        }}
      >
        {value}
      </p>
    </div>
  );
}
