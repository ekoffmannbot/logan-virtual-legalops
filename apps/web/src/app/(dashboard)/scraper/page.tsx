"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { InboxItem } from "@/components/shared/inbox-item";
import { Drawer, useDrawer } from "@/components/layout/drawer";
import { PizzaTracker } from "@/components/shared/pizza-tracker";
import { getProcessProgress } from "@/lib/process-status-map";
import { legalbotScraperProcess } from "@/lib/process-definitions";
import { Search, Loader2, AlertCircle, Play, CheckCircle } from "lucide-react";

/* ------------------------------------------------------------------ */
/* TIPOS                                                               */
/* ------------------------------------------------------------------ */

interface ScraperJob {
  id: number;
  name: string;
  status: string;
  query: string;
  court: string;
  results_count: number;
  created_at: string;
  completed_at: string | null;
}

/* ------------------------------------------------------------------ */
/* HELPERS                                                             */
/* ------------------------------------------------------------------ */

const JOB_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  running: "En Ejecucion",
  processing: "Procesando",
  completed: "Completado",
  failed: "Error",
};

const STATUS_BADGE_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-700",
  running: "bg-blue-100 text-blue-800",
  processing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

function getIconBg(status: string): string {
  if (status === "running" || status === "processing") return "bg-blue-100";
  if (status === "completed") return "bg-green-100";
  if (status === "failed") return "bg-red-100";
  return "bg-gray-100";
}

function getIconColor(status: string): string {
  if (status === "running" || status === "processing") return "text-blue-600";
  if (status === "completed") return "text-green-600";
  if (status === "failed") return "text-red-600";
  return "text-gray-500";
}

function getActionLabel(status: string): string {
  if (status === "completed") return "Ver Resultados";
  if (status === "running" || status === "processing") return "En Proceso";
  if (status === "failed") return "Ver Error";
  return "Ver Detalle";
}

function isActionDisabled(status: string): boolean {
  return status === "running" || status === "processing";
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

/**
 * Construye los pasos para el PizzaTracker.
 */
function buildPizzaSteps(status: string) {
  const process = legalbotScraperProcess;
  const taskSteps = process.steps.filter(
    (s) => s.type !== "start" && s.type !== "end" && s.type !== "decision"
  );

  const progress = getProcessProgress("legalbot-scraper", status);

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

export default function ScraperPage() {
  const { data: jobs = [], isLoading, isError } = useQuery({
    queryKey: ["scraper", "jobs"],
    queryFn: () => api.get<ScraperJob[]>("/scraper/jobs"),
  });

  const { isOpen, drawerTitle, drawerContent, openDrawer, closeDrawer } =
    useDrawer();

  /* Abrir drawer con detalle del trabajo */
  function handleOpenDetail(job: ScraperJob) {
    const { steps, currentIndex, progress } = buildPizzaSteps(job.status);
    const statusLabel = JOB_STATUS_LABELS[job.status] || job.status;

    openDrawer(
      job.name,
      <div className="space-y-6">
        {/* Progreso visual */}
        <div>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }} className="font-semibold mb-1">
            Progreso de la busqueda
          </p>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }} className="mb-4">
            Paso {currentIndex + 1} de {steps.length}: {progress.stepLabel}
          </p>
          <PizzaTracker steps={steps} currentStepIndex={currentIndex} />
        </div>

        {/* Detalles del trabajo */}
        <div
          className="rounded-xl p-4 space-y-3"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--glass-border)",
            borderRadius: 16,
          }}
        >
          <h3
            style={{ fontSize: "15px", color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
            className="font-semibold"
          >
            Detalles de la busqueda
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Detail label="Consulta" value={job.query} />
            <Detail label="Tribunal" value={job.court} />
            <Detail label="Estado" value={statusLabel} />
            <Detail label="Resultados" value={String(job.results_count)} />
            <Detail label="Creado" value={formatDateSpanish(job.created_at)} />
            <Detail label="Completado" value={formatDateSpanish(job.completed_at)} />
          </div>
        </div>

        {/* Lista de resultados stub */}
        {job.status === "completed" && job.results_count > 0 && (
          <div
            className="rounded-xl p-4 space-y-2"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--glass-border)",
              borderRadius: 16,
            }}
          >
            <h3
              style={{ fontSize: "15px", color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
              className="font-semibold"
            >
              Resultados encontrados
            </h3>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold"
                style={{ fontSize: "13px", background: "rgba(34,197,94,0.2)", color: "var(--success)" }}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                {job.results_count} causas encontradas
              </span>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-muted)" }} className="mt-2">
              Las causas encontradas se pueden derivar al proceso de Causas JPL para contactar a los clientes potenciales.
            </p>
          </div>
        )}

        {/* Estado en ejecucion */}
        {(job.status === "running" || job.status === "processing") && (
          <div
            className="rounded-xl p-4"
            style={{
              background: "rgba(99,102,241,0.15)",
              border: "2px solid rgba(99,102,241,0.3)",
              borderRadius: 16,
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--primary-color)" }} />
              <p style={{ fontSize: "14px", color: "var(--primary-color)" }} className="font-semibold">
                Busqueda en progreso
              </p>
            </div>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              El bot esta ejecutando la busqueda automatizada. Los resultados se actualizaran automaticamente.
            </p>
            <div className="mt-3 h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(99,102,241,0.2)" }}>
              <div className="h-full w-2/3 rounded-full animate-pulse" style={{ background: "var(--primary-color)" }} />
            </div>
          </div>
        )}
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
      <div className="flex flex-col items-center justify-center py-20 gap-2" style={{ color: "var(--danger)" }}>
        <AlertCircle className="h-8 w-8" />
        <p style={{ fontSize: "14px" }}>Error al cargar busquedas</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---- HEADER ---- */}
      <div className="flex items-center gap-3">
        <Search className="h-6 w-6" style={{ color: "var(--text-secondary)" }} />
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
        >
          Busqueda de Causas
        </h1>
        <span
          className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 font-semibold"
          style={{ fontSize: "13px", background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
        >
          {jobs.length}
        </span>
      </div>

      {/* ---- LISTA ---- */}
      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2" style={{ color: "var(--text-muted)" }}>
          <Search className="h-10 w-10" />
          <p style={{ fontSize: "14px" }}>No hay busquedas registradas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <InboxItem
              key={job.id}
              id={String(job.id)}
              icon={<Search className="h-5 w-5" />}
              iconBg={getIconBg(job.status)}
              iconColor={getIconColor(job.status)}
              title={job.name}
              subtitle={`${job.query} · ${job.court}`}
              badge={JOB_STATUS_LABELS[job.status] || job.status}
              badgeColor={STATUS_BADGE_COLORS[job.status] || "bg-gray-100 text-gray-700"}
              timeText={getRelativeTimeSpanish(job.created_at)}
              actionLabel={getActionLabel(job.status)}
              onAction={() => {
                if (!isActionDisabled(job.status)) {
                  handleOpenDetail(job);
                }
              }}
              onCardClick={() => handleOpenDetail(job)}
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
