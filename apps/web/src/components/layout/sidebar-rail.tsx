"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Inbox, Calendar, Bot, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Inicio", href: "/dashboard", icon: Home },
  { label: "Mis Cosas", href: "/bandeja", icon: Inbox },
  { label: "Calendario", href: "/calendar", icon: Calendar },
  { label: "Agentes", href: "/agents", icon: Bot },
  { label: "Config", href: "/admin", icon: Settings },
];

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function isRouteActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(href + "/");
}

export function SidebarRail() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const initials = user?.full_name ? getInitials(user.full_name) : "??";

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-16 flex-col items-center border-r bg-white">
      {/* Logo */}
      <Link
        href="/dashboard"
        className="flex h-16 w-full items-center justify-center border-b"
      >
        <span className="text-base font-bold text-blue-600">LV</span>
      </Link>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col items-center gap-1 pt-4">
        {NAV_ITEMS.map((item) => {
          const active = isRouteActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex flex-col items-center justify-center rounded-lg px-2 py-2 transition-colors duration-150",
                active
                  ? "bg-blue-600/10 text-blue-600"
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-150",
                  active && "bg-blue-600 text-white"
                )}
              >
                <Icon className="h-6 w-6" />
              </div>
              <span
                className={cn(
                  "mt-0.5 text-[11px] leading-tight",
                  active ? "font-semibold text-blue-600" : "font-medium"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* User avatar + logout */}
      <div className="flex flex-col items-center gap-2 border-t pb-4 pt-3">
        <button
          onClick={logout}
          className="group flex flex-col items-center justify-center rounded-lg px-2 py-2 text-gray-500 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-700"
          title="Cerrar sesión"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600/10 text-xs font-bold text-blue-600">
            {initials}
          </div>
          <LogOut className="mt-1 h-3.5 w-3.5 text-gray-400 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
        </button>
      </div>
    </aside>
  );
}
