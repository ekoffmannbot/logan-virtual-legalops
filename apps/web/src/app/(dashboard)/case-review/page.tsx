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
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="h-5 w-5 text-gray-400 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-gray-500 leading-tight" style={{ fontSize: "13px" }}>
          {label}
        </p>
        <p className="font-medium text-gray-900 leading-tight truncate" style={{ fontSize: "14px" }}>
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
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2
                className="font-bold text-gray-900"
                style={{ fontSize: "20px" }}
              >
                {matter.title}
              </h2>

              {/* Chips de tribunal y ROL */}
              <div className="flex flex-wrap gap-2 mt-3">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 text-purple-700 px-3 py-1 font-medium"
                  style={{ fontSize: "13px" }}
                >
                  <Scale className="h-3.5 w-3.5" />
                  {matter.court}
                </span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 text-gray-700 px-3 py-1 font-medium"
                  style={{ fontSize: "13px" }}
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
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-gray-500" style={{ fontSize: "14px" }}>
          Cargando causas pendientes...
        </p>
      </div>
    );
  }

  /* ---- Error ---- */
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertTriangle className="h-10 w-10 text-red-500" />
        <p className="font-medium text-red-600" style={{ fontSize: "14px" }}>
          Error al cargar las causas
        </p>
        <p className="text-gray-500" style={{ fontSize: "13px" }}>
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
        <CheckCircle className="h-10 w-10 text-green-500" />
        <p className="font-semibold text-gray-900" style={{ fontSize: "16px" }}>
          No hay causas pendientes de revision
        </p>
        <p className="text-gray-500" style={{ fontSize: "14px" }}>
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
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <div className="text-center">
            <h2
              className="font-bold text-gray-900"
              style={{ fontSize: "20px" }}
            >
              Revision completada
            </h2>
            <p className="mt-2 text-gray-600" style={{ fontSize: "14px" }}>
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
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 transition-colors"
            style={{ fontSize: "15px" }}
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
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
          <ClipboardCheck className="h-5 w-5 text-purple-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontSize: "24px" }}>
          Revision de Causas
        </h1>
        <span
          className="inline-flex items-center justify-center rounded-full bg-purple-100 text-purple-800 px-2.5 py-0.5 font-semibold"
          style={{ fontSize: "13px" }}
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
