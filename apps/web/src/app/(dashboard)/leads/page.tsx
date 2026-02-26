"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Plus } from "lucide-react";
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

const URGENCY_ICON_STYLES: Record<string, { bg: string; color: string }> = {
  urgent: { bg: "rgba(239,68,68,0.15)", color: "var(--danger)" },
  warning: { bg: "rgba(245,158,11,0.15)", color: "var(--warning)" },
  normal: { bg: "rgba(99,102,241,0.15)", color: "var(--primary-color)" },
};

/* ------------------------------------------------------------------ */
/* Badge color por status                                              */
/* ------------------------------------------------------------------ */

const BADGE_STYLES_BY_STATUS: Record<string, { bg: string; color: string }> = {
  new: { bg: "rgba(99,102,241,0.15)", color: "var(--primary-color)" },
  contacted: { bg: "rgba(245,158,11,0.15)", color: "var(--warning)" },
  meeting_scheduled: { bg: "rgba(34,197,94,0.15)", color: "var(--success)" },
  proposal_sent: { bg: "rgba(168,85,247,0.15)", color: "#a855f7" },
  won: { bg: "rgba(34,197,94,0.15)", color: "var(--success)" },
  lost: { bg: "rgba(239,68,68,0.15)", color: "var(--danger)" },
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
      <div className="flex items-center justify-between">
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
        <button
          type="button"
          onClick={() => openDrawer("Nuevo Lead", <CreateLeadForm onSuccess={closeDrawer} />)}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{ background: "var(--primary-color)" }}
        >
          <Plus className="h-4 w-4" />
          Nuevo Lead
        </button>
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
                iconBg={URGENCY_ICON_STYLES[urgency]?.bg || "rgba(99,102,241,0.15)"}
                iconColor={URGENCY_ICON_STYLES[urgency]?.color || "var(--primary-color)"}
                title={lead.full_name}
                subtitle={subtitle}
                badge={LEAD_STATUS_LABELS[lead.status] || lead.status}
                badgeColor={BADGE_STYLES_BY_STATUS[lead.status]?.bg || "var(--bg-tertiary)"}
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
/* Create Lead Form                                                     */
/* ------------------------------------------------------------------ */

const SOURCE_OPTIONS = [
  { value: "inbound_call", label: "Llamada" },
  { value: "walk_in", label: "Visita" },
  { value: "referral", label: "Referido" },
  { value: "scraper_legalbot", label: "LegalBOT" },
  { value: "other", label: "Otro" },
];

function CreateLeadForm({ onSuccess }: { onSuccess: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    source: "inbound_call",
    notes: "",
  });

  const mutation = useMutation({
    mutationFn: (body: typeof form) => api.post("/leads", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      onSuccess();
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) return;
    mutation.mutate(form);
  }

  const inputStyle = {
    background: "var(--bg-tertiary)",
    color: "var(--text-primary)",
    border: "1px solid var(--glass-border)",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>
          Nombre completo *
        </label>
        <input
          type="text"
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
          style={inputStyle}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>
            Email
          </label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>
            Telefono
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
            style={inputStyle}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>
          Fuente
        </label>
        <select
          value={form.source}
          onChange={(e) => setForm({ ...form, source: e.target.value })}
          className="w-full rounded-xl px-4 py-2.5 text-sm outline-none"
          style={inputStyle}
        >
          {SOURCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-muted)" }}>
          Notas
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={3}
          className="w-full rounded-xl px-4 py-2.5 text-sm outline-none resize-y"
          style={inputStyle}
        />
      </div>
      <button
        type="submit"
        disabled={mutation.isPending || !form.full_name.trim()}
        className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
        style={{ background: "var(--primary-color)" }}
      >
        {mutation.isPending ? "Creando..." : "Crear Lead"}
      </button>
      {mutation.isError && (
        <p className="text-xs text-center" style={{ color: "var(--danger)" }}>
          Error al crear el lead. Intente nuevamente.
        </p>
      )}
    </form>
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
