"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import { EMAIL_TICKET_STATUS_LABELS } from "@/lib/constants";
import { ALL_PROCESSES } from "@/lib/process-definitions";
import {
  getProcessProgress,
  getAgentSuggestions,
  getNextActionLabel,
  getTimeUntil,
} from "@/lib/process-status-map";
import { WizardDetail } from "@/components/shared/wizard-detail";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface EmailTicketMessage {
  id: string;
  from: string;
  body: string;
  sent_at: string;
  direction: "inbound" | "outbound";
}

interface EmailTicketDetail {
  id: string;
  subject: string;
  from_email: string;
  from_name: string;
  status: string;
  priority: string;
  assigned_to_name: string | null;
  matter_title: string | null;
  created_at: string;
  sla_deadline: string | null;
  sla_24h_deadline: string | null;
  process_id: string;
  messages: EmailTicketMessage[];
}

/* ------------------------------------------------------------------ */
/* Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function EmailTicketDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const ticketId = params.id as string;

  // ---- Fetch ----
  const { data: ticket, isLoading, error } = useQuery({
    queryKey: ["email-tickets", ticketId],
    queryFn: () => api.get<EmailTicketDetail>(`/email-tickets/${ticketId}`),
  });

  // ---- Mutation: transitions ----
  const transitionMutation = useMutation({
    mutationFn: (action: string) =>
      api.patch(`/email-tickets/${ticketId}`, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-tickets", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["email-tickets"] });
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
  if (error || !ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <p className="text-lg font-medium">Ticket no encontrado</p>
        <p className="text-sm text-muted-foreground mt-1">
          No se pudo cargar el ticket solicitado.
        </p>
      </div>
    );
  }

  // ---- Process progress ----
  const processId = ticket.process_id || "respuesta-correos";
  const progress = getProcessProgress(processId, ticket.status);
  const processDef = ALL_PROCESSES["email-tickets"];
  const suggestions = getAgentSuggestions(processId, ticket.status, ticket);
  const nextAction = getNextActionLabel(processId, ticket.status);

  // ---- SLA text ----
  const slaText = ticket.sla_24h_deadline
    ? getTimeUntil(ticket.sla_24h_deadline)
    : ticket.sla_deadline
    ? getTimeUntil(ticket.sla_deadline)
    : null;

  // ---- Info items ----
  const infoItems: Array<{ label: string; value: string | React.ReactNode }> = [
    {
      label: "Remitente",
      value: (
        <span>
          {ticket.from_name}{" "}
          <span className="text-xs text-gray-500">({ticket.from_email})</span>
        </span>
      ),
    },
    { label: "Prioridad", value: ticket.priority },
    ...(ticket.matter_title
      ? [{ label: "Caso Relacionado", value: ticket.matter_title }]
      : []),
    ...(ticket.assigned_to_name
      ? [{ label: "Asignado a", value: ticket.assigned_to_name }]
      : []),
    ...(slaText
      ? [
          {
            label: "SLA",
            value: (
              <span
                className={cn(
                  "font-semibold",
                  slaText.startsWith("Vencido") ? "text-red-600" : "text-green-700"
                )}
              >
                {slaText}
              </span>
            ),
          },
        ]
      : []),
    { label: "Creado", value: formatDate(ticket.created_at) },
  ];

  return (
    <WizardDetail
      backHref="/email-tickets"
      backLabel="Volver a Correos"
      title={ticket.subject}
      statusLabel={EMAIL_TICKET_STATUS_LABELS[ticket.status] || ticket.status}
      statusKey={ticket.status}
      progress={progress}
      processDefinition={processDef}
      agentSuggestions={suggestions}
      actionLabel={nextAction}
      onAction={() => transitionMutation.mutate(ticket.status)}
      actionLoading={transitionMutation.isPending}
      infoItems={infoItems}
    >
      {/* ---- Hilo de mensajes ---- */}
      {ticket.messages && ticket.messages.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            Conversacion
          </h3>
          <div className="space-y-4">
            {ticket.messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "rounded-lg p-4 text-sm",
                  msg.direction === "inbound"
                    ? "bg-gray-50 border border-gray-100"
                    : "bg-primary/5 border border-primary/10 ml-6"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700">
                    {msg.from}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {formatDate(msg.sent_at)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {msg.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </WizardDetail>
  );
}
