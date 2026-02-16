"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import { PROPOSAL_STATUS_LABELS } from "@/lib/constants";
import { StatusBadge } from "@/components/shared/status-badge";
import { Timeline } from "@/components/shared/timeline";
import { WorkflowActions } from "@/components/shared/workflow-actions";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  User,
  DollarSign,
  Calendar,
  Clock,
  FileText,
  Send,
} from "lucide-react";

interface ProposalDetail {
  id: number;
  client_id: number;
  client_name: string;
  amount: number;
  status: string;
  description?: string;
  sent_at?: string;
  expires_at?: string;
  accepted_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  timeline: Array<{
    id: number;
    title: string;
    description?: string;
    timestamp: string;
    type?: "status_change" | "communication" | "task" | "audit" | "note";
    actor?: string;
  }>;
}

function getWorkflowActions(status: string) {
  const actions: Array<{
    label: string;
    action: string;
    variant?: "default" | "primary" | "destructive";
  }> = [];

  switch (status) {
    case "draft":
      actions.push({ label: "Enviar Propuesta", action: "sent", variant: "primary" });
      break;
    case "sent":
      actions.push({ label: "Marcar como Aceptada", action: "accepted", variant: "primary" });
      actions.push({ label: "Marcar como Rechazada", action: "rejected", variant: "destructive" });
      break;
    default:
      break;
  }

  return actions;
}

export default function ProposalDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const proposalId = params.id as string;

  const { data: proposal, isLoading, error } = useQuery<ProposalDetail>({
    queryKey: ["proposal", proposalId],
    queryFn: () => api.get(`/proposals/${proposalId}`),
  });

  const transitionMutation = useMutation({
    mutationFn: (action: string) =>
      api.post(`/proposals/${proposalId}/transition`, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposal", proposalId] });
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
    },
  });

  const handleAction = (action: string) => {
    transitionMutation.mutate(action);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <p className="text-lg font-medium">Error al cargar la propuesta</p>
        <p className="text-sm text-muted-foreground mt-1">
          No se encontro la propuesta solicitada.
        </p>
        <button
          onClick={() => router.push("/proposals")}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Propuestas
        </button>
      </div>
    );
  }

  const workflowActions = getWorkflowActions(proposal.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/proposals")}
          className="rounded-lg border p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Propuesta #{proposal.id}</h1>
            <StatusBadge
              status={proposal.status}
              label={PROPOSAL_STATUS_LABELS[proposal.status] || proposal.status}
            />
          </div>
          <p className="text-muted-foreground">
            {proposal.client_name} · {formatCurrency(proposal.amount)}
          </p>
        </div>
      </div>

      {/* Workflow Actions */}
      {workflowActions.length > 0 && (
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm font-medium text-muted-foreground mb-3">Acciones disponibles</p>
          <WorkflowActions actions={workflowActions} onAction={handleAction} />
          {transitionMutation.isPending && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Procesando...
            </div>
          )}
          {transitionMutation.isError && (
            <p className="mt-2 text-sm text-destructive">
              Error al realizar la accion. Intente nuevamente.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Proposal Info Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-xl border bg-white p-6">
            <h3 className="text-base font-semibold mb-4">Informacion de la Propuesta</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p
                    className="text-sm font-medium text-primary cursor-pointer hover:underline"
                    onClick={() => router.push(`/clients/${proposal.client_id}`)}
                  >
                    {proposal.client_name}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <DollarSign className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Monto</p>
                  <p className="text-sm font-bold text-lg">{formatCurrency(proposal.amount)}</p>
                </div>
              </div>
              {proposal.created_by_name && (
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Creada por</p>
                    <p className="text-sm">{proposal.created_by_name}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Fecha de creacion</p>
                  <p className="text-sm">{formatDate(proposal.created_at)}</p>
                </div>
              </div>
              {proposal.sent_at && (
                <div className="flex items-start gap-3">
                  <Send className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Enviada</p>
                    <p className="text-sm">{formatDate(proposal.sent_at)}</p>
                  </div>
                </div>
              )}
              {proposal.expires_at && (
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Vencimiento</p>
                    <p className="text-sm">{formatDate(proposal.expires_at)}</p>
                  </div>
                </div>
              )}
              {proposal.accepted_at && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 mt-0.5 text-green-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Aceptada</p>
                    <p className="text-sm text-green-700 font-medium">
                      {formatDate(proposal.accepted_at)}
                    </p>
                  </div>
                </div>
              )}
              {proposal.rejected_at && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 mt-0.5 text-red-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Rechazada</p>
                    <p className="text-sm text-red-700 font-medium">
                      {formatDate(proposal.rejected_at)}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Ultima actualizacion</p>
                  <p className="text-sm">{formatDateTime(proposal.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {proposal.description && (
            <div className="rounded-xl border bg-white p-6">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-base font-semibold">Descripcion</h3>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {proposal.description}
              </p>
            </div>
          )}

          {/* Rejection Reason */}
          {proposal.rejection_reason && (
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-6">
              <h3 className="text-base font-semibold text-red-800 mb-2">Motivo del rechazo</h3>
              <p className="text-sm text-red-700 whitespace-pre-wrap">
                {proposal.rejection_reason}
              </p>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border bg-white p-6">
            <h3 className="text-base font-semibold mb-4">Historial</h3>
            <Timeline events={proposal.timeline || []} />
          </div>
        </div>
      </div>
    </div>
  );
}
