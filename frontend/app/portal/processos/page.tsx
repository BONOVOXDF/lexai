"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarClock,
  Gavel,
  LogOut,
  Scale,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner, Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  clearPortalSession,
  getPortalCliente,
  getPortalToken,
  portalApi,
} from "@/lib/portal-api";
import { formatDate, titleCase } from "@/lib/utils";
import type { PortalEvento, PortalProcesso } from "@/lib/types";

function diasAte(prazo?: string | null): number | null {
  if (!prazo) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(prazo + "T00:00:00");
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

/** Portal do cliente: processos, prazos e audiências. */
export default function PortalProcessosPage() {
  const router = useRouter();
  const cliente = getPortalCliente();

  const [carregando, setCarregando] = React.useState(true);
  const [erro, setErro] = React.useState<string | null>(null);
  const [processos, setProcessos] = React.useState<PortalProcesso[]>([]);
  const [eventos, setEventos] = React.useState<PortalEvento[]>([]);
  const [audiencias, setAudiencias] = React.useState<PortalEvento[]>([]);
  const [totalPrazos, setTotalPrazos] = React.useState(0);

  React.useEffect(() => {
    if (!getPortalToken()) {
      router.replace("/portal/login");
      return;
    }
    (async () => {
      try {
        const data = await portalApi.get<{
          processos: PortalProcesso[];
          eventos: PortalEvento[];
          total_processos: number;
          total_prazos_proximos: number;
          proximas_audiencias: PortalEvento[];
        }>("/api/portal/dashboard");
        setProcessos(data.processos);
        setEventos(data.eventos);
        setAudiencias(data.proximas_audiencias);
        setTotalPrazos(data.total_prazos_proximos);
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Falha ao carregar seus dados.");
      } finally {
        setCarregando(false);
      }
    })();
  }, [router]);

  const sair = () => {
    clearPortalSession();
    router.replace("/portal/login");
  };

  return (
    <div className="min-h-screen bg-parchment dark:bg-navy-dark">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-white/90 backdrop-blur dark:bg-navy/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/">
            <Logo size="md" />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:block">
              {cliente?.nome ?? "Cliente"}
            </span>
            <Button variant="outline" size="sm" onClick={sair}>
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-col gap-2">
          <p className="text-sm font-semibold uppercase tracking-wider text-gold-dark dark:text-gold">
            Portal do cliente
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Olá, {cliente?.nome?.split(" ")[0] ?? "cliente"}!
          </h1>
          <p className="text-sm text-muted-foreground">
            Acompanhe a situação dos seus processos e as próximas audiências.
          </p>
        </div>

        {erro && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        {carregando ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border bg-card p-5 shadow-soft">
                <Scale className="h-5 w-5 text-gold-dark" />
                <p className="mt-3 font-display text-3xl font-semibold">{processos.length}</p>
                <p className="text-sm text-muted-foreground">Processos ativos</p>
              </div>
              <div className="rounded-2xl border bg-card p-5 shadow-soft">
                <CalendarClock className="h-5 w-5 text-gold-dark" />
                <p className="mt-3 font-display text-3xl font-semibold">{totalPrazos}</p>
                <p className="text-sm text-muted-foreground">Prazos pela frente</p>
              </div>
              <div className="rounded-2xl border bg-card p-5 shadow-soft">
                <Gavel className="h-5 w-5 text-gold-dark" />
                <p className="mt-3 font-display text-3xl font-semibold">{audiencias.length}</p>
                <p className="text-sm text-muted-foreground">Próximas audiências</p>
              </div>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-3">
              <section className="lg:col-span-2">
                <h2 className="font-display text-xl font-semibold">Seus processos</h2>
                {processos.length === 0 ? (
                  <div className="mt-4 rounded-2xl border bg-card">
                    <EmptyState
                      icon={Scale}
                      title="Nenhum processo"
                      description="Seus processos aparecerão aqui assim que o escritório os cadastrar."
                    />
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {processos.map((p) => {
                      const dias = diasAte(p.prazo);
                      return (
                        <div
                          key={p.id}
                          className="rounded-2xl border bg-card p-4 shadow-soft transition-all hover:shadow-premium"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-mono text-sm font-semibold text-navy">{p.numero}</p>
                            <Badge variant={p.status === "em_andamento" ? "gold" : "secondary"}>
                              {titleCase(p.status)}
                            </Badge>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {p.tribunal && <span>{p.tribunal}</span>}
                            {p.comarca && <span>{p.comarca}</span>}
                            {p.classe && <span>{p.classe}</span>}
                          </div>
                          {p.prazo && (
                            <div className="mt-3 flex items-center gap-2">
                              <CalendarClock className="h-4 w-4 text-gold-dark" />
                              <span className="text-sm">
                                Próximo prazo: <strong>{formatDate(p.prazo)}</strong>
                                {dias !== null && dias >= 0 && ` (em ${dias} dia${dias === 1 ? "" : "s"})`}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section>
                <h2 className="font-display text-xl font-semibold">Próximas audiências</h2>
                {audiencias.length === 0 ? (
                  <div className="mt-4 rounded-2xl border bg-card">
                    <EmptyState
                      icon={Gavel}
                      title="Nenhuma audiência"
                      description="As audiências agendadas aparecerão aqui."
                    />
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {audiencias.map((e) => (
                      <div key={e.id} className="rounded-2xl border bg-card p-4 shadow-soft">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-gold-dark" />
                          <p className="text-sm font-semibold">{e.titulo}</p>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {formatDate(e.data_inicio)}
                          {e.hora_inicio ? ` às ${e.hora_inicio}` : ""}
                          {e.local ? ` · ${e.local}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {eventos.length > 0 && (
                  <>
                    <h2 className="mt-8 font-display text-xl font-semibold">Agenda</h2>
                    <div className="mt-4 space-y-3">
                      {eventos.map((e) => (
                        <div key={e.id} className="rounded-2xl border bg-card p-4 shadow-soft">
                          <p className="text-sm font-semibold">{e.titulo}</p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatDate(e.data_inicio)}
                            {e.hora_inicio ? ` às ${e.hora_inicio}` : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
