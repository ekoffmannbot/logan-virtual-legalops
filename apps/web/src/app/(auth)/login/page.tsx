"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesi\u00f3n");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md relative z-10">
      <div
        className="rounded-2xl p-8"
        style={{
          background: "var(--bg-card)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid var(--glass-border)",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)",
        }}
      >
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[14px] text-xl font-extrabold text-white"
            style={{
              background: "linear-gradient(135deg, var(--primary-color), var(--accent-color))",
              boxShadow: "0 8px 24px var(--primary-glow)",
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            LV
          </div>
          <h1
            className="text-2xl font-bold"
            style={{
              fontFamily: "'Outfit', sans-serif",
              color: "var(--text-primary)",
            }}
          >
            Logan <span style={{ color: "var(--accent-color)" }}>Virtual</span>
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Sistema de Operaciones Legales
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div
              className="rounded-xl p-3 text-sm"
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                color: "var(--danger)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
              }}
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Correo electr{"\u00f3"}nico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
              onFocus={(e) => {
                (e.target as HTMLElement).style.borderColor = "var(--primary-color)";
                (e.target as HTMLElement).style.boxShadow = "0 0 0 3px var(--primary-glow)";
              }}
              onBlur={(e) => {
                (e.target as HTMLElement).style.borderColor = "var(--glass-border)";
                (e.target as HTMLElement).style.boxShadow = "";
              }}
              placeholder="usuario@logan.cl"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Contrase{"\u00f1"}a
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-primary)",
              }}
              onFocus={(e) => {
                (e.target as HTMLElement).style.borderColor = "var(--primary-color)";
                (e.target as HTMLElement).style.boxShadow = "0 0 0 3px var(--primary-glow)";
              }}
              onBlur={(e) => {
                (e.target as HTMLElement).style.borderColor = "var(--glass-border)";
                (e.target as HTMLElement).style.boxShadow = "";
              }}
              placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50"
            style={{ background: "var(--primary-color)" }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 20px var(--primary-glow)";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = "";
              (e.currentTarget as HTMLElement).style.boxShadow = "";
            }}
          >
            {isLoading ? "Iniciando sesi\u00f3n..." : "Iniciar Sesi\u00f3n"}
          </button>
        </form>

        <p
          className="mt-6 text-center text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          Gerente Legal &middot; 8 agentes IA a tu servicio
        </p>
      </div>
    </div>
  );
}
