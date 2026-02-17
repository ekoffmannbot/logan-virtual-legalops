"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Bot, ChevronDown, ChevronUp, Settings2, Play, CheckCircle2,
  ArrowRight, ArrowDown, Diamond, Circle, CircleDot, User,
  Zap, Eye, EyeOff,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* TYPES                                                               */
/* ------------------------------------------------------------------ */

export interface ProcessAgent {
  id: string;
  name: string;          // e.g. "Secretaria", "Abogado"
  role: string;          // role key
  color: string;         // tailwind color name: blue, green, purple…
  icon?: string;         // optional override
  description: string;   // what this agent does in the process
}

export interface ProcessStep {
  id: string;
  label: string;
  description: string;
  agentId: string;       // which agent handles this step
  type: "start" | "task" | "decision" | "end" | "subprocess";
  status?: "idle" | "active" | "done";  // for demo animation
  nextSteps?: { label?: string; targetId: string }[];
}

export interface ProcessDefinition {
  id: string;
  name: string;
  description: string;
  agents: ProcessAgent[];
  steps: ProcessStep[];
}

/* ------------------------------------------------------------------ */
/* AGENT COLORS                                                        */
/* ------------------------------------------------------------------ */

const AGENT_STYLES: Record<string, { bg: string; border: string; text: string; light: string; dot: string }> = {
  blue:   { bg: "bg-blue-50",   border: "border-blue-300",   text: "text-blue-700",   light: "bg-blue-100", dot: "bg-blue-500" },
  green:  { bg: "bg-green-50",  border: "border-green-300",  text: "text-green-700",  light: "bg-green-100", dot: "bg-green-500" },
  purple: { bg: "bg-purple-50", border: "border-purple-300", text: "text-purple-700", light: "bg-purple-100", dot: "bg-purple-500" },
  amber:  { bg: "bg-amber-50",  border: "border-amber-300",  text: "text-amber-700",  light: "bg-amber-100", dot: "bg-amber-500" },
  rose:   { bg: "bg-rose-50",   border: "border-rose-300",   text: "text-rose-700",   light: "bg-rose-100", dot: "bg-rose-500" },
  cyan:   { bg: "bg-cyan-50",   border: "border-cyan-300",   text: "text-cyan-700",   light: "bg-cyan-100", dot: "bg-cyan-500" },
  slate:  { bg: "bg-slate-50",  border: "border-slate-300",  text: "text-slate-700",  light: "bg-slate-100", dot: "bg-slate-500" },
  teal:   { bg: "bg-teal-50",   border: "border-teal-300",   text: "text-teal-700",   light: "bg-teal-100", dot: "bg-teal-500" },
};

function getAgentStyle(color: string) {
  return AGENT_STYLES[color] || AGENT_STYLES.blue;
}

/* ------------------------------------------------------------------ */
/* STEP NODE                                                           */
/* ------------------------------------------------------------------ */

function StepNode({
  step,
  agent,
  isSelected,
  onClick,
}: {
  step: ProcessStep;
  agent: ProcessAgent;
  isSelected: boolean;
  onClick: () => void;
}) {
  const style = getAgentStyle(agent.color);

  if (step.type === "start") {
    return (
      <button onClick={onClick} className="group flex flex-col items-center gap-1">
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
          "border-green-400 bg-green-100 text-green-600",
          isSelected && "ring-2 ring-green-400 ring-offset-2"
        )}>
          <Play className="h-4 w-4" />
        </div>
        <span className="text-xs font-medium text-gray-600 max-w-[100px] text-center">{step.label}</span>
      </button>
    );
  }

  if (step.type === "end") {
    return (
      <button onClick={onClick} className="group flex flex-col items-center gap-1">
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
          "border-red-400 bg-red-100 text-red-600",
          isSelected && "ring-2 ring-red-400 ring-offset-2"
        )}>
          <CircleDot className="h-4 w-4" />
        </div>
        <span className="text-xs font-medium text-gray-600 max-w-[100px] text-center">{step.label}</span>
      </button>
    );
  }

  if (step.type === "decision") {
    return (
      <button onClick={onClick} className="group flex flex-col items-center gap-1">
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rotate-45 border-2 transition-all",
          style.border, style.bg,
          isSelected && "ring-2 ring-offset-2",
        )}>
          <Diamond className={cn("h-4 w-4 -rotate-45", style.text)} />
        </div>
        <span className={cn("text-xs font-medium max-w-[120px] text-center", style.text)}>{step.label}</span>
      </button>
    );
  }

  if (step.type === "subprocess") {
    return (
      <button onClick={onClick} className="group flex flex-col items-center gap-1">
        <div className={cn(
          "flex items-center gap-2 rounded-lg border-2 border-dashed px-3 py-2 transition-all",
          style.border, style.bg,
          isSelected && "ring-2 ring-offset-2",
        )}>
          <Zap className={cn("h-4 w-4", style.text)} />
          <span className={cn("text-xs font-medium", style.text)}>{step.label}</span>
        </div>
      </button>
    );
  }

  // Default: task
  return (
    <button onClick={onClick} className="group flex flex-col items-center gap-1">
      <div className={cn(
        "flex items-center gap-2 rounded-lg border-2 px-3 py-2 transition-all shadow-sm",
        style.border, style.bg,
        isSelected && "ring-2 ring-offset-2 shadow-md",
        "hover:shadow-md"
      )}>
        <Bot className={cn("h-4 w-4 flex-shrink-0", style.text)} />
        <span className={cn("text-xs font-medium max-w-[150px] text-center leading-tight", style.text)}>
          {step.label}
        </span>
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* PROCESS FLOW COMPONENT                                              */
/* ------------------------------------------------------------------ */

export function ProcessFlow({ process }: { process: ProcessDefinition }) {
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [showFlow, setShowFlow] = useState(true);
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set(process.agents.map(a => a.id)));

  const selectedStepData = process.steps.find(s => s.id === selectedStep);
  const selectedAgent = selectedStepData
    ? process.agents.find(a => a.id === selectedStepData.agentId)
    : null;

  const toggleAgent = (agentId: string) => {
    setExpandedAgents(prev => {
      const next = new Set(prev);
      if (next.has(agentId)) next.delete(agentId);
      else next.add(agentId);
      return next;
    });
  };

  // Group steps by agent (swimlane style)
  const stepsByAgent = process.agents.map(agent => ({
    agent,
    steps: process.steps.filter(s => s.agentId === agent.id),
  }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-gradient-to-r from-gray-50 to-white p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{process.name}</h3>
            <p className="text-xs text-gray-500">{process.description}</p>
          </div>
        </div>
        <button
          onClick={() => setShowFlow(!showFlow)}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {showFlow ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {showFlow ? "Ocultar Flujo" : "Ver Flujo"}
        </button>
      </div>

      {showFlow && (
        <div className="p-4">
          {/* Agent Cards (Swimlanes) */}
          <div className="space-y-3">
            {stepsByAgent.map(({ agent, steps }) => {
              const style = getAgentStyle(agent.color);
              const isExpanded = expandedAgents.has(agent.id);

              return (
                <div key={agent.id} className={cn("rounded-lg border", style.border, style.bg)}>
                  {/* Agent Header */}
                  <button
                    onClick={() => toggleAgent(agent.id)}
                    className="flex w-full items-center justify-between p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-8 w-8 items-center justify-center rounded-full", style.light)}>
                        <Bot className={cn("h-4 w-4", style.text)} />
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className={cn("text-sm font-semibold", style.text)}>{agent.name}</span>
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                            style.light, style.text
                          )}>
                            {steps.length} pasos
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">{agent.description}</p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className={cn("h-4 w-4", style.text)} />
                    ) : (
                      <ChevronDown className={cn("h-4 w-4", style.text)} />
                    )}
                  </button>

                  {/* Steps */}
                  {isExpanded && steps.length > 0 && (
                    <div className="border-t px-4 py-3" style={{ borderColor: 'inherit' }}>
                      <div className="flex flex-wrap items-center gap-2">
                        {steps.map((step, idx) => (
                          <div key={step.id} className="flex items-center gap-2">
                            <StepNode
                              step={step}
                              agent={agent}
                              isSelected={selectedStep === step.id}
                              onClick={() => setSelectedStep(selectedStep === step.id ? null : step.id)}
                            />
                            {idx < steps.length - 1 && (
                              <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Connectors between swimlanes */}
          {stepsByAgent.length > 1 && (
            <div className="flex items-center justify-center py-2">
              <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1">
                <ArrowDown className="h-3 w-3 text-gray-400" />
                <span className="text-[10px] text-gray-500 font-medium">Los agentes se comunican entre sí</span>
                <ArrowDown className="h-3 w-3 text-gray-400 rotate-180" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected Step Detail */}
      {selectedStepData && selectedAgent && (
        <div className="border-t bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0",
              getAgentStyle(selectedAgent.color).light
            )}>
              <Bot className={cn("h-5 w-5", getAgentStyle(selectedAgent.color).text)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-gray-900">{selectedStepData.label}</h4>
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                  getAgentStyle(selectedAgent.color).light,
                  getAgentStyle(selectedAgent.color).text
                )}>
                  <User className="h-3 w-3" />
                  {selectedAgent.name}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-600">{selectedStepData.description}</p>
              {selectedStepData.nextSteps && selectedStepData.nextSteps.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedStepData.nextSteps.map((ns, i) => {
                    const target = process.steps.find(s => s.id === ns.targetId);
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedStep(ns.targetId)}
                        className="inline-flex items-center gap-1 rounded-full bg-white border px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        <ArrowRight className="h-3 w-3" />
                        {ns.label ? `${ns.label}: ` : ""}{target?.label || ns.targetId}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <button
              onClick={() => setSelectedStep(null)}
              className="rounded-lg p-1 hover:bg-white/50"
            >
              <span className="text-xs text-gray-400">✕</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AGENTS PANEL                                                        */
/* ------------------------------------------------------------------ */

export function AgentsPanel({ agents }: { agents: ProcessAgent[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b bg-gradient-to-r from-indigo-50 to-white p-4">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-900">Agentes del Proceso</h3>
        </div>
        <p className="text-xs text-gray-500 mt-1">Cada agente tiene responsabilidades específicas</p>
      </div>
      <div className="divide-y">
        {agents.map(agent => {
          const style = getAgentStyle(agent.color);
          return (
            <div key={agent.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors">
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-full", style.light)}>
                <Bot className={cn("h-4 w-4", style.text)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{agent.name}</span>
                  <span className={cn("h-2 w-2 rounded-full", style.dot)} />
                </div>
                <p className="text-xs text-gray-500 truncate">{agent.description}</p>
              </div>
              <div className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                style.light, style.text
              )}>
                Configurar
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
