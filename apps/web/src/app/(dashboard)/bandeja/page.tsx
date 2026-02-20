"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { InboxItem } from "@/components/shared/inbox-item";
import { Drawer, useDrawer } from "@/components/layout/drawer";
import { PizzaTracker } from "@/components/shared/pizza-tracker";
import {
  getProcessProgress,
  getNextActionLabel,
  computeUrgency,
  getRelativeTime,
} from "@/lib/process-status-map";
import { ENTITY_PROCESS_MAP } from "@/lib/process-status-map";
import {
  LEAD_STATUS_LABELS,
  PROPOSAL_STATUS_LABELS,
  CONTRACT_STATUS_LABELS,
  EMAIL_TICKET_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  NOTARY_STATUS_LABELS,
  STATUS_COLORS,
} from "@/lib/constants";
import {
  Inbox,
  Mail,
  FileText,
  UserPlus,
  Briefcase,
  DollarSign,
  Stamp,
  ClipboardCheck,
  Loader2,
  AlertTriangle,
  Filter,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* TYPES                                                               */
/* ------------------------------------------------------------------ */

interface UnifiedItem {
  id: string;
  type: string; // "lead" | "email_ticket" | "contract" etc
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  timeText: string;
  timeUrgent: boolean;
  actionLabel: string;
  urgencyOrder: number; // 0=urgent, 1=warning, 2=normal
  processId: string;
  status: string;
  rawEntity: any;
}

/* ------------------------------------------------------------------ */
/* FILTER CHIPS                                                        */
/* ------------------------------------------------------------------ */

type FilterKey = "todos" | "urgente" | "correos" | "casos" | "cobranza";

const FILTER_CHIPS: { key: FilterKey; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "urgente", label: "Urgente" },
  { key: "correos", label: "Correos" },
  { key: "casos", label: "Casos" },
  { key: "cobranza", label: "Cobranza" },
];

/* ------------------------------------------------------------------ */
/* HELPERS: Entity mappers                                             */
/* ------------------------------------------------------------------ */

const URGENCY_ORDER: Record<string, number> = {
  urgent: 0,
  warning: 1,
  normal: 2,
};

function mapLeads(items: any[]): UnifiedItem[] {
  return items.map((lead) => {
    const urgency = computeUrgency(lead);
    const processId = lead.process_id || ENTITY_PROCESS_MAP.lead || "recepcion-visita";
    const statusLabel = LEAD_STATUS_LABELS[lead.status] || lead.status;
    return {
      id: `lead-${lead.id}`,
      type: "lead",
      title: lead.full_name || "Lead sin nombre",
      subtitle: lead.subject || lead.source || "Nuevo prospecto",
      badge: statusLabel,
      badgeColor: STATUS_COLORS[lead.status] || "bg-gray-100 text-gray-800",
      icon: <UserPlus className="h-5 w-5" />,
      iconBg: urgency === "urgent" ? "bg-red-100" : "bg-blue-100",
      iconColor: urgency === "urgent" ? "text-red-600" : "text-blue-600",
      timeText: getRelativeTime(lead.created_at),
      timeUrgent: urgency === "urgent",
      actionLabel: getNextActionLabel(processId, lead.status),
      urgencyOrder: URGENCY_ORDER[urgency],
      processId,
      status: lead.status,
      rawEntity: lead,
    };
  });
}

function mapEmailTickets(items: any[]): UnifiedItem[] {
  return items.map((ticket) => {
    const urgency = computeUrgency(ticket);
    const processId = ticket.process_id || ENTITY_PROCESS_MAP.email_ticket || "respuesta-correos";
    const statusLabel = EMAIL_TICKET_STATUS_LABELS[ticket.status] || ticket.status;
    return {
      id: `email-${ticket.id}`,
      type: "email_ticket",
      title: ticket.subject || "Sin asunto",
      subtitle: ticket.from_name || ticket.from_email || "Remitente desconocido",
      badge: statusLabel,
      badgeColor: STATUS_COLORS[ticket.status] || "bg-gray-100 text-gray-800",
      icon: <Mail className="h-5 w-5" />,
      iconBg: urgency === "urgent" ? "bg-red-100" : "bg-yellow-100",
      iconColor: urgency === "urgent" ? "text-red-600" : "text-yellow-600",
      timeText: getRelativeTime(ticket.created_at),
      timeUrgent: urgency === "urgent",
      actionLabel: getNextActionLabel(processId, ticket.status),
      urgencyOrder: URGENCY_ORDER[urgency],
      processId,
      status: ticket.status,
      rawEntity: ticket,
    };
  });
}

function mapContracts(items: any[]): UnifiedItem[] {
  return items.map((contract) => {
    const urgency = computeUrgency(contract);
    const processId = contract.process_id || ENTITY_PROCESS_MAP.contract || "contrato-mandato";
    const statusLabel = CONTRACT_STATUS_LABELS[contract.status] || contract.status;
    return {
      id: `contract-${contract.id}`,
      type: "contract",
      title: contract.title || `Contrato ${contract.id}`,
      subtitle: contract.client_name || "Cliente",
      badge: statusLabel,
      badgeColor: STATUS_COLORS[contract.status] || "bg-gray-100 text-gray-800",
      icon: <FileText className="h-5 w-5" />,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      timeText: getRelativeTime(contract.created_at || contract.updated_at),
      timeUrgent: urgency === "urgent",
      actionLabel: getNextActionLabel(processId, contract.status),
      urgencyOrder: URGENCY_ORDER[urgency],
      processId,
      status: contract.status,
      rawEntity: contract,
    };
  });
}

function mapProposals(items: any[]): UnifiedItem[] {
  return items.map((proposal) => {
    const urgency = computeUrgency(proposal);
    const processId = proposal.process_id || ENTITY_PROCESS_MAP.proposal || "seguimiento-propuestas";
    const statusLabel = PROPOSAL_STATUS_LABELS[proposal.status] || proposal.status;
    return {
      id: `proposal-${proposal.id}`,
      type: "proposal",
      title: proposal.title || `Propuesta ${proposal.id}`,
      subtitle: proposal.client_name || proposal.lead_name || "Cliente",
      badge: statusLabel,
      badgeColor: STATUS_COLORS[proposal.status] || "bg-gray-100 text-gray-800",
      icon: <FileText className="h-5 w-5" />,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      timeText: getRelativeTime(proposal.created_at || proposal.updated_at),
      timeUrgent: urgency === "urgent",
      actionLabel: getNextActionLabel(processId, proposal.status),
      urgencyOrder: URGENCY_ORDER[urgency],
      processId,
      status: proposal.status,
      rawEntity: proposal,
    };
  });
}

function mapInvoices(items: any[]): UnifiedItem[] {
  return items.map((invoice) => {
    const urgency = computeUrgency(invoice);
    const processId = invoice.process_id || ENTITY_PROCESS_MAP.collection || "proceso-cobranza";
    const statusLabel = INVOICE_STATUS_LABELS[invoice.status] || invoice.status;
    return {
      id: `invoice-${invoice.id}`,
      type: "collection",
      title: `${invoice.client_name || "Cliente"} \u00B7 ${invoice.invoice_number || invoice.id}`,
      subtitle: invoice.amount != null
        ? `$${invoice.amount.toLocaleString("es-CL")}`
        : "Monto por confirmar",
      badge: statusLabel,
      badgeColor: STATUS_COLORS[invoice.status] || "bg-gray-100 text-gray-800",
      icon: <DollarSign className="h-5 w-5" />,
      iconBg: urgency === "urgent" ? "bg-red-100" : "bg-yellow-100",
      iconColor: urgency === "urgent" ? "text-red-600" : "text-yellow-600",
      timeText: invoice.due_date ? getRelativeTime(invoice.due_date) : "",
      timeUrgent: urgency === "urgent",
      actionLabel: getNextActionLabel(processId, invoice.status),
      urgencyOrder: URGENCY_ORDER[urgency],
      processId,
      status: invoice.status,
      rawEntity: invoice,
    };
  });
}

function mapNotary(items: any[]): UnifiedItem[] {
  return items.map((doc) => {
    const urgency = computeUrgency(doc);
    const processId = doc.process_id || ENTITY_PROCESS_MAP.notary || "documentos-notariales";
    const statusLabel = NOTARY_STATUS_LABELS[doc.status] || doc.status;
    return {
      id: `notary-${doc.id}`,
      type: "notary",
      title: doc.title || `Documento Notarial ${doc.id}`,
      subtitle: doc.client_name || doc.notary_name || "Notar\u00eda",
      badge: statusLabel,
      badgeColor: STATUS_COLORS[doc.status] || "bg-gray-100 text-gray-800",
      icon: <Stamp className="h-5 w-5" />,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      timeText: getRelativeTime(doc.created_at || doc.updated_at),
      timeUrgent: urgency === "urgent",
      actionLabel: getNextActionLabel(processId, doc.status),
      urgencyOrder: URGENCY_ORDER[urgency],
      processId,
      status: doc.status,
      rawEntity: doc,
    };
  });
}

/* ------------------------------------------------------------------ */
/* PIZZA TRACKER builder for the drawer                                */
/* ------------------------------------------------------------------ */

function buildTrackerForItem(item: UnifiedItem) {
  const progress = getProcessProgress(item.processId, item.status);

  // Build simplified pizza steps from progress
  const steps = [
    { id: "start", label: "Inicio" },
    { id: "current", label: progress.stepLabel || "Paso actual" },
    { id: "end", label: "Finalizado" },
  ];

  // Map progress to a 3-step index
  let currentIndex = 1; // default to "current"
  if (progress.percentage >= 100) currentIndex = 2;
  if (progress.percentage === 0) currentIndex = 0;

  return { steps, currentIndex, progress };
}

/* ------------------------------------------------------------------ */
/* TYPE LABELS for Spanish display                                     */
/* ------------------------------------------------------------------ */

const TYPE_LABELS: Record<string, string> = {
  lead: "Lead",
  email_ticket: "Correo",
  contract: "Contrato",
  proposal: "Propuesta",
  collection: "Cobranza",
  notary: "Notarial",
};

/* ------------------------------------------------------------------ */
/* PAGE                                                                */
/* ------------------------------------------------------------------ */

export default function BandejaPage() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("todos");
  const { isOpen, drawerTitle, drawerContent, openDrawer, closeDrawer } =
    useDrawer();

  /* ---- Parallel data fetching ---- */
  const { data: leadsData, isLoading: loadingLeads } = useQuery<{
    items: any[];
  }>({
    queryKey: ["bandeja", "leads"],
    queryFn: () => api.get("/leads"),
  });

  const { data: emailsData, isLoading: loadingEmails } = useQuery<any[]>({
    queryKey: ["bandeja", "email-tickets"],
    queryFn: () => api.get("/email-tickets"),
  });

  const { data: contractsData, isLoading: loadingContracts } = useQuery<
    any[]
  >({
    queryKey: ["bandeja", "contracts"],
    queryFn: () => api.get("/contracts"),
  });

  const { data: proposalsData, isLoading: loadingProposals } = useQuery<{
    items: any[];
  }>({
    queryKey: ["bandeja", "proposals"],
    queryFn: () => api.get("/proposals"),
  });

  const { data: invoicesData, isLoading: loadingInvoices } = useQuery<any[]>({
    queryKey: ["bandeja", "invoices"],
    queryFn: () => api.get("/collections/invoices"),
  });

  const { data: notaryData, isLoading: loadingNotary } = useQuery<any[]>({
    queryKey: ["bandeja", "notary"],
    queryFn: () => api.get("/notary"),
  });

  const isLoading =
    loadingLeads ||
    loadingEmails ||
    loadingContracts ||
    loadingProposals ||
    loadingInvoices ||
    loadingNotary;

  const hasError = false; // Individual errors are handled gracefully

  /* ---- Merge all items into unified list ---- */
  const allItems = useMemo<UnifiedItem[]>(() => {
    const items: UnifiedItem[] = [];

    const leads = leadsData?.items ?? [];
    const emails = Array.isArray(emailsData) ? emailsData : [];
    const contracts = Array.isArray(contractsData) ? contractsData : [];
    const proposals = proposalsData?.items ?? [];
    const invoices = Array.isArray(invoicesData) ? invoicesData : [];
    const notary = Array.isArray(notaryData) ? notaryData : [];

    items.push(...mapLeads(leads));
    items.push(...mapEmailTickets(emails));
    items.push(...mapContracts(contracts));
    items.push(...mapProposals(proposals));
    items.push(...mapInvoices(invoices));
    items.push(...mapNotary(notary));

    // Sort by urgency (urgent first), then by time
    items.sort((a, b) => {
      if (a.urgencyOrder !== b.urgencyOrder) {
        return a.urgencyOrder - b.urgencyOrder;
      }
      return 0; // keep original order within same urgency
    });

    return items;
  }, [
    leadsData,
    emailsData,
    contractsData,
    proposalsData,
    invoicesData,
    notaryData,
  ]);

  /* ---- Apply filter ---- */
  const filteredItems = useMemo(() => {
    switch (activeFilter) {
      case "urgente":
        return allItems.filter((item) => item.urgencyOrder === 0);
      case "correos":
        return allItems.filter((item) => item.type === "email_ticket");
      case "casos":
        return allItems.filter(
          (item) =>
            item.type === "lead" ||
            item.type === "contract" ||
            item.type === "proposal"
        );
      case "cobranza":
        return allItems.filter((item) => item.type === "collection");
      default:
        return allItems;
    }
  }, [allItems, activeFilter]);

  /* ---- Counts ---- */
  const urgentCount = allItems.filter((i) => i.urgencyOrder === 0).length;

  /* ---- Open detail drawer ---- */
  function handleItemClick(item: UnifiedItem) {
    const { steps, currentIndex, progress } = buildTrackerForItem(item);
    const typeLabel = TYPE_LABELS[item.type] || item.type;

    openDrawer(
      item.title,
      <div className="space-y-6">
        {/* Type and status */}
        <div className="flex flex-wrap gap-2">
          <span
            className="inline-flex items-center rounded-full px-3 py-1 font-medium"
            style={{ fontSize: "13px", background: "var(--bg-tertiary)", color: "var(--text-primary)", border: "1px solid var(--glass-border)" }}
          >
            {typeLabel}
          </span>
          <span
            className={[
              "inline-flex items-center rounded-full px-3 py-1 font-medium",
              item.badgeColor,
            ].join(" ")}
            style={{ fontSize: "13px" }}
          >
            {item.badge}
          </span>
          {item.timeUrgent && (
            <span
              className="inline-flex items-center rounded-full px-3 py-1 font-medium"
              style={{ fontSize: "13px", background: "rgba(239,68,68,0.2)", color: "var(--danger)" }}
            >
              Urgente
            </span>
          )}
        </div>

        {/* Summary card */}
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: 16 }}
        >
          <h3
            className="font-semibold"
            style={{ fontSize: "15px", color: "var(--text-primary)" }}
          >
            Resumen
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="T\u00edtulo" value={item.title} />
            <DetailField label="Subtitulo" value={item.subtitle} />
            <DetailField label="Tipo" value={typeLabel} />
            <DetailField label="Estado" value={item.badge} />
            {item.timeText && (
              <DetailField label="Tiempo" value={item.timeText} />
            )}
            <DetailField label="Proceso" value={progress.processName || item.processId} />
          </div>
        </div>

        {/* Pizza Tracker */}
        <div className="space-y-2">
          <h3
            className="font-semibold"
            style={{ fontSize: "15px", color: "var(--text-primary)" }}
          >
            Progreso del Proceso
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            {progress.stepLabel}
            {progress.agentName && ` \u00B7 ${progress.agentName}`}
          </p>
          <PizzaTracker steps={steps} currentStepIndex={currentIndex} />
        </div>

        {/* Agent info if available */}
        {progress.agentName && (
          <div
            className="flex items-center gap-3 rounded-xl p-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)" }}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ background: "rgba(99,102,241,0.2)" }}
            >
              <ClipboardCheck className="h-5 w-5" style={{ color: "var(--primary-color)" }} />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="font-medium"
                style={{ fontSize: "13px", color: "var(--text-muted)" }}
              >
                Agente Responsable
              </p>
              <p
                className="font-semibold"
                style={{ fontSize: "14px", color: "var(--text-primary)" }}
              >
                {progress.agentName}
              </p>
            </div>
          </div>
        )}

        {/* Next action */}
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}
        >
          <p className="font-semibold" style={{ fontSize: "14px", color: "var(--primary-color)" }}>
            Pr\u00f3xima acci\u00f3n: {item.actionLabel}
          </p>
        </div>
      </div>
    );
  }

  /* ---- Loading ---- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--primary-color)" }} />
      </div>
    );
  }

  /* ---- Render ---- */
  return (
    <div className="space-y-5">
      {/* ============================================================ */}
      {/* HEADER                                                        */}
      {/* ============================================================ */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "rgba(99,102,241,0.2)" }}
        >
          <Inbox className="h-5 w-5" style={{ color: "var(--primary-color)" }} />
        </div>
        <h1
          className="text-2xl font-bold"
          style={{ fontSize: "24px", color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
        >
          Mis Cosas
        </h1>
        <span
          className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 font-semibold"
          style={{ fontSize: "13px", background: "rgba(99,102,241,0.2)", color: "var(--primary-color)" }}
        >
          {allItems.length}
        </span>
      </div>

      {/* ============================================================ */}
      {/* FILTER CHIPS                                                  */}
      {/* ============================================================ */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTER_CHIPS.map((chip) => {
          const isActive = activeFilter === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => setActiveFilter(chip.key)}
              className="inline-flex items-center rounded-full px-4 py-1.5 font-medium transition-colors"
              style={{
                fontSize: "14px",
                background: isActive ? "var(--primary-color)" : "var(--bg-tertiary)",
                color: isActive ? "#ffffff" : "var(--text-secondary)",
                border: isActive ? "none" : "1px solid var(--glass-border)",
              }}
            >
              {chip.label}
              {chip.key === "urgente" && urgentCount > 0 && (
                <span
                  className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 font-semibold"
                  style={{
                    fontSize: "11px",
                    background: isActive
                      ? "rgba(255,255,255,0.2)"
                      : "rgba(239,68,68,0.2)",
                    color: isActive ? "#ffffff" : "var(--danger)",
                  }}
                >
                  {urgentCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* LIST / EMPTY STATE                                            */}
      {/* ============================================================ */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full mb-4"
            style={{ background: "rgba(34,197,94,0.15)" }}
          >
            <Inbox className="h-8 w-8" style={{ color: "var(--success)" }} />
          </div>
          <p
            className="font-medium"
            style={{ fontSize: "16px", color: "var(--text-primary)" }}
          >
            Todo al d\u00eda. No hay pendientes.
          </p>
          <p className="mt-1" style={{ fontSize: "14px", color: "var(--text-muted)" }}>
            {activeFilter !== "todos"
              ? "No hay elementos con este filtro."
              : "No tienes pendientes en este momento."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredItems.map((item) => (
            <InboxItem
              key={item.id}
              id={item.id}
              icon={item.icon}
              iconBg={item.iconBg}
              iconColor={item.iconColor}
              title={item.title}
              subtitle={item.subtitle}
              badge={item.badge}
              badgeColor={item.badgeColor}
              timeText={item.timeText}
              timeUrgent={item.timeUrgent}
              actionLabel={item.actionLabel}
              onAction={() => handleItemClick(item)}
              onCardClick={() => handleItemClick(item)}
            />
          ))}
        </div>
      )}

      {/* ============================================================ */}
      {/* DRAWER                                                        */}
      {/* ============================================================ */}
      <Drawer open={isOpen} onClose={closeDrawer} title={drawerTitle}>
        {drawerContent}
      </Drawer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* HELPER: Detail field for drawer                                      */
/* ------------------------------------------------------------------ */

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        className="font-medium uppercase tracking-wide"
        style={{ fontSize: "12px", color: "var(--text-muted)" }}
      >
        {label}
      </p>
      <p className="mt-0.5" style={{ fontSize: "14px", color: "var(--text-primary)" }}>
        {value}
      </p>
    </div>
  );
}
