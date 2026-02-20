"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { InboxItem } from "@/components/shared/inbox-item";
import { Drawer, useDrawer } from "@/components/layout/drawer";
import { PizzaTracker } from "@/components/shared/pizza-tracker";
import { getProcessProgress } from "@/lib/process-status-map";
import { MATTER_TYPE_LABELS } from "@/lib/constants";
import { causasJPLProcess } from "@/lib/process-definitions";
import { Briefcase, Loader2, AlertCircle, Calendar, Scale } from "lucide-react";
import { formatDate } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* TIPOS                                                               */
/* ------------------------------------------------------------------ */

interface Matter {
  id: number;
  title: string;
  type: string;
  status: string;
  client_name: string;
  assigned_to_name: string;
  court: string | null;
  rol: string | null;
  created_at: string;
  next_hearing_date: string | null;
  last_movement_at: string | null;
  process_id: string;
}

/* ------------------------------------------------------------------ */
/* HELPERS                                                             */
/* ------------------------------------------------------------------ */

const TYPE_FILTERS = ["Todos", "Civiles", "JPL", "Otros"] as const;

const TYPE_BADGE_COLORS: Record<string, string> = {
  civil: "bg-blue-100 text-blue-800",
  jpl: "bg-purple-100 text-purple-800",
  other: "bg-gray-100 text-gray-700",
};

function getTypeLabel(type: string): string {
  return MATTER_TYPE_LABELS[type] || "Otro";
}

function matchesFilter(type: string, filter: string): boolean {
  if (filter === "Todos") return true;
  if (filter === "Civiles") return type === "civil";
  if (filter === "JPL") return type === "jpl";
  if (filter === "Otros") return type !== "civil" && type !== "jpl";
  return true;
}

function formatDateSpanish(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("es-CL", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getRelativeTimeSpanish(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 0) return `hace ${diffDays} dia${diffDays > 1 ? "s" : ""}`;
  if (diffHours > 0) return `hace ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
  if (diffMins > 0) return `hace ${diffMins} min`;
  return "ahora";
}

function getTimeUntilSpanish(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    const overdueDays = Math.abs(diffDays);
    if (overdueDays > 0) return `Vencido hace ${overdueDays} dia${overdueDays > 1 ? "s" : ""}`;
    return `Vencido hace ${Math.abs(diffHours)}h`;
  }

  if (diffDays > 0) return `en ${diffDays} dia${diffDays > 1 ? "s" : ""}`;
  if (diffHours > 0) return `en ${diffHours}h`;
  return "hoy";
}

function getHearingTimeText(m: Matter): string | undefined {
  if (m.next_hearing_date) {
    return `Audiencia ${getTimeUntilSpanish(m.next_hearing_date)}`;
  }
  if (m.last_movement_at) {
    return getRelativeTimeSpanish(m.last_movement_at);
  }
  return undefined;
}

function isHearingUrgent(m: Matter): boolean {
  if (!m.next_hearing_date) return false;
  const date = new Date(m.next_hearing_date);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays < 3;
}

/**
 * Construye los pasos para el PizzaTracker.
 */
function buildPizzaSteps(processId: string, status: string) {
  const process = causasJPLProcess;
  const taskSteps = process.steps.filter(
    (s) => s.type !== "start" && s.type !== "end" && s.type !== "decision"
  );

  const progress = getProcessProgress(
    processId || "causas-jpl",
    status
  );

  const allSteps = process.steps;
  const currentStepId = allSteps[progress.current]?.id || allSteps[0]?.id;

  let currentIndex = taskSteps.findIndex((s) => s.id === currentStepId);
  if (currentIndex === -1) {
    const currentAllIndex = allSteps.findIndex((s) => s.id === currentStepId);
    for (let i = currentAllIndex; i >= 0; i--) {
      const idx = taskSteps.findIndex((s) => s.id === allSteps[i].id);
      if (idx !== -1) {
        currentIndex = idx;
        break;
      }
    }
    if (currentIndex === -1) currentIndex = 0;
  }

  const steps = taskSteps.map((s) => ({
    id: s.id,
    label: s.label,
    description: s.description,
  }));

  return { steps, currentIndex, progress };
}

/* ------------------------------------------------------------------ */
/* PAGINA                                                              */
/* ------------------------------------------------------------------ */

export default function MattersPage() {
  const [activeFilter, setActiveFilter] = useState<string>("Todos");

  const { data, isLoading, isError } = useQuery<{ items: Matter[]; total: number }>({
    queryKey: ["matters"],
    queryFn: () => api.get("/matters"),
  });
  const matters = data?.items ?? [];

  const { isOpen, drawerTitle, drawerContent, openDrawer, closeDrawer } =
    useDrawer();

  /* Filtrar por tipo */
  const filtered = useMemo(() => {
    return matters.filter((m) => matchesFilter(m.type, activeFilter));
  }, [matters, activeFilter]);

  /* Abrir drawer con detalle del caso */
  function handleOpenDetail(m: Matter) {
    const { steps, currentIndex, progress } = buildPizzaSteps(
      m.process_id,
      m.status
    );

    openDrawer(
      m.title,
      <div className="space-y-6">
        {/* Tribunal y ROL */}
        {(m.court || m.rol) && (
          <div className="flex items-center gap-3 flex-wrap">
            {m.court && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium"
                style={{ fontSize: "13px", background: "var(--bg-tertiary)", color: "var(--text-muted)" }}
              >
                <Scale className="h-3.5 w-3.5" />
                {m.court}
              </span>
            )}
            {m.rol && (
              <span
                className="inline-flex items-center rounded-full px-3 py-1 font-medium"
                style={{ fontSize: "13px", background: "var(--bg-tertiary)", color: "var(--text-muted)" }}
              >
                ROL: {m.rol}
              </span>
            )}
          </div>
        )}

        {/* Progreso visual */}
        <div>
          <p style={{ fontSize: "14px", color: "var(--text-primary)" }} className="font-semibold mb-1">
            Progreso del caso
          </p>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }} className="mb-4">
            Paso {currentIndex + 1} de {steps.length}: {progress.stepLabel}
          </p>
          <PizzaTracker steps={steps} currentStepIndex={currentIndex} />
        </div>

        {/* Detalles */}
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: 16 }}
        >
          <h3 style={{ fontSize: "15px", color: "var(--text-primary)" }} className="font-semibold">
            Detalles del caso
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Detail label="Cliente" value={m.client_name} />
            <Detail label="Tipo" value={getTypeLabel(m.type)} />
            <Detail label="Abogado asignado" value={m.assigned_to_name || "-"} />
            <Detail label="Tribunal" value={m.court || "-"} />
            <Detail label="Proxima audiencia" value={m.next_hearing_date ? formatDateSpanish(m.next_hearing_date) : "Sin agendar"} />
            <Detail label="Creado" value={formatDateSpanish(m.created_at)} />
          </div>
        </div>

        {/* Documentos stub */}
        <div
          className="rounded-xl p-4 space-y-2"
          style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: 16 }}
        >
          <h3 style={{ fontSize: "15px", color: "var(--text-primary)" }} className="font-semibold">
            Documentos
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            Los documentos asociados a este caso se mostraran aqui.
          </p>
        </div>
      </div>
    );
  }

  /* ---- Estados de carga / error ---- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--primary-color)" }} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <AlertCircle className="h-8 w-8" style={{ color: "var(--danger)" }} />
        <p style={{ fontSize: "14px", color: "var(--danger)" }}>Error al cargar casos</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---- HEADER ---- */}
      <div className="flex items-center gap-3">
        <Briefcase className="h-6 w-6" style={{ color: "var(--text-primary)" }} />
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
        >
          Casos Activos
        </h1>
        <span
          className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 font-semibold"
          style={{ fontSize: "13px", background: "var(--bg-tertiary)", color: "var(--text-muted)" }}
        >
          {matters.length}
        </span>
      </div>

      {/* ---- FILTER CHIPS ---- */}
      <div className="flex flex-wrap gap-2">
        {TYPE_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            className="inline-flex items-center rounded-full px-4 py-1.5 font-medium transition-colors"
            style={
              activeFilter === filter
                ? { fontSize: "14px", background: "var(--primary-color)", color: "#ffffff" }
                : { fontSize: "14px", background: "var(--bg-tertiary)", color: "var(--text-muted)" }
            }
          >
            {filter}
          </button>
        ))}
      </div>

      {/* ---- LISTA ---- */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <Briefcase className="h-10 w-10" style={{ color: "var(--text-muted)" }} />
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>No hay casos con este filtro</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <InboxItem
              key={m.id}
              id={String(m.id)}
              icon={<Briefcase className="h-5 w-5" />}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
              title={m.title}
              subtitle={`${m.client_name} · ${m.court || "Sin tribunal"}`}
              badge={getTypeLabel(m.type)}
              badgeColor={TYPE_BADGE_COLORS[m.type] || "bg-gray-100 text-gray-700"}
              timeText={getHearingTimeText(m)}
              timeUrgent={isHearingUrgent(m)}
              actionLabel="Ver Caso"
              onAction={() => handleOpenDetail(m)}
              onCardClick={() => handleOpenDetail(m)}
            />
          ))}
        </div>
      )}

      {/* ---- DRAWER ---- */}
      <Drawer open={isOpen} onClose={closeDrawer} title={drawerTitle}>
        {drawerContent}
      </Drawer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* COMPONENTE AUXILIAR                                                  */
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
