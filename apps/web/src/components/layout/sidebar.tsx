"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SIDEBAR_GROUPS } from "@/lib/constants";
import type { SidebarGroup } from "@/lib/constants";
import {
  LayoutDashboard, UserPlus, Users, Briefcase, FileText,
  FileSignature, Stamp, ClipboardCheck, DollarSign, Mail,
  Search, CheckSquare, FolderOpen, Bot, Settings,
  ChevronDown, ChevronRight,
} from "lucide-react";

const iconMap: Record<string, any> = {
  LayoutDashboard, UserPlus, Users, Briefcase, FileText,
  FileSignature, Stamp, ClipboardCheck, DollarSign, Mail,
  Search, CheckSquare, FolderOpen, Bot, Settings,
};

function SidebarGroupSection({ group, pathname }: { group: SidebarGroup; pathname: string }) {
  const [isOpen, setIsOpen] = useState(group.defaultOpen !== false);

  const hasActive = group.items.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );

  return (
    <div className="mb-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center justify-between px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase transition-colors",
          hasActive ? "text-primary" : "text-gray-400 hover:text-gray-600",
        )}
      >
        <span>{group.label}</span>
        {isOpen ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
      </button>

      {isOpen && (
        <div className="space-y-0.5 mt-0.5">
          {group.items.map((item) => {
            const Icon = iconMap[item.icon] || LayoutDashboard;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                )}
              >
                <Icon className={cn("h-4 w-4 flex-shrink-0", isActive && "text-primary")} />
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className={cn(
                    "ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                    item.badgeColor === "red"
                      ? "bg-red-100 text-red-700"
                      : item.badgeColor === "yellow"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-primary/10 text-primary",
                  )}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white flex flex-col">
      <div className="flex h-16 items-center border-b px-6 flex-shrink-0">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white font-bold text-sm">
            LV
          </div>
          <div>
            <span className="text-lg font-semibold leading-none">Logan Virtual</span>
            <p className="text-[9px] text-gray-400 font-medium">LegalOps OS</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {SIDEBAR_GROUPS.map((group) => (
          <SidebarGroupSection
            key={group.label}
            group={group}
            pathname={pathname}
          />
        ))}
      </nav>

      <div className="flex-shrink-0 border-t p-3">
        <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
            CL
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 truncate">Carlos Logan</p>
            <p className="text-[10px] text-gray-400">Gerente Legal</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
