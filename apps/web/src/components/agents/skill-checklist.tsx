"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { agentApi } from "@/lib/api";
import type { AIAgentSkill } from "@/lib/types";
import { SKILL_DESCRIPTIONS } from "@/lib/constants";

interface SkillChecklistProps {
  agentId: number;
  skills: AIAgentSkill[];
}

export function SkillChecklist({ agentId, skills }: SkillChecklistProps) {
  const queryClient = useQueryClient();
  const [optimistic, setOptimistic] = useState<Record<number, Partial<AIAgentSkill>>>({});

  const mutation = useMutation({
    mutationFn: ({ skillId, body }: { skillId: number; body: Partial<AIAgentSkill> }) =>
      agentApi.updateSkill(agentId, skillId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agents"] });
      queryClient.invalidateQueries({ queryKey: ["agent", agentId] });
    },
  });

  function toggle(skill: AIAgentSkill, field: "is_enabled" | "is_autonomous") {
    const newVal = !skill[field];
    setOptimistic((prev) => ({
      ...prev,
      [skill.id]: { ...prev[skill.id], [field]: newVal },
    }));
    mutation.mutate({ skillId: skill.id, body: { [field]: newVal } });
  }

  if (skills.length === 0) {
    return (
      <p className="py-4 text-sm" style={{ color: "var(--text-muted)" }}>
        Sin skills configuradas.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {skills.map((skill) => {
        const merged = { ...skill, ...optimistic[skill.id] };
        return (
          <div
            key={skill.id}
            className="flex items-center justify-between rounded-xl px-4 py-3"
            style={{
              background: merged.is_enabled ? "var(--bg-card)" : "var(--bg-tertiary)",
              border: "1px solid var(--glass-border)",
              opacity: merged.is_enabled ? 1 : 0.6,
            }}
          >
            <div className="min-w-0 flex-1">
              <p
                className="text-sm font-semibold truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {skill.skill_name}
              </p>
              <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--text-muted)" }}>
                {SKILL_DESCRIPTIONS[skill.skill_key] || skill.skill_key}
              </p>
            </div>

            <div className="flex items-center gap-4 flex-shrink-0">
              {/* Enabled toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Activo
                </span>
                <button
                  type="button"
                  onClick={() => toggle(skill, "is_enabled")}
                  className="relative h-5 w-9 rounded-full transition-colors"
                  style={{
                    background: merged.is_enabled ? "var(--primary-color)" : "var(--bg-tertiary)",
                    border: "1px solid var(--glass-border)",
                  }}
                >
                  <span
                    className="absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-transform"
                    style={{
                      transform: merged.is_enabled ? "translateX(17px)" : "translateX(2px)",
                    }}
                  />
                </button>
              </label>

              {/* Autonomous toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Aut\u00f3nomo
                </span>
                <button
                  type="button"
                  onClick={() => toggle(skill, "is_autonomous")}
                  disabled={!merged.is_enabled}
                  className="relative h-5 w-9 rounded-full transition-colors"
                  style={{
                    background: merged.is_autonomous && merged.is_enabled
                      ? "var(--accent-color)"
                      : "var(--bg-tertiary)",
                    border: "1px solid var(--glass-border)",
                    opacity: merged.is_enabled ? 1 : 0.4,
                  }}
                >
                  <span
                    className="absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white transition-transform"
                    style={{
                      transform: merged.is_autonomous && merged.is_enabled
                        ? "translateX(17px)"
                        : "translateX(2px)",
                    }}
                  />
                </button>
              </label>
            </div>
          </div>
        );
      })}
    </div>
  );
}
