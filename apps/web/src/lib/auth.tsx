"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { api, setTokens, clearTokens, getToken } from "./api";

interface User {
  id: number;
  organization_id: number;
  email: string;
  full_name: string;
  role: string;
  active: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  logout: () => {},
});

// Demo users for preview without backend
const DEMO_USERS: Record<string, User> = {
  "admin@logan.cl": {
    id: 1,
    organization_id: 1,
    email: "admin@logan.cl",
    full_name: "Carlos Logan",
    role: "gerente_legal",
    active: true,
  },
  "abogado@logan.cl": {
    id: 2,
    organization_id: 1,
    email: "abogado@logan.cl",
    full_name: "María Fernández",
    role: "abogado",
    active: true,
  },
  "secretaria@logan.cl": {
    id: 3,
    organization_id: 1,
    email: "secretaria@logan.cl",
    full_name: "Ana Torres",
    role: "secretaria",
    active: true,
  },
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Priority: real JWT token > demo session
    const token = getToken();
    if (token) {
      api
        .get<User>("/auth/me")
        .then((userData) => {
          // Real token works — clear any stale demo session
          localStorage.removeItem("demo_user");
          setUser(userData);
        })
        .catch(() => {
          clearTokens();
          // Fall back to demo user if available
          const demoUser = localStorage.getItem("demo_user");
          if (demoUser) {
            try { setUser(JSON.parse(demoUser)); } catch { /* ignore */ }
          } else {
            setUser(null);
          }
        })
        .finally(() => setIsLoading(false));
      return;
    }

    // No real token — check demo session
    const demoUser = localStorage.getItem("demo_user");
    if (demoUser) {
      try {
        setUser(JSON.parse(demoUser));
      } catch { /* ignore */ }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Always try real backend first
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData,
        }
      );

      if (res.ok) {
        const data = await res.json();
        setTokens(data.access_token, data.refresh_token);
        // Clear any previous demo session so API calls go to real backend
        localStorage.removeItem("demo_user");
        const userData = await api.get<User>("/auth/me");
        setUser(userData);
        window.location.href = "/dashboard";
        return;
      }
    } catch {
      // Backend unreachable — fall through to demo mode
      console.warn("Backend unreachable, trying demo mode...");
    }

    // Fallback: demo user only if backend is down
    const demoUser = DEMO_USERS[email];
    if (demoUser && password === "logan2024") {
      localStorage.setItem("demo_user", JSON.stringify(demoUser));
      setUser(demoUser);
      window.location.href = "/dashboard";
      return;
    }

    throw new Error("Credenciales inválidas");
  };

  const logout = () => {
    clearTokens();
    localStorage.removeItem("demo_user");
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
