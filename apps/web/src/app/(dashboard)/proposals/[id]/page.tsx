"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PROPOSAL_STATUS_LABELS } from "@/lib/constants";
import {
  getProcessProgress,
  getAgentSuggestions,
  getNextActionLabel,
} from "@/lib/process-status-map";
import {
  seguimientoPropuestasProcess,
  ALL_PROCESSES,
} from "@/lib/process-definitions";
import { WizardDetail } from "@/components/shared/wizard-detail";
import { Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface ProposalDetail {
  id: number;
  title: string;
  client_name: string;
  status: string;
  amount: number;
  currency: string;
  valid_until: string;
  assigned_to_name: string;
  created_at: string;
  process_id: string;
  sent_at?: string;
  items: Array<{
    id: number;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ProposalDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const proposalId = params.id as string;

  /* ---- Data fetching ---- */
  const {
    data: proposal,
    isLoading,
    error,
  } = useQuery<ProposalDetail>({
    queryKey: ["proposal", proposalId],
    queryFn: () => api.get(`/proposals/${proposalId}`),
  });

  /* ---- Status transition ---- */
  const transitionMutation = useMutation({
    mutationFn: (action: string) =>
      api.post(`/proposals/${proposalId}/transition`, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposal", proposalId] });
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
  });

  /* ---- Loading state ---- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ---- Error state ---- */
  if (error || !proposal) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <p className="text-lg font-medium">Error al cargar la propuesta</p>
        <p className="text-sm text-muted-foreground mt-1">
          No se encontro la propuesta solicitada.
        </p>
        <Link
          href="/proposals"
          className="mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Volver a Propuestas
        </Link>
      </div>
    );
  }

  /* ---- Derived data ---- */
  const processId = proposal.process_id || "seguimiento-propuestas";
  const progress = getProcessProgress(processId, proposal.status);
  const actionLabel = getNextActionLabel(processId, proposal.status);
  const agentSuggestions = getAgentSuggestions(processId, proposal.status, proposal);

  const infoItems: Array<{ label: string; value: string | React.ReactNode }> = [
    { label: "Cliente", value: proposal.client_name },
    {
      label: "Monto",
      value: formatCurrency(proposal.amount, proposal.currency),
    },
    { label: "Moneda", value: proposal.currency },
    { label: "Vigencia", value: formatDate(proposal.valid_until) },
    { label: "Asignado a", value: proposal.assigned_to_name },
    { label: "Creada", value: formatDate(proposal.created_at) },
  ];

  if (proposal.sent_at) {
    infoItems.push({ label: "Enviada", value: formatDate(proposal.sent_at) });
  }

  /* ---- Line items total ---- */
  const lineItemsTotal = (proposal.items ?? []).reduce(
    (sum, item) => sum + item.total,
    0,
  );

  /* ---- Render ---- */
  return (
    <WizardDetail
      backHref="/proposals"
      backLabel="Propuestas"
      title={proposal.title}
      statusLabel={PROPOSAL_STATUS_LABELS[proposal.status] || proposal.status}
      statusKey={proposal.status}
      progress={progress}
      processDefinition={ALL_PROCESSES["proposals"] ?? seguimientoPropuestasProcess}
      actionLabel={actionLabel}
      onAction={() => {
        /* Map current status to the transition action */
        const statusActionMap: Record<string, string> = {
          draft: "sent",
          sent: "follow_up_pending",
          follow_up_pending: "accepted",
          accepted: "accepted",
        };
        const action = statusActionMap[proposal.status];
        if (action) transitionMutation.mutate(action);
      }}
      actionDisabled={transitionMutation.isPending}
      actionLoading={transitionMutation.isPending}
      agentSuggestions={agentSuggestions}
      infoItems={infoItems}
    >
      {/* ---- Line items table ---- */}
      {proposal.items && proposal.items.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 mt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">
            Items de la propuesta
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <th className="py-2 pr-4">Descripcion</th>
                  <th className="py-2 pr-4 text-right">Cant.</th>
                  <th className="py-2 pr-4 text-right">Precio unit.</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {proposal.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-2 pr-4 text-gray-700">
                      {item.description}
                    </td>
                    <td className="py-2 pr-4 text-right text-gray-600">
                      {item.quantity}
                    </td>
                    <td className="py-2 pr-4 text-right text-gray-600">
                      {formatCurrency(item.unit_price, proposal.currency)}
                    </td>
                    <td className="py-2 text-right font-medium text-gray-900">
                      {formatCurrency(item.total, proposal.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200">
                  <td
                    colSpan={3}
                    className="py-2 pr-4 text-right text-xs font-bold uppercase text-gray-400"
                  >
                    Total
                  </td>
                  <td className="py-2 text-right text-base font-bold text-gray-900">
                    {formatCurrency(lineItemsTotal, proposal.currency)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Transition error feedback */}
      {transitionMutation.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 mt-3">
          <p className="text-sm text-red-700">
            Error al realizar la accion. Intente nuevamente.
          </p>
        </div>
      )}
    </WizardDetail>
  );
}
