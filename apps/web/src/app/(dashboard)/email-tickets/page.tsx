"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Mail,
  Search,
  Filter,
  ChevronDown,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  User,
  Inbox,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { EMAIL_TICKET_STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ProcessFlow } from "@/components/shared/process-flow";
import { respuestaCorreosProcess } from "@/lib/process-definitions";

interface EmailTicket {
  id: string;
  subject: string;
  from_email: string;
  from_name: string;
  received_at: string;
  status: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  sla_24h_deadline: string;
  sla_48h_deadline: string;
  sla_24h_met: boolean | null;
  sla_48h_met: boolean | null;
  created_at: string;
}

function getSlaStatus(deadline: string, met: boolean | null): "ok" | "warning" | "breached" | "met" {
  if (met === true) return "met";
  if (met === false) return "breached";

  const now = new Date();
  const deadlineDate = new Date(deadline);
  const hoursRemaining = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursRemaining <= 0) return "breached";
  if (hoursRemaining <= 4) return "warning";
  return "ok";
}

function SlaIndicator({
  deadline,
  met,
  label,
}: {
  deadline: string;
  met: boolean | null;
  label: string;
}) {
  const status = getSlaStatus(deadline, met);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        status === "met" && "bg-green-100 text-green-700",
        status === "ok" && "bg-blue-100 text-blue-700",
        status === "warning" && "bg-yellow-100 text-yellow-700",
        status === "breached" && "bg-red-100 text-red-700"
      )}
    >
      {status === "met" && <CheckCircle2 className="h-3 w-3" />}
      {status === "ok" && <Clock className="h-3 w-3" />}
      {status === "warning" && <AlertTriangle className="h-3 w-3" />}
      {status === "breached" && <XCircle className="h-3 w-3" />}
      {label}
    </div>
  );
}

export default function EmailTicketsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["email-tickets", statusFilter],
    queryFn: () =>
      api.get<EmailTicket[]>(
        statusFilter !== "all"
          ? `/email-tickets?status=${statusFilter}`
          : "/email-tickets"
      ),
  });

  const { data: stats } = useQuery({
    queryKey: ["email-tickets", "stats"],
    queryFn: () =>
      api.get<{
        total: number;
        open: number;
        sla_at_risk: number;
        sla_breached: number;
        unassigned: number;
      }>("/email-tickets/stats"),
  });

  const filteredTickets = tickets.filter(
    (ticket) =>
      ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.from_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.from_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRowClassName = (ticket: EmailTicket): string => {
    const sla24 = getSlaStatus(ticket.sla_24h_deadline, ticket.sla_24h_met);
    const sla48 = getSlaStatus(ticket.sla_48h_deadline, ticket.sla_48h_met);

    if (sla24 === "breached" || sla48 === "breached") {
      return "bg-red-50 hover:bg-red-100";
    }
    if (sla24 === "warning" || sla48 === "warning") {
      return "bg-yellow-50 hover:bg-yellow-100";
    }
    return "";
  };

  const columns = [
    {
      key: "subject",
      label: "Asunto",
      render: (ticket: EmailTicket) => (
        <div className="max-w-xs">
          <p className="font-medium text-gray-900 truncate">
            {ticket.subject}
          </p>
        </div>
      ),
    },
    {
      key: "from_name",
      label: "De",
      render: (ticket: EmailTicket) => (
        <div>
          <p className="text-sm text-gray-900">{ticket.from_name}</p>
          <p className="text-xs text-gray-500">{ticket.from_email}</p>
        </div>
      ),
    },
    {
      key: "received_at",
      label: "Recibido",
      render: (ticket: EmailTicket) => (
        <span className="text-sm text-gray-600">
          {formatDateTime(ticket.received_at)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Estado",
      render: (ticket: EmailTicket) => (
        <StatusBadge
          status={ticket.status}
          labels={EMAIL_TICKET_STATUS_LABELS}
          colors={STATUS_COLORS}
        />
      ),
    },
    {
      key: "sla_24h",
      label: "SLA 24h",
      render: (ticket: EmailTicket) => (
        <SlaIndicator
          deadline={ticket.sla_24h_deadline}
          met={ticket.sla_24h_met}
          label="24h"
        />
      ),
    },
    {
      key: "sla_48h",
      label: "SLA 48h",
      render: (ticket: EmailTicket) => (
        <SlaIndicator
          deadline={ticket.sla_48h_deadline}
          met={ticket.sla_48h_met}
          label="48h"
        />
      ),
    },
    {
      key: "assigned_to",
      label: "Asignado",
      render: (ticket: EmailTicket) => (
        <span className="text-sm text-gray-700">
          {ticket.assigned_to_name || (
            <span className="text-orange-600 font-medium">Sin asignar</span>
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Tickets de Email
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestión de correos entrantes con seguimiento de SLA
        </p>
      </div>

      {/* Process Flow */}
      <ProcessFlow process={respuestaCorreosProcess} />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Tickets Abiertos"
            value={stats.open}
            icon={Inbox}
          />
          <StatCard
            title="Sin Asignar"
            value={stats.unassigned}
            icon={User}
            variant="warning"
          />
          <StatCard
            title="SLA en Riesgo"
            value={stats.sla_at_risk}
            icon={AlertTriangle}
            variant="warning"
          />
          <StatCard
            title="SLA Incumplido"
            value={stats.sla_breached}
            icon={XCircle}
            variant="danger"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por asunto, remitente..."
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
            {Object.entries(EMAIL_TICKET_STATUS_LABELS).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : filteredTickets.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No hay tickets"
          description="No se encontraron tickets de email con los filtros aplicados."
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredTickets}
          onRowClick={(ticket) =>
            router.push(`/email-tickets/${ticket.id}`)
          }
          rowClassName={getRowClassName}
        />
      )}
    </div>
  );
}
