"use client";

import React from "react";

interface InboxItemProps {
  id: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  timeText?: string;
  timeUrgent?: boolean;
  actionLabel: string;
  onAction: () => void;
  onCardClick?: () => void;
}

export function InboxItem({
  id,
  icon,
  iconBg,
  iconColor,
  title,
  subtitle,
  badge,
  badgeColor,
  timeText,
  timeUrgent = false,
  actionLabel,
  onAction,
  onCardClick,
}: InboxItemProps) {
  return (
    <div
      data-inbox-item={id}
      role={onCardClick ? "button" : undefined}
      tabIndex={onCardClick ? 0 : undefined}
      onClick={onCardClick}
      onKeyDown={
        onCardClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onCardClick();
              }
            }
          : undefined
      }
      className="glass-card flex items-center gap-4 p-4 transition-all duration-200 hover:border-[var(--glass-border-hover)]"
      style={{
        cursor: onCardClick ? "pointer" : undefined,
      }}
    >
      {/* Icon */}
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
        style={{ background: iconBg.startsWith("bg-") ? undefined : iconBg }}
      >
        <span style={{ color: iconColor.startsWith("text-") ? undefined : iconColor }}>
          {icon}
        </span>
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3
            className="truncate text-base font-semibold leading-tight"
            style={{ color: "var(--text-primary)", fontSize: 16 }}
          >
            {title}
          </h3>
          {badge && (
            <span
              className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[13px] font-medium"
              style={{
                background: badgeColor?.includes("bg-") ? undefined : "var(--bg-tertiary)",
                color: badgeColor?.includes("text-") ? undefined : "var(--text-secondary)",
              }}
            >
              {badge}
            </span>
          )}
        </div>
        <p
          className="mt-0.5 truncate leading-snug text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          {subtitle}
        </p>
      </div>

      {/* Right: time + action */}
      <div className="flex shrink-0 flex-col items-end gap-2">
        {timeText && (
          <span
            className="whitespace-nowrap text-[13px] font-medium"
            style={{ color: timeUrgent ? "var(--danger)" : "var(--text-muted)" }}
          >
            {timeText}
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAction();
          }}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all duration-200"
          style={{ background: "var(--primary-color)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 20px var(--primary-glow)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.transform = "";
            (e.currentTarget as HTMLElement).style.boxShadow = "";
          }}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
