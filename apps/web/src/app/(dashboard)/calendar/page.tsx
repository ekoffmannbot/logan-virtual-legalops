"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Drawer, useDrawer } from "@/components/layout/drawer";
import {
  Calendar,
  Loader2,
  AlertTriangle,
  Clock,
  MapPin,
  Scale,
  Bell,
  CalendarDays,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* TYPES                                                               */
/* ------------------------------------------------------------------ */

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: string;
  location?: string;
  matterId?: string;
  color: string;
}

/* ------------------------------------------------------------------ */
/* HELPERS                                                             */
/* ------------------------------------------------------------------ */

/** Map event colors to Tailwind dot classes. */
const DOT_COLORS: Record<string, string> = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  red: "bg-red-500",
  yellow: "bg-yellow-500",
};

/** Map event types to badge styling (dark theme). */
const TYPE_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  audiencia: { bg: "rgba(99,102,241,0.2)", text: "var(--primary-color)", label: "Audiencia" },
  reunion: { bg: "rgba(34,197,94,0.2)", text: "var(--success)", label: "Reuni\u00f3n" },
  plazo: { bg: "rgba(239,68,68,0.2)", text: "var(--danger)", label: "Plazo" },
  seguimiento: { bg: "rgba(245,158,11,0.2)", text: "var(--warning)", label: "Seguimiento" },
};

/**
 * Formats a date string as a human-readable Spanish date label.
 * Returns "Hoy", "Ma\u00f1ana", or the full date with weekday.
 */
function formatDateLabel(dateStr: string): string {
  const eventDate = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const eventDay = new Date(eventDate);
  eventDay.setHours(0, 0, 0, 0);

  if (eventDay.getTime() === today.getTime()) return "Hoy";
  if (eventDay.getTime() === tomorrow.getTime()) return "Ma\u00f1ana";

  return eventDate.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Get the date portion (YYYY-MM-DD) from a full date string. */
function getDateKey(dateStr: string): string {
  return dateStr.slice(0, 10);
}

/** Get today formatted for the header. */
function getTodayFormatted(): string {
  return new Date().toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ */
/* PAGE                                                                */
/* ------------------------------------------------------------------ */

export default function CalendarPage() {
  const { isOpen, drawerTitle, drawerContent, openDrawer, closeDrawer } =
    useDrawer();

  /* ---- Fetch events ---- */
  const {
    data: events = [],
    isLoading,
    isError,
  } = useQuery<CalendarEvent[]>({
    queryKey: ["calendar-events"],
    queryFn: () => api.get("/calendar/events"),
  });

  /* ---- Group events by date ---- */
  const groupedEvents = useMemo(() => {
    const groups: Map<string, CalendarEvent[]> = new Map();

    // Sort events by date then time
    const sorted = [...events].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return 0;
    });

    for (const event of sorted) {
      const key = getDateKey(event.date);
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(event);
    }

    return groups;
  }, [events]);

  /* ---- Open event detail drawer ---- */
  function handleEventClick(event: CalendarEvent) {
    const typeBadge = TYPE_BADGE[event.type];

    openDrawer(
      event.title,
      <div className="space-y-6">
        {/* Event summary */}
        <div
          className="rounded-xl p-4 space-y-3"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--glass-border)",
            borderRadius: 16,
          }}
        >
          <h3
            className="font-semibold"
            style={{ fontSize: "15px", color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
          >
            Informaci\u00f3n del Evento
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="Titulo" value={event.title} />
            <DetailField
              label="Tipo"
              value={typeBadge?.label || event.type}
            />
            <DetailField
              label="Fecha"
              value={new Date(event.date + "T00:00:00").toLocaleDateString(
                "es-CL",
                {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }
              )}
            />
            {event.time && <DetailField label="Hora" value={event.time} />}
            {event.location && (
              <DetailField label="Ubicaci\u00f3n" value={event.location} />
            )}
            {event.matterId && (
              <DetailField label="ID Caso" value={event.matterId} />
            )}
          </div>
        </div>

        {/* Type badge large */}
        {typeBadge && (
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center rounded-full px-3 py-1 font-medium"
              style={{ fontSize: "13px", background: typeBadge.bg, color: typeBadge.text }}
            >
              {typeBadge.label}
            </span>
          </div>
        )}

        {/* Location card */}
        {event.location && (
          <div
            className="flex items-center gap-3 rounded-xl p-4"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--glass-border)",
              borderRadius: 16,
            }}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ background: "var(--bg-tertiary)" }}
            >
              <MapPin className="h-5 w-5" style={{ color: "var(--text-muted)" }} />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="font-medium"
                style={{ fontSize: "13px", color: "var(--text-muted)" }}
              >
                Ubicaci\u00f3n
              </p>
              <p
                className="font-semibold"
                style={{ fontSize: "14px", color: "var(--text-primary)" }}
              >
                {event.location}
              </p>
            </div>
          </div>
        )}

        {/* Matter link */}
        {event.matterId && (
          <div
            className="flex items-center gap-3 rounded-xl p-4"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--glass-border)",
              borderRadius: 16,
            }}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ background: "rgba(99,102,241,0.2)" }}
            >
              <Scale className="h-5 w-5" style={{ color: "var(--primary-color)" }} />
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="font-medium"
                style={{ fontSize: "13px", color: "var(--text-muted)" }}
              >
                Caso Asociado
              </p>
              <p
                className="font-semibold"
                style={{ fontSize: "14px", color: "var(--text-primary)" }}
              >
                {event.matterId}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ---- Loading ---- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--primary-color)" }} />
      </div>
    );
  }

  /* ---- Error ---- */
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2" style={{ color: "var(--danger)" }}>
        <AlertTriangle className="h-8 w-8" />
        <p style={{ fontSize: "14px" }}>Error al cargar los eventos</p>
      </div>
    );
  }

  /* ---- Render ---- */
  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* HEADER                                                        */}
      {/* ============================================================ */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: "rgba(99,102,241,0.2)" }}
        >
          <Calendar className="h-5 w-5" style={{ color: "var(--primary-color)" }} />
        </div>
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontSize: "24px", color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
          >
            Mi Agenda
          </h1>
          <p className="capitalize" style={{ fontSize: "14px", color: "var(--text-muted)" }}>
            {getTodayFormatted()}
          </p>
        </div>
      </div>

      {/* ============================================================ */}
      {/* DATE GROUPS / EMPTY STATE                                     */}
      {/* ============================================================ */}
      {groupedEvents.size === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full mb-4"
            style={{ background: "var(--bg-tertiary)" }}
          >
            <CalendarDays className="h-8 w-8" style={{ color: "var(--text-muted)" }} />
          </div>
          <p
            className="font-medium"
            style={{ fontSize: "16px", color: "var(--text-secondary)" }}
          >
            No hay eventos pr\u00f3ximos
          </p>
          <p className="mt-1" style={{ fontSize: "14px", color: "var(--text-muted)" }}>
            No tienes eventos programados en los pr\u00f3ximos 30 d\u00edas.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(groupedEvents.entries()).map(([dateKey, dayEvents]) => (
            <div key={dateKey}>
              {/* Date group header */}
              <h2
                className="font-bold mb-3 capitalize"
                style={{ fontSize: "16px", color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
              >
                {formatDateLabel(dateKey)}
              </h2>

              {/* Event cards */}
              <div className="space-y-3">
                {dayEvents.map((event) => {
                  const typeBadge = TYPE_BADGE[event.type];
                  const dotColor =
                    DOT_COLORS[event.color] || "bg-gray-400";

                  return (
                    <div
                      key={event.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleEventClick(event)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleEventClick(event);
                        }
                      }}
                      className="flex items-start gap-3 p-4 transition-all duration-200 ease-in-out cursor-pointer"
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--glass-border)",
                        borderRadius: 16,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--bg-card-hover)";
                        e.currentTarget.style.borderColor = "var(--glass-border-hover)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "var(--bg-card)";
                        e.currentTarget.style.borderColor = "var(--glass-border)";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      {/* Colored dot */}
                      <div
                        className={[
                          "mt-1.5 h-3 w-3 rounded-full flex-shrink-0",
                          dotColor,
                        ].join(" ")}
                      />

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Time */}
                          {event.time && (
                            <span
                              className="font-bold"
                              style={{ fontSize: "15px", color: "var(--text-primary)" }}
                            >
                              {event.time}
                            </span>
                          )}
                          {/* Title */}
                          <span
                            className="font-semibold truncate"
                            style={{ fontSize: "16px", color: "var(--text-primary)" }}
                          >
                            {event.title}
                          </span>
                        </div>

                        {/* Bottom row: type badge + location */}
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          {typeBadge && (
                            <span
                              className="inline-flex items-center rounded-full px-2.5 py-0.5 font-medium"
                              style={{ fontSize: "13px", background: typeBadge.bg, color: typeBadge.text }}
                            >
                              {typeBadge.label}
                            </span>
                          )}
                          {event.location && (
                            <span
                              className="inline-flex items-center gap-1"
                              style={{ fontSize: "13px", color: "var(--text-muted)" }}
                            >
                              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                              {event.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ============================================================ */}
      {/* DRAWER                                                        */}
      {/* ============================================================ */}
      <Drawer open={isOpen} onClose={closeDrawer} title={drawerTitle}>
        {drawerContent}
      </Drawer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* HELPER: Detail field for drawer                                      */
/* ------------------------------------------------------------------ */

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        className="font-medium uppercase tracking-wide"
        style={{ fontSize: "12px", color: "var(--text-muted)" }}
      >
        {label}
      </p>
      <p className="mt-0.5 capitalize" style={{ fontSize: "14px", color: "var(--text-primary)" }}>
        {value}
      </p>
    </div>
  );
}
