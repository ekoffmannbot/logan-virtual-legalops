"use client";

import { cn } from "@/lib/utils";
import { Bot, Check, Pencil, X } from "lucide-react";

/* ------------------------------------------------------------------ */
/* APPROVE PANEL – Human-in-the-loop para aprobar trabajo de agentes   */
/* ------------------------------------------------------------------ */

interface ApprovePanelProps {
  agentName: string;
  agentAction: string;
  content: string;
  timestamp?: string;
  onApprove: () => void;
  onModify: () => void;
  onReject: () => void;
  status?: "pending" | "approved" | "rejected" | "modified";
}

const STATUS_CONFIG = {
  approved: {
    bg: "bg-green-50",
    border: "border-green-200",
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    label: "Aprobado",
    icon: Check,
  },
  rejected: {
    bg: "bg-red-50",
    border: "border-red-200",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    label: "Rechazado",
    icon: X,
  },
  modified: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    iconBg: "bg-yellow-100",
    iconColor: "text-yellow-600",
    label: "Modificado",
    icon: Pencil,
  },
} as const;

export function ApprovePanel({
  agentName,
  agentAction,
  content,
  timestamp,
  onApprove,
  onModify,
  onReject,
  status = "pending",
}: ApprovePanelProps) {
  const resolved = status !== "pending";
  const config = resolved ? STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] : null;

  return (
    <div className="flex flex-col gap-4">
      {/* ---- Barra de información del agente ---- */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border-l-4 px-4 py-3",
          "bg-blue-50 border-l-blue-600",
        )}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 flex-shrink-0">
          <Bot className="h-5 w-5 text-blue-600" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-gray-800 leading-tight">
            {agentName}
          </p>
          <p className="text-[13px] text-gray-600 leading-tight mt-0.5">
            {agentAction}
          </p>
        </div>

        {timestamp && (
          <span className="text-[13px] text-gray-400 flex-shrink-0">
            {timestamp}
          </span>
        )}
      </div>

      {/* ---- Área de contenido del agente ---- */}
      <div
        className={cn(
          "min-h-[120px] rounded-xl border border-gray-200 bg-white p-6",
          "text-[14px] text-gray-700 leading-relaxed whitespace-pre-wrap",
        )}
      >
        {content}
      </div>

      {/* ---- Barra de acciones / Estado resuelto ---- */}
      {resolved && config ? (
        <div
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl border py-3 px-4",
            config.bg,
            config.border,
          )}
        >
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full",
              config.iconBg,
            )}
          >
            <config.icon className={cn("h-4 w-4", config.iconColor)} />
          </div>
          <span
            className={cn(
              "text-[15px] font-semibold",
              config.iconColor,
            )}
          >
            {config.label}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onApprove}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-2",
              "h-12 rounded-xl bg-green-600 text-white",
              "text-[15px] font-medium",
              "hover:bg-green-700 active:bg-green-800 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2",
            )}
          >
            <Check className="h-5 w-5" />
            Aprobar
          </button>

          <button
            type="button"
            onClick={onModify}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-2",
              "h-12 rounded-xl bg-yellow-500 text-white",
              "text-[15px] font-medium",
              "hover:bg-yellow-600 active:bg-yellow-700 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 focus-visible:ring-offset-2",
            )}
          >
            <Pencil className="h-5 w-5" />
            Modificar
          </button>

          <button
            type="button"
            onClick={onReject}
            className={cn(
              "flex-1 inline-flex items-center justify-center gap-2",
              "h-12 rounded-xl bg-red-500 text-white",
              "text-[15px] font-medium",
              "hover:bg-red-600 active:bg-red-700 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2",
            )}
          >
            <X className="h-5 w-5" />
            Rechazar
          </button>
        </div>
      )}
    </div>
  );
}
