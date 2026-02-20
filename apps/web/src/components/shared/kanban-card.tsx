"use client";

import { cn } from "@/lib/utils";

export interface KanbanCardProps {
  id: string;
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  amount?: string;
  onClick?: () => void;
  className?: string;
}

export function KanbanCard({
  id,
  title,
  subtitle,
  badge,
  badgeColor,
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
        "w-full cursor-pointer rounded-xl p-3.5 transition-all duration-200",
        className,
      )}
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--glass-border)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "var(--primary-color)";
        el.style.transform = "translateY(-2px)";
        el.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.3)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = "var(--glass-border)";
        el.style.transform = "";
        el.style.boxShadow = "";
      }}
    >
      {/* Title + badge */}
      <div className="flex items-start justify-between gap-2">
        <h4
          className="min-w-0 flex-1 truncate text-sm font-semibold leading-snug"
          style={{ color: "var(--text-primary)" }}
          title={title}
        >
          {title}
        </h4>
        {badge && (
          <span
            className="flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{
              background: "var(--bg-tertiary)",
              color: "var(--text-secondary)",
            }}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Subtitle */}
      <p
        className="mt-1 truncate text-xs leading-snug"
        style={{ color: "var(--text-muted)" }}
      >
        {subtitle}
      </p>

      {/* Amount */}
      {amount && (
        <div className="mt-2 flex justify-end">
          <span
            className="text-base font-bold"
            style={{ color: "var(--accent-color)" }}
          >
            {amount}
          </span>
        </div>
      )}
    </div>
  );
}
