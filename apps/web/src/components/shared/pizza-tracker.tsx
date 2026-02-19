"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

/* ------------------------------------------------------------------ */
/* PIZZA TRACKER – Dominant process stepper inspired by Domino's       */
/* Horizontal layout for <=5 steps, vertical layout for >5 steps      */
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

/* ------------------------------------------------------------------ */
/* Step circle shared between both layouts                             */
/* ------------------------------------------------------------------ */

function StepCircle({
  index,
  status,
}: {
  index: number;
  status: "completed" | "current" | "future";
}) {
  return (
    <div className="relative flex items-center justify-center">
      {/* Pulse ring – only on current step */}
      {status === "current" && (
        <span className="absolute h-12 w-12 rounded-full bg-blue-400/30 animate-pulse" />
      )}

      {/* Main circle */}
      <div
        className={cn(
          "relative z-10 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-300",
          status === "completed" && "bg-green-500 text-white shadow-md shadow-green-500/25",
          status === "current" && "bg-blue-600 text-white shadow-lg shadow-blue-600/30",
          status === "future" && "bg-gray-200 text-gray-400",
        )}
      >
        {status === "completed" ? (
          <Check className="h-5 w-5" strokeWidth={3} />
        ) : (
          <span>{index + 1}</span>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helper: resolve step status                                         */
/* ------------------------------------------------------------------ */

function getStatus(stepIndex: number, currentStepIndex: number) {
  if (stepIndex < currentStepIndex) return "completed" as const;
  if (stepIndex === currentStepIndex) return "current" as const;
  return "future" as const;
}

/* ------------------------------------------------------------------ */
/* HORIZONTAL LAYOUT (<=5 steps)                                       */
/* ------------------------------------------------------------------ */

function HorizontalTracker({
  steps,
  currentStepIndex,
  className,
}: PizzaTrackerProps) {
  return (
    <div
      className={cn(
        "w-full rounded-xl bg-white px-6 py-8 shadow-sm border border-gray-100",
        className,
      )}
    >
      <div className="flex items-start">
        {steps.map((step, i) => {
          const status = getStatus(i, currentStepIndex);
          const isLast = i === steps.length - 1;

          return (
            <div
              key={step.id}
              className={cn("flex items-start", !isLast && "flex-1")}
            >
              {/* Step node */}
              <div className="flex flex-col items-center">
                <StepCircle index={i} status={status} />

                {/* Label */}
                <p
                  className={cn(
                    "mt-3 text-center text-[14px] leading-tight max-w-[120px]",
                    status === "completed" && "font-medium text-green-600",
                    status === "current" && "font-semibold text-blue-600",
                    status === "future" && "font-medium text-gray-400",
                  )}
                >
                  {step.label}
                </p>

                {/* Description */}
                {step.description && (
                  <p
                    className={cn(
                      "mt-1 text-center text-[13px] leading-snug max-w-[140px]",
                      status === "current" ? "text-gray-600" : "text-gray-500",
                    )}
                  >
                    {step.description}
                  </p>
                )}
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="flex-1 flex items-center pt-5">
                  <div
                    className={cn(
                      "h-1 w-full rounded-full mx-3 transition-all duration-500",
                      i < currentStepIndex && "bg-green-500",
                      i === currentStepIndex && "bg-blue-600",
                      i > currentStepIndex && "bg-gray-200",
                    )}
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

/* ------------------------------------------------------------------ */
/* VERTICAL LAYOUT (>5 steps)                                          */
/* ------------------------------------------------------------------ */

function VerticalTracker({
  steps,
  currentStepIndex,
  className,
}: PizzaTrackerProps) {
  return (
    <div
      className={cn(
        "w-full rounded-xl bg-white px-6 py-6 shadow-sm border border-gray-100",
        className,
      )}
    >
      <div className="flex flex-col">
        {steps.map((step, i) => {
          const status = getStatus(i, currentStepIndex);
          const isLast = i === steps.length - 1;

          return (
            <div key={step.id} className="flex gap-4">
              {/* Left rail: circle + vertical line */}
              <div className="flex flex-col items-center">
                <StepCircle index={i} status={status} />

                {/* Vertical connector */}
                {!isLast && (
                  <div
                    className={cn(
                      "w-1 flex-1 min-h-[24px] rounded-full transition-all duration-500",
                      i < currentStepIndex && "bg-green-500",
                      i === currentStepIndex && "bg-blue-600",
                      i > currentStepIndex && "bg-gray-200",
                    )}
                  />
                )}
              </div>

              {/* Right side: label + description */}
              <div className={cn("pt-2 pb-6", isLast && "pb-0")}>
                <p
                  className={cn(
                    "text-[14px] leading-tight",
                    status === "completed" && "font-medium text-green-600",
                    status === "current" && "font-semibold text-blue-600",
                    status === "future" && "font-medium text-gray-400",
                  )}
                >
                  {step.label}
                </p>

                {step.description && (
                  <p
                    className={cn(
                      "mt-1 text-[13px] leading-snug",
                      status === "current" ? "text-gray-600" : "text-gray-500",
                    )}
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

/* ------------------------------------------------------------------ */
/* PUBLIC EXPORT                                                        */
/* ------------------------------------------------------------------ */

export function PizzaTracker(props: PizzaTrackerProps) {
  const useVertical = props.steps.length > 5;

  if (useVertical) {
    return <VerticalTracker {...props} />;
  }

  return <HorizontalTracker {...props} />;
}
