"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Mail, Search, Loader2, Inbox, Calendar, User, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { EMAIL_TICKET_STATUS_LABELS } from "@/lib/constants";
import {
  computeUrgency,
  getProcessProgress,
  getNextActionLabel,
  getTimeUntil,
} from "@/lib/process-status-map";
import type { UrgencyLevel } from "@/lib/process-status-map";
import { ItemCard } from "@/components/shared/item-card";
import { AgentStatusBar } from "@/components/shared/agent-message";
import { UrgencySection } from "@/components/shared/urgency-section";
import { EmptyState } from "@/components/shared/empty-state";
import { ProcessFlow } from "@/components/shared/process-flow";
import { respuestaCorreosProcess } from "@/lib/process-definitions";

/* ------------------------------------------------------------------ */
/* TYPES                                                               */
/* ------------------------------------------------------------------ */

interface EmailTicket {
  id: number;
  subject: string;
  from_email: string;
  from_name: string;
  status: string;
  priority: string;
  assigned_to_name: string;
  matter_title?: string;
  created_at: string;
  sla_deadline?: string | null;
  sla_24h_deadline?: string | null;
  process_id: string;
}

/* ------------------------------------------------------------------ */
/* PAGE                                                                */
/* ------------------------------------------------------------------ */

export default function EmailTicketsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showProcessFlow, setShowProcessFlow] = useState(false);

  /* ---- Data fetching ---- */
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["email-tickets"],
    queryFn: () => api.get<EmailTicket[]>("/email-tickets"),
  });

  /* ---- Search filter ---- */
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return tickets;
    const q = searchTerm.toLowerCase();
    return tickets.filter(
      (t) =>
        t.subject.toLowerCase().includes(q) ||
        t.from_name.toLowerCase().includes(q),
    );
  }, [tickets, searchTerm]);

  /* ---- Enrich & sort by urgency ---- */
  const enriched = useMemo(() => {
    return filtered
      .map((ticket) => {
        const urgency = computeUrgency(ticket);
        const progress = getProcessProgress(
          ticket.process_id || "respuesta-correos",
          ticket.status,
        );
        const actionLabel = getNextActionLabel(
          ticket.process_id || "respuesta-correos",
          ticket.status,
        );
        const slaText = ticket.sla_deadline
          ? getTimeUntil(ticket.sla_deadline)
          : ticket.sla_24h_deadline
            ? getTimeUntil(ticket.sla_24h_deadline)
            : undefined;

        return { ticket, urgency, progress, actionLabel, slaText };
      })
      .sort((a, b) => {
        const order: Record<UrgencyLevel, number> = {
          urgent: 0,
          warning: 1,
          normal: 2,
        };
        return order[a.urgency] - order[b.urgency];
      });
  }, [filtered]);

  /* ---- Group into urgency sections ---- */
  const closedStatuses = new Set(["closed", "receipt_confirmed"]);

  const urgentItems = enriched.filter(
    (e) => e.urgency === "urgent" && !closedStatuses.has(e.ticket.status),
  );
  const normalItems = enriched.filter(
    (e) => e.urgency !== "urgent" && !closedStatuses.has(e.ticket.status),
  );
  const closedItems = enriched.filter((e) =>
    closedStatuses.has(e.ticket.status),
  );

  /* ---- Compute header stats ---- */
  const totalCount = tickets.length;
  const openCount = tickets.filter(
    (t) => !closedStatuses.has(t.status),
  ).length;
  const slaAtRiskCount = tickets.filter((t) => {
    const u = computeUrgency(t);
    return (u === "urgent" || u === "warning") && !closedStatuses.has(t.status);
  }).length;

  /* ---- Agent counts for status bar ---- */
  const agentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tickets) {
      if (t.assigned_to_name && !closedStatuses.has(t.status)) {
        counts[t.assigned_to_name] = (counts[t.assigned_to_name] || 0) + 1;
      }
    }
    return counts;
  }, [tickets]);

  const agentBarData = [
    {
      name: "Abogado",
      count: Object.entries(agentCounts)
        .filter(([name]) => !name.toLowerCase().includes("jefe"))
        .reduce((sum, [, c]) => sum + c, 0),
      color: "blue",
    },
    {
      name: "Abogado Jefe",
      count: Object.entries(agentCounts)
        .filter(([name]) => name.toLowerCase().includes("jefe"))
        .reduce((sum, [, c]) => sum + c, 0),
      color: "purple",
    },
  ];

  /* ---- Render ---- */
  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* HEADER                                                        */}
      {/* ============================================================ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Correspondencia</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestión de correos entrantes con seguimiento de SLA
          </p>
        </div>

        {/* Stat pills */}
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">
            <Mail className="h-3.5 w-3.5 text-gray-400" />
            Total: {totalCount}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
            <Inbox className="h-3.5 w-3.5" />
            Abiertos: {openCount}
          </span>
          {slaAtRiskCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
              SLA en riesgo: {slaAtRiskCount}
            </span>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* AGENT STATUS BAR                                              */}
      {/* ============================================================ */}
      <AgentStatusBar agents={agentBarData} />

      {/* ============================================================ */}
      {/* PROCESS FLOW TOGGLE                                           */}
      {/* ============================================================ */}
      <div>
        <button
          onClick={() => setShowProcessFlow(!showProcessFlow)}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {showProcessFlow ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
          {showProcessFlow ? "Ocultar Flujo" : "Ver Flujo de Respuesta"}
        </button>
        {showProcessFlow && (
          <div className="mt-3">
            <ProcessFlow process={respuestaCorreosProcess} />
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* SEARCH                                                        */}
      {/* ============================================================ */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por asunto o remitente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* ============================================================ */}
      {/* CONTENT                                                       */}
      {/* ============================================================ */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : enriched.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No hay correspondencia"
          description="No se encontraron correos con los filtros aplicados."
        />
      ) : (
        <div className="space-y-6">
          {/* --- Urgente --- */}
          {urgentItems.length > 0 && (
            <UrgencySection
              title="Urgente"
              urgency="urgent"
              count={urgentItems.length}
              defaultOpen
            >
              {urgentItems.map(({ ticket, urgency, progress, actionLabel, slaText }) => (
                <div key={ticket.id} className="p-2">
                  <ItemCard
                    title={ticket.subject}
                    subtitle={
                      ticket.from_name +
                      (ticket.matter_title ? " \u00B7 " + ticket.matter_title : "")
                    }
                    statusLabel={EMAIL_TICKET_STATUS_LABELS[ticket.status] || ticket.status}
                    statusKey={ticket.status}
                    urgency={urgency}
                    urgencyText={slaText}
                    progress={progress}
                    meta={[
                      { icon: User, label: ticket.assigned_to_name || "Sin asignar" },
                      { icon: Calendar, label: formatDate(ticket.created_at) },
                    ]}
                    actionLabel={actionLabel}
                    actionHref={`/email-tickets/${ticket.id}`}
                    href={`/email-tickets/${ticket.id}`}
                  />
                </div>
              ))}
            </UrgencySection>
          )}

          {/* --- En Proceso --- */}
          {normalItems.length > 0 && (
            <UrgencySection
              title="En Proceso"
              urgency="normal"
              count={normalItems.length}
              defaultOpen
            >
              {normalItems.map(({ ticket, urgency, progress, actionLabel, slaText }) => (
                <div key={ticket.id} className="p-2">
                  <ItemCard
                    title={ticket.subject}
                    subtitle={
                      ticket.from_name +
                      (ticket.matter_title ? " \u00B7 " + ticket.matter_title : "")
                    }
                    statusLabel={EMAIL_TICKET_STATUS_LABELS[ticket.status] || ticket.status}
                    statusKey={ticket.status}
                    urgency={urgency}
                    urgencyText={slaText}
                    progress={progress}
                    meta={[
                      { icon: User, label: ticket.assigned_to_name || "Sin asignar" },
                      { icon: Calendar, label: formatDate(ticket.created_at) },
                    ]}
                    actionLabel={actionLabel}
                    actionHref={`/email-tickets/${ticket.id}`}
                    href={`/email-tickets/${ticket.id}`}
                  />
                </div>
              ))}
            </UrgencySection>
          )}

          {/* --- Resueltos --- */}
          {closedItems.length > 0 && (
            <UrgencySection
              title="Resueltos"
              urgency="normal"
              count={closedItems.length}
              defaultOpen={false}
            >
              {closedItems.map(({ ticket, urgency, progress, actionLabel, slaText }) => (
                <div key={ticket.id} className="p-2">
                  <ItemCard
                    title={ticket.subject}
                    subtitle={
                      ticket.from_name +
                      (ticket.matter_title ? " \u00B7 " + ticket.matter_title : "")
                    }
                    statusLabel={EMAIL_TICKET_STATUS_LABELS[ticket.status] || ticket.status}
                    statusKey={ticket.status}
                    urgency={urgency}
                    urgencyText={slaText}
                    progress={progress}
                    meta={[
                      { icon: User, label: ticket.assigned_to_name || "Sin asignar" },
                      { icon: Calendar, label: formatDate(ticket.created_at) },
                    ]}
                    actionLabel={actionLabel}
                    actionHref={`/email-tickets/${ticket.id}`}
                    href={`/email-tickets/${ticket.id}`}
                  />
                </div>
              ))}
            </UrgencySection>
          )}
        </div>
      )}
    </div>
  );
}
