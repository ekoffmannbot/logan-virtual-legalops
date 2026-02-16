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
        "Hola, soy el asistente de IA de Logan & Logan. Puedo ayudarte a redactar emails, crear propuestas, resumir casos y más. Selecciona un caso para dar contexto o usa los botones rápidos para comenzar.",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [selectedMatterId, setSelectedMatterId] = useState<string>("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const { data: mattersData } = useQuery({
    queryKey: ["ai", "matters"],
    queryFn: () => api.get<{ items: Matter[]; total: number }>("/matters?status=active&limit=100"),
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
          "Lo siento, ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo.",
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
          "No pude resumir el caso. Asegúrate de seleccionar un caso primero.",
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
      <div className="flex items-center justify-between border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            Asistente IA
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Asistente inteligente para tareas legales
          </p>
        </div>

        {/* Matter Selector */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <select
              value={selectedMatterId}
              onChange={(e) => setSelectedMatterId(e.target.value)}
              className="appearance-none rounded-lg border border-gray-300 py-2 pl-10 pr-10 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 min-w-[250px]"
            >
              <option value="">Sin caso seleccionado</option>
              {matters.map((matter) => (
                <option key={matter.id} value={matter.id}>
                  {matter.title} - {matter.client_name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <button
            onClick={() => {
              setMessages([
                {
                  id: "welcome",
                  role: "assistant",
                  content:
                    "Conversación reiniciada. Estoy listo para ayudarte.",
                  timestamp: new Date(),
                },
              ]);
            }}
            className="rounded-lg border border-gray-300 p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
            title="Reiniciar conversación"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Context indicator */}
      {selectedMatter && (
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-purple-50 px-4 py-1.5 text-sm text-purple-700 self-start">
          <Briefcase className="h-3.5 w-3.5" />
          Contexto: {selectedMatter.title} ({selectedMatter.client_name})
        </div>
      )}

      {/* Quick Action Buttons */}
      <div className="flex items-center gap-3 py-4 border-b border-gray-100">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          Acciones rápidas:
        </span>
        <button
          onClick={() => handleQuickAction("draft_email")}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-4 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50 transition-colors"
        >
          <Mail className="h-3.5 w-3.5" />
          Borrador Email
        </button>
        <button
          onClick={() => handleQuickAction("draft_proposal")}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors"
        >
          <FileText className="h-3.5 w-3.5" />
          Borrador Propuesta
        </button>
        <button
          onClick={() => handleQuickAction("summarize")}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-4 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
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
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                  <Bot className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            )}

            <div
              className={cn(
                "group relative max-w-2xl rounded-2xl px-4 py-3",
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-800"
              )}
            >
              {message.action && message.role === "assistant" && (
                <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium text-gray-600">
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
                className={cn(
                  "mt-1 flex items-center gap-2 text-xs",
                  message.role === "user"
                    ? "text-blue-200"
                    : "text-gray-400"
                )}
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
                    className="absolute -right-2 top-2 rounded-lg bg-white border border-gray-200 p-1.5 text-gray-400 opacity-0 shadow-sm group-hover:opacity-100 hover:text-gray-600 transition-all"
                    title="Copiar mensaje"
                  >
                    {copiedMessageId === message.id ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
            </div>

            {message.role === "user" && (
              <div className="flex-shrink-0 mt-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 mt-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100">
                <Bot className="h-4 w-4 text-purple-600" />
              </div>
            </div>
            <div className="rounded-2xl bg-gray-100 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Pensando...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-end gap-3">
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu mensaje o pregunta..."
              rows={1}
              className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 pr-12 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              style={{
                minHeight: "48px",
                maxHeight: "120px",
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
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-400 text-center">
          El asistente de IA puede cometer errores. Siempre revise el contenido
          generado antes de utilizarlo.
        </p>
      </div>
    </div>
  );
}
