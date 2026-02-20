"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

/* ------------------------------------------------------------------ */
/* PIZZA TRACKER – Dark glassmorphism theme                            */
/* ------------------------------------------------------------------ */

interface PizzaTrackerStep {
  id: string;
  label: string;
  description?: string;
}

interface PizzaTrackerProps {
  steps: PizzaTrackerStep[];
  currentStepIndex: number;
  className?: string;
}

function StepCircle({
  index,
  status,
}: {
  index: number;
  status: "completed" | "current" | "future";
}) {
  return (
    <div className="relative flex items-center justify-center">
      {status === "current" && (
        <span
          className="absolute h-12 w-12 rounded-full animate-pulse"
          style={{ background: "rgba(99, 102, 241, 0.2)" }}
        />
      )}
      <div
        className={cn(
          "relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white transition-all duration-300",
        )}
        style={{
          background:
            status === "completed"
              ? "var(--success)"
              : status === "current"
                ? "var(--primary-color)"
                : "var(--bg-tertiary)",
          color:
            status === "future" ? "var(--text-muted)" : "white",
          boxShadow:
            status === "current"
              ? "0 0 0 4px rgba(99, 102, 241, 0.2)"
              : undefined,
        }}
      >
        {status === "completed" ? (
          <Check className="h-4 w-4" strokeWidth={3} />
        ) : (
          <span>{index + 1}</span>
        )}
      </div>
    </div>
  );
}

function getStatus(stepIndex: number, currentStepIndex: number) {
  if (stepIndex < currentStepIndex) return "completed" as const;
  if (stepIndex === currentStepIndex) return "current" as const;
  return "future" as const;
}

function HorizontalTracker({ steps, currentStepIndex, className }: PizzaTrackerProps) {
  return (
    <div className={cn("w-full py-4", className)}>
      <div className="flex items-start">
        {steps.map((step, i) => {
          const status = getStatus(i, currentStepIndex);
          const isLast = i === steps.length - 1;

          return (
            <div key={step.id} className={cn("flex items-start", !isLast && "flex-1")}>
              <div className="flex flex-col items-center">
                <StepCircle index={i} status={status} />
                <p
                  className="mt-2 max-w-[120px] text-center text-[10px] font-medium"
                  style={{
                    color:
                      status === "completed"
                        ? "var(--success)"
                        : status === "current"
                          ? "var(--primary-color)"
                          : "var(--text-muted)",
                    fontWeight: status === "current" ? 700 : 500,
                  }}
                >
                  {step.label}
                </p>
              </div>

              {!isLast && (
                <div className="flex flex-1 items-center pt-4">
                  <div
                    className="mx-2 h-[3px] w-full rounded-full transition-all duration-500"
                    style={{
                      background:
                        i < currentStepIndex
                          ? "var(--success)"
                          : i === currentStepIndex
                            ? "var(--primary-color)"
                            : "var(--bg-tertiary)",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VerticalTracker({ steps, currentStepIndex, className }: PizzaTrackerProps) {
  return (
    <div className={cn("w-full py-4", className)}>
      <div className="flex flex-col">
        {steps.map((step, i) => {
          const status = getStatus(i, currentStepIndex);
          const isLast = i === steps.length - 1;

          return (
            <div key={step.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <StepCircle index={i} status={status} />
                {!isLast && (
                  <div
                    className="w-[3px] flex-1 min-h-[24px] rounded-full transition-all duration-500"
                    style={{
                      background:
                        i < currentStepIndex
                          ? "var(--success)"
                          : i === currentStepIndex
                            ? "var(--primary-color)"
                            : "var(--bg-tertiary)",
                    }}
                  />
                )}
              </div>

              <div className={cn("pt-1 pb-6", isLast && "pb-0")}>
                <p
                  className="text-sm"
                  style={{
                    color:
                      status === "completed"
                        ? "var(--success)"
                        : status === "current"
                          ? "var(--primary-color)"
                          : "var(--text-muted)",
                    fontWeight: status === "current" ? 700 : status === "completed" ? 600 : 500,
                  }}
                >
                  {step.label}
                </p>
                {step.description && (
                  <p
                    className="mt-1 text-[13px] leading-snug"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PizzaTracker(props: PizzaTrackerProps) {
  return props.steps.length > 5 ? (
    <VerticalTracker {...props} />
  ) : (
    <HorizontalTracker {...props} />
  );
}
