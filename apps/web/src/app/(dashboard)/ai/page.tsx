"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Bot,
  Send,
  Mail,
  FileText,
  BookOpen,
  Loader2,
  User,
  Sparkles,
  ChevronDown,
  Copy,
  Check,
  RotateCcw,
  Briefcase,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatDateTime } from "@/lib/utils";

interface Matter {
  id: string;
  title: string;
  client_name: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  action?: string;
}

export default function AIAssistantPage() {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hola, soy el asistente de IA de Logan & Logan. Puedo ayudarte a redactar emails, crear propuestas, resumir casos y m\u00e1s. Selecciona un caso para dar contexto o usa los botones r\u00e1pidos para comenzar.",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [selectedMatterId, setSelectedMatterId] = useState<string>("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const { data: mattersData } = useQuery({
    queryKey: ["ai", "matters"],
    queryFn: () => api.get<{ items: Matter[]; total: number }>("/matters?status=open&limit=100"),
  });
  const matters = mattersData?.items ?? [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: (data: { message: string; matter_id?: string; action?: string }) =>
      api.post<{ response: string }>("/ai/chat", data),
    onSuccess: (response, variables) => {
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: response.response,
        timestamp: new Date(),
        action: variables.action,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    },
    onError: () => {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content:
          "Lo siento, ocurri\u00f3 un error al procesar tu solicitud. Por favor intenta de nuevo.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  const draftEmailMutation = useMutation({
    mutationFn: (data: { matter_id?: string; context?: string }) =>
      api.post<{ response: string }>("/ai/draft-email", data),
    onSuccess: (response) => {
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: response.response,
        timestamp: new Date(),
        action: "draft_email",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    },
    onError: () => {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content:
          "No pude generar el borrador de email. Por favor intenta de nuevo.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  const draftProposalMutation = useMutation({
    mutationFn: (data: { matter_id?: string; context?: string }) =>
      api.post<{ response: string }>("/ai/draft-proposal", data),
    onSuccess: (response) => {
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: response.response,
        timestamp: new Date(),
        action: "draft_proposal",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    },
    onError: () => {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content:
          "No pude generar la propuesta. Por favor intenta de nuevo.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  const summarizeMutation = useMutation({
    mutationFn: (data: { matter_id: string }) =>
      api.post<{ response: string }>("/ai/summarize-case", data),
    onSuccess: (response) => {
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "assistant",
        content: response.response,
        timestamp: new Date(),
        action: "summarize",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    },
    onError: () => {
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        content:
          "No pude resumir el caso. Aseg\u00farate de seleccionar un caso primero.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    },
  });

  const isLoading =
    chatMutation.isPending ||
    draftEmailMutation.isPending ||
    draftProposalMutation.isPending ||
    summarizeMutation.isPending;

  const handleSendMessage = () => {
    const message = inputValue.trim();
    if (!message || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: message,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    chatMutation.mutate({
      message,
      matter_id: selectedMatterId || undefined,
    });
  };

  const handleQuickAction = (action: string) => {
    let userMessage: ChatMessage;

    switch (action) {
      case "draft_email":
        userMessage = {
          id: `msg-${Date.now()}`,
          role: "user",
          content: "Redactar un borrador de email profesional",
          timestamp: new Date(),
          action: "draft_email",
        };
        setMessages((prev) => [...prev, userMessage]);
        draftEmailMutation.mutate({
          matter_id: selectedMatterId || undefined,
        });
        break;

      case "draft_proposal":
        userMessage = {
          id: `msg-${Date.now()}`,
          role: "user",
          content: "Generar una propuesta de servicios legales",
          timestamp: new Date(),
          action: "draft_proposal",
        };
        setMessages((prev) => [...prev, userMessage]);
        draftProposalMutation.mutate({
          matter_id: selectedMatterId || undefined,
        });
        break;

      case "summarize":
        if (!selectedMatterId) {
          const noMatterMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: "assistant",
            content:
              "Para resumir un caso, primero selecciona uno del selector de casos arriba.",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, noMatterMsg]);
          return;
        }
        userMessage = {
          id: `msg-${Date.now()}`,
          role: "user",
          content: "Resumir el caso seleccionado",
          timestamp: new Date(),
          action: "summarize",
        };
        setMessages((prev) => [...prev, userMessage]);
        summarizeMutation.mutate({ matter_id: selectedMatterId });
        break;
    }
  };

  const handleCopyMessage = (messageId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageId(messageId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const selectedMatter = matters.find((m) => m.id === selectedMatterId);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between pb-4"
        style={{ borderBottom: "1px solid var(--glass-border)" }}
      >
        <div>
          <h1
            className="text-2xl font-bold flex items-center gap-2"
            style={{ color: "var(--text-primary)", fontFamily: "'Outfit', sans-serif" }}
          >
            <Sparkles className="h-6 w-6" style={{ color: "var(--primary-color)" }} />
            Asistente IA
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Asistente inteligente para tareas legales
          </p>
        </div>

        {/* Matter Selector */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <select
              value={selectedMatterId}
              onChange={(e) => setSelectedMatterId(e.target.value)}
              className="appearance-none rounded-lg py-2 pl-10 pr-10 text-sm outline-none min-w-[250px]"
              style={{
                background: "var(--bg-tertiary)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
            >
              <option value="">Sin caso seleccionado</option>
              {matters.map((matter) => (
                <option key={matter.id} value={matter.id}>
                  {matter.title} - {matter.client_name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
          </div>
          <button
            onClick={() => {
              setMessages([
                {
                  id: "welcome",
                  role: "assistant",
                  content:
                    "Conversaci\u00f3n reiniciada. Estoy listo para ayudarte.",
                  timestamp: new Date(),
                },
              ]);
            }}
            className="rounded-lg p-2 transition-colors"
            style={{
              border: "1px solid var(--glass-border)",
              color: "var(--text-muted)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg-tertiary)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
            title="Reiniciar conversaci\u00f3n"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Context indicator */}
      {selectedMatter && (
        <div
          className="mt-3 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm self-start"
          style={{ background: "rgba(99,102,241,0.15)", color: "var(--primary-color)" }}
        >
          <Briefcase className="h-3.5 w-3.5" />
          Contexto: {selectedMatter.title} ({selectedMatter.client_name})
        </div>
      )}

      {/* Quick Action Buttons */}
      <div
        className="flex items-center gap-3 py-4"
        style={{ borderBottom: "1px solid var(--glass-border)" }}
      >
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          Acciones r\u00e1pidas:
        </span>
        <button
          onClick={() => handleQuickAction("draft_email")}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium disabled:opacity-50 transition-colors"
          style={{
            border: "1px solid rgba(99,102,241,0.3)",
            background: "rgba(99,102,241,0.15)",
            color: "var(--primary-color)",
          }}
        >
          <Mail className="h-3.5 w-3.5" />
          Borrador Email
        </button>
        <button
          onClick={() => handleQuickAction("draft_proposal")}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium disabled:opacity-50 transition-colors"
          style={{
            border: "1px solid rgba(99,102,241,0.3)",
            background: "rgba(99,102,241,0.15)",
            color: "var(--primary-color)",
          }}
        >
          <FileText className="h-3.5 w-3.5" />
          Borrador Propuesta
        </button>
        <button
          onClick={() => handleQuickAction("summarize")}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium disabled:opacity-50 transition-colors"
          style={{
            border: "1px solid rgba(34,197,94,0.3)",
            background: "rgba(34,197,94,0.15)",
            color: "var(--success)",
          }}
        >
          <BookOpen className="h-3.5 w-3.5" />
          Resumir Caso
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "assistant" && (
              <div className="flex-shrink-0 mt-1">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ background: "rgba(99,102,241,0.2)" }}
                >
                  <Bot className="h-4 w-4" style={{ color: "var(--primary-color)" }} />
                </div>
              </div>
            )}

            <div
              className={cn(
                "group relative max-w-2xl rounded-2xl px-4 py-3",
              )}
              style={{
                background: message.role === "user" ? "var(--primary-color)" : "var(--bg-card)",
                color: message.role === "user" ? "#ffffff" : "var(--text-primary)",
                border: message.role === "assistant" ? "1px solid var(--glass-border)" : "none",
              }}
            >
              {message.action && message.role === "assistant" && (
                <div
                  className="mb-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{ background: "var(--bg-tertiary)", color: "var(--text-muted)" }}
                >
                  {message.action === "draft_email" && (
                    <>
                      <Mail className="h-3 w-3" />
                      Borrador de Email
                    </>
                  )}
                  {message.action === "draft_proposal" && (
                    <>
                      <FileText className="h-3 w-3" />
                      Propuesta
                    </>
                  )}
                  {message.action === "summarize" && (
                    <>
                      <BookOpen className="h-3 w-3" />
                      Resumen de Caso
                    </>
                  )}
                </div>
              )}

              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {message.content}
              </div>

              <div
                className="mt-1 flex items-center gap-2 text-xs"
                style={{
                  color: message.role === "user" ? "rgba(255,255,255,0.6)" : "var(--text-muted)",
                }}
              >
                <span>
                  {message.timestamp.toLocaleTimeString("es-CL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {/* Copy button for assistant messages */}
              {message.role === "assistant" &&
                message.id !== "welcome" && (
                  <button
                    onClick={() =>
                      handleCopyMessage(message.id, message.content)
                    }
                    className="absolute -right-2 top-2 rounded-lg p-1.5 opacity-0 shadow-sm group-hover:opacity-100 transition-all"
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--glass-border)",
                      color: "var(--text-muted)",
                    }}
                    title="Copiar mensaje"
                  >
                    {copiedMessageId === message.id ? (
                      <Check className="h-3.5 w-3.5" style={{ color: "var(--success)" }} />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
            </div>

            {message.role === "user" && (
              <div className="flex-shrink-0 mt-1">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ background: "rgba(99,102,241,0.2)" }}
                >
                  <User className="h-4 w-4" style={{ color: "var(--primary-color)" }} />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 mt-1">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: "rgba(99,102,241,0.2)" }}
              >
                <Bot className="h-4 w-4" style={{ color: "var(--primary-color)" }} />
              </div>
            </div>
            <div
              className="rounded-2xl px-4 py-3"
              style={{ background: "var(--bg-card)", border: "1px solid var(--glass-border)" }}
            >
              <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
                <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--primary-color)" }} />
                Pensando...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="pt-4" style={{ borderTop: "1px solid var(--glass-border)" }}>
        <div className="flex items-end gap-3">
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu mensaje o pregunta..."
              rows={1}
              className="w-full resize-none rounded-xl px-4 py-3 pr-12 text-sm outline-none"
              style={{
                minHeight: "48px",
                maxHeight: "120px",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
              }}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ background: "var(--primary-color)" }}
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-xs text-center" style={{ color: "var(--text-muted)" }}>
          El asistente de IA puede cometer errores. Siempre revise el contenido
          generado antes de utilizarlo.
        </p>
      </div>
    </div>
  );
}
