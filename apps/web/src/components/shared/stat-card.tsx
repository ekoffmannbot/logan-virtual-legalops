"use client";

import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

type Variant = "warning" | "info" | "success" | "danger";

const VARIANT_CLASSES: Record<Variant, string> = {
  warning: "border-l-4 border-yellow-400",
  info: "border-l-4 border-blue-400",
  success: "border-l-4 border-green-400",
  danger: "border-l-4 border-red-400",
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
  return (
    <div className={cn("rounded-xl border bg-white p-6", variant && VARIANT_CLASSES[variant], className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {Icon && (
          <div className="rounded-lg bg-primary/10 p-2">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        )}
      </div>
      <div className="mt-2">
        <p className="text-2xl font-bold">{value}</p>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <p
            className={cn(
              "mt-1 text-xs font-medium",
              trend.value >= 0 ? "text-green-600" : "text-red-600"
            )}
          >
            {trend.value >= 0 ? "+" : ""}
            {trend.value}% {trend.label}
          </p>
        )}
      </div>
    </div>
  );
}
