"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { CONTRACT_STATUS_LABELS } from "@/lib/constants";
import { AgentStatusBar } from "@/components/shared/agent-message";
import { ItemCard } from "@/components/shared/item-card";
import { UrgencySection } from "@/components/shared/urgency-section";
import {
  getProcessProgress,
  computeUrgency,
  getNextActionLabel,
} from "@/lib/process-status-map";
import type { UrgencyLevel } from "@/lib/process-status-map";
import { EmptyState } from "@/components/shared/empty-state";
import { ProcessFlow } from "@/components/shared/process-flow";
import { contratoMandatoProcess } from "@/lib/process-definitions";
import {
  FileSignature,
  Search,
  Loader2,
  Eye,
  EyeOff,
  X,
  Calendar,
  DollarSign,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* TYPES                                                               */
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
  created_at: string;
  process_id: string;
}

/* ------------------------------------------------------------------ */
/* PROCESS-STEP GROUPING                                               */
/* ------------------------------------------------------------------ */

interface ProcessGroup {
  key: string;
  title: string;
  urgency: UrgencyLevel;
  statuses: string[];
}

const PROCESS_GROUPS: ProcessGroup[] = [
  {
    key: "datos-pendientes",
    title: "Datos Pendientes",
    urgency: "urgent",
    statuses: ["pending_data"],
  },
  {
    key: "en-redaccion",
    title: "En Redaccion",
    urgency: "warning",
    statuses: ["drafting", "changes_requested"],
  },
  {
    key: "revision",
    title: "Revision",
    urgency: "warning",
    statuses: ["pending_review"],
  },
  {
    key: "aprobado-notaria",
    title: "Aprobado / En Notaria",
    urgency: "normal",
    statuses: ["approved", "uploaded_for_signing"],
  },
  {
    key: "firmado-completo",
    title: "Firmado / Completo",
    urgency: "normal",
    statuses: ["signed", "scanned_uploaded", "complete"],
  },
];

/* ------------------------------------------------------------------ */
/* PAGE                                                                */
/* ------------------------------------------------------------------ */

export default function ContractsPage() {
  // UI state
  const [showFlow, setShowFlow] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Data fetching
  const { data: contracts = [], isLoading } = useQuery<Contract[]>({
    queryKey: ["contracts"],
    queryFn: () => api.get("/contracts"),
  });

  // Search filter
  const filteredContracts = useMemo(() => {
    if (!searchQuery.trim()) return contracts;
    const q = searchQuery.toLowerCase();
    return contracts.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.client_name.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q)
    );
  }, [contracts, searchQuery]);

  // Group contracts by process step
  const groupedContracts = useMemo(() => {
    return PROCESS_GROUPS.map((group) => ({
      ...group,
      items: filteredContracts.filter((c) =>
        group.statuses.includes(c.status)
      ),
    }));
  }, [filteredContracts]);

  // Agent status counts
  const agentCounts = useMemo(() => {
    const abogadoStatuses = new Set([
      "pending_review",
      "changes_requested",
    ]);
    const adminStatuses = new Set([
      "pending_data",
      "drafting",
      "approved",
      "signed",
      "scanned_uploaded",
    ]);
    const notariaStatuses = new Set(["uploaded_for_signing"]);

    let abogado = 0;
    let admin = 0;
    let notaria = 0;

    for (const c of contracts) {
      if (abogadoStatuses.has(c.status)) abogado++;
      if (adminStatuses.has(c.status)) admin++;
      if (notariaStatuses.has(c.status)) notaria++;
    }

    return [
      { name: "Abogado", count: abogado, color: "green" },
      { name: "Administracion", count: admin, color: "amber" },
      { name: "Notaria", count: notaria, color: "purple" },
    ];
  }, [contracts]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---- HEADER ---- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contratos</h1>
          <p className="text-muted-foreground">
            Gestion de contratos y mandatos judiciales
          </p>
        </div>
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
          placeholder="Buscar por titulo, cliente o tipo..."
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
                Flujo de Contrato y Mandato
              </h2>
              <button
                onClick={() => setShowFlow(false)}
                className="rounded-lg p-1 hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ProcessFlow process={contratoMandatoProcess} />
          </div>
        </div>
      )}

      {/* ---- CONTENT ---- */}
      {filteredContracts.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="No hay contratos"
          description={
            searchQuery
              ? "No se encontraron resultados para tu busqueda."
              : "Aun no se han registrado contratos en el sistema."
          }
        />
      ) : (
        <div className="space-y-4">
          {groupedContracts.map((group) => {
            if (group.items.length === 0) return null;

            return (
              <UrgencySection
                key={group.key}
                title={group.title}
                urgency={group.urgency}
                count={group.items.length}
                defaultOpen={group.urgency !== "normal" || group.items.length > 0}
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
                  {group.items.map((contract) => (
                    <ContractCard key={contract.id} contract={contract} />
                  ))}
                </div>
              </UrgencySection>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* CONTRACT CARD                                                       */
/* ------------------------------------------------------------------ */

function ContractCard({ contract }: { contract: Contract }) {
  const urgency = computeUrgency(contract);
  const progress = getProcessProgress(
    contract.process_id || "contrato-mandato",
    contract.status
  );
  const actionLabel = getNextActionLabel(
    contract.process_id || "contrato-mandato",
    contract.status
  );

  const statusLabel =
    CONTRACT_STATUS_LABELS[contract.status] || contract.status;

  const subtitle = [contract.type, contract.client_name]
    .filter(Boolean)
    .join(" \u00B7 ");

  const meta: Array<{ icon?: typeof Calendar; label: string }> = [];
  if (contract.start_date) {
    meta.push({ icon: Calendar, label: formatDate(contract.start_date) });
  }
  if (contract.monthly_fee != null) {
    meta.push({
      icon: DollarSign,
      label: formatCurrency(contract.monthly_fee, contract.currency),
    });
  }

  return (
    <ItemCard
      title={contract.title}
      subtitle={subtitle}
      statusLabel={statusLabel}
      statusKey={contract.status}
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
      actionHref={`/contracts/${contract.id}`}
      meta={meta}
    >
      {/* Monthly fee highlight */}
      {contract.monthly_fee != null && (
        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
            Honorario mensual
          </span>
          <span className="text-sm font-bold text-gray-900">
            {formatCurrency(contract.monthly_fee, contract.currency)}
          </span>
        </div>
      )}
    </ItemCard>
  );
}
