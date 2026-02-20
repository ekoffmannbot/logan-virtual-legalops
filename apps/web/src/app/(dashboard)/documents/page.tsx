"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Search,
  Filter,
  ChevronDown,
  Plus,
  Upload,
  File,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  Download,
  Eye,
  User,
  Calendar,
  Tag,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";

interface Document {
  id: string;
  name: string;
  file_type: string;
  mime_type: string;
  entity_type: string | null;
  entity_id: string | null;
  entity_label: string | null;
  version: number;
  status: string;
  uploaded_by: string;
  uploaded_by_name: string;
  file_size: number;
  file_url: string;
  created_at: string;
}

const DOC_STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  archived: "Archivado",
  draft: "Borrador",
  pending_review: "En revisi\u00f3n",
};

function getFileIcon(mimeType: string) {
  if (mimeType.includes("image")) return FileImage;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return FileSpreadsheet;
  if (mimeType.includes("zip") || mimeType.includes("archive"))
    return FileArchive;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function DocumentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    name: "",
    entity_type: "",
    entity_id: "",
    file: null as File | null,
  });

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["documents", statusFilter],
    queryFn: () =>
      api.get<Document[]>(
        statusFilter !== "all"
          ? `/documents?status=${statusFilter}`
          : "/documents"
      ),
  });

  const uploadMutation = useMutation({
    mutationFn: (data: { name: string; entity_type: string; entity_id: string; file: File }) => {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("file", data.file);
      if (data.entity_type) formData.append("entity_type", data.entity_type);
      if (data.entity_id) formData.append("entity_id", data.entity_id);
      return api.post("/documents", formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setShowUploadForm(false);
      setUploadForm({ name: "", entity_type: "", entity_id: "", file: null });
    },
  });

  const filteredDocs = documents.filter(
    (doc) =>
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.uploaded_by_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.entity_label?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadForm({
        ...uploadForm,
        file,
        name: uploadForm.name || file.name.replace(/\.[^/.]+$/, ""),
      });
    }
  };

  const handleUpload = () => {
    if (!uploadForm.file || !uploadForm.name.trim()) return;
    uploadMutation.mutate({
      name: uploadForm.name,
      entity_type: uploadForm.entity_type,
      entity_id: uploadForm.entity_id,
      file: uploadForm.file,
    });
  };

  const columns = [
    {
      key: "name",
      label: "Nombre",
      render: (doc: Document) => {
        const Icon = getFileIcon(doc.mime_type);
        return (
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2" style={{ background: "rgba(99,102,241,0.15)" }}>
              <Icon className="h-5 w-5" style={{ color: "var(--primary-color)" }} />
            </div>
            <div>
              <p className="font-medium" style={{ color: "var(--text-primary)" }}>{doc.name}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {formatFileSize(doc.file_size)}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: "file_type",
      label: "Tipo",
      render: (doc: Document) => (
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium uppercase"
          style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
        >
          {doc.file_type}
        </span>
      ),
    },
    {
      key: "entity_label",
      label: "Entidad",
      render: (doc: Document) => (
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {doc.entity_label || "\u2014"}
        </span>
      ),
    },
    {
      key: "version",
      label: "Versi\u00f3n",
      render: (doc: Document) => (
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>v{doc.version}</span>
      ),
    },
    {
      key: "status",
      label: "Estado",
      render: (doc: Document) => (
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{
            background:
              doc.status === "active"
                ? "rgba(34,197,94,0.2)"
                : doc.status === "archived"
                ? "var(--bg-tertiary)"
                : doc.status === "draft"
                ? "rgba(245,158,11,0.2)"
                : "rgba(99,102,241,0.2)",
            color:
              doc.status === "active"
                ? "var(--success)"
                : doc.status === "archived"
                ? "var(--text-muted)"
                : doc.status === "draft"
                ? "var(--warning)"
                : "var(--primary-color)",
          }}
        >
          {DOC_STATUS_LABELS[doc.status] || doc.status}
        </span>
      ),
    },
    {
      key: "uploaded_by_name",
      label: "Subido por",
      render: (doc: Document) => (
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{doc.uploaded_by_name}</span>
      ),
    },
    {
      key: "created_at",
      label: "Fecha",
      render: (doc: Document) => (
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>
          {formatDate(doc.created_at)}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (doc: Document) => (
        <div className="flex items-center gap-2">
          <a
            href={doc.file_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="rounded p-1 transition-colors"
            style={{ color: "var(--text-muted)" }}
            title="Ver"
          >
            <Eye className="h-4 w-4" />
          </a>
          <a
            href={doc.file_url}
            download
            onClick={(e) => e.stopPropagation()}
            className="rounded p-1 transition-colors"
            style={{ color: "var(--text-muted)" }}
            title="Descargar"
          >
            <Download className="h-4 w-4" />
          </a>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
          >
            Documentos
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Repositorio central de documentos
          </p>
        </div>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors"
          style={{ background: "var(--primary-color)" }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          <Upload className="h-4 w-4" />
          Subir Documento
        </button>
      </div>

      {/* Upload Form */}
      {showUploadForm && (
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
              Subir Nuevo Documento
            </h2>
            <button
              onClick={() => setShowUploadForm(false)}
              style={{ color: "var(--text-muted)" }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                Nombre del documento
              </label>
              <input
                type="text"
                value={uploadForm.name}
                onChange={(e) =>
                  setUploadForm({ ...uploadForm, name: e.target.value })
                }
                placeholder="Nombre descriptivo..."
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
                Tipo de entidad (opcional)
              </label>
              <select
                value={uploadForm.entity_type}
                onChange={(e) =>
                  setUploadForm({
                    ...uploadForm,
                    entity_type: e.target.value,
                  })
                }
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--glass-border)",
                  color: "var(--text-primary)",
                }}
              >
                <option value="">Sin asociar</option>
                <option value="matter">Caso</option>
                <option value="client">Cliente</option>
                <option value="contract">Contrato</option>
                <option value="invoice">Factura</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--text-secondary)" }}>
                Archivo
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center rounded-lg p-8 cursor-pointer transition-colors"
                style={{
                  border: "2px dashed var(--glass-border)",
                  background: "var(--bg-tertiary)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary-color)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--glass-border)"; }}
              >
                <div className="text-center">
                  <Upload className="mx-auto h-10 w-10" style={{ color: "var(--text-muted)" }} />
                  <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {uploadForm.file
                      ? `${uploadForm.file.name} (${formatFileSize(uploadForm.file.size)})`
                      : "Haga clic para seleccionar o arrastre un archivo"}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                    PDF, DOC, DOCX, XLS, XLSX, JPG, PNG hasta 50MB
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.zip"
                onChange={handleFileSelect}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleUpload}
              disabled={
                uploadMutation.isPending ||
                !uploadForm.file ||
                !uploadForm.name.trim()
              }
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 transition-colors"
              style={{ background: "var(--primary-color)" }}
            >
              <Upload className="h-4 w-4" />
              {uploadMutation.isPending ? "Subiendo..." : "Subir Documento"}
            </button>
            <button
              onClick={() => {
                setShowUploadForm(false);
                setUploadForm({
                  name: "",
                  entity_type: "",
                  entity_id: "",
                  file: null,
                });
              }}
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

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Buscar documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg py-2 pl-10 pr-4 text-sm outline-none"
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none rounded-lg py-2 pl-10 pr-10 text-sm outline-none"
            style={{
              background: "var(--bg-tertiary)",
              border: "1px solid var(--glass-border)",
              color: "var(--text-primary)",
            }}
          >
            <option value="all">Todos los estados</option>
            {Object.entries(DOC_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div
            className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
            style={{ borderColor: "var(--primary-color)", borderTopColor: "transparent" }}
          />
        </div>
      ) : filteredDocs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No hay documentos"
          description="Sube tu primer documento para comenzar."
          actionLabel="Subir Documento"
          onAction={() => setShowUploadForm(true)}
        />
      ) : (
        <DataTable columns={columns} data={filteredDocs} />
      )}
    </div>
  );
}
