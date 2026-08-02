"use client";

import * as React from "react";
import { AuthProvider } from "@/lib/auth-context";
import { SidebarContent } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";

/**
 * Layout do painel autenticado: menu lateral fixo + conteúdo.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <AuthProvider>
      <div className="min-h-screen bg-parchment/60 dark:bg-background">
        <div className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
          <SidebarContent />
        </div>
        <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

        <div className="lg:pl-64">
          <Topbar onMenuClick={() => setMobileOpen(true)} />
          <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </AuthProvider>
  );
}
