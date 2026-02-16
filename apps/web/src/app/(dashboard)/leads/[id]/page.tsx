"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/utils";
import { LEAD_STATUS_LABELS, LEAD_SOURCE_LABELS } from "@/lib/constants";
import { StatusBadge } from "@/components/shared/status-badge";
import { Timeline } from "@/components/shared/timeline";
import { WorkflowActions } from "@/components/shared/workflow-actions";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Phone,
  Mail,
  Calendar,
  User,
  Tag,
  Clock,
  FileText,
} from "lucide-react";

interface Lead {
  id: number;
  full_name: string;
  email?: string;
  phone?: string;
  source: string;
  status: string;
  notes?: string;
  assigned_to_name?: string;
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
    case "new":
      actions.push({ label: "Contactar", action: "contacted", variant: "primary" });
      actions.push({ label: "Marcar como Perdido", action: "lost", variant: "destructive" });
      break;
    case "contacted":
      actions.push({ label: "Agendar Reunion", action: "meeting_scheduled", variant: "primary" });
      actions.push({ label: "Marcar como Perdido", action: "lost", variant: "destructive" });
      break;
    case "meeting_scheduled":
      actions.push({ label: "Enviar Propuesta", action: "proposal_sent", variant: "primary" });
      actions.push({ label: "Marcar como Perdido", action: "lost", variant: "destructive" });
      break;
    case "proposal_sent":
      actions.push({ label: "Convertir a Cliente", action: "won", variant: "primary" });
      actions.push({ label: "Marcar como Perdido", action: "lost", variant: "destructive" });
      break;
    default:
      break;
  }

  return actions;
}

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const leadId = params.id as string;

  const { data: lead, isLoading, error } = useQuery<Lead>({
    queryKey: ["lead", leadId],
    queryFn: () => api.get(`/leads/${leadId}`),
  });

  const transitionMutation = useMutation({
    mutationFn: (action: string) =>
      api.post(`/leads/${leadId}/transition`, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
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

  if (error || !lead) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <p className="text-lg font-medium">Error al cargar el lead</p>
        <p className="text-sm text-muted-foreground mt-1">
          No se encontro el lead solicitado.
        </p>
        <button
          onClick={() => router.push("/leads")}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Leads
        </button>
      </div>
    );
  }

  const workflowActions = getWorkflowActions(lead.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/leads")}
          className="rounded-lg border p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{lead.full_name}</h1>
            <StatusBadge
              status={lead.status}
              label={LEAD_STATUS_LABELS[lead.status] || lead.status}
            />
          </div>
          <p className="text-muted-foreground">
            Lead #{lead.id} · Creado {formatDate(lead.created_at)}
          </p>
        </div>
      </div>

      {/* Workflow Actions */}
      {workflowActions.length > 0 && (
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm font-medium text-muted-foreground mb-3">Acciones disponibles</p>
          <WorkflowActions
            actions={workflowActions}
            onAction={handleAction}
          />
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
        {/* Lead Info Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-xl border bg-white p-6">
            <h3 className="text-base font-semibold mb-4">Informacion del Lead</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Nombre</p>
                  <p className="text-sm font-medium">{lead.full_name}</p>
                </div>
              </div>
              {lead.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm">{lead.email}</p>
                  </div>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Telefono</p>
                    <p className="text-sm">{lead.phone}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Tag className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Fuente</p>
                  <p className="text-sm">{LEAD_SOURCE_LABELS[lead.source] || lead.source}</p>
                </div>
              </div>
              {lead.assigned_to_name && (
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Asignado a</p>
                    <p className="text-sm">{lead.assigned_to_name}</p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Ultima actualizacion</p>
                  <p className="text-sm">{formatDateTime(lead.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {lead.notes && (
            <div className="rounded-xl border bg-white p-6">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-base font-semibold">Notas</h3>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{lead.notes}</p>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border bg-white p-6">
            <h3 className="text-base font-semibold mb-4">Historial</h3>
            <Timeline events={lead.timeline || []} />
          </div>
        </div>
      </div>
    </div>
  );
}
