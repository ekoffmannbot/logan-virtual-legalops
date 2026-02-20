"use client";

import { cn } from "@/lib/utils";
import { KanbanCard } from "./kanban-card";
import type { KanbanCardProps } from "./kanban-card";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  cards: KanbanCardProps[];
}

export interface KanbanBoardProps {
  columns: KanbanColumn[];
  onCardClick?: (cardId: string, columnId: string) => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Component – Dark glassmorphism theme                                */
/* ------------------------------------------------------------------ */

export function KanbanBoard({ columns, onCardClick, className }: KanbanBoardProps) {
  const fewColumns = columns.length <= 4;

  return (
    <div
      className={cn(
        "flex gap-5 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth",
        className,
      )}
    >
      {columns.map((column) => (
        <div
          key={column.id}
          className={cn(
            "flex flex-col rounded-2xl snap-start",
            fewColumns ? "flex-1 min-w-[280px]" : "min-w-[280px] flex-shrink-0",
          )}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--glass-border)",
          }}
        >
          {/* Column header */}
          <div
            className="flex items-center justify-between px-4 py-4"
            style={{ borderBottom: "1px solid var(--glass-border)" }}
          >
            <h3
              className="flex items-center gap-2 text-sm font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {column.title}
              <span
                className="rounded-[10px] px-2.5 py-[2px] text-xs"
                style={{
                  background: "var(--bg-tertiary)",
                  color: "var(--text-muted)",
                }}
              >
                {column.cards.length}
              </span>
            </h3>
          </div>

          {/* Cards */}
          <div className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-3 max-h-[calc(100vh-260px)]" style={{ minHeight: 400 }}>
            {column.cards.length === 0 ? (
              <div
                className="flex items-center justify-center rounded-xl border border-dashed py-8"
                style={{ borderColor: "var(--glass-border)", color: "var(--text-muted)" }}
              >
                <p className="text-[13px]">Sin elementos</p>
              </div>
            ) : (
              column.cards.map((card) => (
                <KanbanCard
                  key={card.id}
                  {...card}
                  onClick={() => {
                    card.onClick?.();
                    onCardClick?.(card.id, column.id);
                  }}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
