"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createAgentWs } from "@/lib/api";
import { AGENT_COLORS } from "@/lib/constants";
import { Send, Loader2, AlertTriangle, Check, XCircle } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

interface AgentChatProps {
  agentId: number;
  agentRole: string;
  agentName: string;
}

export function AgentChat({ agentId, agentRole, agentName }: AgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const agentColor = AGENT_COLORS[agentRole] || "#6366f1";

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = createAgentWs(agentId);
    if (!ws) {
      setError("No se pudo conectar. Verifica tu sesi\u00f3n.");
      return;
    }

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "connected") return;
        if (data.type === "response" || data.type === "message") {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: data.response || data.content || data.message,
              timestamp: new Date().toISOString(),
            },
          ]);
          setIsLoading(false);
        }
        if (data.type === "escalation") {
          setMessages((prev) => [
            ...prev,
            {
              role: "system",
              content: `Escalaci\u00f3n: ${data.reason || "El agente requiere su aprobaci\u00f3n."}`,
              timestamp: new Date().toISOString(),
            },
          ]);
          setIsLoading(false);
        }
        if (data.type === "error") {
          setError(data.detail || "Error del agente");
          setIsLoading(false);
        }
      } catch {
        // Non-JSON message
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: event.data, timestamp: new Date().toISOString() },
        ]);
        setIsLoading(false);
      }
    };

    ws.onerror = () => {
      setError("Conexi\u00f3n perdida");
      setIsConnected(false);
      setIsLoading(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
      setIsLoading(false);
    };

    wsRef.current = ws;
  }, [agentId]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function sendMessage() {
    if (!input.trim() || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const text = input.trim();
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text, timestamp: new Date().toISOString() },
    ]);
    wsRef.current.send(JSON.stringify({ message: text }));
    setInput("");
    setIsLoading(true);
  }

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 400 }}>
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 p-4"
        style={{ maxHeight: "calc(100vh - 300px)" }}
      >
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-3xl mb-3 opacity-50">{"\uD83D\uDCAC"}</p>
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Escribe un mensaje para hablar con {agentName}
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className="max-w-[80%] rounded-2xl px-4 py-3"
              style={{
                background:
                  msg.role === "user"
                    ? "var(--primary-color)"
                    : msg.role === "system"
                      ? "rgba(245, 158, 11, 0.15)"
                      : "var(--bg-card)",
                color:
                  msg.role === "user"
                    ? "#ffffff"
                    : msg.role === "system"
                      ? "var(--warning)"
                      : "var(--text-primary)",
                border: msg.role === "assistant" ? "1px solid var(--glass-border)" : undefined,
              }}
            >
              {msg.role === "assistant" && (
                <p
                  className="text-xs font-semibold mb-1"
                  style={{ color: agentColor }}
                >
                  {agentName}
                </p>
              )}
              {msg.role === "system" && (
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span className="text-xs font-semibold">Sistema</span>
                </div>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              {/* Escalation action buttons */}
              {msg.role === "system" && msg.content.toLowerCase().includes("escalaci") && (
                <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: "1px solid rgba(245,158,11,0.3)" }}>
                  <button
                    className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-all"
                    style={{ background: "var(--success)" }}
                    onClick={() => {
                      setMessages((prev) => [
                        ...prev,
                        { role: "user", content: "Apruebo la acción escalada.", timestamp: new Date().toISOString() },
                      ]);
                      if (wsRef.current?.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({ message: "Apruebo la acción escalada." }));
                        setIsLoading(true);
                      }
                    }}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Aprobar
                  </button>
                  <button
                    className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-all"
                    style={{ background: "var(--danger)" }}
                    onClick={() => {
                      setMessages((prev) => [
                        ...prev,
                        { role: "user", content: "Rechazo la acción escalada.", timestamp: new Date().toISOString() },
                      ]);
                      if (wsRef.current?.readyState === WebSocket.OPEN) {
                        wsRef.current.send(JSON.stringify({ message: "Rechazo la acción escalada." }));
                        setIsLoading(true);
                      }
                    }}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Rechazar
                  </button>
                </div>
              )}
              {/* Timestamp */}
              <p
                className="text-[10px] mt-1"
                style={{ color: msg.role === "user" ? "rgba(255,255,255,0.6)" : "var(--text-muted)", textAlign: msg.role === "user" ? "right" : "left" }}
              >
                {new Date(msg.timestamp).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl px-4 py-3 flex items-center gap-2"
              style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)" }}
            >
              <Loader2 className="h-4 w-4 animate-spin" style={{ color: agentColor }} />
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>
                {agentName} est\u00e1 pensando...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          className="mx-4 mb-2 rounded-lg px-3 py-2 flex items-center gap-2"
          style={{ background: "rgba(239,68,68,0.15)" }}
        >
          <AlertTriangle className="h-4 w-4" style={{ color: "var(--danger)" }} />
          <span className="text-xs" style={{ color: "var(--danger)" }}>{error}</span>
          {!isConnected && (
            <button
              onClick={connect}
              className="ml-auto text-xs font-medium underline"
              style={{ color: "var(--primary-color)" }}
            >
              Reconectar
            </button>
          )}
        </div>
      )}

      {/* Input */}
      <div
        className="flex items-center gap-3 p-4"
        style={{ borderTop: "1px solid var(--glass-border)" }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder={`Escribe a ${agentName}...`}
          className="flex-1 rounded-xl px-4 py-3 text-sm outline-none"
          style={{
            background: "var(--bg-tertiary)",
            color: "var(--text-primary)",
            border: "1px solid var(--glass-border)",
          }}
          disabled={!isConnected || isLoading}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || !isConnected || isLoading}
          className="flex h-11 w-11 items-center justify-center rounded-xl transition-all"
          style={{
            background: input.trim() ? "var(--primary-color)" : "var(--bg-tertiary)",
            color: input.trim() ? "#ffffff" : "var(--text-muted)",
          }}
        >
          <Send className="h-4.5 w-4.5" />
        </button>
      </div>
    </div>
  );
}
