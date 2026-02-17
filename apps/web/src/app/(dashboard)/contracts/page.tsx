"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  FileText,
  Plus,
  Search,
  Filter,
  ChevronDown,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatDate } from "@/lib/utils";
import { CONTRACT_STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ProcessFlow } from "@/components/shared/process-flow";
import { contratoMandatoProcess } from "@/lib/process-definitions";

interface Contract {
  id: string;
  client_name: string;
  status: string;
  drafted_by: string;
  reviewed_by: string | null;
  signed: boolean;
  signed_at: string | null;
  created_at: string;
  matter_id: string;
  matter_title: string;
}

export default function ContractsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["contracts", statusFilter],
    queryFn: () =>
      api.get<Contract[]>(statusFilter !== "all" ? `/contracts?status=${statusFilter}` : "/contracts"),
  });

  const { data: stats } = useQuery({
    queryKey: ["contracts", "stats"],
    queryFn: () =>
      api.get<{
        total: number;
        draft: number;
        in_review: number;
        signed: number;
        pending_signature: number;
      }>("/contracts/stats"),
  });

  const filteredContracts = contracts.filter((contract) =>
    contract.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.matter_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns = [
    {
      key: "client_name",
      label: "Cliente",
      render: (contract: Contract) => (
        <div>
          <p className="font-medium text-gray-900">{contract.client_name}</p>
          <p className="text-sm text-gray-500">{contract.matter_title}</p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Estado",
      render: (contract: Contract) => (
        <StatusBadge
          status={contract.status}
          labels={CONTRACT_STATUS_LABELS}
          colors={STATUS_COLORS}
        />
      ),
    },
    {
      key: "drafted_by",
      label: "Redactado por",
      render: (contract: Contract) => (
        <span className="text-sm text-gray-700">{contract.drafted_by}</span>
      ),
    },
    {
      key: "reviewed_by",
      label: "Revisado por",
      render: (contract: Contract) => (
        <span className="text-sm text-gray-700">
          {contract.reviewed_by || "—"}
        </span>
      ),
    },
    {
      key: "signed",
      label: "Firmado",
      render: (contract: Contract) =>
        contract.signed ? (
          <span className="inline-flex items-center gap-1 text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Sí
          </span>
        ) : (
          <span className="text-gray-400">No</span>
        ),
    },
    {
      key: "created_at",
      label: "Fecha",
      render: (contract: Contract) => (
        <span className="text-sm text-gray-600">
          {formatDate(contract.created_at)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contratos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestión de contratos y documentos legales
          </p>
        </div>
        <button
          onClick={() => router.push("/contracts/new")}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nuevo Contrato
        </button>
      </div>

      {/* Process Flow */}
      <ProcessFlow process={contratoMandatoProcess} />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Contratos"
            value={stats.total}
            icon={FileText}
          />
          <StatCard
            title="En Borrador"
            value={stats.draft}
            icon={Clock}
            variant="warning"
          />
          <StatCard
            title="En Revisión"
            value={stats.in_review}
            icon={AlertCircle}
            variant="info"
          />
          <StatCard
            title="Firmados"
            value={stats.signed}
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
            placeholder="Buscar contratos..."
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
            {Object.entries(CONTRACT_STATUS_LABELS).map(([value, label]) => (
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
      ) : filteredContracts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No hay contratos"
          description="Crea tu primer contrato para comenzar."
          actionLabel="Nuevo Contrato"
          onAction={() => router.push("/contracts/new")}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredContracts}
          onRowClick={(contract) => router.push(`/contracts/${contract.id}`)}
        />
      )}
    </div>
  );
}
