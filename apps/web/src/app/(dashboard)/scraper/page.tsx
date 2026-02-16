"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Globe,
  Search,
  Plus,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ExternalLink,
  UserPlus,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";

interface ScraperJob {
  id: string;
  keyword: string;
  base_url: string;
  page_limit: number;
  status: string;
  results_count: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

interface ScraperResult {
  id: string;
  job_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  description: string | null;
  source_url: string;
  converted_to_lead: boolean;
  lead_id: string | null;
  created_at: string;
}

export default function ScraperPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showNewJobForm, setShowNewJobForm] = useState(false);
  const [newJob, setNewJob] = useState({
    keyword: "",
    base_url: "",
    page_limit: 5,
  });
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState("");

  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ["scraper", "jobs"],
    queryFn: () => api.get<ScraperJob[]>("/scraper/jobs"),
  });

  const { data: results = [], isLoading: loadingResults } = useQuery({
    queryKey: ["scraper", "results", selectedJobId],
    queryFn: () =>
      api.get<ScraperResult[]>(`/scraper/jobs/${selectedJobId}/results`),
    enabled: !!selectedJobId,
  });

  const createJobMutation = useMutation({
    mutationFn: (data: typeof newJob) => api.post("/scraper/jobs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scraper", "jobs"] });
      setShowNewJobForm(false);
      setNewJob({ keyword: "", base_url: "", page_limit: 5 });
    },
  });

  const convertToLeadMutation = useMutation({
    mutationFn: (resultId: string) =>
      api.post(`/scraper/results/${resultId}/convert-to-lead`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["scraper", "results", selectedJobId],
      });
    },
  });

  const filteredResults = results.filter(
    (r) =>
      r.name.toLowerCase().includes(searchResults.toLowerCase()) ||
      r.email?.toLowerCase().includes(searchResults.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchResults.toLowerCase())
  );

  const getJobStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-gray-400" />;
      case "running":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getJobStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pendiente";
      case "running":
        return "En ejecución";
      case "completed":
        return "Completado";
      case "failed":
        return "Error";
      default:
        return status;
    }
  };

  const resultColumns = [
    {
      key: "name",
      label: "Nombre",
      render: (r: ScraperResult) => (
        <p className="font-medium text-gray-900">{r.name}</p>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (r: ScraperResult) => (
        <span className="text-sm text-gray-700">{r.email || "—"}</span>
      ),
    },
    {
      key: "phone",
      label: "Teléfono",
      render: (r: ScraperResult) => (
        <span className="text-sm text-gray-700">{r.phone || "—"}</span>
      ),
    },
    {
      key: "website",
      label: "Sitio web",
      render: (r: ScraperResult) =>
        r.website ? (
          <a
            href={r.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ver
          </a>
        ) : (
          <span className="text-sm text-gray-400">—</span>
        ),
    },
    {
      key: "description",
      label: "Descripción",
      render: (r: ScraperResult) => (
        <p className="text-sm text-gray-600 truncate max-w-xs">
          {r.description || "—"}
        </p>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (r: ScraperResult) =>
        r.converted_to_lead ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Convertido
          </span>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              convertToLeadMutation.mutate(r.id);
            }}
            disabled={convertToLeadMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Convertir a Lead
          </button>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Web Scraper
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Búsqueda automatizada de leads potenciales en la web
          </p>
        </div>
        <button
          onClick={() => setShowNewJobForm(!showNewJobForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo Trabajo
        </button>
      </div>

      {/* New Job Form */}
      {showNewJobForm && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Crear Nuevo Trabajo de Scraping
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Palabra clave
              </label>
              <input
                type="text"
                value={newJob.keyword}
                onChange={(e) =>
                  setNewJob({ ...newJob, keyword: e.target.value })
                }
                placeholder="ej: abogado laboral santiago"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL base
              </label>
              <input
                type="url"
                value={newJob.base_url}
                onChange={(e) =>
                  setNewJob({ ...newJob, base_url: e.target.value })
                }
                placeholder="https://example.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Límite de páginas
              </label>
              <input
                type="number"
                value={newJob.page_limit}
                onChange={(e) =>
                  setNewJob({
                    ...newJob,
                    page_limit: parseInt(e.target.value) || 1,
                  })
                }
                min="1"
                max="50"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => createJobMutation.mutate(newJob)}
              disabled={
                createJobMutation.isPending ||
                !newJob.keyword.trim() ||
                !newJob.base_url.trim()
              }
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Play className="h-4 w-4" />
              {createJobMutation.isPending
                ? "Creando..."
                : "Iniciar Scraping"}
            </button>
            <button
              onClick={() => setShowNewJobForm(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Jobs List */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Trabajos de Scraping
          </h2>
        </div>

        {loadingJobs ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Globe}
              title="No hay trabajos"
              description="Crea un nuevo trabajo de scraping para buscar leads."
              actionLabel="Nuevo Trabajo"
              onAction={() => setShowNewJobForm(true)}
            />
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {jobs.map((job) => (
              <div key={job.id}>
                <button
                  onClick={() =>
                    setSelectedJobId(
                      selectedJobId === job.id ? null : job.id
                    )
                  }
                  className={cn(
                    "w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors text-left",
                    selectedJobId === job.id && "bg-blue-50"
                  )}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {getJobStatusIcon(job.status)}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">
                        {job.keyword}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {job.base_url}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        job.status === "completed" &&
                          "bg-green-100 text-green-700",
                        job.status === "running" &&
                          "bg-blue-100 text-blue-700",
                        job.status === "pending" &&
                          "bg-gray-100 text-gray-700",
                        job.status === "failed" && "bg-red-100 text-red-700"
                      )}
                    >
                      {getJobStatusLabel(job.status)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {job.results_count} resultados
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(job.created_at)}
                    </span>
                    {selectedJobId === job.id ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Job error message */}
                {job.error_message && selectedJobId === job.id && (
                  <div className="mx-6 mb-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    Error: {job.error_message}
                  </div>
                )}

                {/* Results Table */}
                {selectedJobId === job.id && (
                  <div className="border-t border-gray-100 bg-gray-50 p-6">
                    {job.results_count > 0 && (
                      <div className="mb-4 relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Filtrar resultados..."
                          value={searchResults}
                          onChange={(e) => setSearchResults(e.target.value)}
                          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                        />
                      </div>
                    )}

                    {loadingResults ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                      </div>
                    ) : filteredResults.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8">
                        No se encontraron resultados para este trabajo.
                      </p>
                    ) : (
                      <DataTable
                        columns={resultColumns}
                        data={filteredResults}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
