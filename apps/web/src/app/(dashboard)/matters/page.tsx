"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  Loader2,
  Search,
  Calendar,
  User,
  Building,
  Hash,
  Clock,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { MATTER_STATUS_LABELS, MATTER_TYPE_LABELS } from "@/lib/constants";
import { ItemCard } from "@/components/shared/item-card";
import { AgentStatusBar } from "@/components/shared/agent-message";
import { UrgencySection } from "@/components/shared/urgency-section";
import { EmptyState } from "@/components/shared/empty-state";
import {
  getProcessProgress,
  computeUrgency,
  getNextActionLabel,
  getTimeUntil,
  getRelativeTime,
} from "@/lib/process-status-map";

interface Matter {
  id: number;
  title: string;
  type: string;
  status: string;
  client_name: string;
  assigned_to_name: string;
  court: string | null;
  rol: string | null;
  created_at: string;
  next_hearing_date: string | null;
  last_movement_at: string | null;
  process_id: string;
}

function getDaysUntilHearing(hearingDate: string | null): number | null {
  if (!hearingDate) return null;
  const hearing = new Date(hearingDate);
  const now = new Date();
  return Math.ceil((hearing.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getHearingUrgency(daysUntil: number | null): "urgent" | "warning" | "normal" {
  if (daysUntil === null) return "normal";
  if (daysUntil < 3) return "urgent";
  if (daysUntil < 7) return "warning";
  return "normal";
}

export default function MattersPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = useQuery<{ items: Matter[]; total: number }>({
    queryKey: ["matters"],
    queryFn: () => api.get("/matters"),
  });
  const matters = data?.items ?? [];

  // Filter by search
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return matters;
    const term = searchTerm.toLowerCase();
    return matters.filter(
      (m) =>
        m.title.toLowerCase().includes(term) ||
        m.client_name.toLowerCase().includes(term) ||
        (m.rol && m.rol.toLowerCase().includes(term))
    );
  }, [matters, searchTerm]);

  // Group matters
  const audienciaProonto = filtered.filter((m) => {
    const days = getDaysUntilHearing(m.next_hearing_date);
    return days !== null && days < 7 && m.status !== "closed";
  });

  const activos = filtered.filter((m) => {
    const days = getDaysUntilHearing(m.next_hearing_date);
    const isInAudiencia = days !== null && days < 7;
    return m.status === "open" && !isInAudiencia;
  });

  const cerrados = filtered.filter(
    (m) => m.status === "closed" || m.status === "terminated"
  );

  // Agent counts based on matter types
  const agentCounts = filtered.reduce(
    (acc, m) => {
      if (m.type === "jpl") acc.jpl++;
      else if (m.type === "civil") acc.civil++;
      else acc.otro++;
      return acc;
    },
    { jpl: 0, civil: 0, otro: 0 }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Casos Activos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestion de causas y materias legales
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por titulo, cliente o ROL..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Agent Status Bar */}
      <AgentStatusBar
        agents={[
          { name: "Causas JPL", count: agentCounts.jpl, color: "teal" },
          { name: "Causas Civiles", count: agentCounts.civil, color: "green" },
          { name: "Otros", count: agentCounts.otro, color: "slate" },
        ]}
      />

      {/* Content */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No hay casos"
          description={
            searchTerm
              ? "No se encontraron casos con los filtros seleccionados."
              : "No hay casos registrados en el sistema."
          }
        />
      ) : (
        <div className="space-y-4">
          {/* Audiencia Pronto */}
          {audienciaProonto.length > 0 && (
            <UrgencySection
              title="Audiencia Pronto"
              urgency="warning"
              count={audienciaProonto.length}
            >
              <div className="p-3 space-y-3">
                {audienciaProonto.map((m) => {
                  const daysUntil = getDaysUntilHearing(m.next_hearing_date);
                  const hearingUrgency = getHearingUrgency(daysUntil);
                  const progress = getProcessProgress(
                    m.process_id || "causas-jpl",
                    m.status
                  );
                  const actionLabel = getNextActionLabel(
                    m.process_id || "causas-jpl",
                    m.status
                  );

                  return (
                    <ItemCard
                      key={m.id}
                      title={m.title}
                      subtitle={m.client_name}
                      statusLabel={
                        MATTER_STATUS_LABELS[m.status] || m.status
                      }
                      urgency={hearingUrgency}
                      urgencyText={
                        m.next_hearing_date
                          ? `Audiencia: ${getTimeUntil(m.next_hearing_date)}`
                          : undefined
                      }
                      progress={progress}
                      meta={[
                        ...(m.court
                          ? [{ icon: Building, label: m.court }]
                          : []),
                        ...(m.rol
                          ? [{ icon: Hash, label: `ROL: ${m.rol}` }]
                          : []),
                        { label: MATTER_TYPE_LABELS[m.type] || m.type },
                        ...(m.assigned_to_name
                          ? [{ icon: User, label: m.assigned_to_name }]
                          : []),
                        ...(m.last_movement_at
                          ? [{ icon: Clock, label: `Ultimo mov: ${getRelativeTime(m.last_movement_at)}` }]
                          : []),
                      ]}
                      actionLabel={actionLabel}
                      actionHref={`/matters/${m.id}`}
                      href={`/matters/${m.id}`}
                    />
                  );
                })}
              </div>
            </UrgencySection>
          )}

          {/* Activos */}
          {activos.length > 0 && (
            <UrgencySection
              title="Activos"
              urgency="normal"
              count={activos.length}
            >
              <div className="p-3 space-y-3">
                {activos.map((m) => {
                  const urgency = computeUrgency(m);
                  const progress = getProcessProgress(
                    m.process_id || "causas-jpl",
                    m.status
                  );
                  const actionLabel = getNextActionLabel(
                    m.process_id || "causas-jpl",
                    m.status
                  );

                  return (
                    <ItemCard
                      key={m.id}
                      title={m.title}
                      subtitle={m.client_name}
                      statusLabel={
                        MATTER_STATUS_LABELS[m.status] || m.status
                      }
                      urgency={urgency}
                      progress={progress}
                      meta={[
                        ...(m.court
                          ? [{ icon: Building, label: m.court }]
                          : []),
                        ...(m.rol
                          ? [{ icon: Hash, label: `ROL: ${m.rol}` }]
                          : []),
                        { label: MATTER_TYPE_LABELS[m.type] || m.type },
                        ...(m.assigned_to_name
                          ? [{ icon: User, label: m.assigned_to_name }]
                          : []),
                        ...(m.next_hearing_date
                          ? [{ icon: Calendar, label: `Audiencia: ${getTimeUntil(m.next_hearing_date)}` }]
                          : []),
                        ...(m.last_movement_at
                          ? [{ icon: Clock, label: `Ultimo mov: ${getRelativeTime(m.last_movement_at)}` }]
                          : []),
                      ]}
                      actionLabel={actionLabel}
                      actionHref={`/matters/${m.id}`}
                      href={`/matters/${m.id}`}
                    />
                  );
                })}
              </div>
            </UrgencySection>
          )}

          {/* Cerrados */}
          {cerrados.length > 0 && (
            <UrgencySection
              title="Cerrados"
              urgency="normal"
              count={cerrados.length}
              defaultOpen={false}
            >
              <div className="p-3 space-y-3">
                {cerrados.map((m) => {
                  const progress = getProcessProgress(
                    m.process_id || "causas-jpl",
                    m.status
                  );

                  return (
                    <ItemCard
                      key={m.id}
                      title={m.title}
                      subtitle={m.client_name}
                      statusLabel={
                        MATTER_STATUS_LABELS[m.status] || m.status
                      }
                      urgency="normal"
                      progress={progress}
                      meta={[
                        ...(m.court
                          ? [{ icon: Building, label: m.court }]
                          : []),
                        ...(m.rol
                          ? [{ icon: Hash, label: `ROL: ${m.rol}` }]
                          : []),
                        { label: MATTER_TYPE_LABELS[m.type] || m.type },
                        { icon: Calendar, label: formatDate(m.created_at) },
                      ]}
                      href={`/matters/${m.id}`}
                    />
                  );
                })}
              </div>
            </UrgencySection>
          )}
        </div>
      )}
    </div>
  );
}
