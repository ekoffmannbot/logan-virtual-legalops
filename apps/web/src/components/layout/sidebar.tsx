"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SIDEBAR_ITEMS } from "@/lib/constants";
import {
  LayoutDashboard, UserPlus, Users, Briefcase, FileText,
  FileSignature, Stamp, ClipboardCheck, DollarSign, Mail,
  Search, CheckSquare, FolderOpen, Bot, Settings,
} from "lucide-react";

const iconMap: Record<string, any> = {
  LayoutDashboard, UserPlus, Users, Briefcase, FileText,
  FileSignature, Stamp, ClipboardCheck, DollarSign, Mail,
  Search, CheckSquare, FolderOpen, Bot, Settings,
};

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-bold text-sm">
            LV
          </div>
          <span className="text-lg font-semibold">Logan Virtual</span>
        </Link>
      </div>
      <nav className="flex flex-col gap-1 p-3 overflow-y-auto h-[calc(100vh-4rem)]">
        {SIDEBAR_ITEMS.map((item) => {
          const Icon = iconMap[item.icon] || LayoutDashboard;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
