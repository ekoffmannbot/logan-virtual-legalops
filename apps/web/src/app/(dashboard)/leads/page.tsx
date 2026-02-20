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
import { LEAD_STATUS_LABELS, LEAD_SOURCE_LABELS } from "@/lib/constants";
import { UserPlus, Loader2, AlertTriangle, Phone, Mail, Building, Calendar, User } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

interface Lead {
  id: number;
  full_name: string;
  email?: string;
  phone?: string;
  company?: string;
  source: string;
  status: string;
  notes?: string;
  assigned_to_name?: string;
  created_at: string;
  process_id: string;
}

/* ------------------------------------------------------------------ */
/* Filtros                                                             */
/* ------------------------------------------------------------------ */

type FilterKey = "todos" | "nuevos" | "contactados" | "con_propuesta";

const FILTER_CHIPS: { key: FilterKey; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "nuevos", label: "Nuevos" },
  { key: "contactados", label: "Contactados" },
  { key: "con_propuesta", label: "Con Propuesta" },
];

/* ------------------------------------------------------------------ */
/* Urgencia a colores                                                  */
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

/* ------------------------------------------------------------------ */
/* Badge color por status                                              */
/* ------------------------------------------------------------------ */

const BADGE_COLOR_BY_STATUS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  meeting_scheduled: "bg-green-100 text-green-700",
  proposal_sent: "bg-purple-100 text-purple-700",
  won: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
};

/* ------------------------------------------------------------------ */
/* Pizza Tracker steps                                                 */
/* ------------------------------------------------------------------ */

const LEAD_PIZZA_STEPS = [
  { id: "new", label: "Nuevo" },
  { id: "contacted", label: "Contactado" },
  { id: "meeting_scheduled", label: "Reunion" },
  { id: "proposal_sent", label: "Propuesta" },
  { id: "won", label: "Ganado" },
];

function getLeadStepIndex(status: string): number {
  const idx = LEAD_PIZZA_STEPS.findIndex((s) => s.id === status);
  return idx >= 0 ? idx : 0;
}

/* ------------------------------------------------------------------ */
/* Pagina                                                              */
/* ------------------------------------------------------------------ */

export default function LeadsPage() {
  const [filter, setFilter] = useState<FilterKey>("todos");
  const { isOpen, drawerTitle, drawerContent, openDrawer, closeDrawer } =
    useDrawer();

  /* ---- Fetch ---- */
  const { data, isLoading, error } = useQuery<{ items: Lead[]; total: number }>(
    {
      queryKey: ["leads"],
      queryFn: () => api.get("/leads"),
    },
  );

  const leads = data?.items ?? [];

  /* ---- Filtrado ---- */
  const filtered = useMemo(() => {
    switch (filter) {
      case "nuevos":
        return leads.filter((l) => l.status === "new");
      case "contactados":
        return leads.filter((l) => l.status === "contacted");
      case "con_propuesta":
        return leads.filter((l) => l.status === "proposal_sent");
      default:
        return leads;
    }
  }, [leads, filter]);

  /* ---- Abrir drawer ---- */
  function handleOpen(lead: Lead) {
    const progress = getProcessProgress(lead.process_id, lead.status);

    openDrawer(lead.full_name, <LeadDetail lead={lead} progress={progress} />);
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
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <AlertTriangle className="h-10 w-10" style={{ color: "var(--danger)" }} />
        <p className="font-medium" style={{ fontSize: "16px", color: "var(--text-primary)" }}>
          Error al cargar los leads
        </p>
        <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>
          No se pudo obtener la informacion. Intente nuevamente.
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
          <UserPlus className="h-5 w-5" style={{ color: "var(--primary-color)" }} />
        </div>
        <h1
          className="text-2xl font-bold"
          style={{ fontSize: "24px", color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
        >
          Recepcion de Clientes
        </h1>
        <span
          className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 font-semibold"
          style={{ fontSize: "13px", background: "rgba(99,102,241,0.2)", color: "var(--primary-color)" }}
        >
          {leads.length}
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
              className="rounded-full px-4 py-1.5 font-medium transition-colors"
              style={{
                fontSize: "14px",
                background: active ? "var(--primary-color)" : "var(--bg-tertiary)",
                color: active ? "#ffffff" : "var(--text-secondary)",
                border: active ? "none" : "1px solid var(--glass-border)",
              }}
            >
              {chip.label}
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
            <UserPlus className="h-8 w-8" style={{ color: "var(--text-muted)" }} />
          </div>
          <p className="font-medium" style={{ fontSize: "16px", color: "var(--text-primary)" }}>
            No hay leads pendientes
          </p>
          <p className="mt-1" style={{ fontSize: "14px", color: "var(--text-muted)" }}>
            {filter !== "todos"
              ? "No hay leads con este filtro."
              : "Cuando lleguen nuevos prospectos apareceran aqui."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((lead) => {
            const urgency = computeUrgency(lead);
            const sourceLabel = LEAD_SOURCE_LABELS[lead.source] || lead.source;
            const subtitle = lead.company
              ? `${lead.company} \u00B7 ${sourceLabel}`
              : sourceLabel;

            return (
              <InboxItem
                key={lead.id}
                id={String(lead.id)}
                icon={<UserPlus className="h-5 w-5" />}
                iconBg={URGENCY_ICON_BG[urgency] || "bg-blue-100"}
                iconColor={URGENCY_ICON_COLOR[urgency] || "text-blue-600"}
                title={lead.full_name}
                subtitle={subtitle}
                badge={LEAD_STATUS_LABELS[lead.status] || lead.status}
                badgeColor={BADGE_COLOR_BY_STATUS[lead.status] || "bg-gray-100 text-gray-700"}
                timeText={getRelativeTime(lead.created_at)}
                timeUrgent={urgency === "urgent"}
                actionLabel={getNextActionLabel(lead.process_id, lead.status)}
                onAction={() => handleOpen(lead)}
                onCardClick={() => handleOpen(lead)}
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

function LeadDetail({
  lead,
  progress,
}: {
  lead: Lead;
  progress: ReturnType<typeof getProcessProgress>;
}) {
  return (
    <div className="space-y-6">
      {/* ---- Datos del contacto ---- */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: 16 }}
      >
        <h3 className="font-semibold" style={{ fontSize: "15px", color: "var(--text-primary)" }}>
          Datos del Contacto
        </h3>

        <InfoRow icon={User} label="Nombre" value={lead.full_name} />

        {lead.company && (
          <InfoRow icon={Building} label="Empresa" value={lead.company} />
        )}

        {lead.email && (
          <InfoRow icon={Mail} label="Email" value={lead.email} />
        )}

        {lead.phone && (
          <InfoRow icon={Phone} label="Telefono" value={lead.phone} />
        )}
      </div>

      {/* ---- Origen y asignacion ---- */}
      <div
        className="rounded-xl p-4 space-y-3"
        style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: 16 }}
      >
        <h3 className="font-semibold" style={{ fontSize: "15px", color: "var(--text-primary)" }}>
          Informacion del Lead
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <Detail label="Fuente" value={LEAD_SOURCE_LABELS[lead.source] || lead.source} />
          <Detail label="Estado" value={LEAD_STATUS_LABELS[lead.status] || lead.status} />
          <Detail
            label="Asignado a"
            value={lead.assigned_to_name || "Sin asignar"}
          />
          <Detail label="Creado" value={getRelativeTime(lead.created_at)} />
        </div>
      </div>

      {/* ---- Notas ---- */}
      {lead.notes && (
        <div
          className="rounded-xl p-4 space-y-2"
          style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: 16 }}
        >
          <h3 className="font-semibold" style={{ fontSize: "15px", color: "var(--text-primary)" }}>
            Notas
          </h3>
          <p
            className="leading-relaxed whitespace-pre-wrap"
            style={{ fontSize: "14px", color: "var(--text-secondary)" }}
          >
            {lead.notes}
          </p>
        </div>
      )}

      {/* ---- Pizza Tracker ---- */}
      <div className="space-y-2">
        <h3 className="font-semibold" style={{ fontSize: "15px", color: "var(--text-primary)" }}>
          Progreso
        </h3>
        <PizzaTracker
          steps={LEAD_PIZZA_STEPS}
          currentStepIndex={getLeadStepIndex(lead.status)}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Componentes auxiliares                                               */
/* ------------------------------------------------------------------ */

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4 shrink-0" style={{ color: "var(--text-muted)" }} />
      <div className="min-w-0">
        <p className="leading-tight" style={{ fontSize: "13px", color: "var(--text-muted)" }}>
          {label}
        </p>
        <p className="font-medium leading-tight truncate" style={{ fontSize: "14px", color: "var(--text-primary)" }}>
          {value}
        </p>
      </div>
    </div>
  );
}

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
