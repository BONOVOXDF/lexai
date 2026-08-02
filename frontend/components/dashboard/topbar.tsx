"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NAV_ITEMS } from "@/components/dashboard/sidebar";
import { useAuth } from "@/lib/auth-context";
import { initials } from "@/lib/utils";

/** Barra superior do painel (mobile e desktop). */
export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const current = NAV_ITEMS.find(
    (item) =>
      pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`))
  );

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/70 bg-background/80 px-4 backdrop-blur-xl sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Abrir menu">
        <Menu className="h-5 w-5" />
      </Button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate font-display text-xl font-semibold tracking-tight">
          {current?.label ?? "LEX AI"}
        </h1>
      </div>

      <div className="hidden items-center gap-2 md:flex">
        <Button variant="ghost" size="sm" onClick={() => router.push("/assistente")}>
          <Plus className="h-4 w-4" />
          Nova conversa
        </Button>
        <Button variant="outline" size="sm" onClick={() => router.push("/peticoes")}>
          <Search className="h-4 w-4" />
          Pesquisar
        </Button>
      </div>

      <ThemeToggle />

      <Button variant="ghost" size="icon" aria-label="Notificações">
        <Bell className="h-5 w-5" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="rounded-full outline-none ring-offset-2 focus-visible:ring-2">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{initials(user?.nome || "LEX AI")}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex flex-col">
            <span className="font-medium">{user?.nome}</span>
            <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/configuracoes")}>Configurações</DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/financeiro")}>Financeiro</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="text-destructive">
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
