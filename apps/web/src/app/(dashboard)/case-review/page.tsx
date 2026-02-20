"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { SequentialWizard } from "@/components/shared/sequential-wizard";
import { PizzaTracker } from "@/components/shared/pizza-tracker";
import { ApprovePanel } from "@/components/shared/approve-panel";
import { getProcessProgress } from "@/lib/process-status-map";
import {
  ClipboardCheck,
  Loader2,
  AlertTriangle,
  Scale,
  Calendar,
  User,
  CheckCircle,
  FileText,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

interface Matter {
  id: string;
  title: string;
  court: string;
  rol_number: string;
  client_name: string;
  status: string;
  assigned_to: string;
  last_movement_at: string | null;
}

type ReviewStatus = "approved" | "modified" | "rejected";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Formato relativo en espanol. */
function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Sin actividad registrada";

  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMinutes < 1) return "Hace un momento";
  if (diffMinutes < 60) return `Hace ${diffMinutes} minuto${diffMinutes !== 1 ? "s" : ""}`;
  if (diffHours < 24) return `Hace ${diffHours} hora${diffHours !== 1 ? "s" : ""}`;
  if (diffDays < 7) return `Hace ${diffDays} dia${diffDays !== 1 ? "s" : ""}`;
  if (diffWeeks < 5) return `Hace ${diffWeeks} semana${diffWeeks !== 1 ? "s" : ""}`;
  return `Hace ${diffMonths} mes${diffMonths !== 1 ? "es" : ""}`;
}

/** Genera texto de analisis del agente para una causa. */
function generateAnalysis(matter: Matter): string {
  const lastDate = matter.last_movement_at
    ? new Date(matter.last_movement_at).toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "fecha desconocida";

  const daysSince = matter.last_movement_at
    ? Math.floor(
        (Date.now() - new Date(matter.last_movement_at).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  const alertNote =
    daysSince !== null && daysSince > 14
      ? `\n\nAlerta: Han pasado ${daysSince} dias sin movimiento. Se recomienda accion inmediata.`
      : "";

  return (
    `Se reviso el expediente electronico de ${matter.title}. Sin movimientos nuevos desde el ${lastDate}.` +
    `\n\nRecomendacion: Verificar estado en el sistema del Poder Judicial.` +
    alertNote +
    `\n\nTribunal: ${matter.court} | ROL: ${matter.rol_number}` +
    `\nAsignado a: ${matter.assigned_to}`
  );
}

/* ------------------------------------------------------------------ */
/* InfoRow                                                             */
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
      <Icon className="h-5 w-5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
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

/* ------------------------------------------------------------------ */
/* Pagina                                                              */
/* ------------------------------------------------------------------ */

export default function CaseReviewPage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewStatuses, setReviewStatuses] = useState<
    Record<string, ReviewStatus>
  >({});
  const [completed, setCompleted] = useState(false);

  /* ---- Fetch ---- */
  const {
    data: cases = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["case-review", "open-matters"],
    queryFn: () => api.get<Matter[]>("/case-review/open-matters"),
  });

  /* ---- Acciones de revision ---- */
  function handleAction(matterId: string, status: ReviewStatus) {
    setReviewStatuses((prev) => ({ ...prev, [matterId]: status }));

    // Auto-avanzar a la siguiente causa
    setTimeout(() => {
      setCurrentIndex((prev) => {
        if (prev < cases.length - 1) return prev + 1;
        return prev;
      });
    }, 1000);
  }

  /* ---- Finalizar ---- */
  function handleComplete() {
    setCompleted(true);
  }

  /* ---- Resumen ---- */
  const summary = useMemo(() => {
    const values = Object.values(reviewStatuses);
    return {
      approved: values.filter((s) => s === "approved").length,
      modified: values.filter((s) => s === "modified").length,
      rejected: values.filter((s) => s === "rejected").length,
    };
  }, [reviewStatuses]);

  /* ---- PizzaTracker steps ---- */
  const trackerSteps = useMemo(
    () =>
      cases.map((matter, i) => ({
        id: matter.id,
        label: `Causa ${i + 1}`,
        description:
          matter.title.length > 30
            ? matter.title.slice(0, 30) + "..."
            : matter.title,
      })),
    [cases],
  );

  /* ---- Wizard items ---- */
  const wizardItems = useMemo(
    () =>
      cases.map((matter) => ({
        id: matter.id,
        content: (
          <div className="space-y-6">
            {/* Encabezado de la causa */}
            <div
              className="rounded-xl p-6"
              style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: 16 }}
            >
              <h2
                className="font-bold"
                style={{ fontSize: "20px", color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
              >
                {matter.title}
              </h2>

              {/* Chips de tribunal y ROL */}
              <div className="flex flex-wrap gap-2 mt-3">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium"
                  style={{ fontSize: "13px", background: "rgba(168,85,247,0.2)", color: "#c084fc" }}
                >
                  <Scale className="h-3.5 w-3.5" />
                  {matter.court}
                </span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium"
                  style={{ fontSize: "13px", background: "var(--bg-tertiary)", color: "var(--text-muted)" }}
                >
                  <FileText className="h-3.5 w-3.5" />
                  ROL {matter.rol_number}
                </span>
              </div>

              {/* Info rows */}
              <div className="mt-4 grid grid-cols-2 gap-4">
                <InfoRow
                  icon={User}
                  label="Cliente"
                  value={matter.client_name}
                />
                <InfoRow
                  icon={User}
                  label="Abogado"
                  value={matter.assigned_to}
                />
                <InfoRow
                  icon={Calendar}
                  label="Ultima actividad"
                  value={formatRelativeTime(matter.last_movement_at)}
                />
              </div>
            </div>

            {/* Panel de analisis del agente */}
            <ApprovePanel
              agentName="Agente Revisor"
              agentAction={`Reviso expediente de ${matter.title}`}
              content={generateAnalysis(matter)}
              onApprove={() => handleAction(matter.id, "approved")}
              onModify={() => handleAction(matter.id, "modified")}
              onReject={() => handleAction(matter.id, "rejected")}
              status={reviewStatuses[matter.id] || "pending"}
            />
          </div>
        ),
      })),
    [cases, reviewStatuses],
  );

  /* ---- Loading ---- */
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="h-10 w-10 animate-spin" style={{ color: "var(--primary-color)" }} />
        <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>
          Cargando causas pendientes...
        </p>
      </div>
    );
  }

  /* ---- Error ---- */
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle className="h-10 w-10" style={{ color: "var(--danger)" }} />
        <p className="font-medium" style={{ fontSize: "14px", color: "var(--danger)" }}>
          Error al cargar las causas
        </p>
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
          {error instanceof Error
            ? error.message
            : "Intente nuevamente mas tarde."}
        </p>
      </div>
    );
  }

  /* ---- Sin causas ---- */
  if (cases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <CheckCircle className="h-10 w-10" style={{ color: "var(--success)" }} />
        <p className="font-semibold" style={{ fontSize: "16px", color: "var(--text-primary)" }}>
          No hay causas pendientes de revision
        </p>
        <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>
          Todas las causas han sido revisadas o no hay causas abiertas.
        </p>
      </div>
    );
  }

  /* ---- Completado ---- */
  if (completed) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-16 gap-6">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full"
            style={{ background: "rgba(34,197,94,0.2)" }}
          >
            <CheckCircle className="h-10 w-10" style={{ color: "var(--success)" }} />
          </div>
          <div className="text-center">
            <h2
              className="font-bold"
              style={{ fontSize: "20px", color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
            >
              Revision completada
            </h2>
            <p className="mt-2" style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
              {summary.approved} aprobadas, {summary.modified} modificadas,{" "}
              {summary.rejected} rechazadas.
            </p>
          </div>

          {/* Resumen visual */}
          <div className="w-full max-w-md">
            <PizzaTracker
              steps={trackerSteps}
              currentStepIndex={cases.length}
            />
          </div>

          <button
            onClick={() => {
              setCompleted(false);
              setCurrentIndex(0);
              setReviewStatuses({});
            }}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 font-semibold transition-colors"
            style={{ fontSize: "15px", background: "var(--primary-color)", color: "#ffffff" }}
          >
            Revisar nuevamente
          </button>
        </div>
      </div>
    );
  }

  /* ---- Render principal ---- */
  return (
    <div className="space-y-6">
      {/* ============ HEADER ============ */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "rgba(168,85,247,0.2)" }}
        >
          <ClipboardCheck className="h-5 w-5" style={{ color: "#c084fc" }} />
        </div>
        <h1
          className="text-2xl font-bold"
          style={{ fontSize: "24px", color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
        >
          Revision de Causas
        </h1>
        <span
          className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 font-semibold"
          style={{ fontSize: "13px", background: "rgba(168,85,247,0.2)", color: "#c084fc" }}
        >
          {cases.length}
        </span>
      </div>

      {/* PizzaTracker de progreso (solo si hay 10 o menos) */}
      {cases.length <= 10 && (
        <PizzaTracker steps={trackerSteps} currentStepIndex={currentIndex} />
      )}

      {/* Wizard secuencial */}
      <SequentialWizard
        items={wizardItems}
        currentIndex={currentIndex}
        onIndexChange={setCurrentIndex}
        title="Revision de Causas"
        subtitle={`${cases.length} causas pendientes`}
        onComplete={handleComplete}
      />
    </div>
  );
}
