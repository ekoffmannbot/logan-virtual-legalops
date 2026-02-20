"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings,
  Users,
  FileCode,
  Cog,
  Plus,
  Search,
  Shield,
  Mail,
  Phone,
  Edit2,
  Trash2,
  Save,
  X,
  ChevronDown,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatDate } from "@/lib/utils";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";

interface UserRecord {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  phone: string | null;
  last_login_at: string | null;
  created_at: string;
}

interface Template {
  id: string;
  name: string;
  type: string;
  content: string;
  variables: string[];
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  partner: "Socio",
  associate: "Asociado",
  paralegal: "Paralegal",
  secretary: "Secretaria",
  billing: "Facturaci\u00f3n",
};

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin: { bg: "rgba(239,68,68,0.2)", text: "var(--danger)" },
  partner: { bg: "rgba(99,102,241,0.2)", text: "var(--primary-color)" },
  associate: { bg: "rgba(99,102,241,0.15)", text: "var(--primary-color)" },
  paralegal: { bg: "rgba(34,197,94,0.2)", text: "var(--success)" },
  secretary: { bg: "rgba(245,158,11,0.2)", text: "var(--warning)" },
  billing: { bg: "rgba(249,115,22,0.2)", text: "#f97316" },
};

const TEMPLATE_TYPES: Record<string, string> = {
  email: "Email",
  contract: "Contrato",
  letter: "Carta",
  proposal: "Propuesta",
  invoice: "Factura",
};

type Tab = "users" | "templates" | "settings";

export default function AdminPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("users");

  // --- Users State ---
  const [userSearch, setUserSearch] = useState("");
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    full_name: "",
    role: "associate",
    phone: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);

  // --- Templates State ---
  const [templateSearch, setTemplateSearch] = useState("");
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    type: "email",
    content: "",
  });

  // --- Queries ---
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => api.get<UserRecord[]>("/admin/users"),
    enabled: activeTab === "users",
  });

  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ["admin", "templates"],
    queryFn: () => api.get<Template[]>("/admin/templates"),
    enabled: activeTab === "templates",
  });

  // --- Mutations ---
  const createUserMutation = useMutation({
    mutationFn: (data: typeof newUser) => api.post("/admin/users", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setShowCreateUser(false);
      setNewUser({
        email: "",
        full_name: "",
        role: "associate",
        phone: "",
        password: "",
      });
    },
  });

  const toggleUserMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) =>
      api.patch(`/admin/users/${userId}`, { is_active: isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
  });

  const createTemplateMutation = useMutation({
    mutationFn: (data: typeof newTemplate) =>
      api.post("/admin/templates", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "templates"] });
      setShowCreateTemplate(false);
      setNewTemplate({ name: "", type: "email", content: "" });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (templateId: string) =>
      api.post(`/admin/templates/${templateId}/archive`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "templates"] });
    },
  });

  // --- Filtered data ---
  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.type.toLowerCase().includes(templateSearch.toLowerCase())
  );

  // --- Columns ---
  const userColumns = [
    {
      key: "full_name",
      label: "Nombre",
      render: (u: UserRecord) => (
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium"
            style={{ background: "rgba(99,102,241,0.2)", color: "var(--primary-color)" }}
          >
            {u.full_name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <p className="font-medium" style={{ color: "var(--text-primary)" }}>{u.full_name}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Rol",
      render: (u: UserRecord) => {
        const roleColor = ROLE_COLORS[u.role] || { bg: "var(--bg-tertiary)", text: "var(--text-secondary)" };
        return (
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{ background: roleColor.bg, color: roleColor.text }}
          >
            <Shield className="h-3 w-3" />
            {ROLE_LABELS[u.role] || u.role}
          </span>
        );
      },
    },
    {
      key: "phone",
      label: "Tel\u00e9fono",
      render: (u: UserRecord) => (
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>{u.phone || "\u2014"}</span>
      ),
    },
    {
      key: "is_active",
      label: "Estado",
      render: (u: UserRecord) => (
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{
            background: u.is_active ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
            color: u.is_active ? "var(--success)" : "var(--danger)",
          }}
        >
          {u.is_active ? "Activo" : "Inactivo"}
        </span>
      ),
    },
    {
      key: "last_login_at",
      label: "\u00daltimo acceso",
      render: (u: UserRecord) => (
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
          {u.last_login_at ? formatDate(u.last_login_at) : "Nunca"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (u: UserRecord) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleUserMutation.mutate({
              userId: u.id,
              isActive: !u.is_active,
            });
          }}
          className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          style={{
            border: u.is_active
              ? "1px solid rgba(239,68,68,0.3)"
              : "1px solid rgba(34,197,94,0.3)",
            color: u.is_active ? "var(--danger)" : "var(--success)",
            background: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = u.is_active
              ? "rgba(239,68,68,0.1)"
              : "rgba(34,197,94,0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          {u.is_active ? "Desactivar" : "Activar"}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
        >
          Administraci\u00f3n
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Gesti\u00f3n de usuarios, plantillas y configuraci\u00f3n del sistema
        </p>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: "1px solid var(--glass-border)" }}>
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab("users")}
            className="pb-3 text-sm font-medium transition-colors"
            style={{
              borderBottom: activeTab === "users" ? "2px solid var(--primary-color)" : "2px solid transparent",
              color: activeTab === "users" ? "var(--primary-color)" : "var(--text-muted)",
            }}
          >
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuarios
            </span>
          </button>
          <button
            onClick={() => setActiveTab("templates")}
            className="pb-3 text-sm font-medium transition-colors"
            style={{
              borderBottom: activeTab === "templates" ? "2px solid var(--primary-color)" : "2px solid transparent",
              color: activeTab === "templates" ? "var(--primary-color)" : "var(--text-muted)",
            }}
          >
            <span className="inline-flex items-center gap-2">
              <FileCode className="h-4 w-4" />
              Plantillas
            </span>
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className="pb-3 text-sm font-medium transition-colors"
            style={{
              borderBottom: activeTab === "settings" ? "2px solid var(--primary-color)" : "2px solid transparent",
              color: activeTab === "settings" ? "var(--primary-color)" : "var(--text-muted)",
            }}
          >
            <span className="inline-flex items-center gap-2">
              <Cog className="h-4 w-4" />
              Configuraci\u00f3n
            </span>
          </button>
        </div>
      </div>

      {/* ============ USERS TAB ============ */}
      {activeTab === "users" && (
        <div className="space-y-6">
          {/* Search + Create */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Buscar usuarios..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full rounded-lg py-2 pl-10 pr-4 text-sm outline-none"
                style={{
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <button
              onClick={() => setShowCreateUser(!showCreateUser)}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors"
              style={{ background: "var(--primary-color)" }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              <Plus className="h-4 w-4" />
              Crear Usuario
            </button>
          </div>

          {/* Create User Form */}
          {showCreateUser && (
            <div
              className="rounded-xl p-6 shadow-sm"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--glass-border)",
                borderRadius: 16,
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-lg font-semibold"
                  style={{ color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
                >
                  Crear Nuevo Usuario
                </h2>
                <button
                  onClick={() => setShowCreateUser(false)}
                  style={{ color: "var(--text-muted)" }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={newUser.full_name}
                    onChange={(e) =>
                      setNewUser({ ...newUser, full_name: e.target.value })
                    }
                    placeholder="Juan P\u00e9rez"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    placeholder="juan@loganlogan.cl"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                    Rol
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value })
                    }
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                    Tel\u00e9fono
                  </label>
                  <input
                    type="tel"
                    value={newUser.phone}
                    onChange={(e) =>
                      setNewUser({ ...newUser, phone: e.target.value })
                    }
                    placeholder="+56 9 1234 5678"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                    Contrase\u00f1a
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newUser.password}
                      onChange={(e) =>
                        setNewUser({ ...newUser, password: e.target.value })
                      }
                      placeholder="M\u00ednimo 8 caracteres"
                      className="w-full rounded-lg px-3 py-2 pr-10 text-sm outline-none"
                      style={{
                        background: "var(--bg-tertiary)",
                        border: "1px solid var(--glass-border)",
                        color: "var(--text-primary)",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => createUserMutation.mutate(newUser)}
                  disabled={
                    createUserMutation.isPending ||
                    !newUser.email.trim() ||
                    !newUser.full_name.trim() ||
                    !newUser.password.trim()
                  }
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 transition-colors"
                  style={{ background: "var(--primary-color)" }}
                >
                  <Save className="h-4 w-4" />
                  {createUserMutation.isPending
                    ? "Creando..."
                    : "Crear Usuario"}
                </button>
                <button
                  onClick={() => setShowCreateUser(false)}
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
              </div>
            </div>
          )}

          {/* Users Table */}
          {loadingUsers ? (
            <div className="flex items-center justify-center py-12">
              <div
                className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
                style={{ borderColor: "var(--primary-color)", borderTopColor: "transparent" }}
              />
            </div>
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No hay usuarios"
              description="Crea el primer usuario del sistema."
              actionLabel="Crear Usuario"
              onAction={() => setShowCreateUser(true)}
            />
          ) : (
            <DataTable columns={userColumns} data={filteredUsers} />
          )}
        </div>
      )}

      {/* ============ TEMPLATES TAB ============ */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          {/* Search + Create */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
              <input
                type="text"
                placeholder="Buscar plantillas..."
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                className="w-full rounded-lg py-2 pl-10 pr-4 text-sm outline-none"
                style={{
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <button
              onClick={() => setShowCreateTemplate(!showCreateTemplate)}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors"
              style={{ background: "var(--primary-color)" }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              <Plus className="h-4 w-4" />
              Nueva Plantilla
            </button>
          </div>

          {/* Create Template Form */}
          {showCreateTemplate && (
            <div
              className="rounded-xl p-6 shadow-sm"
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--glass-border)",
                borderRadius: 16,
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-lg font-semibold"
                  style={{ color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
                >
                  Crear Nueva Plantilla
                </h2>
                <button
                  onClick={() => setShowCreateTemplate(false)}
                  style={{ color: "var(--text-muted)" }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                    Nombre de la plantilla
                  </label>
                  <input
                    type="text"
                    value={newTemplate.name}
                    onChange={(e) =>
                      setNewTemplate({
                        ...newTemplate,
                        name: e.target.value,
                      })
                    }
                    placeholder="ej: Carta de poder simple"
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                    Tipo
                  </label>
                  <select
                    value={newTemplate.type}
                    onChange={(e) =>
                      setNewTemplate({
                        ...newTemplate,
                        type: e.target.value,
                      })
                    }
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {Object.entries(TEMPLATE_TYPES).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                    Contenido
                  </label>
                  <textarea
                    value={newTemplate.content}
                    onChange={(e) =>
                      setNewTemplate({
                        ...newTemplate,
                        content: e.target.value,
                      })
                    }
                    rows={10}
                    className="w-full rounded-lg px-3 py-2 text-sm font-mono outline-none"
                    style={{
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-primary)",
                    }}
                    placeholder="Contenido de la plantilla. Use {{variable}} para variables din\u00e1micas."
                  />
                  <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                    Variables disponibles: {"{{client_name}}"},{" "}
                    {"{{matter_title}}"}, {"{{date}}"}, {"{{lawyer_name}}"}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => createTemplateMutation.mutate(newTemplate)}
                  disabled={
                    createTemplateMutation.isPending ||
                    !newTemplate.name.trim() ||
                    !newTemplate.content.trim()
                  }
                  className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 transition-colors"
                  style={{ background: "var(--primary-color)" }}
                >
                  <Save className="h-4 w-4" />
                  {createTemplateMutation.isPending
                    ? "Creando..."
                    : "Crear Plantilla"}
                </button>
                <button
                  onClick={() => setShowCreateTemplate(false)}
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
              </div>
            </div>
          )}

          {/* Templates List */}
          {loadingTemplates ? (
            <div className="flex items-center justify-center py-12">
              <div
                className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
                style={{ borderColor: "var(--primary-color)", borderTopColor: "transparent" }}
              />
            </div>
          ) : filteredTemplates.length === 0 ? (
            <EmptyState
              icon={FileCode}
              title="No hay plantillas"
              description="Crea tu primera plantilla."
              actionLabel="Nueva Plantilla"
              onAction={() => setShowCreateTemplate(true)}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="p-5 transition-all duration-200"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: 16,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--glass-border-hover)";
                    e.currentTarget.style.background = "var(--bg-card-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--glass-border)";
                    e.currentTarget.style.background = "var(--bg-card)";
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium" style={{ color: "var(--text-primary)" }}>
                        {template.name}
                      </h3>
                      <span
                        className="mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}
                      >
                        {TEMPLATE_TYPES[template.type] || template.type}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        deleteTemplateMutation.mutate(template.id)
                      }
                      className="rounded p-1 transition-colors"
                      style={{ color: "var(--text-muted)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.1)"; e.currentTarget.style.color = "var(--danger)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-3 text-sm line-clamp-3" style={{ color: "var(--text-muted)" }}>
                    {template.content}
                  </p>
                  {template.variables.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {template.variables.map((v) => (
                        <span
                          key={v}
                          className="rounded px-1.5 py-0.5 text-xs font-mono"
                          style={{ background: "rgba(99,102,241,0.15)", color: "var(--primary-color)" }}
                        >
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  )}
                  <div
                    className="mt-3 pt-3 text-xs"
                    style={{ borderTop: "1px solid var(--glass-border)", color: "var(--text-muted)" }}
                  >
                    Creada {formatDate(template.created_at)} por{" "}
                    {template.created_by}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============ SETTINGS TAB ============ */}
      {activeTab === "settings" && (
        <div className="space-y-6">
          <div
            className="p-6 shadow-sm"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--glass-border)",
              borderRadius: 16,
            }}
          >
            <h2
              className="text-lg font-semibold mb-6"
              style={{ color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
            >
              Configuraci\u00f3n General
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                  Nombre del estudio
                </label>
                <input
                  type="text"
                  defaultValue="Logan & Logan Abogados"
                  className="w-full max-w-md rounded-lg px-3 py-2 text-sm outline-none"
                  style={{
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                  Email principal
                </label>
                <input
                  type="email"
                  defaultValue="contacto@loganlogan.cl"
                  className="w-full max-w-md rounded-lg px-3 py-2 text-sm outline-none"
                  style={{
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                  Zona horaria
                </label>
                <select
                  defaultValue="America/Santiago"
                  className="w-full max-w-md rounded-lg px-3 py-2 text-sm outline-none"
                  style={{
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="America/Santiago">
                    America/Santiago (GMT-3)
                  </option>
                  <option value="America/Lima">America/Lima (GMT-5)</option>
                  <option value="America/Bogota">
                    America/Bogota (GMT-5)
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                  Moneda predeterminada
                </label>
                <select
                  defaultValue="CLP"
                  className="w-full max-w-md rounded-lg px-3 py-2 text-sm outline-none"
                  style={{
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--glass-border)",
                    color: "var(--text-primary)",
                  }}
                >
                  <option value="CLP">Peso Chileno (CLP)</option>
                  <option value="USD">D\u00f3lar Estadounidense (USD)</option>
                  <option value="UF">Unidad de Fomento (UF)</option>
                </select>
              </div>
            </div>
          </div>

          <div
            className="p-6 shadow-sm"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--glass-border)",
              borderRadius: 16,
            }}
          >
            <h2
              className="text-lg font-semibold mb-6"
              style={{ color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
            >
              Configuraci\u00f3n de Notificaciones
            </h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    Notificaciones por email
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Recibir alertas de tareas y plazos por correo
                  </p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded"
                  style={{ accentColor: "var(--primary-color)" }}
                />
              </label>
              <label className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    Alertas de SLA
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Notificar cuando un ticket se acerque al SLA
                  </p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded"
                  style={{ accentColor: "var(--primary-color)" }}
                />
              </label>
              <label className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    Resumen diario
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Enviar resumen de actividad al final del d\u00eda
                  </p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked={false}
                  className="h-4 w-4 rounded"
                  style={{ accentColor: "var(--primary-color)" }}
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors"
              style={{ background: "var(--primary-color)" }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              <Save className="h-4 w-4" />
              Guardar Configuraci\u00f3n
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
