"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Spinner } from "@/components/ui/alert";
import { SidebarContent } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";

/**
 * Protege as rotas do painel: redireciona para /login quando não há sessão.
 */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [loading, isAuthenticated, router]);

  if (loading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Layout do painel autenticado: menu lateral fixo + conteúdo.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <AuthProvider>
      <RequireAuth>
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
      </RequireAuth>
    </AuthProvider>
  );
}
