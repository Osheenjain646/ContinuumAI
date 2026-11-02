"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Zap, FileText, Settings, LogOut, Plus, ChevronRight, User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SessionUser } from "@/types";

const navItems = [
  { href: "/dossiers", label: "Dossiers", icon: FileText },
  { href: "/integrations", label: "Integrations", icon: Settings },
];

export default function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SessionUser;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-zinc-50">
      {/* Sidebar */}
      <aside className="hidden md:flex w-56 flex-col border-r border-zinc-200 bg-white">
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b border-zinc-100 px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-blue-500">
            <Zap size={14} className="text-white" />
          </div>
          <span className="text-sm font-bold text-zinc-900">
            Continuum<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-blue-500">AI</span>
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith(item.href)
                  ? "bg-violet-50 text-violet-700"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              )}
            >
              <item.icon size={15} />
              {item.label}
            </Link>
          ))}

          <div className="mt-3 pt-3 border-t border-zinc-100">
            <Link
              href="/dossiers/new"
              className="flex items-center gap-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-500 px-3 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              <Plus size={15} />
              New Dossier
            </Link>
          </div>
        </nav>

        {/* User */}
        <div className="border-t border-zinc-100 p-3">
          <div className="flex items-center gap-2.5 rounded-lg p-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-violet-700 text-xs font-bold shrink-0">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-900 truncate">{user.name}</p>
              <p className="text-[10px] text-zinc-400 truncate">{user.email}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-zinc-400 hover:text-red-500 transition-colors"
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex h-14 items-center gap-3 border-b border-zinc-200 bg-white px-4 md:hidden">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-blue-500">
            <Zap size={14} className="text-white" />
          </div>
          <span className="text-sm font-bold text-zinc-900">ContinuumAI</span>
          <div className="ml-auto flex items-center gap-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}
                className={cn("rounded-md p-2 text-sm", pathname.startsWith(item.href) ? "text-violet-700 bg-violet-50" : "text-zinc-600")}
              >
                <item.icon size={16} />
              </Link>
            ))}
            <Link href="/dossiers/new" className="rounded-md p-2 text-violet-600">
              <Plus size={16} />
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

