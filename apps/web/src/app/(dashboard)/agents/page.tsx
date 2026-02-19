"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AgentLog } from "@/components/shared/agent-log";
import type { AgentLogEntry } from "@/components/shared/agent-log";
import { Drawer, useDrawer } from "@/components/layout/drawer";
import { ApprovePanel } from "@/components/shared/approve-panel";
import { Bot, Loader2, AlertTriangle, Filter } from "lucide-react";

/* ------------------------------------------------------------------ */
/* FILTROS                                                             */
/* ------------------------------------------------------------------ */

type FilterKey = "todos" | "requiere_accion" | "completados";

const FILTER_CHIPS: { key: FilterKey; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "requiere_accion", label: "Requiere Acci\u00f3n" },
  { key: "completados", label: "Completados" },
];

/* ------------------------------------------------------------------ */
/* HELPERS                                                             */
/* ------------------------------------------------------------------ */

function formatTimestamp(isoString: string): string {
  return new Date(isoString).toLocaleString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_LABELS: Record<AgentLogEntry["status"], string> = {
  completed: "Completado",
  pending_approval: "Pendiente de Aprobaci\u00f3n",
  in_progress: "En Progreso",
  failed: "Fallido",
};

/* ------------------------------------------------------------------ */
/* PAGE                                                                */
/* ------------------------------------------------------------------ */

export default function AgentsPage() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("todos");
  const { isOpen, drawerTitle, drawerContent, openDrawer, closeDrawer } =
    useDrawer();

  /* ---- Fetch agent logs ---- */
  const {
    data: entries = [],
    isLoading,
    isError,
  } = useQuery<AgentLogEntry[]>({
    queryKey: ["agent-logs"],
    queryFn: () => api.get("/agent-logs"),
  });

  /* ---- Filtrado ---- */
  const filteredEntries = useMemo(() => {
    switch (activeFilter) {
      case "requiere_accion":
        return entries.filter((e) => e.actionRequired === true);
      case "completados":
        return entries.filter((e) => e.status === "completed");
      default:
        return entries;
    }
  }, [entries, activeFilter]);

  /* ---- Counts ---- */
  const pendingApprovalCount = entries.filter(
    (e) => e.status === "pending_approval" || e.actionRequired
  ).length;

  /* ---- Approve panel state (per drawer open) ---- */
  const [approveStatus, setApproveStatus] = useState<
    "pending" | "approved" | "rejected" | "modified"
  >("pending");

  /* ---- Handle entry click ---- */
  function handleEntryClick(entry: AgentLogEntry) {
    if (entry.actionRequired) {
      // Reset approval status each time we open
      setApproveStatus("pending");

      openDrawer(
        "Aprobaci\u00f3n Requerida",
        <div className="space-y-6">
          {/* Agent action context */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
            <h3
              className="font-semibold text-gray-800"
              style={{ fontSize: "15px" }}
            >
              Detalle de la Acci\u00f3n
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <DetailField label="Agente" value={entry.agentName} />
              <DetailField
                label="Estado"
                value={STATUS_LABELS[entry.status]}
              />
              <DetailField
                label="Fecha"
                value={formatTimestamp(entry.timestamp)}
              />
              {entry.entityType && (
                <DetailField label="Tipo Entidad" value={entry.entityType} />
              )}
              {entry.entityId && (
                <DetailField label="ID Entidad" value={entry.entityId} />
              )}
            </div>
          </div>

          {/* Approve Panel */}
          <ApprovePanel
            agentName={entry.agentName}
            agentAction={entry.action}
            content={
              entry.detail ||
              `El agente "${entry.agentName}" ha realizado la siguiente acci\u00f3n:\n\n${entry.action}\n\nPor favor revise y apruebe, modifique o rechace esta acci\u00f3n.`
            }
            timestamp={formatTimestamp(entry.timestamp)}
            onApprove={() => setApproveStatus("approved")}
            onModify={() => setApproveStatus("modified")}
            onReject={() => setApproveStatus("rejected")}
            status={approveStatus}
          />
        </div>
      );
    } else {
      // Completed / in_progress / failed entry - show simple detail
      openDrawer(
        entry.agentName,
        <div className="space-y-6">
          {/* Action detail */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
            <h3
              className="font-semibold text-gray-800"
              style={{ fontSize: "15px" }}
            >
              Detalle de la Acci\u00f3n
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <DetailField label="Agente" value={entry.agentName} />
              <DetailField
                label="Estado"
                value={STATUS_LABELS[entry.status]}
              />
              <DetailField
                label="Fecha"
                value={formatTimestamp(entry.timestamp)}
              />
              {entry.entityType && (
                <DetailField label="Tipo Entidad" value={entry.entityType} />
              )}
              {entry.entityId && (
                <DetailField label="ID Entidad" value={entry.entityId} />
              )}
            </div>
          </div>

          {/* Action description */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
            <h3
              className="font-semibold text-gray-800"
              style={{ fontSize: "15px" }}
            >
              Acci\u00f3n Realizada
            </h3>
            <p
              className="text-gray-700 leading-relaxed"
              style={{ fontSize: "14px" }}
            >
              {entry.action}
            </p>
          </div>

          {/* Detail text */}
          {entry.detail && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
              <h3
                className="font-semibold text-gray-800"
                style={{ fontSize: "15px" }}
              >
                Detalle
              </h3>
              <p
                className="text-gray-600 leading-relaxed whitespace-pre-wrap"
                style={{ fontSize: "14px" }}
              >
                {entry.detail}
              </p>
            </div>
          )}

          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span
              className={[
                "inline-flex items-center rounded-full px-3 py-1 font-medium",
                entry.status === "completed"
                  ? "bg-green-100 text-green-800"
                  : entry.status === "in_progress"
                    ? "bg-blue-100 text-blue-800"
                    : entry.status === "failed"
                      ? "bg-red-100 text-red-800"
                      : "bg-yellow-100 text-yellow-800",
              ].join(" ")}
              style={{ fontSize: "13px" }}
            >
              {STATUS_LABELS[entry.status]}
            </span>
          </div>
        </div>
      );
    }
  }

  /* ---- Loading ---- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ---- Error ---- */
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2 text-red-600">
        <AlertTriangle className="h-8 w-8" />
        <p style={{ fontSize: "14px" }}>
          Error al cargar la actividad de agentes
        </p>
      </div>
    );
  }

  /* ---- Render ---- */
  return (
    <div className="space-y-5">
      {/* ============================================================ */}
      {/* HEADER                                                        */}
      {/* ============================================================ */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
          <Bot className="h-5 w-5 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontSize: "24px" }}>
          Actividad de Agentes
        </h1>
        <span
          className="inline-flex items-center justify-center rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 font-semibold"
          style={{ fontSize: "13px" }}
        >
          {entries.length}
        </span>
      </div>

      {/* ============================================================ */}
      {/* FILTER CHIPS                                                  */}
      {/* ============================================================ */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTER_CHIPS.map((chip) => {
          const isActive = activeFilter === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => setActiveFilter(chip.key)}
              className={[
                "inline-flex items-center rounded-full px-4 py-1.5 font-medium transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200",
              ].join(" ")}
              style={{ fontSize: "14px" }}
            >
              {chip.label}
              {chip.key === "requiere_accion" && pendingApprovalCount > 0 && (
                <span
                  className={[
                    "ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 font-semibold",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-orange-100 text-orange-700",
                  ].join(" ")}
                  style={{ fontSize: "11px" }}
                >
                  {pendingApprovalCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* SUMMARY BAR                                                   */}
      {/* ============================================================ */}
      {pendingApprovalCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <p
            className="font-medium text-yellow-800"
            style={{ fontSize: "14px" }}
          >
            {pendingApprovalCount} acci\u00f3n{pendingApprovalCount !== 1 ? "es" : ""}{" "}
            pendiente{pendingApprovalCount !== 1 ? "s" : ""} de aprobaci\u00f3n
          </p>
        </div>
      )}

      {/* ============================================================ */}
      {/* AGENT LOG / EMPTY STATE                                       */}
      {/* ============================================================ */}
      {filteredEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-4">
            <Bot className="h-8 w-8 text-gray-400" />
          </div>
          <p className="font-medium text-gray-700" style={{ fontSize: "16px" }}>
            No hay actividad de agentes
          </p>
          <p className="text-gray-500 mt-1" style={{ fontSize: "14px" }}>
            {activeFilter !== "todos"
              ? "No hay registros con este filtro."
              : "Cuando los agentes realicen acciones, aparecer\u00e1n aqu\u00ed."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <AgentLog
            entries={filteredEntries}
            onEntryClick={handleEntryClick}
            maxVisible={20}
          />
        </div>
      )}

      {/* ============================================================ */}
      {/* DRAWER                                                        */}
      {/* ============================================================ */}
      <Drawer open={isOpen} onClose={closeDrawer} title={drawerTitle}>
        {drawerContent}
      </Drawer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* HELPER: Detail field for drawer                                      */
/* ------------------------------------------------------------------ */

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        className="font-medium text-gray-500 uppercase tracking-wide"
        style={{ fontSize: "12px" }}
      >
        {label}
      </p>
      <p className="text-gray-900 mt-0.5" style={{ fontSize: "14px" }}>
        {value}
      </p>
    </div>
  );
}
