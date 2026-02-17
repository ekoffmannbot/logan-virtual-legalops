"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { LEAD_STATUS_LABELS, LEAD_SOURCE_LABELS } from "@/lib/constants";
import { WizardDetail } from "@/components/shared/wizard-detail";
import {
  getProcessProgress,
  getAgentSuggestions,
  getNextActionLabel,
} from "@/lib/process-status-map";
import type { ProcessProgress } from "@/lib/process-status-map";
import { ALL_PROCESSES } from "@/lib/process-definitions";
import { Loader2, AlertCircle } from "lucide-react";

/* ------------------------------------------------------------------ */
/* TYPES                                                               */
/* ------------------------------------------------------------------ */

interface LeadDetail {
  id: number;
  full_name: string;
  email?: string;
  phone?: string;
  company?: string;
  source: string;
  status: string;
  notes?: string;
  assigned_to_name?: string;
  created_at: string;
  process_id: string;
  interactions: Array<{
    id: number;
    type: string;
    notes: string;
    created_by_name: string;
    created_at: string;
  }>;
}

/* ------------------------------------------------------------------ */
/* STATUS TRANSITION MAP                                               */
/* ------------------------------------------------------------------ */

function getNextStatus(current: string): string | null {
  const transitions: Record<string, string> = {
    new: "contacted",
    contacted: "meeting_scheduled",
    meeting_scheduled: "proposal_sent",
    proposal_sent: "won",
  };
  return transitions[current] ?? null;
}

/* ------------------------------------------------------------------ */
/* INTERACTION TYPE LABELS                                             */
/* ------------------------------------------------------------------ */

const INTERACTION_TYPE_LABELS: Record<string, string> = {
  call: "Llamada",
  email: "Correo",
  meeting: "Reunión",
  note: "Nota",
  status_change: "Cambio de estado",
  whatsapp: "WhatsApp",
};

/* ------------------------------------------------------------------ */
/* PAGE                                                                */
/* ------------------------------------------------------------------ */

export default function LeadDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const leadId = params.id as string;

  /* ---- Fetch lead ---- */
  const {
    data: lead,
    isLoading,
    error,
  } = useQuery<LeadDetail>({
    queryKey: ["lead", leadId],
    queryFn: () => api.get(`/leads/${leadId}`),
  });

  /* ---- Status transition mutation ---- */
  const transitionMutation = useMutation({
    mutationFn: (newStatus: string) =>
      api.patch(`/leads/${leadId}`, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
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
  if (error || !lead) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <p className="text-lg font-medium">Error al cargar el lead</p>
        <p className="text-sm text-muted-foreground mt-1">
          No se encontro el lead solicitado.
        </p>
      </div>
    );
  }

  /* ---- Derive process data ---- */
  const processId = lead.process_id || "recepcion-visita";
  const progress: ProcessProgress = getProcessProgress(processId, lead.status);
  const agentSuggestions = getAgentSuggestions(processId, lead.status, lead);
  const actionLabel = getNextActionLabel(processId, lead.status);
  const processDefinition = ALL_PROCESSES[lead.process_id] ?? undefined;

  const nextStatus = getNextStatus(lead.status);

  const handleAction = () => {
    if (nextStatus) {
      transitionMutation.mutate(nextStatus);
    }
  };

  /* ---- Info items ---- */
  const infoItems: Array<{ label: string; value: string | React.ReactNode }> = [
    {
      label: "Fuente",
      value: LEAD_SOURCE_LABELS[lead.source] || lead.source,
    },
  ];

  if (lead.phone) {
    infoItems.push({ label: "Telefono", value: lead.phone });
  }
  if (lead.email) {
    infoItems.push({ label: "Email", value: lead.email });
  }
  if (lead.company) {
    infoItems.push({ label: "Empresa", value: lead.company });
  }
  if (lead.assigned_to_name) {
    infoItems.push({ label: "Asignado a", value: lead.assigned_to_name });
  }
  infoItems.push({ label: "Creado", value: formatDate(lead.created_at) });

  /* ---- Timeline (interactions) ---- */
  const timeline =
    lead.interactions && lead.interactions.length > 0 ? (
      <div className="space-y-4">
        {lead.interactions.map((interaction) => (
          <div
            key={interaction.id}
            className="flex items-start gap-3 border-l-2 border-gray-200 pl-4"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-500 uppercase">
                  {INTERACTION_TYPE_LABELS[interaction.type] || interaction.type}
                </span>
                <span className="text-[10px] text-gray-400">
                  {formatDate(interaction.created_at)}
                </span>
              </div>
              <p className="text-sm text-gray-700 mt-0.5">{interaction.notes}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                {interaction.created_by_name}
              </p>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-sm text-gray-400">Sin interacciones registradas.</p>
    );

  /* ---- Render ---- */
  return (
    <WizardDetail
      backHref="/leads"
      backLabel="Leads"
      title={lead.full_name}
      statusLabel={LEAD_STATUS_LABELS[lead.status] || lead.status}
      statusKey={lead.status}
      progress={progress}
      processDefinition={processDefinition}
      actionLabel={nextStatus ? actionLabel : undefined}
      onAction={nextStatus ? handleAction : undefined}
      actionDisabled={transitionMutation.isPending}
      actionLoading={transitionMutation.isPending}
      agentSuggestions={agentSuggestions}
      infoItems={infoItems}
      timeline={timeline}
    >
      {/* Notes section */}
      {lead.notes && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
            Notas
          </h4>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.notes}</p>
        </div>
      )}

      {/* Mutation error feedback */}
      {transitionMutation.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-sm text-red-700">
            Error al realizar la accion. Intente nuevamente.
          </p>
        </div>
      )}
    </WizardDetail>
  );
}
