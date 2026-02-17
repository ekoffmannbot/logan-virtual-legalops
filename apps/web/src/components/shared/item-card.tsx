"use client";

import { cn } from "@/lib/utils";
import { URGENCY_STYLES } from "@/lib/constants";
import { ProcessStepIndicator, StepDots } from "./process-step-indicator";
import { ArrowRight, LucideIcon } from "lucide-react";
import Link from "next/link";
import type { UrgencyLevel } from "@/lib/process-status-map";

/* ------------------------------------------------------------------ */
/* ITEM CARD – Rich card that replaces DataTable rows                  */
/* ------------------------------------------------------------------ */

interface ItemCardProps {
  /** Title of the item (client name, subject, etc.) */
  title: string;
  /** Subtitle / secondary info */
  subtitle?: string;
  /** Status badge text */
  statusLabel?: string;
  /** Status key for coloring */
  statusKey?: string;
  /** Urgency level from computeUrgency() */
  urgency?: UrgencyLevel;
  /** Urgency message */
  urgencyText?: string;

  /** Process progress data */
  progress?: {
    current: number;
    total: number;
    percentage: number;
    stepLabel: string;
    agentName: string;
    agentColor: string;
  };

  /** Meta info pills at top-right or bottom */
  meta?: Array<{ icon?: LucideIcon; label: string }>;

  /** Big primary action button */
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;

  /** Detail link */
  href?: string;

  /** Additional bottom content */
  children?: React.ReactNode;

  className?: string;
}

export function ItemCard({
  title,
  subtitle,
  statusLabel,
  statusKey,
  urgency = "normal",
  urgencyText,
  progress,
  meta,
  actionLabel,
  actionHref,
  onAction,
  href,
  children,
  className,
}: ItemCardProps) {
  const urgencyStyle = URGENCY_STYLES[urgency];

  const card = (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all",
        urgencyStyle.border,
        urgencyStyle.bg,
        href && "cursor-pointer hover:shadow-md",
        className,
      )}
    >
      {/* Top row: title + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {urgency !== "normal" && (
              <div className={cn("h-2 w-2 rounded-full flex-shrink-0", urgencyStyle.dot)} />
            )}
            <h4 className="text-sm font-semibold text-gray-900 truncate">{title}</h4>
          </div>
          {subtitle && (
            <p className="mt-0.5 text-xs text-gray-500 truncate">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {statusLabel && (
            <span className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
              urgencyStyle.badge,
            )}>
              {statusLabel}
            </span>
          )}
        </div>
      </div>

      {/* Urgency text */}
      {urgencyText && urgency !== "normal" && (
        <p className={cn("mt-1.5 text-xs font-medium", urgencyStyle.text)}>
          {urgencyText}
        </p>
      )}

      {/* Meta pills */}
      {meta && meta.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {meta.map((m, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 text-[10px] text-gray-500"
            >
              {m.icon && <m.icon className="h-3 w-3" />}
              {m.label}
            </span>
          ))}
        </div>
      )}

      {/* Process progress */}
      {progress && (
        <div className="mt-3">
          <ProcessStepIndicator
            current={progress.current}
            total={progress.total}
            percentage={progress.percentage}
            stepLabel={progress.stepLabel}
            agentName={progress.agentName}
            agentColor={progress.agentColor}
            size="sm"
          />
        </div>
      )}

      {/* Children (extra content) */}
      {children && <div className="mt-3">{children}</div>}

      {/* Action button */}
      {actionLabel && (
        <div className="mt-3 flex items-center gap-2">
          {actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {actionLabel}
              <ArrowRight className="h-3 w-3" />
            </Link>
          ) : onAction ? (
            <button
              onClick={(e) => { e.stopPropagation(); onAction(); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              {actionLabel}
              <ArrowRight className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {card}
      </Link>
    );
  }

  return card;
}

/* ------------------------------------------------------------------ */
/* COMPACT CARD – For dashboard lists (less height)                    */
/* ------------------------------------------------------------------ */

interface CompactCardProps {
  title: string;
  subtitle?: string;
  urgency?: UrgencyLevel;
  urgencyText?: string;
  rightContent?: React.ReactNode;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}

export function CompactCard({
  title,
  subtitle,
  urgency = "normal",
  urgencyText,
  rightContent,
  actionLabel,
  actionHref,
  onAction,
  className,
}: CompactCardProps) {
  const urgencyStyle = URGENCY_STYLES[urgency];

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-3 transition-all",
        urgencyStyle.border,
        urgencyStyle.bg,
        className,
      )}
    >
      {urgency !== "normal" && (
        <div className={cn("h-2.5 w-2.5 rounded-full flex-shrink-0", urgencyStyle.dot)} />
      )}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 truncate">{title}</h4>
        {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
        {urgencyText && (
          <p className={cn("text-[10px] font-medium mt-0.5", urgencyStyle.text)}>
            {urgencyText}
          </p>
        )}
      </div>
      {rightContent && <div className="flex-shrink-0">{rightContent}</div>}
      {actionLabel && (
        <div className="flex-shrink-0">
          {actionHref ? (
            <Link
              href={actionHref}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              {actionLabel}
            </Link>
          ) : (
            <button
              onClick={onAction}
              className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
