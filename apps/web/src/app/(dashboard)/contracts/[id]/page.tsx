"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  ArrowLeft,
  User,
  Calendar,
  Building2,
  CheckCircle2,
  Upload,
  Send,
  ThumbsUp,
  RotateCcw,
  PenTool,
  ScanLine,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { CONTRACT_STATUS_LABELS, STATUS_COLORS } from "@/lib/constants";
import { StatusBadge } from "@/components/shared/status-badge";
import { Timeline } from "@/components/shared/timeline";
import { WorkflowActions } from "@/components/shared/workflow-actions";

interface ContractDetail {
  id: string;
  client_name: string;
  client_id: string;
  matter_id: string;
  matter_title: string;
  status: string;
  drafted_by: string;
  reviewed_by: string | null;
  signed: boolean;
  signed_at: string | null;
  scanned_document_url: string | null;
  content: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface TimelineEvent {
  id: string;
  action: string;
  description: string;
  user_name: string;
  created_at: string;
}

export default function ContractDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const contractId = params.id as string;
  const [scanFile, setScanFile] = useState<File | null>(null);

  const { data: contract, isLoading } = useQuery({
    queryKey: ["contracts", contractId],
    queryFn: () => api.get<ContractDetail>(`/contracts/${contractId}`),
  });

  const { data: rawTimeline = [] } = useQuery({
    queryKey: ["contracts", contractId, "timeline"],
    queryFn: () =>
      api.get<TimelineEvent[]>(`/contracts/${contractId}/timeline`),
  });

  const timeline = rawTimeline.map((e) => ({
    id: e.id,
    title: e.action,
    description: e.description,
    timestamp: e.created_at,
    type: "audit" as const,
    actor: e.user_name,
  }));

  const transitionMutation = useMutation({
    mutationFn: (action: string) =>
      api.post(`/contracts/${contractId}/transition`, { action }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts", contractId] });
      queryClient.invalidateQueries({
        queryKey: ["contracts", contractId, "timeline"],
      });
    },
  });

  const uploadScanMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.post(`/contracts/${contractId}/upload-scan`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts", contractId] });
      setScanFile(null);
    },
  });

  const handleAction = (actionId: string) => {
    if (actionId === "upload_scan" && scanFile) {
      uploadScanMutation.mutate(scanFile);
    } else {
      transitionMutation.mutate(actionId);
    }
  };

  const getWorkflowActions = () => {
    if (!contract) return [];

    const actions: Array<{
      id: string;
      label: string;
      icon: React.ElementType;
      variant?: "primary" | "success" | "warning" | "danger";
      disabled?: boolean;
    }> = [];

    switch (contract.status) {
      case "draft":
        actions.push({
          id: "submit_review",
          label: "Enviar a Revisión",
          icon: Send,
          variant: "primary",
        });
        break;
      case "in_review":
        actions.push({
          id: "approve",
          label: "Aprobar",
          icon: ThumbsUp,
          variant: "success",
        });
        actions.push({
          id: "request_changes",
          label: "Solicitar Cambios",
          icon: RotateCcw,
          variant: "warning",
        });
        break;
      case "approved":
        actions.push({
          id: "mark_signed",
          label: "Marcar Firmado",
          icon: PenTool,
          variant: "success",
        });
        break;
      case "signed":
        actions.push({
          id: "upload_scan",
          label: "Subir Escaneo",
          icon: ScanLine,
          variant: "primary",
        });
        break;
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

  if (!contract) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <FileText className="h-12 w-12 text-gray-400" />
        <h2 className="mt-4 text-lg font-medium text-gray-900">
          Contrato no encontrado
        </h2>
        <button
          onClick={() => router.push("/contracts")}
          className="mt-4 text-sm text-blue-600 hover:text-blue-700"
        >
          Volver a contratos
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/contracts")}
          className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">
              Contrato - {contract.client_name}
            </h1>
            <StatusBadge
              status={contract.status}
              labels={CONTRACT_STATUS_LABELS}
              colors={STATUS_COLORS}
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {contract.matter_title}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Contract Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Información del Contrato
            </h2>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Cliente
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {contract.client_name}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Caso
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {contract.matter_title}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <PenTool className="h-4 w-4" />
                  Redactado por
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {contract.drafted_by}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Revisado por
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {contract.reviewed_by || "Pendiente"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Fecha de creación
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDateTime(contract.created_at)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Última actualización
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDateTime(contract.updated_at)}
                </dd>
              </div>
              {contract.signed && contract.signed_at && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Firmado el
                  </dt>
                  <dd className="mt-1 text-sm text-green-700 font-medium">
                    {formatDateTime(contract.signed_at)}
                  </dd>
                </div>
              )}
              {contract.scanned_document_url && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Documento escaneado
                  </dt>
                  <dd className="mt-1">
                    <a
                      href={contract.scanned_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-700 underline"
                    >
                      Ver documento
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Contract Content */}
          {contract.content && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Contenido del Contrato
              </h2>
              <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                {contract.content}
              </div>
            </div>
          )}

          {/* Notes */}
          {contract.notes && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Notas
              </h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {contract.notes}
              </p>
            </div>
          )}

          {/* Upload Scan Section */}
          {contract.status === "signed" && !contract.scanned_document_url && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Subir Escaneo del Contrato Firmado
              </h2>
              <div className="flex items-center gap-4">
                <label className="flex-1">
                  <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 cursor-pointer hover:border-blue-400 transition-colors">
                    <div className="text-center">
                      <Upload className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">
                        {scanFile
                          ? scanFile.name
                          : "Seleccionar archivo PDF o imagen"}
                      </p>
                    </div>
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) =>
                      setScanFile(e.target.files?.[0] || null)
                    }
                  />
                </label>
                {scanFile && (
                  <button
                    onClick={() => uploadScanMutation.mutate(scanFile)}
                    disabled={uploadScanMutation.isPending}
                    className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {uploadScanMutation.isPending ? "Subiendo..." : "Subir"}
                  </button>
                )}
              </div>
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

        {/* Sidebar - Workflow Actions */}
        <div className="space-y-6">
          <WorkflowActions
            actions={getWorkflowActions()}
            onAction={handleAction}
            isLoading={
              transitionMutation.isPending || uploadScanMutation.isPending
            }
          />

          {/* Quick Info */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Resumen
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Estado</span>
                <StatusBadge
                  status={contract.status}
                  labels={CONTRACT_STATUS_LABELS}
                  colors={STATUS_COLORS}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Firmado</span>
                <span
                  className={cn(
                    "font-medium",
                    contract.signed ? "text-green-700" : "text-gray-400"
                  )}
                >
                  {contract.signed ? "Sí" : "No"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Escaneo</span>
                <span
                  className={cn(
                    "font-medium",
                    contract.scanned_document_url
                      ? "text-green-700"
                      : "text-gray-400"
                  )}
                >
                  {contract.scanned_document_url ? "Subido" : "Pendiente"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
