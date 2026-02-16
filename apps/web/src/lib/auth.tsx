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
    // Check for demo session first
    const demoUser = localStorage.getItem("demo_user");
    if (demoUser) {
      try {
        setUser(JSON.parse(demoUser));
      } catch { /* ignore */ }
      setIsLoading(false);
      return;
    }

    const token = getToken();
    if (token) {
      api
        .get<User>("/auth/me")
        .then(setUser)
        .catch(() => {
          clearTokens();
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    // Demo user — instant login, no backend needed
    const demoUser = DEMO_USERS[email];
    if (demoUser && password === "logan2024") {
      localStorage.setItem("demo_user", JSON.stringify(demoUser));
      setUser(demoUser);
      window.location.href = "/dashboard";
      return;
    }

    // Real backend login
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1"}/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Credenciales inválidas");
    }

    const data = await res.json();
    setTokens(data.access_token, data.refresh_token);
    const userData = await api.get<User>("/auth/me");
    setUser(userData);
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
