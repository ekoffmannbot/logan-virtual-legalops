"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

/* ------------------------------------------------------------------ */
/* PROCESS PROGRESS BAR – Large horizontal step bar for detail pages   */
/* ------------------------------------------------------------------ */

interface ProgressStep {
  label: string;
  status: "done" | "current" | "upcoming";
  agentName?: string;
}

interface ProcessProgressBarProps {
  steps: ProgressStep[];
  className?: string;
}

export function ProcessProgressBar({ steps, className }: ProcessProgressBarProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Steps */}
      <div className="flex items-center">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          return (
            <div key={i} className={cn("flex items-center", !isLast && "flex-1")}>
              {/* Step circle + label */}
              <div className="flex flex-col items-center">
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all",
                  step.status === "done" && "border-green-500 bg-green-500 text-white",
                  step.status === "current" && "border-primary bg-primary/10 text-primary animate-pulse",
                  step.status === "upcoming" && "border-gray-200 bg-white text-gray-400",
                )}>
                  {step.status === "done" && <CheckCircle2 className="h-4 w-4" />}
                  {step.status === "current" && <Loader2 className="h-4 w-4 animate-spin" />}
                  {step.status === "upcoming" && <Circle className="h-3 w-3" />}
                </div>
                <div className="mt-1.5 text-center max-w-[80px]">
                  <p className={cn(
                    "text-[9px] font-semibold leading-tight",
                    step.status === "done" && "text-green-600",
                    step.status === "current" && "text-primary",
                    step.status === "upcoming" && "text-gray-400",
                  )}>
                    {step.label}
                  </p>
                  {step.agentName && step.status === "current" && (
                    <p className="text-[8px] text-gray-400 mt-0.5">{step.agentName}</p>
                  )}
                </div>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className={cn(
                  "flex-1 h-0.5 mx-1 mt-[-1rem]",
                  step.status === "done" ? "bg-green-400" : "bg-gray-200",
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* buildProgressSteps – Helper to build steps from process definitions */
/* ------------------------------------------------------------------ */

export function buildProgressSteps(
  processId: string,
  currentStepIndex: number,
  allSteps: Array<{ label: string; agentId: string; type: string }>,
  agents: Array<{ id: string; name: string }>,
): ProgressStep[] {
  // Filter to only task-type steps (skip start/end for cleaner display)
  const taskSteps = allSteps.filter(s => s.type === "task" || s.type === "decision" || s.type === "subprocess");

  // Find current step index relative to task steps
  const taskIndex = Math.min(currentStepIndex, taskSteps.length - 1);

  return taskSteps.map((step, i) => {
    const agent = agents.find(a => a.id === step.agentId);
    let status: "done" | "current" | "upcoming";

    if (i < taskIndex) {
      status = "done";
    } else if (i === taskIndex) {
      status = "current";
    } else {
      status = "upcoming";
    }

    return {
      label: step.label,
      status,
      agentName: agent?.name,
    };
  });
}
