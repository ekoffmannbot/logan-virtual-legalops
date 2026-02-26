"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AgentLog } from "@/components/shared/agent-log";
import type { AgentLogEntry } from "@/components/shared/agent-log";
import { Drawer, useDrawer } from "@/components/layout/drawer";
import { ApprovePanel } from "@/components/shared/approve-panel";
import { Bell, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type FilterKey = "todos" | "requiere_accion" | "completados";

const FILTER_CHIPS: { key: FilterKey; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "requiere_accion", label: "Requiere Acci\u00f3n" },
  { key: "completados", label: "Completados" },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
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

export default function NotificationsPage() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("requiere_accion");
  const { isOpen, drawerTitle, drawerContent, openDrawer, closeDrawer } = useDrawer();
  const [approveStatus, setApproveStatus] = useState<
    "pending" | "approved" | "rejected" | "modified"
  >("pending");

  const {
    data: entries = [],
    isLoading,
    isError,
  } = useQuery<AgentLogEntry[]>({
    queryKey: ["agent-logs"],
    queryFn: () => api.get("/agent-logs"),
  });

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

  const pendingCount = entries.filter(
    (e) => e.status === "pending_approval" || e.actionRequired
  ).length;

  function handleEntryClick(entry: AgentLogEntry) {
    setApproveStatus("pending");

    if (entry.actionRequired) {
      openDrawer(
        "Aprobaci\u00f3n Requerida",
        <div className="space-y-6">
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)" }}
          >
            <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
              Detalle
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <DetailField label="Agente" value={entry.agentName} />
              <DetailField label="Estado" value={STATUS_LABELS[entry.status]} />
              <DetailField label="Fecha" value={formatTimestamp(entry.timestamp)} />
              {entry.entityType && <DetailField label="Tipo" value={entry.entityType} />}
            </div>
          </div>
          <ApprovePanel
            agentName={entry.agentName}
            agentAction={entry.action}
            content={entry.detail || entry.action}
            timestamp={formatTimestamp(entry.timestamp)}
            onApprove={() => setApproveStatus("approved")}
            onModify={() => setApproveStatus("modified")}
            onReject={() => setApproveStatus("rejected")}
            status={approveStatus}
          />
        </div>
      );
    } else {
      openDrawer(entry.agentName, (
        <div className="space-y-4">
          <div
            className="rounded-xl p-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)" }}
          >
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>{entry.action}</p>
            {entry.detail && (
              <p className="mt-2 text-sm whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
                {entry.detail}
              </p>
            )}
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {formatTimestamp(entry.timestamp)}
          </p>
        </div>
      ));
    }
  }

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
        <AlertTriangle className="h-8 w-8" />
        <p className="text-sm">Error al cargar notificaciones</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "rgba(245,158,11,0.2)" }}
        >
          <Bell className="h-5 w-5" style={{ color: "var(--warning)" }} />
        </div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
        >
          Notificaciones
        </h1>
        {pendingCount > 0 && (
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
            style={{ background: "rgba(245,158,11,0.2)", color: "var(--warning)" }}
          >
            {pendingCount} pendiente{pendingCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTER_CHIPS.map((chip) => {
          const isActive = activeFilter === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => setActiveFilter(chip.key)}
              className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
              style={{
                background: isActive ? "var(--primary-color)" : "var(--bg-tertiary)",
                color: isActive ? "#ffffff" : "var(--text-secondary)",
                border: isActive ? "none" : "1px solid var(--glass-border)",
              }}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Summary bar */}
      {pendingCount > 0 && activeFilter !== "completados" && (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}
        >
          <AlertTriangle className="h-5 w-5 flex-shrink-0" style={{ color: "var(--warning)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--warning)" }}>
            {pendingCount} escalaci\u00f3n{pendingCount !== 1 ? "es" : ""} pendiente{pendingCount !== 1 ? "s" : ""} de tu aprobaci\u00f3n
          </p>
        </div>
      )}

      {/* Content */}
      {filteredEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full mb-4"
            style={{ background: "var(--bg-tertiary)" }}
          >
            <CheckCircle2 className="h-8 w-8" style={{ color: "var(--success)" }} />
          </div>
          <p className="font-medium text-base" style={{ color: "var(--text-primary)" }}>
            Sin notificaciones pendientes
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Todos los agentes operan normalmente.
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)" }}
        >
          <AgentLog entries={filteredEntries} onEntryClick={handleEntryClick} maxVisible={30} />
        </div>
      )}

      <Drawer open={isOpen} onClose={closeDrawer} title={drawerTitle}>
        {drawerContent}
      </Drawer>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p className="mt-0.5 text-sm" style={{ color: "var(--text-primary)" }}>{value}</p>
    </div>
  );
}
