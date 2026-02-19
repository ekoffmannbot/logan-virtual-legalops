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

const URGENCY_ICON_BG: Record<string, string> = {
  urgent: "bg-red-100",
  warning: "bg-yellow-100",
  normal: "bg-blue-100",
};

const URGENCY_ICON_COLOR: Record<string, string> = {
  urgent: "text-red-600",
  warning: "text-yellow-600",
  normal: "text-blue-600",
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
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  /* ---- Error ---- */
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <AlertTriangle className="h-10 w-10 text-red-500" />
        <p className="font-medium text-gray-800" style={{ fontSize: "16px" }}>
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
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
          <Mail className="h-5 w-5 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontSize: "24px" }}>
          Correspondencia
        </h1>
        <span
          className="inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-700 px-2.5 py-0.5 font-semibold"
          style={{ fontSize: "13px" }}
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
              className={[
                "inline-flex items-center rounded-full px-4 py-1.5 font-medium transition-colors",
                active
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200",
              ].join(" ")}
              style={{ fontSize: "14px" }}
            >
              {chip.label}
              {chip.key === "sla_riesgo" && slaCount > 0 && (
                <span
                  className={[
                    "ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 font-semibold",
                    active
                      ? "bg-white/20 text-white"
                      : "bg-red-100 text-red-700",
                  ].join(" ")}
                  style={{ fontSize: "13px" }}
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
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
            <Mail className="h-8 w-8 text-gray-400" />
          </div>
          <p className="font-medium text-gray-700" style={{ fontSize: "16px" }}>
            No hay correspondencia
          </p>
          <p className="text-gray-500 mt-1" style={{ fontSize: "14px" }}>
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
                iconBg={URGENCY_ICON_BG[urgency] || "bg-blue-100"}
                iconColor={URGENCY_ICON_COLOR[urgency] || "text-blue-600"}
                title={ticket.subject}
                subtitle={`${ticket.from_name} \u00B7 ${ticket.matter_title || "Sin caso asociado"}`}
                badge={EMAIL_TICKET_STATUS_LABELS[ticket.status] || ticket.status}
                badgeColor={STATUS_COLORS[ticket.status] || "bg-gray-100 text-gray-700"}
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
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
        <h3
          className="font-semibold text-gray-800"
          style={{ fontSize: "15px" }}
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
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-1">
        <p className="font-medium text-gray-500" style={{ fontSize: "13px" }}>
          Caso Asociado
        </p>
        <p className="font-semibold text-gray-900" style={{ fontSize: "14px" }}>
          {ticket.matter_title || "Sin caso asociado"}
        </p>
      </div>

      {/* ---- Countdown SLA ---- */}
      {deadline && (
        <div
          className={[
            "flex items-center gap-3 rounded-xl border p-4",
            slaExpired
              ? "border-red-200 bg-red-50"
              : hoursLeft !== null && hoursLeft <= 6
                ? "border-red-200 bg-red-50"
                : hoursLeft !== null && hoursLeft <= 12
                  ? "border-yellow-200 bg-yellow-50"
                  : "border-gray-200 bg-gray-50",
          ].join(" ")}
        >
          <Clock
            className={[
              "h-5 w-5",
              slaExpired
                ? "text-red-600"
                : hoursLeft !== null && hoursLeft <= 6
                  ? "text-red-600"
                  : hoursLeft !== null && hoursLeft <= 12
                    ? "text-yellow-600"
                    : "text-gray-500",
            ].join(" ")}
          />
          <div>
            <p
              className={[
                "font-semibold",
                slaExpired
                  ? "text-red-700"
                  : hoursLeft !== null && hoursLeft <= 6
                    ? "text-red-700"
                    : "text-gray-700",
              ].join(" ")}
              style={{ fontSize: "14px" }}
            >
              {slaExpired
                ? "SLA Vencido"
                : `${hoursLeft}h restantes para cumplir SLA`}
            </p>
            <p className="text-gray-500 mt-0.5" style={{ fontSize: "13px" }}>
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
          className="font-semibold text-gray-800"
          style={{ fontSize: "15px" }}
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
        className="font-medium text-gray-500 uppercase tracking-wide"
        style={{ fontSize: "13px" }}
      >
        {label}
      </p>
      <p className="text-gray-900 mt-0.5" style={{ fontSize: "14px" }}>
        {value}
      </p>
    </div>
  );
}
