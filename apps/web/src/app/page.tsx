"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Auto-login as demo user and go directly to dashboard
    const demoUser = {
      id: 1,
      organization_id: 1,
      email: "admin@logan.cl",
      full_name: "Carlos Logan",
      role: "gerente_legal",
      active: true,
    };
    localStorage.setItem("demo_user", JSON.stringify(demoUser));
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Cargando Logan Virtual...</p>
      </div>
    </div>
  );
}
