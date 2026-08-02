"use client";

import * as React from "react";
import {
  CalendarDays,
  FileText,
  FolderOpen,
  MessageSquareText,
  ScrollText,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/reveal";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { DashboardData, PontoGrafico } from "@/lib/types";
import { useRouter } from "next/navigation";

/** Gráfico de barras simples e elegante (receitas vs despesas). */
function MiniBars({ data, color }: { data: PontoGrafico[]; color: string }) {
  const max = Math.max(...data.map((d) => d.valor), 1);
  return (
    <div className="flex h-28 items-end gap-2">
      {data.map((p) => (
        <div key={p.rotulo} className="group flex flex-1 flex-col items-center gap-1">
          <div className="relative flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t transition-all duration-500"
              style={{ height: `${Math.max((p.valor / max) * 100, 2)}%`, backgroundColor: color }}
              title={formatCurrency(p.valor)}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">{p.rotulo}</span>
        </div>
      ))}
    </div>
  );
}

/** Página do dashboard principal. */
export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api
      .get<DashboardData>("/api/dashboard")
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (!data) {
    return (
      <PageHeader title="Dashboard" description="Não foi possível carregar os dados. Verifique sua conexão." />
    );
  }

  const s = data.stats;

  return (
    <>
      <PageHeader title="Dashboard" description="Visão geral do seu escritório.">
        <Button variant="gold" onClick={() => router.push("/assistente")}>
          <MessageSquareText className="h-4 w-4" />
          Perguntar à IA
        </Button>
      </PageHeader>

      {/* Cards de indicadores */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Clientes" value={s.total_clientes} icon={Users} accent="navy" />
        <StatCard label="Processos" value={s.total_processos} icon={FolderOpen} accent="navy" hint={`${s.processos_andamento} em andamento`} />
        <StatCard label="Consultas IA" value={s.total_consultas_ia} icon={MessageSquareText} accent="gold" />
        <StatCard label="Petições" value={s.total_peticoes} icon={ScrollText} accent="gold" />
        <StatCard label="Documentos" value={s.total_documentos} icon={FileText} accent="emerald" />
      </div>

      {/* Gráficos + agenda */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Fluxo financeiro</CardTitle>
            <CardDescription>Receitas e despesas dos últimos 6 meses.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Receitas</p>
                <MiniBars data={data.receitas_por_mes} color="#D4AF37" />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Despesas</p>
                <MiniBars data={data.despesas_por_mes} color="#0B1F3A" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-muted/40 p-4">
                <p className="text-xs text-muted-foreground">Receitas do mês</p>
                <p className="mt-1 font-display text-lg font-semibold text-emerald-600">{formatCurrency(s.receitas_mes)}</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-4">
                <p className="text-xs text-muted-foreground">Despesas do mês</p>
                <p className="mt-1 font-display text-lg font-semibold text-red-600">{formatCurrency(s.despesas_mes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Próximos eventos */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Agenda</CardTitle>
              <CardDescription>Próximos eventos e prazos.</CardDescription>
            </div>
            <CalendarDays className="h-5 w-5 text-gold-dark" />
          </CardHeader>
          <CardContent className="space-y-3">
            {data.eventos_proximos.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum evento próximo.</p>
            ) : (
              data.eventos_proximos.map((e) => (
                <div key={e.id} className="flex items-center gap-3 rounded-xl border p-3">
                  <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-navy text-white">
                    <span className="text-sm font-semibold">{new Date(e.data_inicio).getDate()}</span>
                    <span className="text-[9px] uppercase opacity-70">
                      {new Date(e.data_inicio).toLocaleDateString("pt-BR", { month: "short" })}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{e.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {e.hora_inicio || "—"} · {formatDate(e.data_inicio)}
                    </p>
                  </div>
                </div>
              ))
            )}
            <Button variant="outline" className="w-full" onClick={() => router.push("/agenda")}>
              Ver agenda completa
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Processos e atividades */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Processos recentes</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => router.push("/processos")}>
              Ver todos
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.processos_recentes.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum processo cadastrado.</p>
            ) : (
              data.processos_recentes.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.numero}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.tribunal || "Tribunal não informado"} {p.cliente_nome ? `· ${p.cliente_nome}` : ""}
                    </p>
                  </div>
                  <Badge variant={p.status === "em_andamento" ? "gold" : "secondary"}>{p.status.replace(/_/g, " ")}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atividades recentes</CardTitle>
            <CardDescription>Últimas movimentações no seu escritório.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.atividades_recentes.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma atividade recente.</p>
            ) : (
              data.atividades_recentes.map((a) => (
                <Reveal key={`${a.tipo}-${a.id}`}>
                  <div className="flex items-center gap-3 rounded-xl border p-3">
                    <Badge variant="outline" className="w-20 justify-center">
                      {a.tipo}
                    </Badge>
                    <p className="min-w-0 flex-1 truncate text-sm">{a.descricao}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDate(a.data)}</span>
                  </div>
                </Reveal>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 rounded-xl lg:col-span-2" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}
