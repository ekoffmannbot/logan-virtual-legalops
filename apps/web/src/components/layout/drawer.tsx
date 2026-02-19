"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DrawerProps {
  /** Whether the drawer is visible */
  open: boolean;
  /** Called when the user requests to close (backdrop click, ESC, X button) */
  onClose: () => void;
  /** Title displayed in the drawer header */
  title: string;
  /** Content rendered inside the scrollable body */
  children: React.ReactNode;
  /**
   * CSS width of the panel on desktop.
   * On mobile (<768 px) the drawer always spans 100 vw.
   * @default "60vw"
   */
  width?: string;
}

// ---------------------------------------------------------------------------
// Drawer component
// ---------------------------------------------------------------------------

export function Drawer({
  open,
  onClose,
  title,
  children,
  width = "60vw",
}: DrawerProps) {
  const [mounted, setMounted] = useState(false);

  // We need to wait until the component is mounted on the client before
  // rendering via createPortal (document.body is not available on the server).
  useEffect(() => {
    setMounted(true);
  }, []);

  // ---- ESC key handler ----------------------------------------------------
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, handleKeyDown]);

  // ---- Prevent body scroll when open --------------------------------------
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  // Don't render anything on the server or before hydration.
  if (!mounted) return null;

  return createPortal(
    // Root wrapper -- always in the DOM so transitions work.
    // pointer-events are toggled so the backdrop doesn't block clicks when closed.
    <div
      className={cn("fixed inset-0 z-50", open ? "pointer-events-auto" : "pointer-events-none")}
      aria-hidden={!open}
    >
      {/* ----- Backdrop ----- */}
      <div
        className={cn(
          "absolute inset-0 bg-black/30 transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />

      {/* ----- Panel ----- */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "absolute right-0 top-0 h-full w-full bg-white border-l border-gray-200 shadow-xl",
          "flex flex-col",
          "transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
        style={{ maxWidth: width }}
      >
        {/* ---- Header ---- */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold leading-none text-foreground">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-muted transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* ---- Scrollable body ---- */}
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
