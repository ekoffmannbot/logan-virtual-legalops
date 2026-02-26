"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

type Variant = "warning" | "info" | "success" | "danger";

const VARIANT_COLORS: Record<Variant, string> = {
  warning: "var(--warning)",
  info: "var(--primary-color)",
  success: "var(--success)",
  danger: "var(--danger)",
};

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: { value: number; label: string };
  variant?: Variant;
  className?: string;
}

export function StatCard({ title, value, description, icon: Icon, trend, variant, className }: StatCardProps) {
  const accentColor = variant ? VARIANT_COLORS[variant] : "var(--primary-color)";

  return (
    <div
      className={cn("rounded-xl p-6", className)}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--glass-border)",
        borderLeft: variant ? `4px solid ${accentColor}` : undefined,
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
          {title}
        </p>
        {Icon && (
          <div
            className="rounded-lg p-2"
            style={{ background: `${accentColor}15` }}
          >
            <Icon className="h-4 w-4" style={{ color: accentColor }} />
          </div>
        )}
      </div>
      <div className="mt-2">
        <p
          className="text-2xl font-bold"
          style={{ color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
        >
          {value}
        </p>
        {description && (
          <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
            {description}
          </p>
        )}
        {trend && (
          <p
            className="mt-1 text-xs font-medium"
            style={{ color: trend.value >= 0 ? "var(--success)" : "var(--danger)" }}
          >
            {trend.value >= 0 ? "+" : ""}
            {trend.value}% {trend.label}
          </p>
        )}
      </div>
    </div>
  );
}
