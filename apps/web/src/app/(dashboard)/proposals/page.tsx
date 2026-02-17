"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { FileText, Loader2, DollarSign, Calendar, User } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import { PROPOSAL_STATUS_LABELS } from "@/lib/constants";
import { seguimientoPropuestasProcess } from "@/lib/process-definitions";
import { ItemCard } from "@/components/shared/item-card";
import { AgentStatusBar } from "@/components/shared/agent-message";
import { UrgencySection } from "@/components/shared/urgency-section";
import { EmptyState } from "@/components/shared/empty-state";
import {
  getProcessProgress,
  computeUrgency,
  getNextActionLabel,
  getTimeUntil,
} from "@/lib/process-status-map";

interface Proposal {
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
}

function isSentOver72h(sentAt?: string): boolean {
  if (!sentAt) return false;
  const sent = new Date(sentAt);
  const now = new Date();
  const diffHours = (now.getTime() - sent.getTime()) / (1000 * 60 * 60);
  return diffHours > 72;
}

export default function ProposalsPage() {
  const router = useRouter();
  const [showFlow, setShowFlow] = useState(false);

  const { data, isLoading } = useQuery<{ items: Proposal[]; total: number }>({
    queryKey: ["proposals"],
    queryFn: () => api.get("/proposals"),
  });
  const proposals = data?.items ?? [];

  const borradores = proposals.filter((p) => p.status === "draft");
  const enviadas = proposals.filter((p) => p.status === "sent");
  const aceptadas = proposals.filter((p) => p.status === "accepted");
  const finalizadas = proposals.filter(
    (p) => p.status === "rejected" || p.status === "expired"
  );

  // Agent counts
  const agentCounts = proposals.reduce(
    (acc, p) => {
      const progress = getProcessProgress(
        p.process_id || "seguimiento-propuestas",
        p.status
      );
      const agent = progress.agentName;
      if (agent.includes("Jefe")) acc.jefe++;
      else if (agent.includes("Abogado")) acc.abogado++;
      else if (agent.includes("Administra")) acc.admin++;
      return acc;
    },
    { jefe: 0, abogado: 0, admin: 0 }
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
          <h1 className="text-2xl font-bold text-gray-900">Propuestas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Pipeline de propuestas comerciales
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
            Flujo: {seguimientoPropuestasProcess.name}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {seguimientoPropuestasProcess.steps
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
          { name: "Abogado Jefe", count: agentCounts.jefe, color: "purple" },
          { name: "Abogado", count: agentCounts.abogado, color: "green" },
          { name: "Administracion", count: agentCounts.admin, color: "amber" },
        ]}
      />

      {/* Content */}
      {proposals.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No hay propuestas"
          description="Crea tu primera propuesta comercial para un cliente."
        />
      ) : (
        <div className="space-y-4">
          {/* Borradores */}
          {borradores.length > 0 && (
            <UrgencySection
              title="Borradores"
              urgency="normal"
              count={borradores.length}
            >
              <div className="p-3 space-y-3">
                {borradores.map((p) => {
                  const progress = getProcessProgress(
                    p.process_id || "seguimiento-propuestas",
                    p.status
                  );
                  const urgency = computeUrgency(p);
                  const actionLabel = getNextActionLabel(
                    "seguimiento-propuestas",
                    p.status
                  );

                  return (
                    <ItemCard
                      key={p.id}
                      title={p.client_name}
                      subtitle={p.title}
                      statusLabel={PROPOSAL_STATUS_LABELS[p.status] || p.status}
                      urgency={urgency}
                      progress={progress}
                      meta={[
                        { icon: DollarSign, label: formatCurrency(p.amount, p.currency) },
                        ...(p.assigned_to_name
                          ? [{ icon: User, label: p.assigned_to_name }]
                          : []),
                        { icon: Calendar, label: formatDate(p.created_at) },
                      ]}
                      actionLabel={actionLabel}
                      actionHref={`/proposals/${p.id}`}
                      href={`/proposals/${p.id}`}
                    />
                  );
                })}
              </div>
            </UrgencySection>
          )}

          {/* Enviadas */}
          {enviadas.length > 0 && (
            <UrgencySection
              title="Enviadas"
              urgency="warning"
              count={enviadas.length}
            >
              <div className="p-3 space-y-3">
                {enviadas.map((p) => {
                  const progress = getProcessProgress(
                    p.process_id || "seguimiento-propuestas",
                    p.status
                  );
                  const over72h = isSentOver72h(p.sent_at);
                  const urgency = over72h ? "urgent" as const : computeUrgency(p);
                  const actionLabel = getNextActionLabel(
                    "seguimiento-propuestas",
                    p.status
                  );

                  return (
                    <ItemCard
                      key={p.id}
                      title={p.client_name}
                      subtitle={p.title}
                      statusLabel={PROPOSAL_STATUS_LABELS[p.status] || p.status}
                      urgency={urgency}
                      urgencyText={
                        over72h
                          ? "Mas de 72h sin respuesta - contactar cliente"
                          : undefined
                      }
                      progress={progress}
                      meta={[
                        { icon: DollarSign, label: formatCurrency(p.amount, p.currency) },
                        ...(p.sent_at
                          ? [{ icon: Calendar, label: `Enviada: ${formatDate(p.sent_at)}` }]
                          : []),
                        ...(p.valid_until
                          ? [{ label: `Vence: ${getTimeUntil(p.valid_until)}` }]
                          : []),
                      ]}
                      actionLabel={actionLabel}
                      actionHref={`/proposals/${p.id}`}
                      href={`/proposals/${p.id}`}
                    />
                  );
                })}
              </div>
            </UrgencySection>
          )}

          {/* Aceptadas */}
          {aceptadas.length > 0 && (
            <UrgencySection
              title="Aceptadas"
              urgency="normal"
              count={aceptadas.length}
            >
              <div className="p-3 space-y-3">
                {aceptadas.map((p) => {
                  const progress = getProcessProgress(
                    p.process_id || "seguimiento-propuestas",
                    p.status
                  );
                  const actionLabel = getNextActionLabel(
                    "seguimiento-propuestas",
                    p.status
                  );

                  return (
                    <ItemCard
                      key={p.id}
                      title={p.client_name}
                      subtitle={p.title}
                      statusLabel={PROPOSAL_STATUS_LABELS[p.status] || p.status}
                      urgency="normal"
                      progress={progress}
                      meta={[
                        { icon: DollarSign, label: formatCurrency(p.amount, p.currency) },
                        ...(p.assigned_to_name
                          ? [{ icon: User, label: p.assigned_to_name }]
                          : []),
                      ]}
                      actionLabel={actionLabel}
                      actionHref={`/proposals/${p.id}`}
                      href={`/proposals/${p.id}`}
                    />
                  );
                })}
              </div>
            </UrgencySection>
          )}

          {/* Finalizadas */}
          {finalizadas.length > 0 && (
            <UrgencySection
              title="Finalizadas"
              urgency="normal"
              count={finalizadas.length}
              defaultOpen={false}
            >
              <div className="p-3 space-y-3">
                {finalizadas.map((p) => {
                  const progress = getProcessProgress(
                    p.process_id || "seguimiento-propuestas",
                    p.status
                  );

                  return (
                    <ItemCard
                      key={p.id}
                      title={p.client_name}
                      subtitle={p.title}
                      statusLabel={PROPOSAL_STATUS_LABELS[p.status] || p.status}
                      urgency="normal"
                      progress={progress}
                      meta={[
                        { icon: DollarSign, label: formatCurrency(p.amount, p.currency) },
                        { icon: Calendar, label: formatDate(p.created_at) },
                      ]}
                      href={`/proposals/${p.id}`}
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
