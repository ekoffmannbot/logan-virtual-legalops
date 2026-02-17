"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Stamp, Loader2, FileText, Building, User, Calendar } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { NOTARY_STATUS_LABELS } from "@/lib/constants";
import { documentosNotarialesProcess } from "@/lib/process-definitions";
import { ItemCard } from "@/components/shared/item-card";
import { AgentStatusBar } from "@/components/shared/agent-message";
import { UrgencySection } from "@/components/shared/urgency-section";
import { EmptyState } from "@/components/shared/empty-state";
import {
  getProcessProgress,
  computeUrgency,
  getNextActionLabel,
} from "@/lib/process-status-map";

interface NotaryDoc {
  id: number;
  document_type: string;
  title: string;
  client_name: string;
  notary_name: string;
  status: string;
  submitted_date: string | null;
  created_at: string;
  process_id: string;
}

const EN_TRAMITE_STATUSES = ["antecedents_requested", "drafting", "sent_to_notary"];
const EN_NOTARIA_STATUSES = ["notary_received", "notary_signed"];
const CON_CLIENTE_STATUSES = ["client_contact_pending", "document_available"];
const COMPLETADO_STATUSES = ["archived", "reported_to_manager", "client_signed"];

export default function NotaryPage() {
  const router = useRouter();
  const [showFlow, setShowFlow] = useState(false);

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["notary"],
    queryFn: () => api.get<NotaryDoc[]>("/notary"),
  });

  const enTramite = documents.filter((d) => EN_TRAMITE_STATUSES.includes(d.status));
  const enNotaria = documents.filter((d) => EN_NOTARIA_STATUSES.includes(d.status));
  const conCliente = documents.filter((d) => CON_CLIENTE_STATUSES.includes(d.status));
  const completado = documents.filter((d) => COMPLETADO_STATUSES.includes(d.status));

  // Compute agent counts for the status bar
  const agentCounts = documents.reduce(
    (acc, doc) => {
      const progress = getProcessProgress(doc.process_id || "documentos-notariales", doc.status);
      const agent = progress.agentName;
      if (agent.includes("Gerente")) acc.gerente++;
      else if (agent.includes("Abogado")) acc.abogado++;
      else if (agent.includes("Notar")) acc.notaria++;
      else if (agent.includes("Cliente")) acc.cliente++;
      return acc;
    },
    { gerente: 0, abogado: 0, notaria: 0, cliente: 0 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Tramites Notariales
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Seguimiento de documentos en notarias
          </p>
        </div>
        <button
          onClick={() => setShowFlow(!showFlow)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Ver Flujo
        </button>
      </div>

      {/* Process Flow (togglable) */}
      {showFlow && (
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm text-gray-500 mb-2 font-medium">
            Flujo: {documentosNotarialesProcess.name}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {documentosNotarialesProcess.steps
              .filter((s) => s.type !== "start" && s.type !== "end")
              .map((step, i) => (
                <div key={step.id} className="flex items-center gap-2">
                  {i > 0 && <span className="text-gray-300">&rarr;</span>}
                  <span className="text-xs bg-gray-100 rounded-md px-2 py-1 text-gray-600">
                    {step.label}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Agent Status Bar */}
      <AgentStatusBar
        agents={[
          { name: "Gerente Legal", count: agentCounts.gerente, color: "rose" },
          { name: "Abogado", count: agentCounts.abogado, color: "green" },
          { name: "Notaria", count: agentCounts.notaria, color: "purple" },
          { name: "Cliente", count: agentCounts.cliente, color: "cyan" },
        ]}
      />

      {/* Content */}
      {documents.length === 0 ? (
        <EmptyState
          icon={Stamp}
          title="No hay tramites notariales"
          description="No se encontraron documentos notariales en el sistema."
        />
      ) : (
        <div className="space-y-4">
          {/* En Tramite */}
          {enTramite.length > 0 && (
            <UrgencySection
              title="En Tramite"
              urgency="warning"
              count={enTramite.length}
            >
              <div className="p-3 space-y-3">
                {enTramite.map((doc) => {
                  const progress = getProcessProgress(
                    doc.process_id || "documentos-notariales",
                    doc.status
                  );
                  const urgency = computeUrgency(doc);
                  const actionLabel = getNextActionLabel(
                    "documentos-notariales",
                    doc.status
                  );

                  return (
                    <ItemCard
                      key={doc.id}
                      title={doc.client_name}
                      subtitle={`${doc.document_type}${doc.title ? ` - ${doc.title}` : ""}`}
                      statusLabel={NOTARY_STATUS_LABELS[doc.status] || doc.status}
                      urgency={urgency}
                      progress={progress}
                      meta={[
                        ...(doc.notary_name
                          ? [{ icon: Building, label: doc.notary_name }]
                          : []),
                        { icon: Calendar, label: formatDate(doc.created_at) },
                      ]}
                      actionLabel={actionLabel}
                      actionHref={`/notary/${doc.id}`}
                      href={`/notary/${doc.id}`}
                    />
                  );
                })}
              </div>
            </UrgencySection>
          )}

          {/* En Notaria */}
          {enNotaria.length > 0 && (
            <UrgencySection
              title="En Notaria"
              urgency="normal"
              count={enNotaria.length}
            >
              <div className="p-3 space-y-3">
                {enNotaria.map((doc) => {
                  const progress = getProcessProgress(
                    doc.process_id || "documentos-notariales",
                    doc.status
                  );
                  const urgency = computeUrgency(doc);
                  const actionLabel = getNextActionLabel(
                    "documentos-notariales",
                    doc.status
                  );

                  return (
                    <ItemCard
                      key={doc.id}
                      title={doc.client_name}
                      subtitle={`${doc.document_type}${doc.title ? ` - ${doc.title}` : ""}`}
                      statusLabel={NOTARY_STATUS_LABELS[doc.status] || doc.status}
                      urgency={urgency}
                      progress={progress}
                      meta={[
                        ...(doc.notary_name
                          ? [{ icon: Building, label: doc.notary_name }]
                          : []),
                        ...(doc.submitted_date
                          ? [{ icon: Calendar, label: `Enviado: ${formatDate(doc.submitted_date)}` }]
                          : []),
                      ]}
                      actionLabel={actionLabel}
                      actionHref={`/notary/${doc.id}`}
                      href={`/notary/${doc.id}`}
                    />
                  );
                })}
              </div>
            </UrgencySection>
          )}

          {/* Con Cliente */}
          {conCliente.length > 0 && (
            <UrgencySection
              title="Con Cliente"
              urgency="warning"
              count={conCliente.length}
            >
              <div className="p-3 space-y-3">
                {conCliente.map((doc) => {
                  const progress = getProcessProgress(
                    doc.process_id || "documentos-notariales",
                    doc.status
                  );
                  const urgency = computeUrgency(doc);
                  const actionLabel = getNextActionLabel(
                    "documentos-notariales",
                    doc.status
                  );

                  return (
                    <ItemCard
                      key={doc.id}
                      title={doc.client_name}
                      subtitle={`${doc.document_type}${doc.title ? ` - ${doc.title}` : ""}`}
                      statusLabel={NOTARY_STATUS_LABELS[doc.status] || doc.status}
                      urgency={urgency}
                      progress={progress}
                      meta={[
                        ...(doc.notary_name
                          ? [{ icon: Building, label: doc.notary_name }]
                          : []),
                        { icon: User, label: "Pendiente firma cliente" },
                      ]}
                      actionLabel={actionLabel}
                      actionHref={`/notary/${doc.id}`}
                      href={`/notary/${doc.id}`}
                    />
                  );
                })}
              </div>
            </UrgencySection>
          )}

          {/* Completado */}
          {completado.length > 0 && (
            <UrgencySection
              title="Completado"
              urgency="normal"
              count={completado.length}
              defaultOpen={false}
            >
              <div className="p-3 space-y-3">
                {completado.map((doc) => {
                  const progress = getProcessProgress(
                    doc.process_id || "documentos-notariales",
                    doc.status
                  );

                  return (
                    <ItemCard
                      key={doc.id}
                      title={doc.client_name}
                      subtitle={`${doc.document_type}${doc.title ? ` - ${doc.title}` : ""}`}
                      statusLabel={NOTARY_STATUS_LABELS[doc.status] || doc.status}
                      urgency="normal"
                      progress={progress}
                      meta={[
                        { icon: Calendar, label: formatDate(doc.created_at) },
                      ]}
                      href={`/notary/${doc.id}`}
                    />
                  );
                })}
              </div>
            </UrgencySection>
          )}
        </div>
      )}
    </div>
  );
}
