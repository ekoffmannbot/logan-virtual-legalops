"use client";

import { cn } from "@/lib/utils";
import { LucideIcon, Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, actionLabel, onAction, className }: EmptyStateProps) {
  const actionContent = action ?? (actionLabel && onAction ? (
    <button
      onClick={onAction}
      className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
    >
      {actionLabel}
    </button>
  ) : null);

  return (
    <div className={cn("flex flex-col items-center justify-center py-12", className)}>
      <div className="rounded-full bg-muted p-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-medium">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">{description}</p>
      )}
      {actionContent && <div className="mt-4">{actionContent}</div>}
    </div>
  );
}
