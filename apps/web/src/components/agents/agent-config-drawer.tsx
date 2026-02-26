"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { agentApi } from "@/lib/api";
import type { AIAgent, AIAgentTask, AgentConversationMessage, AgentCostSummary } from "@/lib/types";
import {
  AGENT_COLORS,
  AGENT_EMOJIS,
  MODEL_LABELS,
  AGENT_TASK_STATUS_LABELS,
  AGENT_TASK_STATUS_COLORS,
} from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { SkillChecklist } from "./skill-checklist";
import { AgentChat } from "./agent-chat";
import { Drawer } from "@/components/layout/drawer";
import { Loader2, X, RotateCcw } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Tab types                                                           */
/* ------------------------------------------------------------------ */

type Tab = "general" | "personality" | "skills" | "history" | "costs" | "chat";

const TABS: { key: Tab; label: string }[] = [
  { key: "general", label: "General" },
  { key: "personality", label: "Personalidad" },
  { key: "skills", label: "Skills" },
  { key: "chat", label: "Chat" },
  { key: "history", label: "Historial" },
  { key: "costs", label: "Costos" },
];

/* ------------------------------------------------------------------ */
/* Props                                                               */
/* ------------------------------------------------------------------ */

interface AgentConfigDrawerProps {
  agent: AIAgent | null;
  open: boolean;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function AgentConfigDrawer({ agent, open, onClose }: AgentConfigDrawerProps) {
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const queryClient = useQueryClient();

  if (!agent) return null;

  const agentColor = AGENT_COLORS[agent.role] || "#6366f1";
  const agentEmoji = AGENT_EMOJIS[agent.role] || "\uD83E\uDD16";

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <span className="text-2xl">{agentEmoji}</span>
          <div>
            <span style={{ color: "var(--text-primary)" }}>{agent.display_name}</span>
            <p className="text-xs font-normal" style={{ color: agentColor }}>
              {MODEL_LABELS[agent.model_name] || agent.model_name}
            </p>
          </div>
        </div>
      }
    >
      {/* Tab bar */}
      <div
        className="flex gap-1 overflow-x-auto px-1 py-2 mb-4"
        style={{ borderBottom: "1px solid var(--glass-border)" }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              background: activeTab === tab.key ? "var(--primary-color)" : "transparent",
              color: activeTab === tab.key ? "#ffffff" : "var(--text-secondary)",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="space-y-4">
        {activeTab === "general" && <GeneralTab agent={agent} />}
        {activeTab === "personality" && <PersonalityTab agent={agent} />}
        {activeTab === "skills" && <SkillChecklist agentId={agent.id} skills={agent.skills} />}
        {activeTab === "chat" && (
          <AgentChat agentId={agent.id} agentRole={agent.role} agentName={agent.display_name} />
        )}
        {activeTab === "history" && <HistoryTab agentId={agent.id} />}
        {activeTab === "costs" && <CostsTab agentId={agent.id} agentColor={agentColor} />}
      </div>
    </Drawer>
  );
}

/* ------------------------------------------------------------------ */
/* General Tab                                                         */
/* ------------------------------------------------------------------ */

function GeneralTab({ agent }: { agent: AIAgent }) {
  const queryClient = useQueryClient();
  const [temperature, setTemperature] = useState(agent.temperature);
  const [maxTokens, setMaxTokens] = useState(agent.max_tokens);

  const mutation = useMutation({
    mutationFn: (body: Partial<AIAgent>) => agentApi.update(agent.id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["agent", agent.id] });
    },
  });

  return (
    <div className="space-y-5">
      <FieldRow label="Nombre" value={agent.display_name} />
      <FieldRow label="Rol" value={agent.role} />
      <FieldRow label="Modelo" value={MODEL_LABELS[agent.model_name] || agent.model_name} />
      <FieldRow label="Estado" value={agent.is_active ? "Activo" : "Inactivo"} />

      {/* Temperature slider */}
      <div>
        <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
          Temperatura: {temperature.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={temperature}
          onChange={(e) => setTemperature(parseFloat(e.target.value))}
          onMouseUp={() => mutation.mutate({ temperature })}
          className="w-full accent-[var(--primary-color)]"
        />
      </div>

      {/* Max tokens */}
      <div>
        <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
          M\u00e1x Tokens: {maxTokens}
        </label>
        <input
          type="range"
          min="512"
          max="8192"
          step="256"
          value={maxTokens}
          onChange={(e) => setMaxTokens(parseInt(e.target.value))}
          onMouseUp={() => mutation.mutate({ max_tokens: maxTokens })}
          className="w-full accent-[var(--primary-color)]"
        />
      </div>

      {/* Toggle active with confirmation */}
      <ToggleActiveRow agent={agent} mutation={mutation} />

      {/* Skills summary */}
      <div>
        <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>Skills</p>
        <p className="text-sm" style={{ color: "var(--text-primary)" }}>
          {agent.skills.filter((s) => s.is_enabled).length} activas de {agent.skills.length} total
          {" \u00b7 "}
          {agent.skills.filter((s) => s.is_autonomous).length} aut\u00f3nomas
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Personality Tab                                                     */
/* ------------------------------------------------------------------ */

function PersonalityTab({ agent }: { agent: AIAgent }) {
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState(agent.system_prompt);
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: (body: Partial<AIAgent>) => agentApi.update(agent.id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
          System Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={12}
          className="w-full rounded-xl px-4 py-3 text-sm leading-relaxed outline-none resize-y"
          style={{
            background: "var(--bg-tertiary)",
            color: "var(--text-primary)",
            border: "1px solid var(--glass-border)",
            minHeight: 200,
          }}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => mutation.mutate({ system_prompt: prompt })}
          disabled={mutation.isPending}
          className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all"
          style={{ background: "var(--primary-color)" }}
        >
          {mutation.isPending ? "Guardando..." : saved ? "Guardado" : "Guardar Prompt"}
        </button>
        <button
          onClick={() => setPrompt(agent.system_prompt)}
          className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
          style={{ color: "var(--text-secondary)", background: "var(--bg-tertiary)" }}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restaurar
        </button>
      </div>

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Variables disponibles: {"{org_name}"}, {"{agent_name}"}, {"{current_date}"}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* History Tab                                                         */
/* ------------------------------------------------------------------ */

function HistoryTab({ agentId }: { agentId: number }) {
  const { data: tasks, isLoading } = useQuery<AIAgentTask[]>({
    queryKey: ["agent-tasks", agentId],
    queryFn: () => agentApi.tasks(agentId, 30),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--primary-color)" }} />
      </div>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <p className="py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
        Sin historial de tareas.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          className="rounded-xl px-4 py-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)" }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {task.task_type}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium"
              style={{
                background: `${AGENT_TASK_STATUS_COLORS[task.status]}20`,
                color: AGENT_TASK_STATUS_COLORS[task.status],
              }}
            >
              {AGENT_TASK_STATUS_LABELS[task.status] || task.status}
            </span>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {formatDateTime(task.created_at)}
            {task.trigger_type && ` \u00b7 ${task.trigger_type}`}
          </p>
          {task.escalation_reason && (
            <p className="mt-1 text-xs" style={{ color: "var(--warning)" }}>
              Escalado: {task.escalation_reason}
            </p>
          )}
          {task.error_message && (
            <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>
              Error: {task.error_message}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Costs Tab                                                           */
/* ------------------------------------------------------------------ */

function CostsTab({ agentId, agentColor }: { agentId: number; agentColor: string }) {
  const { data: costs, isLoading } = useQuery<AgentCostSummary>({
    queryKey: ["agent-costs", agentId],
    queryFn: () => agentApi.costs(agentId),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--primary-color)" }} />
      </div>
    );
  }

  if (!costs) {
    return (
      <p className="py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
        Sin datos de costos.
      </p>
    );
  }

  const stats = [
    { label: "Tareas Totales", value: costs.total_tasks.toLocaleString() },
    { label: "Tokens Entrada", value: costs.total_input_tokens.toLocaleString() },
    { label: "Tokens Salida", value: costs.total_output_tokens.toLocaleString() },
    { label: "Costo Estimado", value: `$${costs.estimated_cost_usd.toFixed(4)} USD` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl px-4 py-3"
            style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)" }}
          >
            <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
              {stat.label}
            </p>
            <p
              className="text-lg font-bold"
              style={{ fontFamily: "'Outfit', sans-serif", color: agentColor }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="mt-0.5 text-sm" style={{ color: "var(--text-primary)" }}>{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toggle Active with Confirmation                                     */
/* ------------------------------------------------------------------ */

function ToggleActiveRow({
  agent,
  mutation,
}: {
  agent: AIAgent;
  mutation: ReturnType<typeof useMutation<AIAgent, Error, Partial<AIAgent>>>;
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  function handleToggle() {
    if (agent.is_active) {
      setShowConfirm(true);
    } else {
      mutation.mutate({ is_active: true });
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Agente activo</span>
        <button
          type="button"
          onClick={handleToggle}
          className="relative h-6 w-11 rounded-full transition-colors"
          style={{
            background: agent.is_active ? "var(--success)" : "var(--bg-tertiary)",
            border: "1px solid var(--glass-border)",
          }}
        >
          <span
            className="absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white transition-transform"
            style={{
              transform: agent.is_active ? "translateX(22px)" : "translateX(2px)",
            }}
          />
        </button>
      </div>

      {showConfirm && (
        <div
          className="mt-3 rounded-xl p-4"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}
        >
          <p className="text-sm font-medium mb-3" style={{ color: "var(--text-primary)" }}>
            Desactivar a {agent.display_name} detendrá todas sus tareas automáticas. ¿Continuar?
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                mutation.mutate({ is_active: false });
                setShowConfirm(false);
              }}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-white"
              style={{ background: "var(--danger)" }}
            >
              Sí, desactivar
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="rounded-lg px-4 py-2 text-xs font-semibold"
              style={{ color: "var(--text-secondary)", background: "var(--bg-tertiary)" }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
