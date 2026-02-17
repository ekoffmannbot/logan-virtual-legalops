"use client";

import { cn } from "@/lib/utils";
import { ProcessProgressBar, buildProgressSteps } from "./process-progress-bar";
import { AgentMessage } from "./agent-message";
import { StatusBadge } from "./status-badge";
import { ArrowLeft, ArrowRight, Bot, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { ProcessDefinition } from "@/components/shared/process-flow";
import type { ProcessProgress } from "@/lib/process-status-map";

/* ------------------------------------------------------------------ */
/* WIZARD DETAIL – Layout for process detail pages                     */
/* ------------------------------------------------------------------ */

interface WizardDetailProps {
  /** Back button link */
  backHref: string;
  backLabel?: string;

  /** Entity title */
  title: string;
  /** Status badge */
  statusLabel: string;
  statusKey: string;

  /** Process progress data */
  progress: ProcessProgress;
  /** Full process definition for the progress bar */
  processDefinition?: ProcessDefinition;

  /** Current step description */
  stepDescription?: string;

  /** Big action button */
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  actionLoading?: boolean;

  /** What comes next */
  nextStepLabel?: string;
  nextStepAgent?: string;

  /** Agent suggestion */
  agentSuggestions?: string[];

  /** Info panel content (right side) */
  infoItems?: Array<{ label: string; value: string | React.ReactNode }>;

  /** Timeline / history section (collapsible) */
  timeline?: React.ReactNode;

  /** Additional content below the wizard */
  children?: React.ReactNode;
}

export function WizardDetail({
  backHref,
  backLabel = "Volver",
  title,
  statusLabel,
  statusKey,
  progress,
  processDefinition,
  stepDescription,
  actionLabel,
  onAction,
  actionDisabled,
  actionLoading,
  nextStepLabel,
  nextStepAgent,
  agentSuggestions,
  infoItems,
  timeline,
  children,
}: WizardDetailProps) {
  const [showTimeline, setShowTimeline] = useState(false);

  // Build progress steps for the bar
  const progressSteps = processDefinition
    ? buildProgressSteps(
        processDefinition.id,
        progress.current,
        processDefinition.steps,
        processDefinition.agents,
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Back + Status */}
      <div className="flex items-center justify-between">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <StatusBadge status={statusKey} label={statusLabel} className="text-sm px-3 py-1" />
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>

      {/* Process Progress Bar */}
      {progressSteps.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 overflow-x-auto">
          <ProcessProgressBar steps={progressSteps} />
        </div>
      )}

      {/* Main Content: Step + Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Current Step */}
        <div className="lg:col-span-2 space-y-4">
          {/* Current Step Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  {progress.stepLabel}
                </h3>
                <p className="text-[10px] text-gray-400">
                  Agente: {progress.agentName || "—"} · Paso {progress.current + 1} de {progress.total}
                </p>
              </div>
            </div>

            {stepDescription && (
              <p className="text-sm text-gray-600 mt-3 leading-relaxed">
                {stepDescription}
              </p>
            )}

            {/* Big Action Button */}
            {actionLabel && (
              <button
                onClick={onAction}
                disabled={actionDisabled || actionLoading}
                className={cn(
                  "mt-5 w-full rounded-xl py-3 px-6 text-base font-bold text-white transition-all",
                  "bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed",
                  "flex items-center justify-center gap-2",
                )}
              >
                {actionLoading ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    {actionLabel}
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            )}

            {/* What comes next */}
            {nextStepLabel && (
              <div className="mt-4 rounded-lg bg-gray-50 border border-gray-100 p-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">
                  Que sigue despues
                </p>
                <p className="text-sm text-gray-700">{nextStepLabel}</p>
                {nextStepAgent && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Lo hara: {nextStepAgent}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Agent Suggestions */}
          {agentSuggestions && agentSuggestions.length > 0 && (
            <div className="space-y-2">
              {agentSuggestions.map((msg, i) => (
                <AgentMessage
                  key={i}
                  agentName={progress.agentName || "Agente"}
                  message={msg}
                  type="suggestion"
                />
              ))}
            </div>
          )}

          {/* Extra content */}
          {children}
        </div>

        {/* Right: Info Panel */}
        <div className="space-y-4">
          {infoItems && infoItems.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">
                Informacion
              </h4>
              <div className="space-y-3">
                {infoItems.map((item, i) => (
                  <div key={i}>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase">{item.label}</p>
                    <div className="text-sm text-gray-900 mt-0.5">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timeline (collapsible) */}
      {timeline && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <button
            onClick={() => setShowTimeline(!showTimeline)}
            className="flex w-full items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <span className="text-sm font-semibold text-gray-700">Historial</span>
            {showTimeline ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>
          {showTimeline && (
            <div className="border-t p-4">{timeline}</div>
          )}
        </div>
      )}
    </div>
  );
}
