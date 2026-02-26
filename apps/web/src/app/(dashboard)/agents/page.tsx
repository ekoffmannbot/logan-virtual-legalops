"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { agentApi } from "@/lib/api";
import type { AIAgent } from "@/lib/types";
import { AGENT_COLORS, AGENT_EMOJIS, MODEL_LABELS } from "@/lib/constants";
import { AgentConfigDrawer } from "@/components/agents/agent-config-drawer";
import { Bot, Loader2, AlertTriangle, Zap, Shield } from "lucide-react";

/* ------------------------------------------------------------------ */
/* PAGE                                                                */
/* ------------------------------------------------------------------ */

export default function AgentsPage() {
  const [selectedAgent, setSelectedAgent] = useState<AIAgent | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const {
    data: agents = [],
    isLoading,
    isError,
  } = useQuery<AIAgent[]>({
    queryKey: ["agents"],
    queryFn: () => agentApi.list(),
  });

  function openAgent(agent: AIAgent) {
    setSelectedAgent(agent);
    setDrawerOpen(true);
  }

  /* ---- Loading ---- */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--primary-color)" }} />
      </div>
    );
  }

  /* ---- Error ---- */
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2" style={{ color: "var(--danger)" }}>
        <AlertTriangle className="h-8 w-8" />
        <p style={{ fontSize: "14px" }}>Error al cargar los agentes</p>
      </div>
    );
  }

  const activeCount = agents.filter((a) => a.is_active).length;
  const totalSkills = agents.reduce((sum, a) => sum + (a.skills ?? []).filter((s) => s.is_enabled).length, 0);
  const autonomousSkills = agents.reduce((sum, a) => sum + (a.skills ?? []).filter((s) => s.is_autonomous).length, 0);

  /* ---- Render ---- */
  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* HEADER                                                        */}
      {/* ============================================================ */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: "rgba(99,102,241,0.2)" }}
          >
            <Bot className="h-5 w-5" style={{ color: "var(--primary-color)" }} />
          </div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
          >
            Mis Agentes
          </h1>
        </div>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {activeCount} agentes activos &middot; {totalSkills} skills habilitadas &middot; {autonomousSkills} aut\u00f3nomas
        </p>
      </div>

      {/* ============================================================ */}
      {/* AGENT GRID                                                    */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {agents.map((agent, i) => {
          const color = AGENT_COLORS[agent.role] || "#6366f1";
          const emoji = AGENT_EMOJIS[agent.role] || "\uD83E\uDD16";
          const skills = agent.skills ?? [];
          const enabledSkills = skills.filter((s) => s.is_enabled).length;
          const autoSkills = skills.filter((s) => s.is_autonomous).length;

          return (
            <button
              key={agent.id}
              type="button"
              onClick={() => openAgent(agent)}
              className="glass-card glass-card-interactive animate-fade-in-up group relative overflow-hidden p-6 text-left"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              {/* Top color bar */}
              <div
                className="absolute left-0 top-0 h-1 w-full transition-opacity duration-300"
                style={{ background: color, opacity: agent.is_active ? 1 : 0.3 }}
              />

              {/* Emoji + Name */}
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-transform duration-300 group-hover:scale-110"
                  style={{ background: `${color}20` }}
                >
                  {emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <h3
                    className="text-base font-bold truncate"
                    style={{ fontFamily: "'Outfit', sans-serif", color: "var(--text-primary)" }}
                  >
                    {agent.display_name}
                  </h3>
                  <p className="text-xs" style={{ color }}>
                    {MODEL_LABELS[agent.model_name] || agent.model_name}
                  </p>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{
                    background: agent.is_active ? "var(--success)" : "var(--text-muted)",
                    boxShadow: agent.is_active ? "0 0 8px var(--success)" : undefined,
                  }}
                />
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {agent.is_active ? "Activo" : "Inactivo"}
                </span>
              </div>

              {/* Skills summary */}
              <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  {enabledSkills} skills
                </span>
                <span className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  {autoSkills} auto
                </span>
              </div>

              {/* Skill pills */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {skills
                  .filter((s) => s.is_enabled)
                  .slice(0, 3)
                  .map((skill) => (
                    <span
                      key={skill.id}
                      className="rounded-md px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        background: "var(--bg-tertiary)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {skill.skill_name}
                    </span>
                  ))}
                {enabledSkills > 3 && (
                  <span
                    className="rounded-md px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      background: `${color}15`,
                      color,
                    }}
                  >
                    +{enabledSkills - 3}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* CONFIG DRAWER                                                 */}
      {/* ============================================================ */}
      <AgentConfigDrawer
        agent={selectedAgent}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedAgent(null);
        }}
      />
    </div>
  );
}
