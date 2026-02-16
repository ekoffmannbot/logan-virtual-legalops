"use client";

import { cn } from "@/lib/utils";
import { ArrowRight, Loader2 } from "lucide-react";

interface WorkflowAction {
  label: string;
  action?: string;
  id?: string;
  variant?: "default" | "primary" | "destructive" | "warning" | "success" | "danger";
  disabled?: boolean;
  icon?: React.ElementType;
}

interface WorkflowActionsProps {
  actions: WorkflowAction[];
  onAction: (action: string) => void;
  className?: string;
  isLoading?: boolean;
}

export function WorkflowActions({ actions, onAction, className, isLoading }: WorkflowActionsProps) {
  if (actions.length === 0) return null;

  const variantClasses: Record<string, string> = {
    default: "border bg-white text-foreground hover:bg-muted",
    primary: "bg-primary text-white hover:bg-primary/90",
    destructive: "bg-destructive text-white hover:bg-destructive/90",
    warning: "bg-yellow-500 text-white hover:bg-yellow-600",
    success: "bg-green-600 text-white hover:bg-green-700",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {actions.map((a) => {
        const key = a.action || a.id || a.label;
        const Icon = a.icon || ArrowRight;
        return (
          <button
            key={key}
            onClick={() => onAction(key)}
            disabled={a.disabled || isLoading}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50",
              variantClasses[a.variant || "default"]
            )}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Icon className="h-3.5 w-3.5" />
            )}
            {a.label}
          </button>
        );
      })}
    </div>
  );
}
