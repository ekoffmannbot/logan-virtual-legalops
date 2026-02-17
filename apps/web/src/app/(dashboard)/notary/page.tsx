"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Stamp,
  Search,
  Filter,
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatDate } from "@/lib/utils";
import { NOTARY_STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ProcessFlow } from "@/components/shared/process-flow";
import { documentosNotarialesProcess } from "@/lib/process-definitions";

interface NotaryDoc {
  id: string;
  client_name: string;
  document_type: string;
  status: string;
  notary_office: string | null;
  sent_at: string | null;
  notary_signed_at: string | null;
  client_signed_at: string | null;
  matter_id: string;
  matter_title: string;
  created_at: string;
}

export default function NotaryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["notary", statusFilter],
    queryFn: () =>
      api.get<NotaryDoc[]>(
        statusFilter !== "all"
          ? `/notary?status=${statusFilter}`
          : "/notary"
      ),
  });

  const { data: stats } = useQuery({
    queryKey: ["notary", "stats"],
    queryFn: () =>
      api.get<{
        total: number;
        pending: number;
        at_notary: number;
        completed: number;
      }>("/notary/stats"),
  });

  const filteredDocs = documents.filter(
    (doc) =>
      doc.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.document_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.notary_office?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      key: "client_name",
      label: "Cliente",
      render: (doc: NotaryDoc) => (
        <div>
          <p className="font-medium text-gray-900">{doc.client_name}</p>
          <p className="text-sm text-gray-500">{doc.matter_title}</p>
        </div>
      ),
    },
    {
      key: "document_type",
      label: "Tipo",
      render: (doc: NotaryDoc) => (
        <span className="text-sm text-gray-700">{doc.document_type}</span>
      ),
    },
    {
      key: "status",
      label: "Estado",
      render: (doc: NotaryDoc) => (
        <StatusBadge
          status={doc.status}
          labels={NOTARY_STATUS_LABELS}
          colors={STATUS_COLORS}
        />
      ),
    },
    {
      key: "notary_office",
      label: "Notaría",
      render: (doc: NotaryDoc) => (
        <span className="text-sm text-gray-700">
          {doc.notary_office || "—"}
        </span>
      ),
    },
    {
      key: "sent_at",
      label: "Enviado",
      render: (doc: NotaryDoc) => (
        <span className="text-sm text-gray-600">
          {doc.sent_at ? formatDate(doc.sent_at) : "—"}
        </span>
      ),
    },
    {
      key: "notary_signed_at",
      label: "Firmado Notaría",
      render: (doc: NotaryDoc) =>
        doc.notary_signed_at ? (
          <span className="inline-flex items-center gap-1 text-sm text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {formatDate(doc.notary_signed_at)}
          </span>
        ) : (
          <span className="text-sm text-gray-400">Pendiente</span>
        ),
    },
    {
      key: "client_signed_at",
      label: "Firmado Cliente",
      render: (doc: NotaryDoc) =>
        doc.client_signed_at ? (
          <span className="inline-flex items-center gap-1 text-sm text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {formatDate(doc.client_signed_at)}
          </span>
        ) : (
          <span className="text-sm text-gray-400">Pendiente</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Trámites Notariales
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Seguimiento de documentos en notarías
        </p>
      </div>

      {/* Process Flow */}
      <ProcessFlow process={documentosNotarialesProcess} />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Documentos"
            value={stats.total}
            icon={Stamp}
          />
          <StatCard
            title="Pendientes"
            value={stats.pending}
            icon={Clock}
            variant="warning"
          />
          <StatCard
            title="En Notaría"
            value={stats.at_notary}
            icon={Building}
            variant="info"
          />
          <StatCard
            title="Completados"
            value={stats.completed}
            icon={CheckCircle2}
            variant="success"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, tipo o notaría..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none rounded-lg border border-gray-300 py-2 pl-10 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">Todos los estados</option>
            {Object.entries(NOTARY_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : filteredDocs.length === 0 ? (
        <EmptyState
          icon={Stamp}
          title="No hay trámites notariales"
          description="No se encontraron documentos notariales."
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredDocs}
          onRowClick={(doc) => router.push(`/notary/${doc.id}`)}
        />
      )}
    </div>
  );
}
