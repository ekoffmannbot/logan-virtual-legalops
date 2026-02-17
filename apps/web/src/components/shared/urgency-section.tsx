"use client";

import { cn } from "@/lib/utils";
import { URGENCY_STYLES } from "@/lib/constants";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { UrgencyLevel } from "@/lib/process-status-map";

/* ------------------------------------------------------------------ */
/* URGENCY SECTION – Grouped section with urgency header               */
/* ------------------------------------------------------------------ */

interface UrgencySectionProps {
  title: string;
  urgency: UrgencyLevel;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function UrgencySection({
  title,
  urgency,
  count,
  defaultOpen = true,
  children,
  className,
}: UrgencySectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const style = URGENCY_STYLES[urgency];

  return (
    <div className={cn("rounded-xl border overflow-hidden", style.border, className)}>
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center justify-between px-4 py-3 transition-colors",
          style.bg,
        )}
      >
        <div className="flex items-center gap-2">
          <div className={cn("h-2.5 w-2.5 rounded-full", style.dot)} />
          <span className={cn("text-sm font-bold", style.text)}>{title}</span>
          <span className={cn(
            "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
            style.badge,
          )}>
            {count}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className={cn("h-4 w-4", style.text)} />
        ) : (
          <ChevronDown className={cn("h-4 w-4", style.text)} />
        )}
      </button>

      {/* Content */}
      {isOpen && (
        <div className="divide-y divide-gray-100 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ACTION ITEMS SECTION – For dashboard                                */
/* ------------------------------------------------------------------ */

interface ActionItemsSectionProps {
  title: string;
  urgency: UrgencyLevel;
  count: number;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
  className?: string;
}

export function ActionItemsSection({
  title,
  urgency,
  count,
  icon,
  defaultOpen = true,
  emptyMessage,
  children,
  className,
}: ActionItemsSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const style = URGENCY_STYLES[urgency];

  return (
    <div className={cn("space-y-2", className)}>
      {/* Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between group"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className={cn("text-sm font-bold uppercase tracking-wide", style.text)}>
            {title}
          </span>
          <span className={cn(
            "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
            style.badge,
          )}>
            {count}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
        )}
      </button>

      {/* Content */}
      {isOpen && (
        <div className="space-y-2">
          {count === 0 && emptyMessage ? (
            <p className="text-xs text-gray-400 text-center py-3">{emptyMessage}</p>
          ) : (
            children
          )}
        </div>
      )}
    </div>
  );
}
