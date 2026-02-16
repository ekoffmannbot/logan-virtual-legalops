"use client";

import { cn } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/constants";

interface StatusBadgeProps {
  status: string;
  label?: string;
  labels?: Record<string, string>;
  colors?: Record<string, string>;
  className?: string;
}

export function StatusBadge({ status, label, labels, colors, className }: StatusBadgeProps) {
  const colorSource = colors ?? STATUS_COLORS;
  const colorClass = colorSource[status] || "bg-gray-100 text-gray-800";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        colorClass,
        className
      )}
    >
      {label || (labels && labels[status]) || status}
    </span>
  );
}
