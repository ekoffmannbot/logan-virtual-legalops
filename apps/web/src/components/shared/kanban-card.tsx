"use client";

import { cn } from "@/lib/utils";

export interface KanbanCardProps {
  /** Unique identifier for the card */
  id: string;
  /** Primary text – 15px, font-medium, truncated */
  title: string;
  /** Secondary text – 13px, text-gray-500 */
  subtitle: string;
  /** Optional status badge text */
  badge?: string;
  /** Tailwind classes for the badge (bg + text color) */
  badgeColor?: string;
  /** Monetary amount, e.g. "$3.500.000" */
  amount?: string;
  /** Click handler for the whole card */
  onClick?: () => void;
  className?: string;
}

export function KanbanCard({
  id,
  title,
  subtitle,
  badge,
  badgeColor = "bg-gray-100 text-gray-700",
  amount,
  onClick,
  className,
}: KanbanCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "w-full cursor-pointer rounded-lg border bg-white p-3 transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        className,
      )}
    >
      {/* Top row: title + badge */}
      <div className="flex items-start justify-between gap-2">
        <h4
          className="min-w-0 flex-1 truncate text-[15px] font-medium leading-snug text-gray-900"
          title={title}
        >
          {title}
        </h4>

        {badge && (
          <span
            className={cn(
              "flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-tight",
              badgeColor,
            )}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Subtitle */}
      <p className="mt-1 truncate text-[13px] leading-snug text-gray-500">
        {subtitle}
      </p>

      {/* Amount – bottom right */}
      {amount && (
        <div className="mt-2 flex justify-end">
          <span className="text-[14px] font-semibold text-gray-900">
            {amount}
          </span>
        </div>
      )}
    </div>
  );
}
