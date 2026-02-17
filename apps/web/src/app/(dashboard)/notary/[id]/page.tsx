"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import { NOTARY_STATUS_LABELS } from "@/lib/constants";
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

interface ContactAttempt {
  id: string;
  type: string;
  description: string;
  outcome: string;
  user_name: string;
  created_at: string;
}

interface NotaryDetail {
  id: string;
  document_type: string;
  title: string;
  client_name: string;
  notary_name: string | null;
  status: string;
  submitted_date: string | null;
  created_at: string;
  process_id: string;
  contact_attempts: ContactAttempt[];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const CONTACT_TYPE_LABELS: Record<string, string> = {
  phone: "Llamada",
  email: "Correo",
  visit: "Visita",
  whatsapp: "WhatsApp",
};

const OUTCOME_LABELS: Record<string, string> = {
  contacted: "Contactado",
  no_answer: "No contesto",
  busy: "Ocupado",
  voicemail: "Buzon de voz",
  scheduled: "Cita programada",
  other: "Otro",
};

/* ------------------------------------------------------------------ */
/* Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function NotaryDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const notaryId = params.id as string;

  // ---- Fetch ----
  const { data: notaryDoc, isLoading, error } = useQuery({
    queryKey: ["notary", notaryId],
    queryFn: () => api.get<NotaryDetail>(`/notary/${notaryId}`),
  });

  // ---- Mutation: status transitions ----
  const transitionMutation = useMutation({
    mutationFn: (action: string) =>
      api.patch(`/notary/${notaryId}`, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notary", notaryId] });
      queryClient.invalidateQueries({ queryKey: ["notary"] });
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
  if (error || !notaryDoc) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <p className="text-lg font-medium">Tramite no encontrado</p>
        <p className="text-sm text-muted-foreground mt-1">
          No se pudo cargar el tramite notarial solicitado.
        </p>
      </div>
    );
  }

  // ---- Process progress ----
  const processId = notaryDoc.process_id || "documentos-notariales";
  const progress = getProcessProgress(processId, notaryDoc.status);
  const processDef = ALL_PROCESSES["notary"];
  const suggestions = getAgentSuggestions(processId, notaryDoc.status, notaryDoc);
  const nextAction = getNextActionLabel(processId, notaryDoc.status);

  // ---- Info items ----
  const infoItems: Array<{ label: string; value: string | React.ReactNode }> = [
    { label: "Tipo de Documento", value: notaryDoc.document_type },
    { label: "Cliente", value: notaryDoc.client_name },
    {
      label: "Notaria",
      value: notaryDoc.notary_name || "No asignada",
    },
    ...(notaryDoc.submitted_date
      ? [{ label: "Fecha de Envio", value: formatDate(notaryDoc.submitted_date) }]
      : []),
    { label: "Creado", value: formatDate(notaryDoc.created_at) },
  ];

  return (
    <WizardDetail
      backHref="/notary"
      backLabel="Volver a Tramites Notariales"
      title={notaryDoc.title}
      statusLabel={NOTARY_STATUS_LABELS[notaryDoc.status] || notaryDoc.status}
      statusKey={notaryDoc.status}
      progress={progress}
      processDefinition={processDef}
      agentSuggestions={suggestions}
      actionLabel={nextAction}
      onAction={() => transitionMutation.mutate(notaryDoc.status)}
      actionLoading={transitionMutation.isPending}
      infoItems={infoItems}
    >
      {/* ---- Intentos de contacto ---- */}
      {notaryDoc.contact_attempts && notaryDoc.contact_attempts.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            Registro de Intentos de Contacto
          </h3>
          <div className="space-y-3">
            {notaryDoc.contact_attempts.map((attempt) => (
              <div
                key={attempt.id}
                className="rounded-lg border border-gray-100 bg-gray-50 p-4"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {CONTACT_TYPE_LABELS[attempt.type] || attempt.type}
                    </span>
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
                      {OUTCOME_LABELS[attempt.outcome] || attempt.outcome}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDate(attempt.created_at)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  {attempt.description}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  por {attempt.user_name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </WizardDetail>
  );
}
