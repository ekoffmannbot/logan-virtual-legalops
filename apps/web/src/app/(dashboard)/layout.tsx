"use client";

import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "var(--bg-primary)" }}
      >
        <div className="text-center">
          <div
            className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
            style={{ borderColor: "var(--primary-color)", borderTopColor: "transparent" }}
          />
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Cargando...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)" }}>
      {/* Background effects */}
      <div className="bg-pattern" />
      <div className="bg-grid" />

      {/* Sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="min-h-screen" style={{ marginLeft: "var(--sidebar-width)" }}>
        <Topbar />
        <main className="p-8" style={{ animation: "fadeIn 0.4s ease" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
