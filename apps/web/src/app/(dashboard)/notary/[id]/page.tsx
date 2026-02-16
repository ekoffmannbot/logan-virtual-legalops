"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Stamp,
  ArrowLeft,
  User,
  Calendar,
  Building,
  Phone,
  CheckCircle2,
  ArrowRight,
  PhoneCall,
  Clock,
  PenTool,
  Archive,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { NOTARY_STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";
import { StatusBadge } from "@/components/shared/status-badge";
import { Timeline } from "@/components/shared/timeline";
import { WorkflowActions } from "@/components/shared/workflow-actions";

interface NotaryDetail {
  id: string;
  client_name: string;
  client_id: string;
  matter_id: string;
  matter_title: string;
  document_type: string;
  status: string;
  notary_office: string | null;
  notary_contact: string | null;
  sent_at: string | null;
  notary_signed_at: string | null;
  client_signed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ContactAttempt {
  id: string;
  type: string;
  description: string;
  outcome: string;
  user_name: string;
  created_at: string;
}

interface TimelineEvent {
  id: string;
  action: string;
  description: string;
  user_name: string;
  created_at: string;
}

export default function NotaryDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const notaryId = params.id as string;

  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({
    type: "phone",
    description: "",
    outcome: "",
  });

  const { data: notaryDoc, isLoading } = useQuery({
    queryKey: ["notary", notaryId],
    queryFn: () => api.get<NotaryDetail>(`/notary/${notaryId}`),
  });

  const { data: rawTimeline = [] } = useQuery({
    queryKey: ["notary", notaryId, "timeline"],
    queryFn: () =>
      api.get<TimelineEvent[]>(`/notary/${notaryId}/timeline`),
  });

  const timeline = rawTimeline.map((e) => ({
    id: e.id,
    title: e.action,
    description: e.description,
    timestamp: e.created_at,
    type: "audit" as const,
    actor: e.user_name,
  }));

  const { data: contactAttempts = [] } = useQuery({
    queryKey: ["notary", notaryId, "contacts"],
    queryFn: () =>
      api.get<ContactAttempt[]>(`/notary/${notaryId}/contact-attempts`),
  });

  const transitionMutation = useMutation({
    mutationFn: (action: string) =>
      api.post(`/notary/${notaryId}/transition`, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notary", notaryId] });
      queryClient.invalidateQueries({
        queryKey: ["notary", notaryId, "timeline"],
      });
    },
  });

  const contactMutation = useMutation({
    mutationFn: (data: typeof contactForm) =>
      api.post(`/notary/${notaryId}/contact-attempts`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notary", notaryId, "contacts"],
      });
      queryClient.invalidateQueries({
        queryKey: ["notary", notaryId, "timeline"],
      });
      setShowContactForm(false);
      setContactForm({ type: "phone", description: "", outcome: "" });
    },
  });

  const handleAction = (actionId: string) => {
    if (actionId === "register_contact") {
      setShowContactForm(true);
    } else {
      transitionMutation.mutate(actionId);
    }
  };

  const getWorkflowActions = () => {
    if (!notaryDoc) return [];

    const actions: Array<{
      id: string;
      label: string;
      icon: React.ElementType;
      variant?: "primary" | "success" | "warning" | "danger";
    }> = [];

    actions.push({
      id: "advance",
      label: "Avanzar Estado",
      icon: ArrowRight,
      variant: "primary",
    });

    actions.push({
      id: "register_contact",
      label: "Registrar Intento Contacto",
      icon: PhoneCall,
      variant: "warning",
    });

    if (notaryDoc.status === "waiting_notary") {
      actions.push({
        id: "mark_available",
        label: "Marcar Disponible",
        icon: Clock,
      });
    }

    if (
      notaryDoc.status === "ready_for_signature" ||
      notaryDoc.status === "at_notary"
    ) {
      actions.push({
        id: "mark_signed",
        label: "Marcar Firmado",
        icon: PenTool,
        variant: "success",
      });
    }

    actions.push({
      id: "archive",
      label: "Archivar",
      icon: Archive,
      variant: "danger",
    });

    actions.push({
      id: "inform_manager",
      label: "Informar Gerente",
      icon: AlertTriangle,
      variant: "warning",
    });

    return actions;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!notaryDoc) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Stamp className="h-12 w-12 text-gray-400" />
        <h2 className="mt-4 text-lg font-medium text-gray-900">
          Trámite no encontrado
        </h2>
        <button
          onClick={() => router.push("/notary")}
          className="mt-4 text-sm text-blue-600 hover:text-blue-700"
        >
          Volver a trámites
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/notary")}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              Trámite Notarial - {notaryDoc.client_name}
            </h1>
            <StatusBadge
              status={notaryDoc.status}
              labels={NOTARY_STATUS_LABELS}
              colors={STATUS_COLORS}
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {notaryDoc.document_type} - {notaryDoc.matter_title}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Información del Trámite
            </h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Cliente
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {notaryDoc.client_name}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Tipo de Documento
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {notaryDoc.document_type}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Notaría
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {notaryDoc.notary_office || "No asignada"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Contacto Notaría
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {notaryDoc.notary_contact || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Enviado
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {notaryDoc.sent_at
                    ? formatDateTime(notaryDoc.sent_at)
                    : "No enviado"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Firmado Notaría
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {notaryDoc.notary_signed_at
                    ? formatDateTime(notaryDoc.notary_signed_at)
                    : "Pendiente"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Firmado Cliente
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {notaryDoc.client_signed_at
                    ? formatDateTime(notaryDoc.client_signed_at)
                    : "Pendiente"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Creado</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDateTime(notaryDoc.created_at)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Notes */}
          {notaryDoc.notes && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Notas
              </h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {notaryDoc.notes}
              </p>
            </div>
          )}

          {/* Contact Attempt Form */}
          {showContactForm && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Registrar Intento de Contacto
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de contacto
                  </label>
                  <select
                    value={contactForm.type}
                    onChange={(e) =>
                      setContactForm({ ...contactForm, type: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="phone">Llamada telefónica</option>
                    <option value="email">Correo electrónico</option>
                    <option value="visit">Visita presencial</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={contactForm.description}
                    onChange={(e) =>
                      setContactForm({
                        ...contactForm,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Detalles del intento de contacto..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Resultado
                  </label>
                  <select
                    value={contactForm.outcome}
                    onChange={(e) =>
                      setContactForm({
                        ...contactForm,
                        outcome: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Seleccionar resultado...</option>
                    <option value="contacted">Contactado exitosamente</option>
                    <option value="no_answer">No contestó</option>
                    <option value="busy">Ocupado</option>
                    <option value="voicemail">Buzón de voz</option>
                    <option value="scheduled">Cita programada</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => contactMutation.mutate(contactForm)}
                    disabled={
                      contactMutation.isPending ||
                      !contactForm.description ||
                      !contactForm.outcome
                    }
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {contactMutation.isPending
                      ? "Guardando..."
                      : "Registrar Contacto"}
                  </button>
                  <button
                    onClick={() => setShowContactForm(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Contact Attempts Log */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-gray-400" />
              Registro de Intentos de Contacto
            </h2>
            {contactAttempts.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">
                No hay intentos de contacto registrados.
              </p>
            ) : (
              <div className="space-y-4">
                {contactAttempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-4"
                  >
                    <div
                      className={cn(
                        "mt-0.5 rounded-full p-1.5",
                        attempt.outcome === "contacted"
                          ? "bg-green-100 text-green-600"
                          : attempt.outcome === "scheduled"
                          ? "bg-blue-100 text-blue-600"
                          : "bg-yellow-100 text-yellow-600"
                      )}
                    >
                      <PhoneCall className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">
                          {attempt.type === "phone"
                            ? "Llamada"
                            : attempt.type === "email"
                            ? "Correo"
                            : attempt.type === "visit"
                            ? "Visita"
                            : attempt.type === "whatsapp"
                            ? "WhatsApp"
                            : attempt.type}
                        </p>
                        <span className="text-xs text-gray-500">
                          {formatDateTime(attempt.created_at)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">
                        {attempt.description}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            attempt.outcome === "contacted"
                              ? "bg-green-100 text-green-700"
                              : attempt.outcome === "scheduled"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-yellow-100 text-yellow-700"
                          )}
                        >
                          {attempt.outcome === "contacted"
                            ? "Contactado"
                            : attempt.outcome === "no_answer"
                            ? "No contestó"
                            : attempt.outcome === "busy"
                            ? "Ocupado"
                            : attempt.outcome === "voicemail"
                            ? "Buzón de voz"
                            : attempt.outcome === "scheduled"
                            ? "Cita programada"
                            : attempt.outcome}
                        </span>
                        <span className="text-xs text-gray-500">
                          por {attempt.user_name}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
            isLoading={transitionMutation.isPending}
          />

          {/* Status Summary */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Resumen
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Estado</span>
                <StatusBadge
                  status={notaryDoc.status}
                  labels={NOTARY_STATUS_LABELS}
                  colors={STATUS_COLORS}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Intentos de contacto</span>
                <span className="font-medium text-gray-900">
                  {contactAttempts.length}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Firma Notaría</span>
                <span
                  className={cn(
                    "font-medium",
                    notaryDoc.notary_signed_at
                      ? "text-green-700"
                      : "text-gray-400"
                  )}
                >
                  {notaryDoc.notary_signed_at ? "Completada" : "Pendiente"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Firma Cliente</span>
                <span
                  className={cn(
                    "font-medium",
                    notaryDoc.client_signed_at
                      ? "text-green-700"
                      : "text-gray-400"
                  )}
                >
                  {notaryDoc.client_signed_at ? "Completada" : "Pendiente"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
