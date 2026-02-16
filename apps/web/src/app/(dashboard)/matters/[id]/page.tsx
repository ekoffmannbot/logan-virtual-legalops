"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { cn, formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import {
  MATTER_STATUS_LABELS,
  MATTER_TYPE_LABELS,
  TASK_STATUS_LABELS,
  DEADLINE_SEVERITY_LABELS,
} from "@/lib/constants";
import { StatusBadge } from "@/components/shared/status-badge";
import { Timeline } from "@/components/shared/timeline";
import { WorkflowActions } from "@/components/shared/workflow-actions";
import { EmptyState } from "@/components/shared/empty-state";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Briefcase,
  User,
  Calendar,
  Clock,
  FileText,
  CheckSquare,
  MessageSquare,
  FolderOpen,
  CalendarClock,
  ClipboardList,
  LayoutDashboard,
} from "lucide-react";

interface MatterDetail {
  id: number;
  title: string;
  description?: string;
  client_id: number;
  client_name: string;
  matter_type: string;
  status: string;
  assigned_lawyer_name?: string;
  rit?: string;
  court?: string;
  created_at: string;
  updated_at: string;
  deadlines: Array<{
    id: number;
    title: string;
    due_date: string;
    severity: string;
    completed: boolean;
  }>;
  gestiones: Array<{
    id: number;
    title: string;
    gestion_type: string;
    date: string;
    result?: string;
  }>;
  documents: Array<{
    id: number;
    filename: string;
    doc_type?: string;
    uploaded_at: string;
  }>;
  tasks: Array<{
    id: number;
    title: string;
    status: string;
    due_date?: string;
    assigned_to_name?: string;
  }>;
  communications: Array<{
    id: number;
    channel: string;
    subject?: string;
    snippet?: string;
    sent_at: string;
    direction: string;
  }>;
  timeline: Array<{
    id: number;
    title: string;
    description?: string;
    timestamp: string;
    type?: "status_change" | "communication" | "task" | "audit" | "note";
    actor?: string;
  }>;
}

type TabKey = "summary" | "deadlines" | "gestiones" | "documents" | "tasks" | "communications";

const TABS: Array<{ key: TabKey; label: string; icon: React.ElementType }> = [
  { key: "summary", label: "Resumen", icon: LayoutDashboard },
  { key: "deadlines", label: "Plazos", icon: CalendarClock },
  { key: "gestiones", label: "Gestiones", icon: ClipboardList },
  { key: "documents", label: "Documentos", icon: FolderOpen },
  { key: "tasks", label: "Tareas", icon: CheckSquare },
  { key: "communications", label: "Comunicaciones", icon: MessageSquare },
];

function getWorkflowActions(status: string) {
  const actions: Array<{
    label: string;
    action: string;
    variant?: "default" | "primary" | "destructive";
  }> = [];

  switch (status) {
    case "open":
      actions.push({ label: "Cerrar Caso", action: "closed", variant: "default" });
      actions.push({ label: "Suspender por Impago", action: "suspended_nonpayment", variant: "destructive" });
      break;
    case "suspended_nonpayment":
      actions.push({ label: "Reabrir Caso", action: "open", variant: "primary" });
      actions.push({ label: "Terminar Caso", action: "terminated", variant: "destructive" });
      break;
    case "closed":
      actions.push({ label: "Reabrir Caso", action: "open", variant: "primary" });
      break;
    default:
      break;
  }

  return actions;
}

export default function MatterDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const matterId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabKey>("summary");

  const { data: matter, isLoading, error } = useQuery<MatterDetail>({
    queryKey: ["matter", matterId],
    queryFn: () => api.get(`/matters/${matterId}`),
  });

  const transitionMutation = useMutation({
    mutationFn: (action: string) =>
      api.post(`/matters/${matterId}/transition`, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matter", matterId] });
      queryClient.invalidateQueries({ queryKey: ["matters"] });
    },
  });

  const handleAction = (action: string) => {
    transitionMutation.mutate(action);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !matter) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <p className="text-lg font-medium">Error al cargar el caso</p>
        <p className="text-sm text-muted-foreground mt-1">
          No se encontro el caso solicitado.
        </p>
        <button
          onClick={() => router.push("/matters")}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Casos
        </button>
      </div>
    );
  }

  const workflowActions = getWorkflowActions(matter.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/matters")}
          className="rounded-lg border p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{matter.title}</h1>
            <StatusBadge
              status={matter.status}
              label={MATTER_STATUS_LABELS[matter.status] || matter.status}
            />
          </div>
          <p className="text-muted-foreground">
            {MATTER_TYPE_LABELS[matter.matter_type] || matter.matter_type} · {matter.client_name}
            {matter.rit && ` · RIT ${matter.rit}`}
          </p>
        </div>
      </div>

      {/* Workflow Actions */}
      {workflowActions.length > 0 && (
        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm font-medium text-muted-foreground mb-3">Acciones disponibles</p>
          <WorkflowActions actions={workflowActions} onAction={handleAction} />
          {transitionMutation.isPending && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Procesando...
            </div>
          )}
          {transitionMutation.isError && (
            <p className="mt-2 text-sm text-destructive">
              Error al realizar la accion. Intente nuevamente.
            </p>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-lg border bg-white p-1 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                activeTab === tab.key
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab: Resumen */}
      {activeTab === "summary" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1 space-y-6">
            {/* Matter Info */}
            <div className="rounded-xl border bg-white p-6">
              <h3 className="text-base font-semibold mb-4">Informacion del Caso</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p
                      className="text-sm font-medium text-primary cursor-pointer hover:underline"
                      onClick={() => router.push(`/clients/${matter.client_id}`)}
                    >
                      {matter.client_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Briefcase className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo</p>
                    <p className="text-sm">{MATTER_TYPE_LABELS[matter.matter_type] || matter.matter_type}</p>
                  </div>
                </div>
                {matter.assigned_lawyer_name && (
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Abogado asignado</p>
                      <p className="text-sm">{matter.assigned_lawyer_name}</p>
                    </div>
                  </div>
                )}
                {matter.rit && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">RIT</p>
                      <p className="text-sm">{matter.rit}</p>
                    </div>
                  </div>
                )}
                {matter.court && (
                  <div className="flex items-start gap-3">
                    <Briefcase className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Tribunal</p>
                      <p className="text-sm">{matter.court}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Creado</p>
                    <p className="text-sm">{formatDate(matter.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Ultima actualizacion</p>
                    <p className="text-sm">{formatDateTime(matter.updated_at)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            {matter.description && (
              <div className="rounded-xl border bg-white p-6">
                <h3 className="text-base font-semibold mb-3">Descripcion</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {matter.description}
                </p>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border bg-white p-6">
              <h3 className="text-base font-semibold mb-4">Historial</h3>
              <Timeline events={matter.timeline || []} />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Plazos */}
      {activeTab === "deadlines" && (
        <div className="rounded-xl border bg-white">
          {(!matter.deadlines || matter.deadlines.length === 0) ? (
            <EmptyState
              icon={CalendarClock}
              title="Sin plazos"
              description="No hay plazos registrados para este caso."
            />
          ) : (
            <div className="divide-y">
              {matter.deadlines.map((deadline) => (
                <div
                  key={deadline.id}
                  className={cn(
                    "flex items-center justify-between p-4",
                    deadline.completed && "opacity-60"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {deadline.completed && (
                        <CheckSquare className="h-4 w-4 text-green-500 flex-shrink-0" />
                      )}
                      <p className={cn(
                        "text-sm font-medium truncate",
                        deadline.completed && "line-through"
                      )}>
                        {deadline.title}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Vence: {formatDate(deadline.due_date)}
                    </p>
                  </div>
                  <StatusBadge
                    status={deadline.severity}
                    label={DEADLINE_SEVERITY_LABELS[deadline.severity] || deadline.severity}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Gestiones */}
      {activeTab === "gestiones" && (
        <div className="rounded-xl border bg-white">
          {(!matter.gestiones || matter.gestiones.length === 0) ? (
            <EmptyState
              icon={ClipboardList}
              title="Sin gestiones"
              description="No hay gestiones registradas para este caso."
            />
          ) : (
            <div className="divide-y">
              {matter.gestiones.map((gestion) => (
                <div key={gestion.id} className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">{gestion.title}</p>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(gestion.date)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground capitalize">{gestion.gestion_type}</p>
                  {gestion.result && (
                    <p className="mt-2 text-sm text-muted-foreground">{gestion.result}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Documentos */}
      {activeTab === "documents" && (
        <div className="rounded-xl border bg-white">
          {(!matter.documents || matter.documents.length === 0) ? (
            <EmptyState
              icon={FolderOpen}
              title="Sin documentos"
              description="No hay documentos asociados a este caso."
            />
          ) : (
            <div className="divide-y">
              {matter.documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-3 p-4">
                  <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.doc_type || "Documento"} · {formatDate(doc.uploaded_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Tareas */}
      {activeTab === "tasks" && (
        <div className="rounded-xl border bg-white">
          {(!matter.tasks || matter.tasks.length === 0) ? (
            <EmptyState
              icon={CheckSquare}
              title="Sin tareas"
              description="No hay tareas asignadas a este caso."
            />
          ) : (
            <div className="divide-y">
              {matter.tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      {task.assigned_to_name && <span>{task.assigned_to_name}</span>}
                      {task.due_date && (
                        <>
                          {task.assigned_to_name && <span>·</span>}
                          <span>Vence: {formatDate(task.due_date)}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <StatusBadge
                    status={task.status}
                    label={TASK_STATUS_LABELS[task.status] || task.status}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Comunicaciones */}
      {activeTab === "communications" && (
        <div className="rounded-xl border bg-white">
          {(!matter.communications || matter.communications.length === 0) ? (
            <EmptyState
              icon={MessageSquare}
              title="Sin comunicaciones"
              description="No hay comunicaciones registradas para este caso."
            />
          ) : (
            <div className="divide-y">
              {matter.communications.map((comm) => (
                <div key={comm.id} className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                        comm.direction === "inbound"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                      )}>
                        {comm.direction === "inbound" ? "Recibido" : "Enviado"}
                      </span>
                      <span className="text-xs text-muted-foreground capitalize">{comm.channel}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comm.sent_at)}
                    </span>
                  </div>
                  {comm.subject && (
                    <p className="text-sm font-medium">{comm.subject}</p>
                  )}
                  {comm.snippet && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {comm.snippet}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
