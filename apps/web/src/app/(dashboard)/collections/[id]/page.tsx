"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import { INVOICE_STATUS_LABELS } from "@/lib/constants";
import { ALL_PROCESSES } from "@/lib/process-definitions";
import {
  getProcessProgress,
  getAgentSuggestions,
  getNextActionLabel,
  getTimeUntil,
} from "@/lib/process-status-map";
import { WizardDetail } from "@/components/shared/wizard-detail";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Payment {
  id: string;
  amount: number;
  currency: string;
  method: string;
  notes: string | null;
  recorded_by: string;
  created_at: string;
}

interface CollectionCase {
  id: string;
  status: string;
  last_contact_at: string | null;
  next_action: string | null;
  next_action_date: string | null;
  attempts_count: number;
}

interface InvoiceDetail {
  id: string;
  invoice_number: string;
  client_name: string;
  amount: number;
  amount_paid: number;
  currency: string;
  status: string;
  due_date: string;
  issued_date: string;
  created_at: string;
  process_id: string;
  payments: Payment[];
  collection_case: CollectionCase | null;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const METHOD_LABELS: Record<string, string> = {
  transfer: "Transferencia",
  check: "Cheque",
  cash: "Efectivo",
  card: "Tarjeta",
};

/* ------------------------------------------------------------------ */
/* Page Component                                                      */
/* ------------------------------------------------------------------ */

export default function CollectionDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const invoiceId = params.id as string;

  // ---- Fetch ----
  const { data: invoice, isLoading, error } = useQuery({
    queryKey: ["collections", "invoice", invoiceId],
    queryFn: () =>
      api.get<InvoiceDetail>(`/collections/invoices/${invoiceId}`),
  });

  // ---- Mutation: payment registration ----
  const paymentMutation = useMutation({
    mutationFn: (data: { amount: number; method: string; notes: string }) =>
      api.post(`/collections/invoices/${invoiceId}/payments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["collections", "invoice", invoiceId],
      });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });

  // ---- Mutation: status transitions ----
  const transitionMutation = useMutation({
    mutationFn: (action: string) =>
      api.patch(`/collections/invoices/${invoiceId}`, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["collections", "invoice", invoiceId],
      });
      queryClient.invalidateQueries({ queryKey: ["collections"] });
    },
  });

  // ---- Loading ----
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ---- Error / not found ----
  if (error || !invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <p className="text-lg font-medium">Factura no encontrada</p>
        <p className="text-sm text-muted-foreground mt-1">
          No se pudo cargar la factura solicitada.
        </p>
      </div>
    );
  }

  // ---- Process progress ----
  const processId = invoice.process_id || "proceso-cobranza";
  const progress = getProcessProgress(processId, invoice.status);
  const processDef = ALL_PROCESSES["collections"];
  const suggestions = getAgentSuggestions(processId, invoice.status, invoice);
  const nextAction = getNextActionLabel(processId, invoice.status);

  // ---- Derived data ----
  const outstanding = invoice.amount - invoice.amount_paid;
  const dueText = getTimeUntil(invoice.due_date);
  const isOverdue = dueText.startsWith("Vencido");

  // ---- Info items ----
  const infoItems: Array<{ label: string; value: string | React.ReactNode }> = [
    {
      label: "Monto Total",
      value: formatCurrency(invoice.amount, invoice.currency),
    },
    {
      label: "Pagado",
      value: (
        <span className="text-green-700">
          {formatCurrency(invoice.amount_paid, invoice.currency)}
        </span>
      ),
    },
    {
      label: "Pendiente",
      value: (
        <span className={cn("font-bold", outstanding > 0 ? "text-red-600" : "text-green-600")}>
          {formatCurrency(outstanding, invoice.currency)}
        </span>
      ),
    },
    {
      label: "Vencimiento",
      value: (
        <span className={cn(isOverdue && "text-red-600 font-semibold")}>
          {formatDate(invoice.due_date)} ({dueText})
        </span>
      ),
    },
    ...(invoice.issued_date
      ? [{ label: "Emitida", value: formatDate(invoice.issued_date) }]
      : []),
  ];

  return (
    <WizardDetail
      backHref="/collections"
      backLabel="Volver a Cobranza"
      title={`${invoice.client_name} - ${invoice.invoice_number}`}
      statusLabel={INVOICE_STATUS_LABELS[invoice.status] || invoice.status}
      statusKey={invoice.status}
      progress={progress}
      processDefinition={processDef}
      agentSuggestions={suggestions}
      actionLabel={nextAction}
      onAction={() => transitionMutation.mutate(invoice.status)}
      actionLoading={transitionMutation.isPending || paymentMutation.isPending}
      infoItems={infoItems}
    >
      {/* ---- Historial de Pagos ---- */}
      {invoice.payments && invoice.payments.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            Historial de Pagos
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase">
                  <th className="pb-2 pr-4">Monto</th>
                  <th className="pb-2 pr-4">Metodo</th>
                  <th className="pb-2 pr-4">Registrado por</th>
                  <th className="pb-2 pr-4">Notas</th>
                  <th className="pb-2">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {invoice.payments.map((p) => (
                  <tr key={p.id} className="text-gray-700">
                    <td className="py-2 pr-4 font-medium">
                      {formatCurrency(p.amount, p.currency)}
                    </td>
                    <td className="py-2 pr-4">
                      {METHOD_LABELS[p.method] || p.method}
                    </td>
                    <td className="py-2 pr-4">{p.recorded_by}</td>
                    <td className="py-2 pr-4 text-gray-500">
                      {p.notes || "—"}
                    </td>
                    <td className="py-2 text-gray-500">
                      {formatDate(p.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- Caso de Cobranza ---- */}
      {invoice.collection_case && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">
            Caso de Cobranza
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Estado</p>
              <p className="mt-0.5 text-gray-900">
                {invoice.collection_case.status === "active"
                  ? "Activo"
                  : invoice.collection_case.status === "escalated"
                  ? "Escalado"
                  : "Resuelto"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">
                Intentos de contacto
              </p>
              <p className="mt-0.5 text-gray-900">
                {invoice.collection_case.attempts_count}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">
                Ultimo contacto
              </p>
              <p className="mt-0.5 text-gray-900">
                {invoice.collection_case.last_contact_at
                  ? formatDate(invoice.collection_case.last_contact_at)
                  : "Sin contacto"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">
                Proxima accion
              </p>
              <p className="mt-0.5 text-gray-900">
                {invoice.collection_case.next_action || "Sin accion programada"}
                {invoice.collection_case.next_action_date && (
                  <span className="text-gray-500 ml-1">
                    ({formatDate(invoice.collection_case.next_action_date)})
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </WizardDetail>
  );
}
