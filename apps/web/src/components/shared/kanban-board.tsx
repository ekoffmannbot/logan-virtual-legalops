"use client";

import { cn } from "@/lib/utils";
import { KanbanCard } from "./kanban-card";
import type { KanbanCardProps } from "./kanban-card";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface KanbanColumn {
  /** Unique identifier for the column */
  id: string;
  /** Column header text */
  title: string;
  /** Tailwind border-top color class, e.g. "border-t-blue-500" */
  color: string;
  /** Cards to render inside this column */
  cards: KanbanCardProps[];
}

export interface KanbanBoardProps {
  columns: KanbanColumn[];
  onCardClick?: (cardId: string, columnId: string) => void;
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function KanbanBoard({ columns, onCardClick, className }: KanbanBoardProps) {
  /**
   * When there are few columns (<=4) we let them flex to fill the
   * available width evenly.  With more columns we fall back to a
   * horizontal-scroll layout with a fixed min-width per column.
   */
  const fewColumns = columns.length <= 4;

  return (
    <div
      className={cn(
        "flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth",
        // Hide scrollbar on desktop but keep functionality
        "scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent",
        className,
      )}
    >
      {columns.map((column) => (
        <div
          key={column.id}
          className={cn(
            "flex flex-col rounded-xl border-t-4 bg-gray-50",
            column.color,
            // Sizing: fill evenly when few, fixed min-width otherwise
            fewColumns ? "flex-1 min-w-[250px]" : "min-w-[280px] flex-shrink-0",
            // Mobile snap
            "snap-start",
          )}
        >
          {/* ---- Column header ---- */}
          <div className="flex items-center justify-between px-3 pt-3 pb-2">
            <h3 className="text-[15px] font-semibold text-gray-800">
              {column.title}
            </h3>
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-200 px-1.5 text-[11px] font-semibold text-gray-600">
              {column.cards.length}
            </span>
          </div>

          {/* ---- Cards container (scrollable) ---- */}
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3 max-h-[calc(100vh-220px)]">
            {column.cards.length === 0 ? (
              <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 py-8">
                <p className="text-[13px] text-gray-400">Sin elementos</p>
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
