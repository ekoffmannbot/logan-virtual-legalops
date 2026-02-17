"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Search,
  Loader2,
  Globe,
  Calendar,
  Hash,
  Building,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import { ItemCard } from "@/components/shared/item-card";
import { AgentStatusBar } from "@/components/shared/agent-message";
import { EmptyState } from "@/components/shared/empty-state";
import {
  getProcessProgress,
  getNextActionLabel,
} from "@/lib/process-status-map";

interface ScraperJob {
  id: number;
  name: string;
  status: string;
  query: string;
  court: string;
  results_count: number;
  created_at: string;
  completed_at: string | null;
}

const JOB_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  running: "En Ejecucion",
  processing: "Procesando",
  completed: "Completado",
  failed: "Error",
};

export default function ScraperPage() {
  const router = useRouter();

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["scraper", "jobs"],
    queryFn: () => api.get<ScraperJob[]>("/scraper/jobs"),
  });

  const runningJobs = jobs.filter(
    (j) => j.status === "running" || j.status === "processing"
  );
  const pendingJobs = jobs.filter((j) => j.status === "pending");
  const completedJobs = jobs.filter((j) => j.status === "completed");
  const failedJobs = jobs.filter((j) => j.status === "failed");

  // Agent counts
  const agentCounts = {
    comercial: pendingJobs.length + completedJobs.length,
    bot: runningJobs.length,
  };

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
        <h1 className="text-2xl font-bold text-gray-900">
          Busqueda de Causas
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Busqueda automatizada de causas en tribunales
        </p>
      </div>

      {/* Agent Status Bar */}
      <AgentStatusBar
        agents={[
          { name: "Agente Comercial", count: agentCounts.comercial, color: "teal" },
          { name: "Bot Scraper", count: agentCounts.bot, color: "slate" },
        ]}
      />

      {/* Content */}
      {jobs.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No hay busquedas"
          description="No se encontraron trabajos de busqueda de causas."
        />
      ) : (
        <div className="space-y-6">
          {/* Running Jobs - Prominent */}
          {runningJobs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <h2 className="text-sm font-bold text-blue-700 uppercase tracking-wide">
                  En Ejecucion
                </h2>
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-100 px-1.5 text-[10px] font-bold text-blue-800">
                  {runningJobs.length}
                </span>
              </div>
              {runningJobs.map((job) => {
                const progress = getProcessProgress("legalbot-scraper", job.status);

                return (
                  <div
                    key={job.id}
                    className="rounded-xl border-2 border-blue-300 bg-blue-50 p-4 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-500 flex-shrink-0" />
                          <h4 className="text-sm font-semibold text-gray-900 truncate">
                            {job.name}
                          </h4>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Consulta: {job.query}
                        </p>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-800">
                        {JOB_STATUS_LABELS[job.status] || job.status}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {job.court}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        {job.results_count} resultados
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(job.created_at)}
                      </span>
                    </div>

                    {/* Animated progress bar */}
                    <div className="mt-3 h-1.5 w-full rounded-full bg-blue-200 overflow-hidden">
                      <div className="h-full w-2/3 rounded-full bg-blue-500 animate-pulse" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pending Jobs */}
          {pendingJobs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide">
                  Pendientes
                </h2>
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-100 px-1.5 text-[10px] font-bold text-gray-700">
                  {pendingJobs.length}
                </span>
              </div>
              {pendingJobs.map((job) => {
                const progress = getProcessProgress("legalbot-scraper", job.status);
                const actionLabel = getNextActionLabel("legalbot-scraper", job.status);

                return (
                  <ItemCard
                    key={job.id}
                    title={job.name}
                    subtitle={`Consulta: ${job.query}`}
                    statusLabel={JOB_STATUS_LABELS[job.status] || job.status}
                    urgency="normal"
                    progress={progress}
                    meta={[
                      { icon: Building, label: job.court },
                      { icon: Calendar, label: formatDate(job.created_at) },
                    ]}
                    actionLabel={actionLabel}
                    href={`/scraper/${job.id}`}
                  />
                );
              })}
            </div>
          )}

          {/* Completed Jobs */}
          {completedJobs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <h2 className="text-sm font-bold text-green-700 uppercase tracking-wide">
                  Completados
                </h2>
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-green-100 px-1.5 text-[10px] font-bold text-green-800">
                  {completedJobs.length}
                </span>
              </div>
              {completedJobs.map((job) => {
                const progress = getProcessProgress("legalbot-scraper", job.status);
                const actionLabel = getNextActionLabel("legalbot-scraper", job.status);

                return (
                  <ItemCard
                    key={job.id}
                    title={job.name}
                    subtitle={`Consulta: ${job.query}`}
                    statusLabel={JOB_STATUS_LABELS[job.status] || job.status}
                    urgency="normal"
                    progress={progress}
                    meta={[
                      { icon: Building, label: job.court },
                      { icon: Calendar, label: formatDate(job.created_at) },
                    ]}
                    actionLabel={actionLabel}
                    href={`/scraper/${job.id}`}
                  >
                    {/* Results count badge */}
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                        <Hash className="h-3 w-3" />
                        {job.results_count} resultados encontrados
                      </span>
                      {job.completed_at && (
                        <span className="text-[10px] text-gray-400">
                          Completado: {formatDate(job.completed_at)}
                        </span>
                      )}
                    </div>
                  </ItemCard>
                );
              })}
            </div>
          )}

          {/* Failed Jobs */}
          {failedJobs.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <h2 className="text-sm font-bold text-red-700 uppercase tracking-wide">
                  Con Errores
                </h2>
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-100 px-1.5 text-[10px] font-bold text-red-800">
                  {failedJobs.length}
                </span>
              </div>
              {failedJobs.map((job) => (
                <ItemCard
                  key={job.id}
                  title={job.name}
                  subtitle={`Consulta: ${job.query}`}
                  statusLabel="Error"
                  urgency="urgent"
                  meta={[
                    { icon: Building, label: job.court },
                    { icon: Calendar, label: formatDate(job.created_at) },
                  ]}
                  href={`/scraper/${job.id}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
