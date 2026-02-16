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
  billing: "Facturación",
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  partner: "bg-purple-100 text-purple-700",
  associate: "bg-blue-100 text-blue-700",
  paralegal: "bg-green-100 text-green-700",
  secretary: "bg-yellow-100 text-yellow-700",
  billing: "bg-orange-100 text-orange-700",
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
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
            {u.full_name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-gray-900">{u.full_name}</p>
            <p className="text-xs text-gray-500">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Rol",
      render: (u: UserRecord) => (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
            ROLE_COLORS[u.role] || "bg-gray-100 text-gray-700"
          )}
        >
          <Shield className="h-3 w-3" />
          {ROLE_LABELS[u.role] || u.role}
        </span>
      ),
    },
    {
      key: "phone",
      label: "Teléfono",
      render: (u: UserRecord) => (
        <span className="text-sm text-gray-600">{u.phone || "—"}</span>
      ),
    },
    {
      key: "is_active",
      label: "Estado",
      render: (u: UserRecord) => (
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
            u.is_active
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          )}
        >
          {u.is_active ? "Activo" : "Inactivo"}
        </span>
      ),
    },
    {
      key: "last_login_at",
      label: "Último acceso",
      render: (u: UserRecord) => (
        <span className="text-sm text-gray-500">
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
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            u.is_active
              ? "border border-red-200 text-red-700 hover:bg-red-50"
              : "border border-green-200 text-green-700 hover:bg-green-50"
          )}
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
        <h1 className="text-2xl font-bold text-gray-900">Administración</h1>
        <p className="mt-1 text-sm text-gray-500">
          Gestión de usuarios, plantillas y configuración del sistema
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab("users")}
            className={cn(
              "pb-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === "users"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            <span className="inline-flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuarios
            </span>
          </button>
          <button
            onClick={() => setActiveTab("templates")}
            className={cn(
              "pb-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === "templates"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            <span className="inline-flex items-center gap-2">
              <FileCode className="h-4 w-4" />
              Plantillas
            </span>
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={cn(
              "pb-3 text-sm font-medium border-b-2 transition-colors",
              activeTab === "settings"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            <span className="inline-flex items-center gap-2">
              <Cog className="h-4 w-4" />
              Configuración
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
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar usuarios..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowCreateUser(!showCreateUser)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Crear Usuario
            </button>
          </div>

          {/* Create User Form */}
          {showCreateUser && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Crear Nuevo Usuario
                </h2>
                <button
                  onClick={() => setShowCreateUser(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    value={newUser.full_name}
                    onChange={(e) =>
                      setNewUser({ ...newUser, full_name: e.target.value })
                    }
                    placeholder="Juan Pérez"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    placeholder="juan@loganlogan.cl"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rol
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value })
                    }
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={newUser.phone}
                    onChange={(e) =>
                      setNewUser({ ...newUser, phone: e.target.value })
                    }
                    placeholder="+56 9 1234 5678"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newUser.password}
                      onChange={(e) =>
                        setNewUser({ ...newUser, password: e.target.value })
                      }
                      placeholder="Mínimo 8 caracteres"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="h-4 w-4" />
                  {createUserMutation.isPending
                    ? "Creando..."
                    : "Crear Usuario"}
                </button>
                <button
                  onClick={() => setShowCreateUser(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Users Table */}
          {loadingUsers ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
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
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar plantillas..."
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={() => setShowCreateTemplate(!showCreateTemplate)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Nueva Plantilla
            </button>
          </div>

          {/* Create Template Form */}
          {showCreateTemplate && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Crear Nueva Plantilla
                </h2>
                <button
                  onClick={() => setShowCreateTemplate(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {Object.entries(TEMPLATE_TYPES).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                    placeholder="Contenido de la plantilla. Use {{variable}} para variables dinámicas."
                  />
                  <p className="mt-1 text-xs text-gray-500">
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
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Save className="h-4 w-4" />
                  {createTemplateMutation.isPending
                    ? "Creando..."
                    : "Crear Plantilla"}
                </button>
                <button
                  onClick={() => setShowCreateTemplate(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Templates List */}
          {loadingTemplates ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
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
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {template.name}
                      </h3>
                      <span className="mt-1 inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                        {TEMPLATE_TYPES[template.type] || template.type}
                      </span>
                    </div>
                    <button
                      onClick={() =>
                        deleteTemplateMutation.mutate(template.id)
                      }
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-3 text-sm text-gray-500 line-clamp-3">
                    {template.content}
                  </p>
                  {template.variables.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {template.variables.map((v) => (
                        <span
                          key={v}
                          className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-600 font-mono"
                        >
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
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
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Configuración General
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del estudio
                </label>
                <input
                  type="text"
                  defaultValue="Logan & Logan Abogados"
                  className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email principal
                </label>
                <input
                  type="email"
                  defaultValue="contacto@loganlogan.cl"
                  className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zona horaria
                </label>
                <select
                  defaultValue="America/Santiago"
                  className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Moneda predeterminada
                </label>
                <select
                  defaultValue="CLP"
                  className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="CLP">Peso Chileno (CLP)</option>
                  <option value="USD">Dólar Estadounidense (USD)</option>
                  <option value="UF">Unidad de Fomento (UF)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Configuración de Notificaciones
            </h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Notificaciones por email
                  </p>
                  <p className="text-xs text-gray-500">
                    Recibir alertas de tareas y plazos por correo
                  </p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
              <label className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Alertas de SLA
                  </p>
                  <p className="text-xs text-gray-500">
                    Notificar cuando un ticket se acerque al SLA
                  </p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
              <label className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Resumen diario
                  </p>
                  <p className="text-xs text-gray-500">
                    Enviar resumen de actividad al final del día
                  </p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked={false}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>
          </div>

          <div className="flex justify-end">
            <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors">
              <Save className="h-4 w-4" />
              Guardar Configuración
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
