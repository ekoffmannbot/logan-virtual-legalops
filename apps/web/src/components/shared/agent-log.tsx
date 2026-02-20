"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Bot } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface AgentLogEntry {
  id: string;
  agentName: string;
  action: string;
  detail?: string;
  timestamp: string;
  status: "completed" | "pending_approval" | "in_progress" | "failed";
  entityType?: string;
  entityId?: string;
  actionRequired?: boolean;
}

interface AgentLogProps {
  entries: AgentLogEntry[];
  onEntryClick?: (entry: AgentLogEntry) => void;
  maxVisible?: number;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const STATUS_DOT_STYLES: Record<AgentLogEntry["status"], string> = {
  completed: "var(--success)",
  pending_approval: "var(--warning)",
  in_progress: "var(--primary-color)",
  failed: "var(--danger)",
};

export function getRelativeTimeSpanish(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "Ahora";
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "Hace un momento";
  if (minutes === 1) return "Hace 1 min";
  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours === 1) return "Hace 1 hora";
  if (hours < 24) return `Hace ${hours} horas`;
  if (days === 1) return "Hace 1 d\u00eda";
  return `Hace ${days} d\u00edas`;
}

/* ------------------------------------------------------------------ */
/* Component – Dark theme                                              */
/* ------------------------------------------------------------------ */

export function AgentLog({ entries, onEntryClick, maxVisible = 10 }: AgentLogProps) {
  const [expanded, setExpanded] = useState(false);

  if (entries.length === 0) {
    return (
      <p className="py-4 text-[13px]" style={{ color: "var(--text-muted)" }}>
        No hay actividad de agentes registrada.
      </p>
    );
  }

  const visibleEntries = expanded ? entries : entries.slice(0, maxVisible);
  const hasMore = entries.length > maxVisible;

  return (
    <div className="space-y-0">
      {visibleEntries.map((entry, index) => {
        const isLast = index === visibleEntries.length - 1;

        return (
          <div
            key={entry.id}
            className={cn(
              "flex gap-3 transition-colors rounded-lg",
              onEntryClick && "cursor-pointer",
            )}
            style={{
              background:
                entry.status === "pending_approval"
                  ? "rgba(245, 158, 11, 0.05)"
                  : undefined,
            }}
            onClick={() => onEntryClick?.(entry)}
            onMouseEnter={(e) => {
              if (onEntryClick)
                (e.currentTarget as HTMLElement).style.background = "var(--bg-card-hover)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                entry.status === "pending_approval"
                  ? "rgba(245, 158, 11, 0.05)"
                  : "";
            }}
          >
            {/* Timeline rail */}
            <div className="flex flex-shrink-0 flex-col items-center pt-1">
              <div
                className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ background: STATUS_DOT_STYLES[entry.status] }}
              />
              {!isLast && (
                <div
                  className="w-[2px] flex-1"
                  style={{ background: "var(--glass-border)" }}
                />
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 pb-5">
              <div className="flex items-center gap-2">
                <Bot className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
                <span
                  className="truncate text-sm font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {entry.agentName}
                </span>
                <span
                  className="flex-shrink-0 text-[13px]"
                  style={{ color: "var(--text-muted)" }}
                >
                  {getRelativeTimeSpanish(entry.timestamp)}
                </span>
              </div>

              <p
                className="mt-0.5 text-sm leading-snug"
                style={{ color: "var(--text-secondary)" }}
              >
                {entry.action}
              </p>

              {entry.detail && (
                <p
                  className="mt-0.5 text-[13px] leading-snug"
                  style={{ color: "var(--text-muted)" }}
                >
                  {entry.detail}
                </p>
              )}

              {entry.actionRequired && (
                <span
                  className="mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[13px] font-medium"
                  style={{
                    background: "rgba(245, 158, 11, 0.2)",
                    color: "var(--warning)",
                  }}
                >
                  Requiere acci{"\u00f3"}n
                </span>
              )}
            </div>
          </div>
        );
      })}

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-1 w-full text-center text-[13px] font-medium transition-colors"
          style={{ color: "var(--primary-color)" }}
        >
          {expanded ? "Ver menos" : `Ver m\u00e1s (${entries.length - maxVisible})`}
        </button>
      )}
    </div>
  );
}
