"use client";

import * as React from "react";
import { Newspaper, Search, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/alert";
import { Markdown } from "@/components/markdown";
import { EmptyState } from "@/components/dashboard/empty-state";
import { api } from "@/lib/api";
import type { ResultadoPesquisa, ResultadoPesquisaIA } from "@/lib/types";

/** Página de pesquisa de leis e legislação. */
export default function LeisPage() {
  const [termo, setTermo] = React.useState("");
  const [resultados, setResultados] = React.useState<ResultadoPesquisa[]>([]);
  const [resultadoIA, setResultadoIA] = React.useState<ResultadoPesquisaIA | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [loadingIA, setLoadingIA] = React.useState(false);
  const [pesquisou, setPesquisou] = React.useState(false);

  const pesquisar = async () => {
    if (termo.trim().length < 3) return;
    setLoading(true);
    setPesquisou(true);
    try {
      const data = await api.post<ResultadoPesquisa[]>("/api/pesquisa/leis", { termo, limite: 15 });
      setResultados(data);
    } finally {
      setLoading(false);
    }
  };

  const pesquisarIA = async () => {
    if (termo.trim().length < 3) return;
    setLoadingIA(true);
    setPesquisou(true);
    try {
      const data = await api.post<ResultadoPesquisaIA>("/api/pesquisa/ia", { termo, limite: 10 });
      setResultadoIA(data);
    } finally {
      setLoadingIA(false);
    }
  };

  return (
    <>
      <PageHeader title="Leis" description="Pesquise legislação na sua base de conhecimento e na plataforma." />

      <div className="rounded-2xl border bg-card p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <Label>Pesquisar legislação</Label>
            <Input
              placeholder="Ex.: CLT, Código Civil, LGPD, art. 475-J…"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && pesquisar()}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={pesquisar} disabled={loading || termo.trim().length < 3}>
              <Search className="h-4 w-4" /> Pesquisar
            </Button>
            <Button variant="gold" onClick={pesquisarIA} disabled={loadingIA || termo.trim().length < 3}>
              {loadingIA ? <Spinner /> : <Sparkles className="h-4 w-4" />}
              Pesquisa IA
            </Button>
          </div>
        </div>
      </div>

      {loadingIA && (
        <div className="mt-6 flex items-center gap-3 text-muted-foreground">
          <Spinner /> <span className="text-sm">IA analisando a legislação…</span>
        </div>
      )}

      {resultadoIA && (
        <div className="mt-6 rounded-2xl border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold-dark" />
            <h2 className="font-display font-semibold">Resposta da IA</h2>
          </div>
          <Markdown content={resultadoIA.resposta} />
        </div>
      )}

      <div className="mt-6 space-y-3">
        {loading && <div className="flex justify-center py-10"><Spinner /></div>}
        {!loading && pesquisou && resultados.length === 0 && !resultadoIA && (
          <EmptyState icon={Newspaper} title="Nenhuma lei encontrada" description="Tente outro termo ou use a pesquisa por IA." />
        )}
        {!loading &&
          resultados.map((r, i) => (
            <div key={i} className="rounded-2xl border bg-card p-5 transition-all hover:shadow-premium">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display font-semibold">{r.titulo}</h3>
                {r.orgao && <Badge variant="secondary">{r.orgao}</Badge>}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{r.resumo}</p>
            </div>
          ))}
      </div>
    </>
  );
}
