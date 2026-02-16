"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Receipt,
  ArrowLeft,
  User,
  Calendar,
  DollarSign,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  Phone,
  Send,
  FileText,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import { INVOICE_STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";
import { StatusBadge } from "@/components/shared/status-badge";
import { Timeline } from "@/components/shared/timeline";
import { WorkflowActions } from "@/components/shared/workflow-actions";

interface InvoiceDetail {
  id: string;
  invoice_number: string;
  client_name: string;
  client_id: string;
  matter_id: string;
  matter_title: string;
  amount: number;
  amount_paid: number;
  currency: string;
  due_date: string;
  status: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface Payment {
  id: string;
  amount: number;
  currency: string;
  method: string;
  notes: string | null;
  recorded_by: string;
  created_at: string;
}

interface CollectionCaseDetail {
  id: string;
  status: string;
  last_contact_at: string | null;
  next_action: string | null;
  next_action_date: string | null;
  attempts_count: number;
}

interface TimelineEvent {
  id: string;
  action: string;
  description: string;
  user_name: string;
  created_at: string;
}

export default function CollectionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const invoiceId = params.id as string;

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "transfer",
    notes: "",
  });

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["collections", "invoice", invoiceId],
    queryFn: () =>
      api.get<InvoiceDetail>(`/collections/invoices/${invoiceId}`),
  });

  const { data: payments = [] } = useQuery({
    queryKey: ["collections", "invoice", invoiceId, "payments"],
    queryFn: () =>
      api.get<Payment[]>(`/collections/invoices/${invoiceId}/payments`),
  });

  const { data: collectionCase } = useQuery({
    queryKey: ["collections", "invoice", invoiceId, "case"],
    queryFn: () =>
      api.get<CollectionCaseDetail>(
        `/collections/invoices/${invoiceId}/case`
      ),
  });

  const { data: rawTimeline = [] } = useQuery({
    queryKey: ["collections", "invoice", invoiceId, "timeline"],
    queryFn: () =>
      api.get<TimelineEvent[]>(
        `/collections/invoices/${invoiceId}/timeline`
      ),
  });
  const timeline = rawTimeline.map((e) => ({
    id: e.id,
    title: e.action,
    description: e.description,
    timestamp: e.created_at,
    type: "audit" as const,
    actor: e.user_name,
  }));

  const registerPaymentMutation = useMutation({
    mutationFn: (data: { amount: number; method: string; notes: string }) =>
      api.post(`/collections/invoices/${invoiceId}/payments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["collections", "invoice", invoiceId],
      });
      setShowPaymentForm(false);
      setPaymentForm({ amount: "", method: "transfer", notes: "" });
    },
  });

  const transitionMutation = useMutation({
    mutationFn: (action: string) =>
      api.post(`/collections/invoices/${invoiceId}/transition`, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["collections", "invoice", invoiceId],
      });
    },
  });

  const handleAction = (actionId: string) => {
    if (actionId === "register_payment") {
      setShowPaymentForm(true);
    } else {
      transitionMutation.mutate(actionId);
    }
  };

  const getWorkflowActions = () => {
    if (!invoice) return [];

    const actions: Array<{
      id: string;
      label: string;
      icon: React.ElementType;
      variant?: "primary" | "success" | "warning" | "danger";
    }> = [];

    if (invoice.status !== "paid") {
      actions.push({
        id: "register_payment",
        label: "Registrar Pago",
        icon: CreditCard,
        variant: "success",
      });
    }

    if (invoice.status === "pending" || invoice.status === "overdue") {
      actions.push({
        id: "send_reminder",
        label: "Enviar Recordatorio",
        icon: Send,
        variant: "warning",
      });
    }

    if (invoice.status === "overdue" && !collectionCase) {
      actions.push({
        id: "create_collection_case",
        label: "Iniciar Caso de Cobranza",
        icon: AlertCircle,
        variant: "danger",
      });
    }

    if (collectionCase && collectionCase.status === "active") {
      actions.push({
        id: "escalate_case",
        label: "Escalar Caso",
        icon: AlertCircle,
        variant: "danger",
      });
      actions.push({
        id: "log_contact",
        label: "Registrar Contacto",
        icon: Phone,
        variant: "primary",
      });
    }

    if (invoice.status !== "paid" && invoice.status !== "cancelled") {
      actions.push({
        id: "mark_cancelled",
        label: "Anular Factura",
        icon: FileText,
        variant: "danger",
      });
    }

    return actions;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Receipt className="h-12 w-12 text-gray-400" />
        <h2 className="mt-4 text-lg font-medium text-gray-900">
          Factura no encontrada
        </h2>
        <button
          onClick={() => router.push("/collections")}
          className="mt-4 text-sm text-blue-600 hover:text-blue-700"
        >
          Volver a cobranza
        </button>
      </div>
    );
  }

  const amountRemaining = invoice.amount - invoice.amount_paid;
  const paymentPercentage =
    invoice.amount > 0
      ? Math.round((invoice.amount_paid / invoice.amount) * 100)
      : 0;
  const isOverdue =
    new Date(invoice.due_date) < new Date() && invoice.status !== "paid";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/collections")}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              Factura #{invoice.invoice_number}
            </h1>
            <StatusBadge
              status={invoice.status}
              labels={INVOICE_STATUS_LABELS}
              colors={STATUS_COLORS}
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {invoice.client_name} - {invoice.matter_title}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Detail */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Detalle de Factura
            </h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Cliente
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {invoice.client_name}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Monto Total
                </dt>
                <dd className="mt-1 text-lg font-bold text-gray-900">
                  {formatCurrency(invoice.amount, invoice.currency)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Vencimiento
                </dt>
                <dd
                  className={cn(
                    "mt-1 text-sm font-medium",
                    isOverdue ? "text-red-600" : "text-gray-900"
                  )}
                >
                  {formatDate(invoice.due_date)}
                  {isOverdue && " (vencida)"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Fecha de emisión
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(invoice.created_at)}
                </dd>
              </div>
            </dl>

            {invoice.description && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500 font-medium">Descripción</p>
                <p className="mt-1 text-sm text-gray-700">
                  {invoice.description}
                </p>
              </div>
            )}

            {/* Payment Progress */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Progreso de pago
                </span>
                <span className="text-sm text-gray-500">
                  {paymentPercentage}%
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-gray-200 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    paymentPercentage >= 100
                      ? "bg-green-500"
                      : paymentPercentage >= 50
                      ? "bg-blue-500"
                      : "bg-yellow-500"
                  )}
                  style={{ width: `${Math.min(paymentPercentage, 100)}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  Pagado: {formatCurrency(invoice.amount_paid, invoice.currency)}
                </span>
                <span className="font-medium text-gray-900">
                  Pendiente:{" "}
                  {formatCurrency(amountRemaining, invoice.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          {showPaymentForm && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Registrar Pago
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto
                  </label>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        amount: e.target.value,
                      })
                    }
                    placeholder={amountRemaining.toFixed(2)}
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
                    value={paymentForm.method}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        method: e.target.value,
                      })
                    }
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
                    value={paymentForm.notes}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        notes: e.target.value,
                      })
                    }
                    placeholder="Referencia de pago..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => {
                    if (
                      paymentForm.amount &&
                      parseFloat(paymentForm.amount) > 0
                    ) {
                      registerPaymentMutation.mutate({
                        amount: parseFloat(paymentForm.amount),
                        method: paymentForm.method,
                        notes: paymentForm.notes,
                      });
                    }
                  }}
                  disabled={
                    registerPaymentMutation.isPending ||
                    !paymentForm.amount ||
                    parseFloat(paymentForm.amount) <= 0
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {registerPaymentMutation.isPending
                    ? "Registrando..."
                    : "Confirmar Pago"}
                </button>
                <button
                  onClick={() => setShowPaymentForm(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Payment History */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Historial de Pagos
            </h2>
            {payments.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">
                No se han registrado pagos para esta factura.
              </p>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-green-100 p-2">
                        <CreditCard className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(payment.amount, payment.currency)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {payment.method === "transfer"
                            ? "Transferencia"
                            : payment.method === "check"
                            ? "Cheque"
                            : payment.method === "cash"
                            ? "Efectivo"
                            : "Tarjeta"}{" "}
                          - {payment.recorded_by}
                        </p>
                        {payment.notes && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {payment.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDateTime(payment.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Collection Case Status */}
          {collectionCase && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Caso de Cobranza
              </h2>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Estado</dt>
                  <dd className="mt-1">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        collectionCase.status === "active"
                          ? "bg-yellow-100 text-yellow-700"
                          : collectionCase.status === "escalated"
                          ? "bg-red-100 text-red-700"
                          : "bg-green-100 text-green-700"
                      )}
                    >
                      {collectionCase.status === "active"
                        ? "Activo"
                        : collectionCase.status === "escalated"
                        ? "Escalado"
                        : "Resuelto"}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Intentos de contacto
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {collectionCase.attempts_count}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Último contacto
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {collectionCase.last_contact_at
                      ? formatDateTime(collectionCase.last_contact_at)
                      : "Sin contacto"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Próxima acción
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {collectionCase.next_action || "Sin acción programada"}
                    {collectionCase.next_action_date && (
                      <span className="text-gray-500 ml-1">
                        ({formatDate(collectionCase.next_action_date)})
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {/* Timeline */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Historial de Actividad
            </h2>
            <Timeline events={timeline} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <WorkflowActions
            actions={getWorkflowActions()}
            onAction={handleAction}
            isLoading={
              transitionMutation.isPending ||
              registerPaymentMutation.isPending
            }
          />

          {/* Summary */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Resumen Financiero
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Total</span>
                <span className="font-bold text-gray-900">
                  {formatCurrency(invoice.amount, invoice.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Pagado</span>
                <span className="font-medium text-green-700">
                  {formatCurrency(invoice.amount_paid, invoice.currency)}
                </span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex items-center justify-between text-sm">
                <span className="text-gray-500">Pendiente</span>
                <span
                  className={cn(
                    "font-bold",
                    amountRemaining > 0 ? "text-red-600" : "text-green-600"
                  )}
                >
                  {formatCurrency(amountRemaining, invoice.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Pagos registrados</span>
                <span className="font-medium text-gray-900">
                  {payments.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
