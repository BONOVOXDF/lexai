"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Calendar,
  Contact,
  CreditCard,
  FileText,
  FolderOpen,
  Gavel,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Newspaper,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Assistente IA", href: "/assistente", icon: MessageSquareText },
  { label: "Petições", href: "/peticoes", icon: ScrollText },
  { label: "Jurisprudência", href: "/jurisprudencia", icon: Gavel },
  { label: "Leis", href: "/leis", icon: Newspaper },
  { label: "Contratos", href: "/contratos", icon: FileText },
  { label: "Clientes", href: "/clientes", icon: Users },
  { label: "Processos", href: "/processos", icon: FolderOpen },
  { label: "Agenda", href: "/agenda", icon: Calendar },
  { label: "Documentos", href: "/documentos", icon: FileText },
  { label: "Financeiro", href: "/financeiro", icon: CreditCard },
  { label: "Configurações", href: "/configuracoes", icon: Settings },
];

function SidebarContent() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div className="flex h-full flex-col bg-navy text-white">
      {/* Filete dourado no topo */}
      <div className="h-px shrink-0 bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

      <div className="flex h-16 shrink-0 items-center border-b border-white/10 px-5">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Logo size="sm" />
          <span className="font-display text-xl font-semibold tracking-tight">
            LEX <span className="text-gradient-gold">AI</span>
          </span>
        </Link>
      </div>

      <ScrollArea className="flex-1">
        <nav className="space-y-1 p-3">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/65 hover:bg-white/5 hover:text-white"
                )}
              >
                {active && (
                  <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-gradient-to-b from-gold-light to-gold-dark" />
                )}
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] transition-colors",
                    active ? "text-gold-light" : "text-white/45 group-hover:text-white/80"
                  )}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="shrink-0 border-t border-white/10 p-3">
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gold-light to-gold-dark text-sm font-semibold text-navy">
            {(user?.nome || "A").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.nome || "Advogado"}</p>
            <p className="truncate text-xs text-white/50">{user?.plano === "free" ? "Plano Free" : "Plano Profissional"}</p>
          </div>
          <ShieldCheck className="h-4 w-4 text-gold/70" />
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-white/65 hover:bg-white/5 hover:text-white"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  );
}

export { NAV_ITEMS, SidebarContent };
