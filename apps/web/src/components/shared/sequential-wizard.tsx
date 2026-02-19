"use client";

import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/* SEQUENTIAL WIZARD – One-at-a-time review with slide transitions     */
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
            {/* Pulse ring on current */}
            {isCurrent && (
              <span className="absolute h-5 w-5 rounded-full bg-blue-400/30 animate-pulse" />
            )}

            <div
              className={cn(
                "relative z-10 h-3 w-3 rounded-full transition-all duration-300",
                isDone && "bg-green-500",
                isCurrent && "bg-blue-600 ring-2 ring-blue-300 ring-offset-2",
                !isDone && !isCurrent && "bg-gray-300",
              )}
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

  /* ------ Slide transition state ------ */
  const [displayIndex, setDisplayIndex] = useState(currentIndex);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(
    null,
  );
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // When currentIndex changes externally, trigger animation
  useEffect(() => {
    if (currentIndex === displayIndex) return;

    const direction = currentIndex > displayIndex ? "left" : "right";
    setSlideDirection(direction);
    setIsAnimating(true);

    // After the slide-out animation, swap content and slide in
    const timer = setTimeout(() => {
      setDisplayIndex(currentIndex);
      setSlideDirection(direction === "left" ? "right" : "left");

      // Force a reflow so the "slide-in start" position applies
      // before we transition to the final resting position
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setSlideDirection(null);
          setIsAnimating(false);
        });
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [currentIndex, displayIndex]);

  /* ------ Navigation handlers ------ */
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

  /* ------ Keyboard support ------ */
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

  /* ------ Compute slide transform ------ */
  function getSlideTransform() {
    if (slideDirection === "left") return "translateX(-100%)";
    if (slideDirection === "right") return "translateX(100%)";
    return "translateX(0)";
  }

  const currentItem = items[displayIndex];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ====== TOP BAR ====== */}
      <div className="flex-shrink-0 rounded-t-xl border border-gray-200 bg-white px-6 py-5">
        {/* Title row */}
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && (
              <h2 className="text-xl font-bold text-gray-900" style={{ fontSize: "clamp(16px, 2vw, 22px)" }}>
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-[14px] text-gray-500">{subtitle}</p>
            )}
          </div>
          <span className="text-[14px] font-semibold text-gray-600 bg-gray-100 rounded-full px-3 py-1">
            {currentIndex + 1} de {total}
          </span>
        </div>

        {/* Progress dots */}
        <ProgressDots total={total} currentIndex={currentIndex} />
      </div>

      {/* ====== MAIN CONTENT AREA ====== */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-hidden border-x border-gray-200 bg-gray-50"
      >
        <div
          className="h-full w-full px-6 py-8 sm:px-8 lg:px-10"
          style={{
            transform: getSlideTransform(),
            transition: isAnimating || slideDirection
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
      <div className="flex-shrink-0 rounded-b-xl border border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Anterior button */}
          <button
            onClick={goPrev}
            disabled={isFirst || isAnimating}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-xl px-5 font-semibold transition-all",
              "h-[48px] min-w-[140px] text-[14px]",
              isFirst
                ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300",
            )}
          >
            <ChevronLeft className="h-5 w-5" />
            Anterior
          </button>

          {/* Center: Position indicator */}
          <span className="text-[14px] font-medium text-gray-500 select-none">
            {currentIndex + 1} de {total}
          </span>

          {/* Right: Siguiente / Finalizar button */}
          {isLast ? (
            <button
              onClick={goNext}
              disabled={isAnimating}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-xl px-5 font-semibold text-white transition-all",
                "h-[48px] min-w-[140px] text-[14px]",
                "bg-green-600 hover:bg-green-700 active:bg-green-800",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
            >
              Finalizar
              <CheckCircle className="h-5 w-5" />
            </button>
          ) : (
            <button
              onClick={goNext}
              disabled={isAnimating}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-xl px-5 font-semibold text-white transition-all",
                "h-[48px] min-w-[140px] text-[14px]",
                "bg-blue-600 hover:bg-blue-700 active:bg-blue-800",
                "disabled:opacity-50 disabled:cursor-not-allowed",
              )}
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
