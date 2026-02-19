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
      className={[
        "flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4",
        "transition-all duration-200 ease-in-out",
        "hover:shadow-md hover:-translate-y-0.5",
        onCardClick ? "cursor-pointer" : "",
      ].join(" ")}
    >
      {/* Icon circle - 48px */}
      <div
        className={[
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
          iconBg,
        ].join(" ")}
      >
        <span className={iconColor}>{icon}</span>
      </div>

      {/* Text area */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3
            className="truncate text-base font-semibold leading-tight text-gray-900"
            style={{ fontSize: "16px" }}
          >
            {title}
          </h3>
          {badge && (
            <span
              className={[
                "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-medium",
                badgeColor || "bg-gray-100 text-gray-700",
              ].join(" ")}
              style={{ fontSize: "13px" }}
            >
              {badge}
            </span>
          )}
        </div>
        <p
          className="mt-0.5 truncate leading-snug text-gray-500"
          style={{ fontSize: "14px" }}
        >
          {subtitle}
        </p>
      </div>

      {/* Right area: time + action button */}
      <div className="flex shrink-0 flex-col items-end gap-2">
        {timeText && (
          <span
            className={[
              "whitespace-nowrap font-medium",
              timeUrgent ? "text-red-600" : "text-gray-400",
            ].join(" ")}
            style={{ fontSize: "13px" }}
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
          className={[
            "inline-flex items-center justify-center whitespace-nowrap rounded-lg",
            "bg-blue-600 px-4 py-2 font-medium text-white",
            "transition-colors duration-150 hover:bg-blue-700",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          ].join(" ")}
          style={{ fontSize: "14px" }}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
