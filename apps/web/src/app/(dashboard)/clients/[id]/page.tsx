"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { cn, formatDate, formatRut, formatCurrency } from "@/lib/utils";
import { MATTER_STATUS_LABELS, MATTER_TYPE_LABELS } from "@/lib/constants";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  User,
  CreditCard,
  Briefcase,
  FileText,
  MessageSquare,
  FolderOpen,
} from "lucide-react";

interface ClientDetail {
  id: number;
  full_name: string;
  rut?: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
  matters: Array<{
    id: number;
    title: string;
    matter_type: string;
    status: string;
    created_at: string;
  }>;
  documents: Array<{
    id: number;
    filename: string;
    doc_type?: string;
    uploaded_at: string;
  }>;
  communications: Array<{
    id: number;
    channel: string;
    subject?: string;
    snippet?: string;
    sent_at: string;
    direction: string;
  }>;
}

type TabKey = "matters" | "documents" | "communications";

const TABS: Array<{ key: TabKey; label: string; icon: React.ElementType }> = [
  { key: "matters", label: "Casos", icon: Briefcase },
  { key: "documents", label: "Documentos", icon: FolderOpen },
  { key: "communications", label: "Comunicaciones", icon: MessageSquare },
];

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabKey>("matters");

  const { data: client, isLoading, error } = useQuery<ClientDetail>({
    queryKey: ["client", clientId],
    queryFn: () => api.get(`/clients/${clientId}/360`),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <p className="text-lg font-medium">Error al cargar el cliente</p>
        <p className="text-sm text-muted-foreground mt-1">
          No se encontro el cliente solicitado.
        </p>
        <button
          onClick={() => router.push("/clients")}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Clientes
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/clients")}
          className="rounded-lg border p-2 hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{client.full_name}</h1>
          <p className="text-muted-foreground">
            Cliente #{client.id} · Desde {formatDate(client.created_at)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Client Info Sidebar */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border bg-white p-6">
            <h3 className="text-base font-semibold mb-4">Informacion del Cliente</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Nombre</p>
                  <p className="text-sm font-medium">{client.full_name}</p>
                </div>
              </div>
              {client.rut && (
                <div className="flex items-start gap-3">
                  <CreditCard className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">RUT</p>
                    <p className="text-sm">{formatRut(client.rut)}</p>
                  </div>
                </div>
              )}
              {client.email && (
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm">{client.email}</p>
                  </div>
                </div>
              )}
              {client.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Telefono</p>
                    <p className="text-sm">{client.phone}</p>
                  </div>
                </div>
              )}
              {client.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Direccion</p>
                    <p className="text-sm">{client.address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs Content */}
        <div className="lg:col-span-3">
          {/* Tab Navigation */}
          <div className="flex gap-1 rounded-lg border bg-white p-1 mb-4">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "flex-1 inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    activeTab === tab.key
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab: Casos */}
          {activeTab === "matters" && (
            <div className="rounded-xl border bg-white">
              {client.matters.length === 0 ? (
                <EmptyState
                  icon={Briefcase}
                  title="Sin casos"
                  description="Este cliente no tiene casos asociados."
                />
              ) : (
                <div className="divide-y">
                  {client.matters.map((matter) => (
                    <div
                      key={matter.id}
                      className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => router.push(`/matters/${matter.id}`)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{matter.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {MATTER_TYPE_LABELS[matter.matter_type] || matter.matter_type} · {formatDate(matter.created_at)}
                        </p>
                      </div>
                      <StatusBadge
                        status={matter.status}
                        label={MATTER_STATUS_LABELS[matter.status] || matter.status}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Documentos */}
          {activeTab === "documents" && (
            <div className="rounded-xl border bg-white">
              {client.documents.length === 0 ? (
                <EmptyState
                  icon={FolderOpen}
                  title="Sin documentos"
                  description="No hay documentos asociados a este cliente."
                />
              ) : (
                <div className="divide-y">
                  {client.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{doc.filename}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.doc_type || "Documento"} · {formatDate(doc.uploaded_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab: Comunicaciones */}
          {activeTab === "communications" && (
            <div className="rounded-xl border bg-white">
              {client.communications.length === 0 ? (
                <EmptyState
                  icon={MessageSquare}
                  title="Sin comunicaciones"
                  description="No hay comunicaciones registradas con este cliente."
                />
              ) : (
                <div className="divide-y">
                  {client.communications.map((comm) => (
                    <div key={comm.id} className="p-4">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                            comm.direction === "inbound"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-green-100 text-green-800"
                          )}>
                            {comm.direction === "inbound" ? "Recibido" : "Enviado"}
                          </span>
                          <span className="text-xs text-muted-foreground capitalize">{comm.channel}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(comm.sent_at)}
                        </span>
                      </div>
                      {comm.subject && (
                        <p className="text-sm font-medium">{comm.subject}</p>
                      )}
                      {comm.snippet && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {comm.snippet}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
