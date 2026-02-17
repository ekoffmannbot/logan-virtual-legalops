"use client";

import { cn } from "@/lib/utils";
import { Bot, Lightbulb, AlertTriangle, Info, Sparkles } from "lucide-react";

/* ------------------------------------------------------------------ */
/* AGENT MESSAGE – Chat bubble from an agent                           */
/* ------------------------------------------------------------------ */

type MessageType = "suggestion" | "warning" | "info" | "insight";

const MESSAGE_STYLES: Record<MessageType, {
  bg: string; border: string; icon: typeof Bot; iconColor: string;
}> = {
  suggestion: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: Lightbulb,
    iconColor: "text-blue-500",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: AlertTriangle,
    iconColor: "text-amber-500",
  },
  info: {
    bg: "bg-gray-50",
    border: "border-gray-200",
    icon: Info,
    iconColor: "text-gray-500",
  },
  insight: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    icon: Sparkles,
    iconColor: "text-purple-500",
  },
};

interface AgentMessageProps {
  agentName: string;
  message: string;
  type?: MessageType;
  timestamp?: string;
  className?: string;
}

export function AgentMessage({
  agentName,
  message,
  type = "suggestion",
  timestamp,
  className,
}: AgentMessageProps) {
  const style = MESSAGE_STYLES[type];
  const Icon = style.icon;

  return (
    <div className={cn(
      "flex gap-2.5 rounded-lg border p-3",
      style.bg, style.border,
      className,
    )}>
      <div className={cn(
        "flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0",
        style.bg,
      )}>
        <Icon className={cn("h-4 w-4", style.iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-gray-700">{agentName}</span>
          {timestamp && (
            <span className="text-[9px] text-gray-400">{timestamp}</span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-gray-600 leading-relaxed">{message}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AGENT MESSAGE LIST – Multiple messages stacked                      */
/* ------------------------------------------------------------------ */

interface AgentMessageListProps {
  messages: Array<{
    agentName: string;
    message: string;
    type?: MessageType;
    timestamp?: string;
  }>;
  maxVisible?: number;
  className?: string;
}

export function AgentMessageList({
  messages,
  maxVisible = 3,
  className,
}: AgentMessageListProps) {
  const visible = messages.slice(0, maxVisible);
  const remaining = messages.length - maxVisible;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 mb-1">
        <Bot className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold text-gray-700">Agentes dicen:</span>
      </div>
      {visible.map((msg, i) => (
        <AgentMessage key={i} {...msg} />
      ))}
      {remaining > 0 && (
        <p className="text-[10px] text-gray-400 text-center">
          +{remaining} mensaje{remaining > 1 ? "s" : ""} más
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* AGENT STATUS BAR – Compact bar showing active agents                */
/* ------------------------------------------------------------------ */

interface AgentStatusBarProps {
  agents: Array<{ name: string; count: number; color: string }>;
  className?: string;
}

const AGENT_DOT_COLORS: Record<string, string> = {
  blue: "bg-blue-500",
  green: "bg-green-500",
  purple: "bg-purple-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  cyan: "bg-cyan-500",
  slate: "bg-slate-500",
  teal: "bg-teal-500",
};

export function AgentStatusBar({ agents, className }: AgentStatusBarProps) {
  return (
    <div className={cn(
      "flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2",
      className,
    )}>
      <Bot className="h-4 w-4 text-gray-400 flex-shrink-0" />
      <div className="flex items-center gap-3 flex-wrap">
        {agents.map((agent) => (
          <div key={agent.name} className="flex items-center gap-1.5">
            <div className={cn("h-2 w-2 rounded-full", AGENT_DOT_COLORS[agent.color] || "bg-gray-400")} />
            <span className="text-[10px] font-medium text-gray-600">{agent.name}</span>
            {agent.count > 0 && (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/10 px-1 text-[9px] font-bold text-primary">
                {agent.count}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
