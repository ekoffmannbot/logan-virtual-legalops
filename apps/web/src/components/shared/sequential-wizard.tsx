"use client";

import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/* SEQUENTIAL WIZARD – Dark glassmorphism theme                        */
/* ------------------------------------------------------------------ */

export interface WizardItem {
  id: string;
  content: React.ReactNode;
}

export interface SequentialWizardProps {
  items: WizardItem[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  title?: string;
  subtitle?: string;
  onComplete?: () => void;
}

/* ------------------------------------------------------------------ */
/* Progress dots                                                       */
/* ------------------------------------------------------------------ */

function ProgressDots({
  total,
  currentIndex,
}: {
  total: number;
  currentIndex: number;
}) {
  return (
    <div className="flex items-center justify-center gap-2.5">
      {Array.from({ length: total }).map((_, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;

        return (
          <div key={i} className="relative flex items-center justify-center">
            {isCurrent && (
              <span
                className="absolute h-5 w-5 rounded-full animate-pulse"
                style={{ background: "rgba(99, 102, 241, 0.3)" }}
              />
            )}
            <div
              className="relative z-10 h-3 w-3 rounded-full transition-all duration-300"
              style={{
                background: isDone
                  ? "var(--success)"
                  : isCurrent
                    ? "var(--primary-color)"
                    : "var(--bg-tertiary)",
                boxShadow: isCurrent
                  ? "0 0 0 2px rgba(99, 102, 241, 0.3), 0 0 0 4px rgba(99, 102, 241, 0.1)"
                  : undefined,
              }}
            >
              {isDone && (
                <CheckCircle className="h-3 w-3 text-white" strokeWidth={3} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export function SequentialWizard({
  items,
  currentIndex,
  onIndexChange,
  title,
  subtitle,
  onComplete,
}: SequentialWizardProps) {
  const total = items.length;
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === total - 1;

  const [displayIndex, setDisplayIndex] = useState(currentIndex);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentIndex === displayIndex) return;
    const direction = currentIndex > displayIndex ? "left" : "right";
    setSlideDirection(direction);
    setIsAnimating(true);

    const timer = setTimeout(() => {
      setDisplayIndex(currentIndex);
      setSlideDirection(direction === "left" ? "right" : "left");
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setSlideDirection(null);
          setIsAnimating(false);
        });
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [currentIndex, displayIndex]);

  const goNext = useCallback(() => {
    if (isAnimating) return;
    if (isLast) {
      onComplete?.();
    } else {
      onIndexChange(currentIndex + 1);
    }
  }, [isAnimating, isLast, onComplete, onIndexChange, currentIndex]);

  const goPrev = useCallback(() => {
    if (isAnimating || isFirst) return;
    onIndexChange(currentIndex - 1);
  }, [isAnimating, isFirst, onIndexChange, currentIndex]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

  function getSlideTransform() {
    if (slideDirection === "left") return "translateX(-100%)";
    if (slideDirection === "right") return "translateX(100%)";
    return "translateX(0)";
  }

  const currentItem = items[displayIndex];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ====== TOP BAR ====== */}
      <div
        className="flex-shrink-0 rounded-t-2xl px-6 py-5"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--glass-border)",
          borderBottom: "none",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && (
              <h2
                className="text-xl font-bold"
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  color: "var(--text-primary)",
                  fontSize: "clamp(16px, 2vw, 22px)",
                }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-sm" style={{ color: "var(--text-muted)" }}>
                {subtitle}
              </p>
            )}
          </div>
          <span
            className="rounded-full px-3 py-1 text-sm font-semibold"
            style={{
              background: "var(--bg-tertiary)",
              color: "var(--text-secondary)",
            }}
          >
            {currentIndex + 1} de {total}
          </span>
        </div>

        <ProgressDots total={total} currentIndex={currentIndex} />
      </div>

      {/* ====== MAIN CONTENT AREA ====== */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-hidden"
        style={{
          background: "var(--bg-secondary)",
          borderLeft: "1px solid var(--glass-border)",
          borderRight: "1px solid var(--glass-border)",
        }}
      >
        <div
          className="h-full w-full px-6 py-8 sm:px-8 lg:px-10"
          style={{
            transform: getSlideTransform(),
            transition:
              isAnimating || slideDirection
                ? "transform 250ms cubic-bezier(0.4, 0, 0.2, 1)"
                : "none",
          }}
        >
          {currentItem && (
            <div key={currentItem.id} className="h-full">
              {currentItem.content}
            </div>
          )}
        </div>
      </div>

      {/* ====== BOTTOM NAVIGATION BAR ====== */}
      <div
        className="flex-shrink-0 rounded-b-2xl px-6 py-4"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--glass-border)",
          borderTop: "none",
        }}
      >
        <div className="flex items-center justify-between">
          {/* Left: Anterior */}
          <button
            onClick={goPrev}
            disabled={isFirst || isAnimating}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 font-semibold transition-all h-12 min-w-[140px] text-sm"
            style={{
              background: isFirst ? "var(--bg-tertiary)" : "var(--bg-tertiary)",
              color: isFirst ? "var(--text-muted)" : "var(--text-secondary)",
              cursor: isFirst ? "not-allowed" : "pointer",
              opacity: isFirst ? 0.5 : 1,
            }}
          >
            <ChevronLeft className="h-5 w-5" />
            Anterior
          </button>

          {/* Center: Position */}
          <span className="text-sm font-medium select-none" style={{ color: "var(--text-muted)" }}>
            {currentIndex + 1} de {total}
          </span>

          {/* Right: Siguiente / Finalizar */}
          {isLast ? (
            <button
              onClick={goNext}
              disabled={isAnimating}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 font-semibold text-white transition-all h-12 min-w-[140px] text-sm disabled:opacity-50"
              style={{ background: "var(--success)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 20px rgba(34, 197, 94, 0.4)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "";
                (e.currentTarget as HTMLElement).style.boxShadow = "";
              }}
            >
              Finalizar
              <CheckCircle className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={isAnimating}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 font-semibold text-white transition-all h-12 min-w-[140px] text-sm disabled:opacity-50"
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
              Siguiente
              <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
