"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import {
  MATTER_STATUS_LABELS,
  MATTER_TYPE_LABELS,
} from "@/lib/constants";
import { ALL_PROCESSES } from "@/lib/process-definitions";
import {
  getProcessProgress,
  getAgentSuggestions,
  getNextActionLabel,
  getTimeUntil,
  getRelativeTime,
} from "@/lib/process-status-map";
import { WizardDetail } from "@/components/shared/wizard-detail";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface MatterTask {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  assigned_to_name: string | null;
}

interface MatterDocument {
  id: string;
  filename: string;
  doc_type: string | null;
  uploaded_at: string;
}

interface TimelineEvent {
  id: string;
  title: string;
  description: string | null;
  timestamp: string;
  type: string;
  actor: string | null;
}

interface MatterDetail {
  id: string;
  title: string;
  type: string;
  status: string;
  client_name: string;
  assigned_to_name: string | null;
  court: string | null;
  rol: string | null;
  created_at: string;
  next_hearing_date: string | null;
  last_movement_at: string | null;
  process_id: string;
  tasks: MatterTask[];
  documents: MatterDocument[];
  timeline: TimelineEvent[];
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const TASK_STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  done: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const TASK_STATUS_LABELS: Record<string, string> = {
  open: "Abierta",
  in_progress: "En Progreso",
  done: "Completada",
  cancelled: "Cancelada",
};

/* ------------------------------------------------------------------ */
/* Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function MatterDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const matterId = params.id as string;

  // ---- Fetch ----
  const { data: matter, isLoading, error } = useQuery({
    queryKey: ["matter", matterId],
    queryFn: () => api.get<MatterDetail>(`/matters/${matterId}`),
  });

  // ---- Mutation: status transitions ----
  const transitionMutation = useMutation({
    mutationFn: (action: string) =>
      api.patch(`/matters/${matterId}`, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matter", matterId] });
      queryClient.invalidateQueries({ queryKey: ["matters"] });
    },
  });

  // ---- Loading ----
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ---- Error / not found ----
  if (error || !matter) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <p className="text-lg font-medium">Caso no encontrado</p>
        <p className="text-sm text-muted-foreground mt-1">
          No se pudo cargar el caso solicitado.
        </p>
      </div>
    );
  }

  // ---- Process progress ----
  const processId = matter.process_id || "revision-causas";
  const progress = getProcessProgress(processId, matter.status);
  const processDef = ALL_PROCESSES["matters"] || ALL_PROCESSES["case-review"];
  const suggestions = getAgentSuggestions(processId, matter.status, matter);
  const nextAction = getNextActionLabel(processId, matter.status);

  // ---- Derived data ----
  const nextHearingText = matter.next_hearing_date
    ? getTimeUntil(matter.next_hearing_date)
    : null;
  const lastMovementText = matter.last_movement_at
    ? getRelativeTime(matter.last_movement_at)
    : null;

  // ---- Info items ----
  const infoItems: Array<{ label: string; value: string | React.ReactNode }> = [
    { label: "Cliente", value: matter.client_name },
    ...(matter.court
      ? [{ label: "Tribunal", value: matter.court }]
      : []),
    ...(matter.rol
      ? [{ label: "ROL", value: matter.rol }]
      : []),
    {
      label: "Tipo",
      value: MATTER_TYPE_LABELS[matter.type] || matter.type,
    },
    ...(matter.next_hearing_date
      ? [
          {
            label: "Proxima Audiencia",
            value: (
              <span>
                {formatDate(matter.next_hearing_date)}{" "}
                <span
                  className={cn(
                    "text-xs font-semibold",
                    nextHearingText?.startsWith("Vencido")
                      ? "text-red-600"
                      : "text-green-700"
                  )}
                >
                  ({nextHearingText})
                </span>
              </span>
            ),
          },
        ]
      : []),
    ...(lastMovementText
      ? [
          {
            label: "Ultimo Movimiento",
            value: lastMovementText,
          },
        ]
      : []),
    ...(matter.assigned_to_name
      ? [{ label: "Asignado a", value: matter.assigned_to_name }]
      : []),
    { label: "Creado", value: formatDate(matter.created_at) },
  ];

  // ---- Timeline node ----
  const timelineNode =
    matter.timeline && matter.timeline.length > 0 ? (
      <div className="space-y-3">
        {matter.timeline.map((event) => (
          <div
            key={event.id}
            className="flex gap-3 text-sm"
          >
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "h-2.5 w-2.5 rounded-full mt-1.5",
                  event.type === "status_change"
                    ? "bg-blue-500"
                    : event.type === "communication"
                    ? "bg-green-500"
                    : event.type === "task"
                    ? "bg-yellow-500"
                    : "bg-gray-400"
                )}
              />
              <div className="w-px flex-1 bg-gray-200" />
            </div>
            <div className="pb-4">
              <p className="font-medium text-gray-900">{event.title}</p>
              {event.description && (
                <p className="text-gray-500 mt-0.5">{event.description}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {formatDate(event.timestamp)}
                {event.actor && ` · ${event.actor}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    ) : undefined;

  return (
    <WizardDetail
      backHref="/matters"
      backLabel="Volver a Casos"
      title={matter.title}
      statusLabel={MATTER_STATUS_LABELS[matter.status] || matter.status}
      statusKey={matter.status}
      progress={progress}
      processDefinition={processDef}
      agentSuggestions={suggestions}
      actionLabel={nextAction}
      onAction={() => transitionMutation.mutate(matter.status)}
      actionLoading={transitionMutation.isPending}
      infoItems={infoItems}
      timeline={timelineNode}
    >
      {/* ---- Tareas ---- */}
      {matter.tasks && matter.tasks.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            Tareas
          </h3>
          <div className="space-y-2">
            {matter.tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                    {task.assigned_to_name && (
                      <span>{task.assigned_to_name}</span>
                    )}
                    {task.due_date && (
                      <>
                        {task.assigned_to_name && <span>·</span>}
                        <span>Vence: {formatDate(task.due_date)}</span>
                      </>
                    )}
                  </div>
                </div>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    TASK_STATUS_STYLES[task.status] || "bg-gray-100 text-gray-800"
                  )}
                >
                  {TASK_STATUS_LABELS[task.status] || task.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- Documentos ---- */}
      {matter.documents && matter.documents.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            Documentos
          </h3>
          <div className="space-y-2">
            {matter.documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {doc.filename}
                  </p>
                  <p className="text-xs text-gray-500">
                    {doc.doc_type || "Documento"} · {formatDate(doc.uploaded_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </WizardDetail>
  );
}
