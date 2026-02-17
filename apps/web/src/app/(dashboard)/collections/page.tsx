"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  Search,
  Receipt,
  AlertCircle,
  TrendingUp,
  Calendar,
  Loader2,
  Eye,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import { INVOICE_STATUS_LABELS } from "@/lib/constants";
import { computeUrgency, getNextActionLabel } from "@/lib/process-status-map";
import { ItemCard } from "@/components/shared/item-card";
import { AgentStatusBar } from "@/components/shared/agent-message";
import { UrgencySection } from "@/components/shared/urgency-section";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ProcessFlow } from "@/components/shared/process-flow";
import { procesoCobranzaProcess } from "@/lib/process-definitions";

/* ------------------------------------------------------------------ */
/* Types                                                               */
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

interface CollectionStats {
  total_invoices: number;
  total_outstanding: number;
  overdue_count: number;
  overdue_amount: number;
  collection_rate: number;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function getDaysDiff(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getUrgencyText(invoice: Invoice): string {
  const days = getDaysDiff(invoice.due_date);
  if (days < 0) {
    const absDays = Math.abs(days);
    return `Vencida hace ${absDays} dia${absDays !== 1 ? "s" : ""}`;
  }
  if (days === 0) return "Vence hoy";
  return `Vence en ${days} dia${days !== 1 ? "s" : ""}`;
}

function getActionLabel(invoice: Invoice): string {
  switch (invoice.status) {
    case "overdue":
      return "Cobrar Hoy";
    case "due":
      return "Cobrar Hoy";
    case "paid":
      return "Verificar Pago";
    case "scheduled":
      return "Ver";
    default:
      return "Ver Detalle";
  }
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function CollectionsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showProcess, setShowProcess] = useState(false);

  // ----- Data fetching -----
  const {
    data: invoices = [],
    isLoading: loadingInvoices,
  } = useQuery({
    queryKey: ["collections", "invoices"],
    queryFn: () => api.get<Invoice[]>("/collections/invoices"),
  });

  const { data: stats } = useQuery({
    queryKey: ["collections", "stats"],
    queryFn: () => api.get<CollectionStats>("/collections/stats"),
  });

  // ----- Filter by search -----
  const filtered = invoices.filter(
    (inv) =>
      inv.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // ----- Group into urgency buckets -----
  const overdue = filtered.filter((inv) => inv.status === "overdue");
  const due = filtered.filter((inv) => inv.status === "due");
  const rest = filtered.filter(
    (inv) => inv.status !== "overdue" && inv.status !== "due",
  );

  // ----- Agent counts for status bar -----
  const secretariaCount = filtered.filter(
    (inv) => inv.status === "scheduled" || inv.status === "due",
  ).length;
  const jefeCobranzaCount = filtered.filter(
    (inv) => inv.status === "overdue",
  ).length;

  // ----- Loading state -----
  if (loadingInvoices) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cobranza</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestion de facturas y cobranza del estudio
          </p>
        </div>
        <button
          onClick={() => setShowProcess(!showProcess)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Eye className="h-4 w-4" />
          Ver Flujo
        </button>
      </div>

      {/* ---- Process Flow (togglable) ---- */}
      {showProcess && <ProcessFlow process={procesoCobranzaProcess} />}

      {/* ---- Stats Row ---- */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total facturas"
            value={stats.total_invoices}
            icon={Receipt}
          />
          <StatCard
            title="Deuda pendiente"
            value={formatCurrency(stats.total_outstanding)}
            icon={DollarSign}
            variant="warning"
          />
          <StatCard
            title="Vencidas"
            value={stats.overdue_count}
            description={formatCurrency(stats.overdue_amount)}
            icon={AlertCircle}
            variant="danger"
          />
          <StatCard
            title="Tasa cobro"
            value={`${stats.collection_rate}%`}
            icon={TrendingUp}
            variant="success"
          />
        </div>
      )}

      {/* ---- Agent Status Bar ---- */}
      <AgentStatusBar
        agents={[
          { name: "Secretaria", count: secretariaCount, color: "blue" },
          { name: "Jefe Cobranza", count: jefeCobranzaCount, color: "rose" },
        ]}
      />

      {/* ---- Search ---- */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por cliente o numero de factura..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* ---- Empty state ---- */}
      {filtered.length === 0 && (
        <EmptyState
          icon={Receipt}
          title="No hay facturas"
          description="No se encontraron facturas con los filtros aplicados."
        />
      )}

      {/* ---- Urgency Groups ---- */}
      {filtered.length > 0 && (
        <div className="space-y-4">
          {/* VENCIDAS */}
          {overdue.length > 0 && (
            <UrgencySection
              title="VENCIDAS"
              urgency="urgent"
              count={overdue.length}
              defaultOpen
            >
              {overdue.map((inv) => (
                <InvoiceCard key={inv.id} invoice={inv} />
              ))}
            </UrgencySection>
          )}

          {/* POR VENCER */}
          {due.length > 0 && (
            <UrgencySection
              title="POR VENCER"
              urgency="warning"
              count={due.length}
              defaultOpen
            >
              {due.map((inv) => (
                <InvoiceCard key={inv.id} invoice={inv} />
              ))}
            </UrgencySection>
          )}

          {/* AL DIA */}
          {rest.length > 0 && (
            <UrgencySection
              title="AL DIA"
              urgency="normal"
              count={rest.length}
              defaultOpen={overdue.length === 0 && due.length === 0}
            >
              {rest.map((inv) => (
                <InvoiceCard key={inv.id} invoice={inv} />
              ))}
            </UrgencySection>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Invoice Card sub-component                                          */
/* ------------------------------------------------------------------ */

function InvoiceCard({ invoice }: { invoice: Invoice }) {
  const urgency = computeUrgency(invoice);
  const balance = invoice.amount - invoice.amount_paid;

  return (
    <ItemCard
      title={invoice.client_name}
      subtitle={`#${invoice.invoice_number}`}
      urgency={urgency}
      urgencyText={getUrgencyText(invoice)}
      statusLabel={INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status}
      statusKey={invoice.status}
      meta={[
        { icon: Calendar, label: `Emitida ${formatDate(invoice.issued_date)}` },
        { icon: Calendar, label: `Vence ${formatDate(invoice.due_date)}` },
      ]}
      actionLabel={getActionLabel(invoice)}
      actionHref={`/collections/${invoice.id}`}
      href={`/collections/${invoice.id}`}
    >
      {/* Big amount display */}
      <div className="flex items-baseline gap-3">
        <span className="text-lg font-bold text-gray-900">
          {formatCurrency(balance, invoice.currency)}
        </span>
        {invoice.amount_paid > 0 && (
          <span className="text-xs text-gray-500">
            de {formatCurrency(invoice.amount, invoice.currency)}
          </span>
        )}
      </div>
    </ItemCard>
  );
}
