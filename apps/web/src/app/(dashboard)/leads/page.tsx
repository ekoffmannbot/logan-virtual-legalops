"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { LEAD_STATUS_LABELS, LEAD_SOURCE_LABELS } from "@/lib/constants";
import { DataTable, Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { UserPlus, Plus, Loader2, X, AlertCircle } from "lucide-react";

interface Lead {
  id: number;
  full_name: string;
  source: string;
  status: string;
  phone?: string;
  email?: string;
  assigned_to_name?: string;
  created_at: string;
}

interface CreateLeadPayload {
  full_name: string;
  email?: string;
  phone?: string;
  source: string;
  notes?: string;
}

export default function LeadsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState<CreateLeadPayload>({
    full_name: "",
    email: "",
    phone: "",
    source: "inbound_call",
    notes: "",
  });
  const [formError, setFormError] = useState("");

  const { data, isLoading, error } = useQuery<{ items: Lead[]; total: number }>({
    queryKey: ["leads"],
    queryFn: () => api.get("/leads"),
  });
  const leads = data?.items ?? [];

  const createMutation = useMutation({
    mutationFn: (payload: CreateLeadPayload) => api.post("/leads", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      setShowCreate(false);
      setFormData({ full_name: "", email: "", phone: "", source: "inbound_call", notes: "" });
      setFormError("");
    },
    onError: (err: any) => {
      setFormError(err.message || "Error al crear el lead");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      setFormError("El nombre es obligatorio");
      return;
    }
    setFormError("");
    createMutation.mutate(formData);
  };

  const columns: Column<Lead>[] = [
    {
      key: "full_name",
      label: "Nombre",
      sortable: true,
      render: (lead) => <span className="font-medium">{lead.full_name}</span>,
    },
    {
      key: "source",
      label: "Fuente",
      render: (lead) => LEAD_SOURCE_LABELS[lead.source] || lead.source,
    },
    {
      key: "status",
      label: "Estado",
      render: (lead) => (
        <StatusBadge
          status={lead.status}
          label={LEAD_STATUS_LABELS[lead.status] || lead.status}
        />
      ),
    },
    {
      key: "phone",
      label: "Telefono",
      render: (lead) => lead.phone || "-",
    },
    {
      key: "assigned_to_name",
      label: "Asignado",
      render: (lead) => lead.assigned_to_name || "-",
    },
    {
      key: "created_at",
      label: "Fecha",
      sortable: true,
      render: (lead) => formatDate(lead.created_at),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-10 w-10 text-destructive mb-3" />
        <p className="text-lg font-medium">Error al cargar los leads</p>
        <p className="text-sm text-muted-foreground mt-1">
          No se pudo obtener la informacion. Intente nuevamente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground">Gestion de prospectos y oportunidades</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nuevo Lead
        </button>
      </div>

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <div className="relative z-50 w-full max-w-lg rounded-xl border bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Nuevo Lead</h2>
              <button onClick={() => setShowCreate(false)} className="rounded-lg p-1 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre completo *</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="Nombre del prospecto"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="email@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Telefono</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="+56 9 1234 5678"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Fuente</label>
                <select
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  {Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notas</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  rows={3}
                  placeholder="Notas adicionales..."
                />
              </div>
              {formError && (
                <p className="text-sm text-destructive">{formError}</p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Crear Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {leads.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="No hay leads"
          description="Agrega tu primer prospecto para comenzar a gestionar oportunidades."
          action={
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Nuevo Lead
            </button>
          }
        />
      ) : (
        <DataTable
          data={leads}
          columns={columns}
          searchKey="full_name"
          searchPlaceholder="Buscar por nombre..."
          onRowClick={(lead) => router.push(`/leads/${lead.id}`)}
        />
      )}
    </div>
  );
}
