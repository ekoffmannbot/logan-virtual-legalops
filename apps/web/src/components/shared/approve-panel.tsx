"use client";

import { cn } from "@/lib/utils";
import { Bot, Check, Pencil, X } from "lucide-react";

/* ------------------------------------------------------------------ */
/* APPROVE PANEL – Dark glassmorphism theme                            */
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

  return (
    <div className="flex flex-col gap-4">
      {/* Agent info bar */}
      <div
        className="flex items-center gap-3 rounded-xl border-l-4 px-4 py-3"
        style={{
          background: "rgba(99, 102, 241, 0.1)",
          borderLeftColor: "var(--primary-color)",
        }}
      >
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
          style={{ background: "rgba(99, 102, 241, 0.2)" }}
        >
          <Bot className="h-5 w-5" style={{ color: "var(--primary-color)" }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {agentName}
          </p>
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--text-secondary)" }}>
            {agentAction}
          </p>
        </div>
        {timestamp && (
          <span className="flex-shrink-0 text-[13px]" style={{ color: "var(--text-muted)" }}>
            {timestamp}
          </span>
        )}
      </div>

      {/* Content area */}
      <div
        className="min-h-[120px] whitespace-pre-wrap rounded-xl p-6 text-sm leading-relaxed"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--glass-border)",
          color: "var(--text-secondary)",
        }}
      >
        {content}
      </div>

      {/* Action buttons */}
      {resolved ? (
        <div
          className="flex items-center justify-center gap-2 rounded-xl py-3 px-4"
          style={{
            background:
              status === "approved"
                ? "rgba(34, 197, 94, 0.15)"
                : status === "rejected"
                  ? "rgba(239, 68, 68, 0.15)"
                  : "rgba(245, 158, 11, 0.15)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <span
            className="text-[15px] font-semibold"
            style={{
              color:
                status === "approved"
                  ? "var(--success)"
                  : status === "rejected"
                    ? "var(--danger)"
                    : "var(--warning)",
            }}
          >
            {status === "approved" ? "Aprobado" : status === "rejected" ? "Rechazado" : "Modificado"}
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onApprove}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-[15px] font-semibold text-white transition-all duration-200"
            style={{ background: "var(--success)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 20px rgba(34, 197, 94, 0.4)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "";
              (e.currentTarget as HTMLElement).style.boxShadow = "";
            }}
          >
            <Check className="h-5 w-5" />
            Aprobar
          </button>

          <button
            type="button"
            onClick={onModify}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-[15px] font-semibold text-white transition-all duration-200"
            style={{ background: "var(--warning)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 20px rgba(245, 158, 11, 0.4)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "";
              (e.currentTarget as HTMLElement).style.boxShadow = "";
            }}
          >
            <Pencil className="h-5 w-5" />
            Modificar
          </button>

          <button
            type="button"
            onClick={onReject}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-[15px] font-semibold transition-all duration-200"
            style={{
              background: "transparent",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "var(--danger)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(239, 68, 68, 0.1)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <X className="h-5 w-5" />
            Rechazar
          </button>
        </div>
      )}
    </div>
  );
}
