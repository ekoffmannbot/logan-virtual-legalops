"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import { CONTRACT_STATUS_LABELS } from "@/lib/constants";
import { ALL_PROCESSES } from "@/lib/process-definitions";
import {
  getProcessProgress,
  getAgentSuggestions,
  getNextActionLabel,
} from "@/lib/process-status-map";
import { WizardDetail } from "@/components/shared/wizard-detail";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface ContractDetail {
  id: string;
  title: string;
  client_name: string;
  type: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  monthly_fee: number | null;
  currency: string;
  created_at: string;
  process_id: string;
  clauses: Array<{ id: string; title: string; content: string }>;
  attachments: Array<{ id: string; filename: string; url: string; uploaded_at: string }>;
}

/* ------------------------------------------------------------------ */
/* Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function ContractDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const contractId = params.id as string;

  // ---- Fetch ----
  const { data: contract, isLoading, error } = useQuery({
    queryKey: ["contracts", contractId],
    queryFn: () => api.get<ContractDetail>(`/contracts/${contractId}`),
  });

  // ---- Mutation: status transitions ----
  const transitionMutation = useMutation({
    mutationFn: (action: string) =>
      api.patch(`/contracts/${contractId}`, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts", contractId] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });

  // ---- Loading ----
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ---- Error / not found ----
  if (error || !contract) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <p className="text-lg font-medium">Contrato no encontrado</p>
        <p className="text-sm text-muted-foreground mt-1">
          No se pudo cargar el contrato solicitado.
        </p>
      </div>
    );
  }

  // ---- Process progress ----
  const processId = contract.process_id || "contrato-mandato";
  const progress = getProcessProgress(processId, contract.status);
  const processDef = ALL_PROCESSES["contracts"];
  const suggestions = getAgentSuggestions(processId, contract.status, contract);
  const nextAction = getNextActionLabel(processId, contract.status);

  // ---- Info items ----
  const infoItems: Array<{ label: string; value: string | React.ReactNode }> = [
    { label: "Cliente", value: contract.client_name },
    { label: "Tipo", value: contract.type },
    ...(contract.monthly_fee != null
      ? [
          {
            label: "Honorario Mensual",
            value: formatCurrency(contract.monthly_fee, contract.currency),
          },
        ]
      : []),
    ...(contract.start_date
      ? [{ label: "Fecha Inicio", value: formatDate(contract.start_date) }]
      : []),
    ...(contract.end_date
      ? [{ label: "Fecha Fin", value: formatDate(contract.end_date) }]
      : []),
    { label: "Creado", value: formatDate(contract.created_at) },
  ];

  return (
    <WizardDetail
      backHref="/contracts"
      backLabel="Volver a Contratos"
      title={contract.title}
      statusLabel={CONTRACT_STATUS_LABELS[contract.status] || contract.status}
      statusKey={contract.status}
      progress={progress}
      processDefinition={processDef}
      agentSuggestions={suggestions}
      actionLabel={nextAction}
      onAction={() => transitionMutation.mutate(contract.status)}
      actionLoading={transitionMutation.isPending}
      infoItems={infoItems}
    >
      {/* ---- Adjuntos ---- */}
      {contract.attachments && contract.attachments.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            Archivos Adjuntos
          </h3>
          <div className="space-y-2">
            {contract.attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {att.filename}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(att.uploaded_at)}
                  </p>
                </div>
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Descargar
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Clausulas ---- */}
      {contract.clauses && contract.clauses.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            Clausulas
          </h3>
          <div className="space-y-3">
            {contract.clauses.map((clause) => (
              <div
                key={clause.id}
                className="rounded-lg border border-gray-100 bg-gray-50 p-4"
              >
                <p className="text-sm font-semibold text-gray-800">
                  {clause.title}
                </p>
                <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                  {clause.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </WizardDetail>
  );
}
