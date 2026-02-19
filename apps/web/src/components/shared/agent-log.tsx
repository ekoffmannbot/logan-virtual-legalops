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

const STATUS_DOT_COLORS: Record<AgentLogEntry["status"], string> = {
  completed: "bg-green-500",
  pending_approval: "bg-yellow-500",
  in_progress: "bg-blue-500",
  failed: "bg-red-500",
};

/**
 * Returns a human-readable relative time string in Spanish.
 * e.g. "Hace 5 min", "Hace 1 hora", "Hace 2 días"
 */
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
  if (days === 1) return "Hace 1 día";
  return `Hace ${days} días`;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function AgentLog({
  entries,
  onEntryClick,
  maxVisible = 10,
}: AgentLogProps) {
  const [expanded, setExpanded] = useState(false);

  if (entries.length === 0) {
    return (
      <p className="text-[13px] text-muted-foreground py-4">
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
              "flex gap-3 transition-colors",
              onEntryClick && "cursor-pointer hover:bg-gray-50/80",
              entry.status === "pending_approval" && "bg-yellow-50",
            )}
            onClick={() => onEntryClick?.(entry)}
          >
            {/* Timeline rail */}
            <div className="flex flex-col items-center flex-shrink-0 pt-1">
              <div
                className={cn(
                  "mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0",
                  STATUS_DOT_COLORS[entry.status],
                )}
              />
              {!isLast && (
                <div className="w-[2px] flex-1 bg-gray-200" />
              )}
            </div>

            {/* Entry content */}
            <div className="pb-5 min-w-0 flex-1">
              {/* Agent name + relative time */}
              <div className="flex items-center gap-2">
                <Bot className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-[14px] font-bold text-gray-900 truncate">
                  {entry.agentName}
                </span>
                <span className="text-[13px] text-gray-400 flex-shrink-0">
                  {getRelativeTimeSpanish(entry.timestamp)}
                </span>
              </div>

              {/* Action */}
              <p className="mt-0.5 text-[14px] text-gray-700 leading-snug">
                {entry.action}
              </p>

              {/* Detail */}
              {entry.detail && (
                <p className="mt-0.5 text-[13px] text-gray-500 leading-snug">
                  {entry.detail}
                </p>
              )}

              {/* Action required badge */}
              {entry.actionRequired && (
                <span className="mt-1.5 inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-[13px] font-medium text-orange-700">
                  {"Requiere acci\u00f3n"}
                </span>
              )}
            </div>
          </div>
        );
      })}

      {/* Ver mas / Ver menos */}
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="mt-1 w-full text-center text-[13px] font-medium text-primary hover:underline focus:outline-none"
        >
          {expanded ? "Ver menos" : `Ver m\u00e1s (${entries.length - maxVisible})`}
        </button>
      )}
    </div>
  );
}
