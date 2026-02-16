"use client";

import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface TimelineEvent {
  id: string | number;
  title: string;
  description?: string;
  timestamp: string;
  type?: "status_change" | "communication" | "task" | "audit" | "note";
  actor?: string;
}

interface TimelineProps {
  events: TimelineEvent[];
  className?: string;
}

const typeColors: Record<string, string> = {
  status_change: "bg-blue-500",
  communication: "bg-green-500",
  task: "bg-yellow-500",
  audit: "bg-gray-500",
  note: "bg-purple-500",
};

export function Timeline({ events, className }: TimelineProps) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No hay eventos registrados.
      </p>
    );
  }

  return (
    <div className={cn("space-y-0", className)}>
      {events.map((event, i) => (
        <div key={event.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                "mt-1.5 h-2.5 w-2.5 rounded-full",
                typeColors[event.type || "audit"]
              )}
            />
            {i < events.length - 1 && (
              <div className="w-px flex-1 bg-border" />
            )}
          </div>
          <div className="pb-6">
            <p className="text-sm font-medium">{event.title}</p>
            {event.description && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {event.description}
              </p>
            )}
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatDateTime(event.timestamp)}</span>
              {event.actor && (
                <>
                  <span>·</span>
                  <span>{event.actor}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
