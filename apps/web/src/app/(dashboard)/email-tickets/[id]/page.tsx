"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mail,
  ArrowLeft,
  User,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Send,
  PenLine,
  Eye,
  X,
  Timer,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { EMAIL_TICKET_STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";
import { StatusBadge } from "@/components/shared/status-badge";
import { Timeline } from "@/components/shared/timeline";
import { WorkflowActions } from "@/components/shared/workflow-actions";

interface EmailTicketDetail {
  id: string;
  subject: string;
  from_email: string;
  from_name: string;
  body: string;
  received_at: string;
  status: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  sla_24h_deadline: string;
  sla_48h_deadline: string;
  sla_24h_met: boolean | null;
  sla_48h_met: boolean | null;
  draft_response: string | null;
  matter_id: string | null;
  matter_title: string | null;
  created_at: string;
  updated_at: string;
}

interface TimelineEvent {
  id: string;
  action: string;
  description: string;
  user_name: string;
  created_at: string;
}

function SlaCountdown({ deadline, met }: { deadline: string; met: boolean | null }) {
  const [timeRemaining, setTimeRemaining] = useState("");
  const [status, setStatus] = useState<"ok" | "warning" | "breached" | "met">("ok");

  useEffect(() => {
    if (met === true) {
      setStatus("met");
      setTimeRemaining("Cumplido");
      return;
    }
    if (met === false) {
      setStatus("breached");
      setTimeRemaining("Incumplido");
      return;
    }

    const updateTimer = () => {
      const now = new Date();
      const deadlineDate = new Date(deadline);
      const diff = deadlineDate.getTime() - now.getTime();

      if (diff <= 0) {
        setStatus("breached");
        setTimeRemaining("Vencido");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours <= 4) {
        setStatus("warning");
      } else {
        setStatus("ok");
      }

      setTimeRemaining(
        `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [deadline, met]);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-mono font-bold",
        status === "met" && "bg-green-100 text-green-700",
        status === "ok" && "bg-blue-100 text-blue-700",
        status === "warning" && "bg-yellow-100 text-yellow-700 animate-pulse",
        status === "breached" && "bg-red-100 text-red-700"
      )}
    >
      <Timer className="h-4 w-4" />
      {timeRemaining}
    </div>
  );
}

export default function EmailTicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const ticketId = params.id as string;

  const [draftContent, setDraftContent] = useState("");
  const [showDraftArea, setShowDraftArea] = useState(false);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["email-tickets", ticketId],
    queryFn: () =>
      api.get<EmailTicketDetail>(`/email-tickets/${ticketId}`),
  });

  const { data: rawTimeline = [] } = useQuery({
    queryKey: ["email-tickets", ticketId, "timeline"],
    queryFn: () =>
      api.get<TimelineEvent[]>(`/email-tickets/${ticketId}/timeline`),
  });

  const timeline = rawTimeline.map((e) => ({
    id: e.id,
    title: e.action,
    description: e.description,
    timestamp: e.created_at,
    type: "audit" as const,
    actor: e.user_name,
  }));

  // Initialize draft content from server
  useEffect(() => {
    if (ticket?.draft_response) {
      setDraftContent(ticket.draft_response);
    }
  }, [ticket?.draft_response]);

  const transitionMutation = useMutation({
    mutationFn: (action: string) =>
      api.post(`/email-tickets/${ticketId}/transition`, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["email-tickets", ticketId],
      });
      queryClient.invalidateQueries({
        queryKey: ["email-tickets", ticketId, "timeline"],
      });
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: (content: string) =>
      api.patch(`/email-tickets/${ticketId}`, { draft_response: content }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["email-tickets", ticketId],
      });
    },
  });

  const sendResponseMutation = useMutation({
    mutationFn: () =>
      api.post(`/email-tickets/${ticketId}/send`, { body: draftContent }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["email-tickets", ticketId],
      });
      queryClient.invalidateQueries({
        queryKey: ["email-tickets", ticketId, "timeline"],
      });
      setShowDraftArea(false);
    },
  });

  const handleAction = (actionId: string) => {
    if (actionId === "draft") {
      setShowDraftArea(true);
    } else if (actionId === "send") {
      sendResponseMutation.mutate();
    } else {
      transitionMutation.mutate(actionId);
    }
  };

  const getWorkflowActions = () => {
    if (!ticket) return [];

    const actions: Array<{
      id: string;
      label: string;
      icon: React.ElementType;
      variant?: "primary" | "success" | "warning" | "danger";
      disabled?: boolean;
    }> = [];

    if (ticket.status === "new" || ticket.status === "open") {
      actions.push({
        id: "draft",
        label: "Redactar",
        icon: PenLine,
        variant: "primary",
      });
    }

    if (ticket.status === "draft_ready" || draftContent.trim()) {
      actions.push({
        id: "send",
        label: "Enviar",
        icon: Send,
        variant: "success",
        disabled: !draftContent.trim(),
      });
    }

    if (
      ticket.status === "sent" ||
      ticket.status === "awaiting_confirmation"
    ) {
      actions.push({
        id: "confirm_receipt",
        label: "Confirmar Recepción",
        icon: Eye,
        variant: "primary",
      });
    }

    if (ticket.status !== "closed") {
      actions.push({
        id: "close",
        label: "Cerrar",
        icon: X,
        variant: "danger",
      });
    }

    return actions;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Mail className="h-12 w-12 text-gray-400" />
        <h2 className="mt-4 text-lg font-medium text-gray-900">
          Ticket no encontrado
        </h2>
        <button
          onClick={() => router.push("/email-tickets")}
          className="mt-4 text-sm text-blue-600 hover:text-blue-700"
        >
          Volver a tickets
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/email-tickets")}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              {ticket.subject}
            </h1>
            <StatusBadge
              status={ticket.status}
              labels={EMAIL_TICKET_STATUS_LABELS}
              colors={STATUS_COLORS}
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            De: {ticket.from_name} ({ticket.from_email})
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* SLA Countdowns */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Timer className="h-5 w-5 text-gray-400" />
              SLA
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">
                  Respuesta 24 horas
                </p>
                <SlaCountdown
                  deadline={ticket.sla_24h_deadline}
                  met={ticket.sla_24h_met}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Límite: {formatDateTime(ticket.sla_24h_deadline)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">
                  Resolución 48 horas
                </p>
                <SlaCountdown
                  deadline={ticket.sla_48h_deadline}
                  met={ticket.sla_48h_met}
                />
                <p className="mt-1 text-xs text-gray-400">
                  Límite: {formatDateTime(ticket.sla_48h_deadline)}
                </p>
              </div>
            </div>
          </div>

          {/* Ticket Info */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Información del Ticket
            </h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Remitente
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {ticket.from_name}
                </dd>
                <dd className="text-xs text-gray-500">{ticket.from_email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Recibido
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDateTime(ticket.received_at)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Asignado a
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {ticket.assigned_to_name || (
                    <span className="text-orange-600">Sin asignar</span>
                  )}
                </dd>
              </div>
              {ticket.matter_title && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Caso relacionado
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {ticket.matter_title}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Email Body */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Contenido del Email
            </h2>
            <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-700 whitespace-pre-wrap border border-gray-100">
              {ticket.body}
            </div>
          </div>

          {/* Draft Area */}
          {(showDraftArea || ticket.draft_response) && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <PenLine className="h-5 w-5 text-blue-500" />
                  Borrador de Respuesta
                </h2>
                {showDraftArea && (
                  <button
                    onClick={() => setShowDraftArea(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
              <textarea
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                rows={10}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                placeholder="Escriba su respuesta aquí..."
              />
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => saveDraftMutation.mutate(draftContent)}
                  disabled={saveDraftMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50 transition-colors"
                >
                  {saveDraftMutation.isPending
                    ? "Guardando..."
                    : "Guardar Borrador"}
                </button>
                <button
                  onClick={() => sendResponseMutation.mutate()}
                  disabled={
                    sendResponseMutation.isPending || !draftContent.trim()
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Send className="h-4 w-4" />
                  {sendResponseMutation.isPending
                    ? "Enviando..."
                    : "Enviar Respuesta"}
                </button>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Historial de Actividad
            </h2>
            <Timeline events={timeline} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <WorkflowActions
            actions={getWorkflowActions()}
            onAction={handleAction}
            isLoading={
              transitionMutation.isPending ||
              sendResponseMutation.isPending
            }
          />

          {/* Quick Info */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Resumen
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Estado</span>
                <StatusBadge
                  status={ticket.status}
                  labels={EMAIL_TICKET_STATUS_LABELS}
                  colors={STATUS_COLORS}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">SLA 24h</span>
                {ticket.sla_24h_met === true ? (
                  <span className="text-green-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Cumplido
                  </span>
                ) : ticket.sla_24h_met === false ? (
                  <span className="text-red-600 font-medium flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5" />
                    Incumplido
                  </span>
                ) : (
                  <span className="text-blue-600 font-medium flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    En curso
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">SLA 48h</span>
                {ticket.sla_48h_met === true ? (
                  <span className="text-green-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Cumplido
                  </span>
                ) : ticket.sla_48h_met === false ? (
                  <span className="text-red-600 font-medium flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5" />
                    Incumplido
                  </span>
                ) : (
                  <span className="text-blue-600 font-medium flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    En curso
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Borrador</span>
                <span
                  className={cn(
                    "font-medium",
                    ticket.draft_response
                      ? "text-green-700"
                      : "text-gray-400"
                  )}
                >
                  {ticket.draft_response ? "Preparado" : "Pendiente"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
