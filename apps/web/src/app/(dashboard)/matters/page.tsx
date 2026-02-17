"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { MATTER_STATUS_LABELS, MATTER_TYPE_LABELS } from "@/lib/constants";
import { DataTable, Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Briefcase, Plus, Loader2, X, AlertCircle, Filter } from "lucide-react";
import { ProcessFlow } from "@/components/shared/process-flow";
import { causasJPLProcess } from "@/lib/process-definitions";

interface Matter {
  id: number;
  title: string;
  client_name: string;
  client_id: number;
  matter_type: string;
  status: string;
  assigned_lawyer_name?: string;
  created_at: string;
}

interface CreateMatterPayload {
  title: string;
  client_id: number;
  matter_type: string;
  description?: string;
}

export default function MattersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [formData, setFormData] = useState<CreateMatterPayload>({
    title: "",
    client_id: 0,
    matter_type: "civil",
    description: "",
  });
  const [formError, setFormError] = useState("");

  const { data, isLoading, error } = useQuery<{ items: Matter[]; total: number }>({
    queryKey: ["matters"],
    queryFn: () => api.get("/matters"),
  });
  const matters = data?.items ?? [];

  const createMutation = useMutation({
    mutationFn: (payload: CreateMatterPayload) => api.post("/matters", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matters"] });
      setShowCreate(false);
      setFormData({ title: "", client_id: 0, matter_type: "civil", description: "" });
      setFormError("");
    },
    onError: (err: any) => {
      setFormError(err.message || "Error al crear el caso");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError("El titulo es obligatorio");
      return;
    }
    if (!formData.client_id) {
      setFormError("El cliente es obligatorio");
      return;
    }
    setFormError("");
    createMutation.mutate(formData);
  };

  const filteredMatters = matters.filter((m) => {
    if (statusFilter && m.status !== statusFilter) return false;
    if (typeFilter && m.matter_type !== typeFilter) return false;
    return true;
  });

  const columns: Column<Matter>[] = [
    {
      key: "title",
      label: "Titulo",
      sortable: true,
      render: (matter) => <span className="font-medium">{matter.title}</span>,
    },
    {
      key: "client_name",
      label: "Cliente",
      sortable: true,
      render: (matter) => matter.client_name,
    },
    {
      key: "matter_type",
      label: "Tipo",
      render: (matter) => MATTER_TYPE_LABELS[matter.matter_type] || matter.matter_type,
    },
    {
      key: "status",
      label: "Estado",
      render: (matter) => (
        <StatusBadge
          status={matter.status}
          label={MATTER_STATUS_LABELS[matter.status] || matter.status}
        />
      ),
    },
    {
      key: "assigned_lawyer_name",
      label: "Abogado",
      render: (matter) => matter.assigned_lawyer_name || "-",
    },
    {
      key: "created_at",
      label: "Fecha",
      sortable: true,
      render: (matter) => formatDate(matter.created_at),
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
        <p className="text-lg font-medium">Error al cargar los casos</p>
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
          <h1 className="text-2xl font-bold">Casos</h1>
          <p className="text-muted-foreground">Gestion de causas y materias legales</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nuevo Caso
        </button>
      </div>

      {/* Process Flow */}
      <ProcessFlow process={causasJPLProcess} />

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        >
          <option value="">Todos los estados</option>
          {Object.entries(MATTER_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        >
          <option value="">Todos los tipos</option>
          {Object.entries(MATTER_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {(statusFilter || typeFilter) && (
          <button
            onClick={() => { setStatusFilter(""); setTypeFilter(""); }}
            className="text-sm text-primary hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <div className="relative z-50 w-full max-w-lg rounded-xl border bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Nuevo Caso</h2>
              <button onClick={() => setShowCreate(false)} className="rounded-lg p-1 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Titulo del caso *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="Titulo descriptivo del caso"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">ID del Cliente *</label>
                <input
                  type="number"
                  value={formData.client_id || ""}
                  onChange={(e) => setFormData({ ...formData, client_id: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  placeholder="ID del cliente"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tipo de caso</label>
                <select
                  value={formData.matter_type}
                  onChange={(e) => setFormData({ ...formData, matter_type: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  {Object.entries(MATTER_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Descripcion</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  rows={3}
                  placeholder="Descripcion del caso..."
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
                  Crear Caso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {filteredMatters.length === 0 && matters.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No hay casos"
          description="Crea tu primer caso para comenzar a gestionar materias legales."
          action={
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Nuevo Caso
            </button>
          }
        />
      ) : filteredMatters.length === 0 ? (
        <EmptyState
          icon={Filter}
          title="Sin resultados"
          description="No se encontraron casos con los filtros seleccionados."
          action={
            <button
              onClick={() => { setStatusFilter(""); setTypeFilter(""); }}
              className="text-sm text-primary hover:underline"
            >
              Limpiar filtros
            </button>
          }
        />
      ) : (
        <DataTable
          data={filteredMatters}
          columns={columns}
          searchKey="title"
          searchPlaceholder="Buscar por titulo..."
          onRowClick={(matter) => router.push(`/matters/${matter.id}`)}
        />
      )}
    </div>
  );
}
