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
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: 16 }}
          >
            <h3
              className="font-semibold"
              style={{ fontSize: "15px", color: "var(--text-primary)" }}
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
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: 16 }}
          >
            <h3
              className="font-semibold"
              style={{ fontSize: "15px", color: "var(--text-primary)" }}
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
          <div
            className="rounded-xl p-4 space-y-2"
            style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: 16 }}
          >
            <h3
              className="font-semibold"
              style={{ fontSize: "15px", color: "var(--text-primary)" }}
            >
              Acci\u00f3n Realizada
            </h3>
            <p
              className="leading-relaxed"
              style={{ fontSize: "14px", color: "var(--text-primary)" }}
            >
              {entry.action}
            </p>
          </div>

          {/* Detail text */}
          {entry.detail && (
            <div
              className="rounded-xl p-4 space-y-2"
              style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: 16 }}
            >
              <h3
                className="font-semibold"
                style={{ fontSize: "15px", color: "var(--text-primary)" }}
              >
                Detalle
              </h3>
              <p
                className="leading-relaxed whitespace-pre-wrap"
                style={{ fontSize: "14px", color: "var(--text-secondary)" }}
              >
                {entry.detail}
              </p>
            </div>
          )}

          {/* Status badge */}
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center rounded-full px-3 py-1 font-medium"
              style={{
                fontSize: "13px",
                ...(entry.status === "completed"
                  ? { background: "rgba(34,197,94,0.2)", color: "var(--success)" }
                  : entry.status === "in_progress"
                    ? { background: "rgba(99,102,241,0.2)", color: "var(--primary-color)" }
                    : entry.status === "failed"
                      ? { background: "rgba(239,68,68,0.2)", color: "var(--danger)" }
                      : { background: "rgba(245,158,11,0.2)", color: "var(--warning)" }),
              }}
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
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--primary-color)" }} />
      </div>
    );
  }

  /* ---- Error ---- */
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2" style={{ color: "var(--danger)" }}>
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
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "rgba(99,102,241,0.2)" }}
        >
          <Bot className="h-5 w-5" style={{ color: "var(--primary-color)" }} />
        </div>
        <h1
          className="text-2xl font-bold"
          style={{ fontSize: "24px", color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
        >
          Actividad de Agentes
        </h1>
        <span
          className="inline-flex items-center justify-center rounded-full px-2.5 py-0.5 font-semibold"
          style={{ fontSize: "13px", background: "rgba(99,102,241,0.2)", color: "var(--primary-color)" }}
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
              className="inline-flex items-center rounded-full px-4 py-1.5 font-medium transition-colors"
              style={{
                fontSize: "14px",
                background: isActive ? "var(--primary-color)" : "var(--bg-tertiary)",
                color: isActive ? "#ffffff" : "var(--text-secondary)",
                border: isActive ? "none" : "1px solid var(--glass-border)",
              }}
            >
              {chip.label}
              {chip.key === "requiere_accion" && pendingApprovalCount > 0 && (
                <span
                  className="ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 font-semibold"
                  style={{
                    fontSize: "11px",
                    background: isActive
                      ? "rgba(255,255,255,0.2)"
                      : "rgba(245,158,11,0.2)",
                    color: isActive ? "#ffffff" : "var(--warning)",
                  }}
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
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}
        >
          <AlertTriangle className="h-5 w-5 flex-shrink-0" style={{ color: "var(--warning)" }} />
          <p
            className="font-medium"
            style={{ fontSize: "14px", color: "var(--warning)" }}
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
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full mb-4"
            style={{ background: "var(--bg-tertiary)" }}
          >
            <Bot className="h-8 w-8" style={{ color: "var(--text-muted)" }} />
          </div>
          <p className="font-medium" style={{ fontSize: "16px", color: "var(--text-primary)" }}>
            No hay actividad de agentes
          </p>
          <p className="mt-1" style={{ fontSize: "14px", color: "var(--text-muted)" }}>
            {activeFilter !== "todos"
              ? "No hay registros con este filtro."
              : "Cuando los agentes realicen acciones, aparecer\u00e1n aqu\u00ed."}
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)" }}
        >
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
        className="font-medium uppercase tracking-wide"
        style={{ fontSize: "12px", color: "var(--text-muted)" }}
      >
        {label}
      </p>
      <p className="mt-0.5" style={{ fontSize: "14px", color: "var(--text-primary)" }}>
        {value}
      </p>
    </div>
  );
}
