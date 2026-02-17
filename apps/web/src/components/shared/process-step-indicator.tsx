"use client";

import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

interface ProcessStepIndicatorProps {
  current: number;
  total: number;
  percentage: number;
  stepLabel: string;
  agentName?: string;
  agentColor?: string;
  size?: "sm" | "md";
  className?: string;
}

const COLOR_MAP: Record<string, { bar: string; text: string }> = {
  blue:   { bar: "bg-blue-500",   text: "text-blue-600" },
  green:  { bar: "bg-green-500",  text: "text-green-600" },
  purple: { bar: "bg-purple-500", text: "text-purple-600" },
  amber:  { bar: "bg-amber-500",  text: "text-amber-600" },
  rose:   { bar: "bg-rose-500",   text: "text-rose-600" },
  cyan:   { bar: "bg-cyan-500",   text: "text-cyan-600" },
  slate:  { bar: "bg-slate-500",  text: "text-slate-600" },
  teal:   { bar: "bg-teal-500",   text: "text-teal-600" },
};

export function ProcessStepIndicator({
  current,
  total,
  percentage,
  stepLabel,
  agentName,
  agentColor = "blue",
  size = "sm",
  className,
}: ProcessStepIndicatorProps) {
  const colors = COLOR_MAP[agentColor] || COLOR_MAP.blue;
  const isSm = size === "sm";

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {/* Label row */}
      <div className="flex items-center justify-between">
        <span className={cn(
          "font-medium truncate",
          isSm ? "text-[10px]" : "text-xs",
          colors.text,
        )}>
          {stepLabel}
        </span>
        <span className={cn(
          "text-gray-400 flex-shrink-0 ml-2",
          isSm ? "text-[10px]" : "text-xs",
        )}>
          {current}/{total}
        </span>
      </div>

      {/* Progress bar */}
      <div className={cn(
        "w-full rounded-full bg-gray-100 overflow-hidden",
        isSm ? "h-1.5" : "h-2",
      )}>
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", colors.bar)}
          style={{ width: `${Math.min(100, Math.max(5, percentage))}%` }}
        />
      </div>

      {/* Agent name */}
      {agentName && (
        <div className="flex items-center gap-1">
          <div className={cn("h-1.5 w-1.5 rounded-full", colors.bar)} />
          <span className={cn(
            "text-gray-500 truncate",
            isSm ? "text-[9px]" : "text-[10px]",
          )}>
            {agentName}
          </span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* STEP DOTS (alternative compact visualization)                       */
/* ------------------------------------------------------------------ */

interface StepDotsProps {
  current: number;
  total: number;
  color?: string;
  className?: string;
}

export function StepDots({ current, total, color = "blue", className }: StepDotsProps) {
  const colors = COLOR_MAP[color] || COLOR_MAP.blue;
  const dots = Math.min(total, 8); // Cap at 8 dots for compact display

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: dots }).map((_, i) => {
        const stepNum = Math.round((i / dots) * total);
        const isDone = stepNum < current;
        const isCurrent = stepNum === current;

        return (
          <div
            key={i}
            className={cn(
              "rounded-full transition-all",
              isDone && cn(colors.bar, "h-1.5 w-1.5"),
              isCurrent && cn(colors.bar, "h-2 w-2 animate-pulse"),
              !isDone && !isCurrent && "bg-gray-200 h-1.5 w-1.5",
            )}
          />
        );
      })}
    </div>
  );
}
