"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DollarSign,
  Search,
  Filter,
  ChevronDown,
  CreditCard,
  AlertCircle,
  Clock,
  CheckCircle2,
  Receipt,
  Briefcase,
  Calendar,
  Phone,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import {
  INVOICE_STATUS_LABELS,
  STATUS_COLORS,
} from "@/lib/constants";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";

interface Invoice {
  id: string;
  client_name: string;
  amount: number;
  currency: string;
  due_date: string;
  status: string;
  matter_title: string;
  invoice_number: string;
  created_at: string;
}

interface CollectionCase {
  id: string;
  invoice_id: string;
  invoice_number: string;
  client_name: string;
  status: string;
  last_contact_at: string | null;
  next_action: string | null;
  next_action_date: string | null;
  amount_owed: number;
  currency: string;
}

export default function CollectionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"invoices" | "cases">("invoices");
  const [searchTerm, setSearchTerm] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>("all");
  const [showPaymentForm, setShowPaymentForm] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("transfer");
  const [paymentNotes, setPaymentNotes] = useState("");

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ["collections", "invoices", invoiceStatusFilter],
    queryFn: () =>
      api.get<Invoice[]>(
        invoiceStatusFilter !== "all"
          ? `/collections/invoices?status=${invoiceStatusFilter}`
          : "/collections/invoices"
      ),
  });

  const { data: collectionCases = [], isLoading: loadingCases } = useQuery({
    queryKey: ["collections", "cases"],
    queryFn: () => api.get<CollectionCase[]>("/collections/cases"),
  });

  const { data: stats } = useQuery({
    queryKey: ["collections", "stats"],
    queryFn: () =>
      api.get<{
        total_invoices: number;
        total_outstanding: number;
        total_overdue: number;
        active_cases: number;
      }>("/collections/stats"),
  });

  const registerPaymentMutation = useMutation({
    mutationFn: ({
      invoiceId,
      data,
    }: {
      invoiceId: string;
      data: { amount: number; method: string; notes: string };
    }) => api.post(`/collections/invoices/${invoiceId}/payments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      setShowPaymentForm(null);
      setPaymentAmount("");
      setPaymentMethod("transfer");
      setPaymentNotes("");
    },
  });

  const handleRegisterPayment = (invoiceId: string) => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) return;
    registerPaymentMutation.mutate({
      invoiceId,
      data: {
        amount: parseFloat(paymentAmount),
        method: paymentMethod,
        notes: paymentNotes,
      },
    });
  };

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCases = collectionCases.filter((c) =>
    c.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const invoiceColumns = [
    {
      key: "client_name",
      label: "Cliente",
      render: (inv: Invoice) => (
        <div>
          <p className="font-medium text-gray-900">{inv.client_name}</p>
          <p className="text-sm text-gray-500">#{inv.invoice_number}</p>
        </div>
      ),
    },
    {
      key: "amount",
      label: "Monto",
      render: (inv: Invoice) => (
        <span className="font-medium text-gray-900">
          {formatCurrency(inv.amount, inv.currency)}
        </span>
      ),
    },
    {
      key: "due_date",
      label: "Vencimiento",
      render: (inv: Invoice) => {
        const isOverdue =
          new Date(inv.due_date) < new Date() && inv.status !== "paid";
        return (
          <span
            className={cn(
              "text-sm",
              isOverdue ? "text-red-600 font-medium" : "text-gray-600"
            )}
          >
            {formatDate(inv.due_date)}
            {isOverdue && (
              <span className="ml-1 text-xs">(vencida)</span>
            )}
          </span>
        );
      },
    },
    {
      key: "status",
      label: "Estado",
      render: (inv: Invoice) => (
        <StatusBadge
          status={inv.status}
          labels={INVOICE_STATUS_LABELS}
          colors={STATUS_COLORS}
        />
      ),
    },
    {
      key: "actions",
      label: "",
      render: (inv: Invoice) =>
        inv.status !== "paid" ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowPaymentForm(
                showPaymentForm === inv.id ? null : inv.id
              );
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
          >
            <CreditCard className="h-3.5 w-3.5" />
            Registrar Pago
          </button>
        ) : null,
    },
  ];

  const caseColumns = [
    {
      key: "invoice_number",
      label: "Factura",
      render: (c: CollectionCase) => (
        <div>
          <p className="font-medium text-gray-900">{c.client_name}</p>
          <p className="text-sm text-gray-500">#{c.invoice_number}</p>
        </div>
      ),
    },
    {
      key: "amount_owed",
      label: "Monto",
      render: (c: CollectionCase) => (
        <span className="font-medium text-gray-900">
          {formatCurrency(c.amount_owed, c.currency)}
        </span>
      ),
    },
    {
      key: "status",
      label: "Estado",
      render: (c: CollectionCase) => (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
            c.status === "active"
              ? "bg-yellow-100 text-yellow-700"
              : c.status === "escalated"
              ? "bg-red-100 text-red-700"
              : c.status === "resolved"
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-700"
          )}
        >
          {c.status === "active"
            ? "Activo"
            : c.status === "escalated"
            ? "Escalado"
            : c.status === "resolved"
            ? "Resuelto"
            : c.status}
        </span>
      ),
    },
    {
      key: "last_contact_at",
      label: "Último contacto",
      render: (c: CollectionCase) => (
        <span className="text-sm text-gray-600">
          {c.last_contact_at ? formatDate(c.last_contact_at) : "Sin contacto"}
        </span>
      ),
    },
    {
      key: "next_action",
      label: "Próxima acción",
      render: (c: CollectionCase) => (
        <div>
          <p className="text-sm text-gray-700">
            {c.next_action || "Sin acción programada"}
          </p>
          {c.next_action_date && (
            <p className="text-xs text-gray-500">
              {formatDate(c.next_action_date)}
            </p>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cobranza</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestión de facturas y casos de cobranza
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Facturas"
            value={stats.total_invoices}
            icon={Receipt}
          />
          <StatCard
            title="Monto Pendiente"
            value={formatCurrency(stats.total_outstanding)}
            icon={DollarSign}
            variant="warning"
          />
          <StatCard
            title="Facturas Vencidas"
            value={stats.total_overdue}
            icon={AlertCircle}
            variant="danger"
          />
          <StatCard
            title="Casos Activos"
            value={stats.active_cases}
            icon={Briefcase}
            variant="info"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab("invoices")}
            className={cn(
              "pb-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === "invoices"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            <span className="inline-flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Facturas
            </span>
          </button>
          <button
            onClick={() => setActiveTab("cases")}
            className={cn(
              "pb-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === "cases"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            <span className="inline-flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Casos de Cobranza
            </span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente o número de factura..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        {activeTab === "invoices" && (
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <select
              value={invoiceStatusFilter}
              onChange={(e) => setInvoiceStatusFilter(e.target.value)}
              className="appearance-none rounded-lg border border-gray-300 py-2 pl-10 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Todos los estados</option>
              {Object.entries(INVOICE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        )}
      </div>

      {/* Content */}
      {activeTab === "invoices" && (
        <>
          {loadingInvoices ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No hay facturas"
              description="No se encontraron facturas con los filtros aplicados."
            />
          ) : (
            <div className="space-y-2">
              <DataTable
                columns={invoiceColumns}
                data={filteredInvoices}
                onRowClick={(inv) => router.push(`/collections/${inv.id}`)}
              />

              {/* Payment Form Modal */}
              {showPaymentForm && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Registrar Pago
                  </h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Monto
                      </label>
                      <input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Método de pago
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="transfer">Transferencia</option>
                        <option value="check">Cheque</option>
                        <option value="cash">Efectivo</option>
                        <option value="card">Tarjeta</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notas
                      </label>
                      <input
                        type="text"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        placeholder="Referencia, número de cheque, etc."
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={() =>
                        handleRegisterPayment(showPaymentForm)
                      }
                      disabled={
                        registerPaymentMutation.isPending ||
                        !paymentAmount ||
                        parseFloat(paymentAmount) <= 0
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {registerPaymentMutation.isPending
                        ? "Registrando..."
                        : "Confirmar Pago"}
                    </button>
                    <button
                      onClick={() => setShowPaymentForm(null)}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === "cases" && (
        <>
          {loadingCases ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : filteredCases.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No hay casos de cobranza"
              description="No se encontraron casos de cobranza activos."
            />
          ) : (
            <DataTable
              columns={caseColumns}
              data={filteredCases}
              onRowClick={(c) => router.push(`/collections/${c.invoice_id}`)}
            />
          )}
        </>
      )}
    </div>
  );
}
