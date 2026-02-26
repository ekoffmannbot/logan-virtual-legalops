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
  getTimeUntil,
  getRelativeTime,
} from "@/lib/process-status-map";
import { EMAIL_TICKET_STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";
import { Mail, Loader2, AlertTriangle, Clock, User } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
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
/* Filtros                                                             */
/* ------------------------------------------------------------------ */

type FilterKey = "todos" | "pendientes" | "sla_riesgo" | "cerrados";

const FILTER_CHIPS: { key: FilterKey; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "pendientes", label: "Pendientes" },
  { key: "sla_riesgo", label: "SLA Riesgo" },
  { key: "cerrados", label: "Cerrados" },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const URGENCY_ICON_STYLES: Record<string, { bg: string; color: string }> = {
  urgent: { bg: "rgba(239,68,68,0.15)", color: "var(--danger)" },
  warning: { bg: "rgba(245,158,11,0.15)", color: "var(--warning)" },
  normal: { bg: "rgba(99,102,241,0.15)", color: "var(--primary-color)" },
};

/** Checks if an SLA deadline is within 6 hours or already passed. */
function isSlaAtRisk(ticket: EmailTicket): boolean {
  const deadline = ticket.sla_24h_deadline || ticket.sla_deadline;
  if (!deadline) return false;
  const hoursLeft =
    (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60);
  return hoursLeft <= 6;
}

/** Pizza Tracker steps for email process. */
const EMAIL_PIZZA_STEPS = [
  { id: "new", label: "Nuevo" },
  { id: "drafting", label: "Redaccion" },
  { id: "waiting_manager_approval", label: "VB Jefe" },
  { id: "sent", label: "Enviado" },
  { id: "receipt_confirmed", label: "Confirmado" },
  { id: "closed", label: "Cerrado" },
];

function getEmailStepIndex(status: string): number {
  const idx = EMAIL_PIZZA_STEPS.findIndex((s) => s.id === status);
  if (idx >= 0) return idx;
  // SLA breached statuses map to their equivalent step
  if (status === "sla_breached_24h") return 1;
  if (status === "sla_breached_48h") return 2;
  return 0;
}

/* ------------------------------------------------------------------ */
/* Pagina                                                              */
/* ------------------------------------------------------------------ */

export default function EmailTicketsPage() {
  const [filter, setFilter] = useState<FilterKey>("todos");
  const { isOpen, drawerTitle, drawerContent, openDrawer, closeDrawer } =
    useDrawer();

  /* ---- Fetch ---- */
  const {
    data: tickets = [],
    isLoading,
    isError,
  } = useQuery<EmailTicket[]>({
    queryKey: ["email-tickets"],
    queryFn: () => api.get("/email-tickets"),
  });

  /* ---- Filtrado ---- */
  const filtered = useMemo(() => {
    switch (filter) {
      case "pendientes":
        return tickets.filter(
          (t) => t.status === "new" || t.status === "drafting",
        );
      case "sla_riesgo":
        return tickets.filter((t) => isSlaAtRisk(t));
      case "cerrados":
        return tickets.filter(
          (t) => t.status === "closed" || t.status === "receipt_confirmed",
        );
      default:
        return tickets;
    }
  }, [tickets, filter]);

  const slaCount = useMemo(
    () => tickets.filter((t) => isSlaAtRisk(t)).length,
    [tickets],
  );

  /* ---- Abrir drawer ---- */
  function handleOpen(ticket: EmailTicket) {
    openDrawer(ticket.subject, <TicketDetail ticket={ticket} />);
  }

  /* ---- Loading ---- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--primary-color)" }} />
      </div>
    );
  }

  /* ---- Error ---- */
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <AlertTriangle className="h-10 w-10" style={{ color: "var(--danger)" }} />
        <p className="font-medium" style={{ fontSize: "16px", color: "var(--text-primary)" }}>
          Error al cargar la correspondencia
        </p>
      </div>
    );
  }

  /* ---- Render ---- */
  return (
    <div className="space-y-5">
      {/* ============ HEADER ============ */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "rgba(99,102,241,0.2)" }}
        >
          <Mail className="h-5 w-5" style={{ color: "var(--primary-color)" }} />
        </div>
        <h1
          className="text-2xl font-bold"
          style={{ fontSize: "24px", color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
        >
          Correspondencia
        </h1>
        <span
          className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 font-semibold"
          style={{ fontSize: "13px", background: "var(--bg-tertiary)", color: "var(--text-muted)" }}
        >
          {tickets.length}
        </span>
      </div>

      {/* ============ FILTER CHIPS ============ */}
      <div className="flex flex-wrap gap-2">
        {FILTER_CHIPS.map((chip) => {
          const active = filter === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => setFilter(chip.key)}
              className="inline-flex items-center rounded-full px-4 py-1.5 font-medium transition-colors"
              style={
                active
                  ? { fontSize: "14px", background: "var(--primary-color)", color: "#ffffff" }
                  : { fontSize: "14px", background: "var(--bg-tertiary)", color: "var(--text-muted)" }
              }
            >
              {chip.label}
              {chip.key === "sla_riesgo" && slaCount > 0 && (
                <span
                  className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 font-semibold"
                  style={
                    active
                      ? { fontSize: "13px", background: "rgba(255,255,255,0.2)", color: "#ffffff" }
                      : { fontSize: "13px", background: "rgba(239,68,68,0.2)", color: "var(--danger)" }
                  }
                >
                  {slaCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============ LISTA / EMPTY ============ */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full mb-4"
            style={{ background: "var(--bg-tertiary)" }}
          >
            <Mail className="h-8 w-8" style={{ color: "var(--text-muted)" }} />
          </div>
          <p className="font-medium" style={{ fontSize: "16px", color: "var(--text-primary)" }}>
            No hay correspondencia
          </p>
          <p className="mt-1" style={{ fontSize: "14px", color: "var(--text-muted)" }}>
            No se encontraron correos con el filtro seleccionado.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((ticket) => {
            const urgency = computeUrgency(ticket);
            const timeText = ticket.sla_24h_deadline
              ? getTimeUntil(ticket.sla_24h_deadline)
              : getRelativeTime(ticket.created_at);

            return (
              <InboxItem
                key={ticket.id}
                id={String(ticket.id)}
                icon={<Mail className="h-5 w-5" />}
                iconBg={URGENCY_ICON_STYLES[urgency]?.bg || "rgba(99,102,241,0.15)"}
                iconColor={URGENCY_ICON_STYLES[urgency]?.color || "var(--primary-color)"}
                title={ticket.subject}
                subtitle={`${ticket.from_name} \u00B7 ${ticket.matter_title || "Sin caso asociado"}`}
                badge={EMAIL_TICKET_STATUS_LABELS[ticket.status] || ticket.status}
                badgeColor="var(--bg-tertiary)"
                timeText={timeText}
                timeUrgent={urgency === "urgent"}
                actionLabel={getNextActionLabel(ticket.process_id, ticket.status)}
                onAction={() => handleOpen(ticket)}
                onCardClick={() => handleOpen(ticket)}
              />
            );
          })}
        </div>
      )}

      {/* ============ DRAWER ============ */}
      <Drawer open={isOpen} onClose={closeDrawer} title={drawerTitle}>
        {drawerContent}
      </Drawer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Drawer content                                                      */
/* ------------------------------------------------------------------ */

function TicketDetail({ ticket }: { ticket: EmailTicket }) {
  const deadline = ticket.sla_24h_deadline || ticket.sla_deadline;
  const hoursLeft = deadline
    ? Math.max(
        0,
        Math.floor(
          (new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60),
        ),
      )
    : null;
  const slaExpired = deadline
    ? new Date(deadline).getTime() < Date.now()
    : false;

  return (
    <div className="space-y-6">
      {/* ---- Informacion del correo ---- */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: 16 }}
      >
        <h3
          className="font-semibold"
          style={{ fontSize: "15px", color: "var(--text-primary)" }}
        >
          Informacion del Correo
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Detail label="Remitente" value={ticket.from_name} />
          <Detail label="Email" value={ticket.from_email} />
          <Detail label="Prioridad" value={ticket.priority || "Normal"} />
          <Detail
            label="Asignado a"
            value={ticket.assigned_to_name || "Sin asignar"}
          />
        </div>
      </div>

      {/* ---- Caso asociado ---- */}
      <div
        className="rounded-xl p-4 space-y-1"
        style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: 16 }}
      >
        <p className="font-medium" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
          Caso Asociado
        </p>
        <p className="font-semibold" style={{ fontSize: "14px", color: "var(--text-primary)" }}>
          {ticket.matter_title || "Sin caso asociado"}
        </p>
      </div>

      {/* ---- Countdown SLA ---- */}
      {deadline && (
        <div
          className="flex items-center gap-3 rounded-xl p-4"
          style={{
            border: slaExpired
              ? "1px solid rgba(239,68,68,0.3)"
              : hoursLeft !== null && hoursLeft <= 6
                ? "1px solid rgba(239,68,68,0.3)"
                : hoursLeft !== null && hoursLeft <= 12
                  ? "1px solid rgba(245,158,11,0.3)"
                  : "1px solid var(--glass-border)",
            background: slaExpired
              ? "rgba(239,68,68,0.1)"
              : hoursLeft !== null && hoursLeft <= 6
                ? "rgba(239,68,68,0.1)"
                : hoursLeft !== null && hoursLeft <= 12
                  ? "rgba(245,158,11,0.1)"
                  : "var(--bg-card)",
          }}
        >
          <Clock
            className="h-5 w-5"
            style={{
              color: slaExpired
                ? "var(--danger)"
                : hoursLeft !== null && hoursLeft <= 6
                  ? "var(--danger)"
                  : hoursLeft !== null && hoursLeft <= 12
                    ? "var(--warning)"
                    : "var(--text-muted)",
            }}
          />
          <div>
            <p
              className="font-semibold"
              style={{
                fontSize: "14px",
                color: slaExpired
                  ? "var(--danger)"
                  : hoursLeft !== null && hoursLeft <= 6
                    ? "var(--danger)"
                    : "var(--text-primary)",
              }}
            >
              {slaExpired
                ? "SLA Vencido"
                : `${hoursLeft}h restantes para cumplir SLA`}
            </p>
            <p className="mt-0.5" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
              Fecha limite:{" "}
              {new Date(deadline).toLocaleString("es-CL", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      )}

      {/* ---- Pizza Tracker ---- */}
      <div className="space-y-2">
        <h3
          className="font-semibold"
          style={{ fontSize: "15px", color: "var(--text-primary)" }}
        >
          Progreso
        </h3>
        <PizzaTracker
          steps={EMAIL_PIZZA_STEPS}
          currentStepIndex={getEmailStepIndex(ticket.status)}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Componente auxiliar                                                  */
/* ------------------------------------------------------------------ */

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        className="font-medium uppercase tracking-wide"
        style={{ fontSize: "13px", color: "var(--text-muted)" }}
      >
        {label}
      </p>
      <p className="mt-0.5" style={{ fontSize: "14px", color: "var(--text-primary)" }}>
        {value}
      </p>
    </div>
  );
}
