import type {
  AIAgent,
  AIAgentSkill,
  AIAgentTask,
  AgentConversationMessage,
  AgentCostSummary,
  AgentExecuteResponse,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

class ApiError extends Error {
  status: number;
  data: any;
  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

function setTokens(access: string, refresh: string) {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
}

function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("refresh_token");
  if (!refreshToken) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) {
      clearTokens();
      return null;
    }
    const data = await res.json();
    setTokens(data.access_token, data.refresh_token);
    return data.access_token;
  } catch {
    clearTokens();
    return null;
  }
}

async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  let token = getToken();

  const makeRequest = async (authToken: string | null) => {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    // Ensure trailing slash for FastAPI compatibility (avoids 307 redirects)
    const normalizedPath = path.endsWith("/") || path.includes("?") ? path : `${path}/`;
    return fetch(`${API_BASE_URL}${normalizedPath}`, { ...options, headers });
  };

  let res = await makeRequest(token);

  if (res.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await makeRequest(newToken);
    } else {
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new ApiError(401, "Sesi\u00f3n expirada");
    }
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(
      res.status,
      errorData.detail || `Error ${res.status}`,
      errorData
    );
  }

  if (res.status === 204) return {} as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body?: any) =>
    apiRequest<T>(path, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  patch: <T>(path: string, body: any) =>
    apiRequest<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  put: <T>(path: string, body: any) =>
    apiRequest<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) =>
    apiRequest<T>(path, { method: "POST", body: formData }),
};

/* ------------------------------------------------------------------ */
/* Agent-specific API helpers                                          */
/* ------------------------------------------------------------------ */

export const agentApi = {
  list: () => api.get<AIAgent[]>("/agents"),
  get: (id: number) => api.get<AIAgent>(`/agents/${id}`),
  update: (id: number, body: Partial<AIAgent>) =>
    api.patch<AIAgent>(`/agents/${id}`, body),
  updateSkill: (agentId: number, skillId: number, body: Partial<AIAgentSkill>) =>
    api.patch<AIAgentSkill>(`/agents/${agentId}/skills/${skillId}`, body),
  execute: (id: number, message: string, threadId?: string) =>
    api.post<AgentExecuteResponse>(`/agents/${id}/execute`, {
      message,
      thread_id: threadId,
    }),
  tasks: (id: number, limit = 50) =>
    api.get<AIAgentTask[]>(`/agents/${id}/tasks?limit=${limit}`),
  conversations: (id: number, threadId?: string) =>
    api.get<AgentConversationMessage[]>(
      `/agents/${id}/conversations${threadId ? `?thread_id=${threadId}` : ""}`
    ),
  costs: (id: number) => api.get<AgentCostSummary>(`/agents/${id}/costs`),
  runWorkflow: (key: string, context?: Record<string, unknown>) =>
    api.post(`/agents/workflows/${key}`, { context }),
};

/* ------------------------------------------------------------------ */
/* WebSocket helper                                                    */
/* ------------------------------------------------------------------ */

export function createAgentWs(agentId: number): WebSocket | null {
  const token = getToken();
  if (!token) return null;
  const wsBase = (process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000")
    .replace(/^http/, "ws");
  return new WebSocket(`${wsBase}/ws/chat/${agentId}?token=${token}`);
}

export { ApiError, setTokens, clearTokens, getToken };
