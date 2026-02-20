"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { formatDate, formatRut } from "@/lib/utils";
import { DataTable, Column } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { Users, Plus, Loader2, X, AlertCircle } from "lucide-react";

interface Client {
  id: number;
  full_name: string;
  rut?: string;
  email?: string;
  phone?: string;
  created_at: string;
}

interface CreateClientPayload {
  full_name: string;
  rut?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export default function ClientsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState<CreateClientPayload>({
    full_name: "",
    rut: "",
    email: "",
    phone: "",
    address: "",
  });
  const [formError, setFormError] = useState("");

  const { data: clients = [], isLoading, error } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: () => api.get("/clients"),
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateClientPayload) => api.post("/clients", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setShowCreate(false);
      setFormData({ full_name: "", rut: "", email: "", phone: "", address: "" });
      setFormError("");
    },
    onError: (err: any) => {
      setFormError(err.message || "Error al crear el cliente");
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

  const columns: Column<Client>[] = [
    {
      key: "full_name",
      label: "Nombre",
      sortable: true,
      render: (client) => <span className="font-medium" style={{ color: "var(--text-primary)" }}>{client.full_name}</span>,
    },
    {
      key: "rut",
      label: "RUT",
      render: (client) => <span style={{ color: "var(--text-secondary)" }}>{formatRut(client.rut)}</span>,
    },
    {
      key: "email",
      label: "Email",
      render: (client) => <span style={{ color: "var(--text-secondary)" }}>{client.email || "-"}</span>,
    },
    {
      key: "phone",
      label: "Telefono",
      render: (client) => <span style={{ color: "var(--text-secondary)" }}>{client.phone || "-"}</span>,
    },
    {
      key: "created_at",
      label: "Fecha",
      sortable: true,
      render: (client) => <span style={{ color: "var(--text-muted)" }}>{formatDate(client.created_at)}</span>,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--primary-color)" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-10 w-10 mb-3" style={{ color: "var(--danger)" }} />
        <p className="text-lg font-medium" style={{ color: "var(--text-primary)" }}>Error al cargar los clientes</p>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          No se pudo obtener la informacion. Intente nuevamente.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
          >
            Clientes
          </h1>
          <p style={{ color: "var(--text-muted)" }}>Directorio de clientes del estudio</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
          style={{ background: "var(--primary-color)" }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          <Plus className="h-4 w-4" />
          Nuevo Cliente
        </button>
      </div>

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60" onClick={() => setShowCreate(false)} />
          <div
            className="relative z-50 w-full max-w-lg p-6 shadow-lg"
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--glass-border)",
              borderRadius: 16,
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-lg font-semibold"
                style={{ color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
              >
                Nuevo Cliente
              </h2>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg p-1 transition-colors"
                style={{ color: "var(--text-muted)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Nombre completo *</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                  placeholder="Nombre del cliente"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>RUT</label>
                <input
                  type="text"
                  value={formData.rut}
                  onChange={(e) => setFormData({ ...formData, rut: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                  placeholder="12.345.678-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                    placeholder="email@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Telefono</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                    placeholder="+56 9 1234 5678"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Direccion</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                  placeholder="Direccion del cliente"
                />
              </div>
              {formError && (
                <p className="text-sm" style={{ color: "var(--danger)" }}>{formError}</p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                  style={{
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-secondary)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 transition-colors"
                  style={{ background: "var(--primary-color)" }}
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Crear Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No hay clientes"
          description="Agrega tu primer cliente al directorio del estudio."
          action={
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
              style={{ background: "var(--primary-color)" }}
            >
              <Plus className="h-4 w-4" />
              Nuevo Cliente
            </button>
          }
        />
      ) : (
        <DataTable
          data={clients}
          columns={columns}
          searchKey="full_name"
          searchPlaceholder="Buscar por nombre..."
          onRowClick={(client) => router.push(`/clients/${client.id}`)}
        />
      )}
    </div>
  );
}
