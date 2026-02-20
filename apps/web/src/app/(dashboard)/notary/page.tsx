"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { InboxItem } from "@/components/shared/inbox-item";
import { Drawer, useDrawer } from "@/components/layout/drawer";
import { PizzaTracker } from "@/components/shared/pizza-tracker";
import { getProcessProgress } from "@/lib/process-status-map";
import { NOTARY_STATUS_LABELS } from "@/lib/constants";
import { documentosNotarialesProcess } from "@/lib/process-definitions";
import { Stamp, Loader2, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* TIPOS                                                               */
/* ------------------------------------------------------------------ */

interface NotaryDoc {
  id: number;
  document_type: string;
  title: string;
  client_name: string;
  notary_name: string;
  status: string;
  submitted_date: string | null;
  created_at: string;
  process_id: string;
}

/* ------------------------------------------------------------------ */
/* HELPERS                                                             */
/* ------------------------------------------------------------------ */

const DOC_TYPE_FILTERS = ["Todos", "Poder", "Escritura", "Certificado"] as const;

const STATUS_BADGE_COLORS: Record<string, string> = {
  notary_received: "bg-yellow-100 text-yellow-800",
  notary_signed: "bg-green-100 text-green-800",
  client_signed: "bg-green-100 text-green-800",
  archived: "bg-gray-100 text-gray-700",
  reported_to_manager: "bg-gray-100 text-gray-700",
};

function getIconBg(status: string): string {
  if (status === "notary_received" || status === "sent_to_notary") return "bg-yellow-100";
  if (status === "notary_signed" || status === "client_signed" || status === "archived") return "bg-green-100";
  return "bg-blue-100";
}

function getIconColor(status: string): string {
  if (status === "notary_received" || status === "sent_to_notary") return "text-yellow-600";
  if (status === "notary_signed" || status === "client_signed" || status === "archived") return "text-green-600";
  return "text-blue-600";
}

function getActionLabel(status: string): string {
  const map: Record<string, string> = {
    antecedents_requested: "Verificar",
    antecedents_complete: "Redactar",
    drafting: "Enviar",
    sent_to_notary: "Confirmar",
    notary_received: "Esperar Firma",
    notary_signed: "Contactar",
    client_contact_pending: "Llamar",
    document_available: "Entregar",
    client_signed: "Archivar",
    retrieved_by_procurador: "Archivar",
    archived: "Ver Detalle",
    reported_to_manager: "Ver Detalle",
  };
  return map[status] || "Ver Detalle";
}

function formatDateSpanish(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("es-CL", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getRelativeTimeSpanish(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 0) return `hace ${diffDays} dia${diffDays > 1 ? "s" : ""}`;
  if (diffHours > 0) return `hace ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
  if (diffMins > 0) return `hace ${diffMins} min`;
  return "ahora";
}

/**
 * Construye los pasos para el PizzaTracker filtrando solo task/subprocess.
 */
function buildPizzaSteps(processId: string, status: string) {
  const process = documentosNotarialesProcess;
  const taskSteps = process.steps.filter(
    (s) => s.type !== "start" && s.type !== "end" && s.type !== "decision"
  );

  const progress = getProcessProgress(
    processId || "documentos-notariales",
    status
  );

  const allSteps = process.steps;
  const currentStepId = allSteps[progress.current]?.id || allSteps[0]?.id;

  let currentIndex = taskSteps.findIndex((s) => s.id === currentStepId);
  if (currentIndex === -1) {
    const currentAllIndex = allSteps.findIndex((s) => s.id === currentStepId);
    for (let i = currentAllIndex; i >= 0; i--) {
      const idx = taskSteps.findIndex((s) => s.id === allSteps[i].id);
      if (idx !== -1) {
        currentIndex = idx;
        break;
      }
    }
    if (currentIndex === -1) currentIndex = 0;
  }

  const steps = taskSteps.map((s) => ({
    id: s.id,
    label: s.label,
    description: s.description,
  }));

  return { steps, currentIndex, progress };
}

/* ------------------------------------------------------------------ */
/* PAGINA                                                              */
/* ------------------------------------------------------------------ */

export default function NotaryPage() {
  const [activeFilter, setActiveFilter] = useState<string>("Todos");

  const { data: documents = [], isLoading, isError } = useQuery({
    queryKey: ["notary"],
    queryFn: () => api.get<NotaryDoc[]>("/notary"),
  });

  const { isOpen, drawerTitle, drawerContent, openDrawer, closeDrawer } =
    useDrawer();

  /* Filtrar por tipo de documento */
  const filtered = useMemo(() => {
    if (activeFilter === "Todos") return documents;
    return documents.filter(
      (d) => d.document_type.toLowerCase() === activeFilter.toLowerCase()
    );
  }, [documents, activeFilter]);

  /* Abrir drawer con detalle del documento */
  function handleOpenDetail(doc: NotaryDoc) {
    const { steps, currentIndex, progress } = buildPizzaSteps(
      doc.process_id,
      doc.status
    );
    const statusLabel = NOTARY_STATUS_LABELS[doc.status] || doc.status;

    openDrawer(
      doc.title || "Documento Notarial",
      <div className="space-y-6">
        {/* Progreso visual */}
        <div>
          <p style={{ fontSize: "14px", color: "var(--text-primary)" }} className="font-semibold mb-1">
            Progreso del tramite
          </p>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }} className="mb-4">
            Paso {currentIndex + 1} de {steps.length}: {progress.stepLabel}
          </p>
          <PizzaTracker steps={steps} currentStepIndex={currentIndex} />
        </div>

        {/* Detalles */}
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)", borderRadius: 16 }}
        >
          <h3 style={{ fontSize: "15px", color: "var(--text-primary)" }} className="font-semibold">
            Detalles del documento
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Detail label="Cliente" value={doc.client_name} />
            <Detail label="Tipo" value={doc.document_type} />
            <Detail label="Estado" value={statusLabel} />
            <Detail label="Notaria" value={doc.notary_name || "-"} />
            <Detail label="Fecha envio" value={formatDateSpanish(doc.submitted_date)} />
            <Detail label="Creado" value={formatDateSpanish(doc.created_at)} />
          </div>
        </div>
      </div>
    );
  }

  /* ---- Estados de carga / error ---- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--primary-color)" }} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <AlertCircle className="h-8 w-8" style={{ color: "var(--danger)" }} />
        <p style={{ fontSize: "14px", color: "var(--danger)" }}>Error al cargar tramites notariales</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---- HEADER ---- */}
      <div className="flex items-center gap-3">
        <Stamp className="h-6 w-6" style={{ color: "var(--text-primary)" }} />
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
        >
          Tramites Notariales
        </h1>
        <span
          className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 font-semibold"
          style={{ fontSize: "13px", background: "var(--bg-tertiary)", color: "var(--text-muted)" }}
        >
          {documents.length}
        </span>
      </div>

      {/* ---- FILTER CHIPS ---- */}
      <div className="flex flex-wrap gap-2">
        {DOC_TYPE_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            className="inline-flex items-center rounded-full px-4 py-1.5 font-medium transition-colors"
            style={
              activeFilter === filter
                ? { fontSize: "14px", background: "var(--primary-color)", color: "#ffffff" }
                : { fontSize: "14px", background: "var(--bg-tertiary)", color: "var(--text-muted)" }
            }
          >
            {filter}
          </button>
        ))}
      </div>

      {/* ---- LISTA ---- */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-2">
          <Stamp className="h-10 w-10" style={{ color: "var(--text-muted)" }} />
          <p style={{ fontSize: "14px", color: "var(--text-muted)" }}>No hay tramites notariales</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => (
            <InboxItem
              key={doc.id}
              id={String(doc.id)}
              icon={<Stamp className="h-5 w-5" />}
              iconBg={getIconBg(doc.status)}
              iconColor={getIconColor(doc.status)}
              title={doc.title || doc.document_type}
              subtitle={`${doc.client_name} · ${doc.notary_name || "Sin notaria"}`}
              badge={NOTARY_STATUS_LABELS[doc.status] || doc.status}
              badgeColor={STATUS_BADGE_COLORS[doc.status] || "bg-blue-100 text-blue-800"}
              timeText={getRelativeTimeSpanish(doc.created_at)}
              actionLabel={getActionLabel(doc.status)}
              onAction={() => handleOpenDetail(doc)}
              onCardClick={() => handleOpenDetail(doc)}
            />
          ))}
        </div>
      )}

      {/* ---- DRAWER ---- */}
      <Drawer open={isOpen} onClose={closeDrawer} title={drawerTitle}>
        {drawerContent}
      </Drawer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* COMPONENTE AUXILIAR                                                  */
/* ------------------------------------------------------------------ */

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p
        className="font-medium uppercase tracking-wide"
        style={{ fontSize: "13px", color: "var(--text-muted)" }}
      >
        {label}
      </p>
      <p className="mt-0.5" style={{ fontSize: "14px", color: "var(--text-primary)" }}>
        {value}
      </p>
    </div>
  );
}
