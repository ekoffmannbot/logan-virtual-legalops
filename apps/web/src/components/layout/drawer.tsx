"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

// ---------------------------------------------------------------------------
// Drawer component (dark glassmorphism theme)
// ---------------------------------------------------------------------------

export function Drawer({
  open,
  onClose,
  title,
  children,
  width = "480px",
}: DrawerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <div
      className={cn("fixed inset-0 z-[200]", open ? "pointer-events-auto" : "pointer-events-none")}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
        style={{ background: "rgba(0, 0, 0, 0.6)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "absolute right-0 top-0 h-full flex flex-col",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
        style={{
          width,
          maxWidth: "90vw",
          background: "var(--bg-secondary)",
          borderLeft: "1px solid var(--glass-border)",
          boxShadow: "-10px 0 40px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-6 py-6"
          style={{ borderBottom: "1px solid var(--glass-border)" }}
        >
          <div>
            <h2
              className="text-xl font-bold leading-none"
              style={{
                fontFamily: "'Outfit', sans-serif",
                color: "var(--text-primary)",
              }}
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-[10px] transition-all duration-200"
            style={{
              background: "var(--bg-tertiary)",
              color: "var(--text-secondary)",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "var(--danger)";
              el.style.color = "white";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = "var(--bg-tertiary)";
              el.style.color = "var(--text-secondary)";
            }}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </aside>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------------------
// useDrawer hook
// ---------------------------------------------------------------------------

export function useDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [drawerContent, setDrawerContent] = useState<React.ReactNode>(null);
  const [drawerTitle, setDrawerTitle] = useState("");

  const openDrawer = useCallback((title: string, content: React.ReactNode) => {
    setDrawerTitle(title);
    setDrawerContent(content);
    setIsOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setIsOpen(false);
  }, []);

  return { isOpen, drawerContent, drawerTitle, openDrawer, closeDrawer };
}
