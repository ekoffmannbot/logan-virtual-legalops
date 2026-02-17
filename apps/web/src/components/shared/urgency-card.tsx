"use client";

import { cn } from "@/lib/utils";
import { URGENCY_STYLES } from "@/lib/constants";
import { ArrowRight, LucideIcon } from "lucide-react";
import Link from "next/link";
import type { UrgencyLevel } from "@/lib/process-status-map";

/* ------------------------------------------------------------------ */
/* URGENCY CARD – Dashboard action card                                */
/* ------------------------------------------------------------------ */

interface UrgencyCardProps {
  title: string;
  subtitle?: string;
  urgency: UrgencyLevel;
  urgencyText?: string;
  icon?: LucideIcon;
  /** Primary action */
  actionLabel: string;
  actionHref?: string;
  onAction?: () => void;
  /** Secondary action */
  secondaryLabel?: string;
  secondaryHref?: string;
  onSecondary?: () => void;
  /** Amount for financial items */
  amount?: string;
  className?: string;
}

export function UrgencyCard({
  title,
  subtitle,
  urgency,
  urgencyText,
  icon: Icon,
  actionLabel,
  actionHref,
  onAction,
  secondaryLabel,
  secondaryHref,
  onSecondary,
  amount,
  className,
}: UrgencyCardProps) {
  const style = URGENCY_STYLES[urgency];

  return (
    <div className={cn(
      "rounded-xl border-2 p-4 transition-all hover:shadow-md",
      style.border, style.bg,
      className,
    )}>
      <div className="flex items-start gap-3">
        {Icon && (
          <div className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0",
            urgency === "urgent" ? "bg-red-100" : urgency === "warning" ? "bg-yellow-100" : "bg-gray-100",
          )}>
            <Icon className={cn("h-5 w-5", style.text)} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
          {subtitle && (
            <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
          )}
          {urgencyText && (
            <p className={cn("mt-1 text-xs font-semibold", style.text)}>
              {urgencyText}
            </p>
          )}
        </div>
        {amount && (
          <div className="text-right flex-shrink-0">
            <p className={cn("text-lg font-bold", style.text)}>{amount}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center gap-2">
        {actionHref ? (
          <Link
            href={actionHref}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors",
              urgency === "urgent" ? "bg-red-600 hover:bg-red-700" :
              urgency === "warning" ? "bg-yellow-600 hover:bg-yellow-700" :
              "bg-primary hover:bg-primary/90",
            )}
          >
            {actionLabel}
            <ArrowRight className="h-3 w-3" />
          </Link>
        ) : (
          <button
            onClick={onAction}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors",
              urgency === "urgent" ? "bg-red-600 hover:bg-red-700" :
              urgency === "warning" ? "bg-yellow-600 hover:bg-yellow-700" :
              "bg-primary hover:bg-primary/90",
            )}
          >
            {actionLabel}
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
        {secondaryLabel && (
          secondaryHref ? (
            <Link
              href={secondaryHref}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-white transition-colors"
            >
              {secondaryLabel}
            </Link>
          ) : (
            <button
              onClick={onSecondary}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-white transition-colors"
            >
              {secondaryLabel}
            </button>
          )
        )}
      </div>
    </div>
  );
}
