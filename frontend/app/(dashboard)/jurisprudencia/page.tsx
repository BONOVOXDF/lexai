"use client";

import * as React from "react";
import { Gavel, Search, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner, Alert, AlertDescription } from "@/components/ui/alert";
import { Markdown } from "@/components/markdown";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { ResultadoPesquisa, ResultadoPesquisaIA } from "@/lib/types";

/** Página de pesquisa de jurisprudência (textual + por IA). */
export default function JurisprudenciaPage() {
  const [termo, setTermo] = React.useState("");
  const [tribunal, setTribunal] = React.useState("qualquer");
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
      const data = await api.post<ResultadoPesquisa[]>("/api/pesquisa/jurisprudencia", {
        termo,
        tribunal: tribunal === "qualquer" ? null : tribunal,
        limite: 15,
      });
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
      const data = await api.post<ResultadoPesquisaIA>("/api/pesquisa/ia", {
        termo,
        tribunal: tribunal === "qualquer" ? null : tribunal,
        limite: 10,
      });
      setResultadoIA(data);
    } finally {
      setLoadingIA(false);
    }
  };

  return (
    <>
      <PageHeader title="Jurisprudência" description="Pesquise jurisprudência e súmulas dos tribunais." />

      <div className="rounded-2xl border bg-card p-5">
        <div className="grid gap-4 md:grid-cols-[1fr_220px_auto]">
          <div className="space-y-2">
            <Label>Termo de pesquisa</Label>
            <Input
              placeholder="Ex.: dano moral, justa causa, repetição de indébito…"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && pesquisar()}
            />
          </div>
          <div className="space-y-2">
            <Label>Tribunal</Label>
            <Select value={tribunal} onValueChange={setTribunal}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["qualquer", "STF", "STJ", "TST", "TRF1", "TRF2", "TRF3", "TRF4", "TJSP", "TJMG", "TJRJ", "TJRS"].map((t) => (
                  <SelectItem key={t} value={t}>{t === "qualquer" ? "Qualquer tribunal" : t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <Spinner /> <span className="text-sm">IA pesquisando jurisprudência e fundamentos…</span>
        </div>
      )}

      {resultadoIA && (
        <div className="mt-6 rounded-2xl border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold-dark" />
            <h2 className="font-display font-semibold">Resultado da pesquisa por IA</h2>
          </div>
          <Markdown content={resultadoIA.resposta} />
          {resultadoIA.fontes.length > 0 && (
            <div className="mt-4 rounded-xl bg-muted/40 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fontes</p>
              {resultadoIA.fontes.map((f, i) => (
                <p key={i} className="mb-1.5 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{f.fonte}</span> — {f.trecho.slice(0, 120)}
                  {f.url && <span className="block">{f.url}</span>}
                </p>
              ))}
            </div>
          )}
          <Alert variant="warning" className="mt-4">
            <AlertDescription>⚠️ Confirme a vigência e a aplicabilidade dos entendimentos antes de utilizá-los em peças processuais.</AlertDescription>
          </Alert>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {loading && <div className="flex justify-center py-10"><Spinner /></div>}
        {!loading && pesquisou && resultados.length === 0 && !resultadoIA && (
          <EmptyState icon={Gavel} title="Nenhum resultado encontrado" description="Tente termos diferentes ou use a pesquisa por IA." />
        )}
        {!loading &&
          resultados.map((r, i) => (
            <div key={i} className="rounded-2xl border bg-card p-5 transition-all hover:shadow-premium">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display font-semibold">{r.titulo}</h3>
                <Badge variant="gold">{r.tipo === "sumula" ? "Súmula" : "Jurisprudência"}</Badge>
                {r.orgao && <Badge variant="secondary">{r.orgao}</Badge>}
              </div>
              {r.data && <p className="mt-1 text-xs text-muted-foreground">{formatDate(r.data)}</p>}
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{r.resumo}</p>
              {r.url && (
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm font-medium text-gold-dark hover:underline">
                  Ver inteiro teor →
                </a>
              )}
            </div>
          ))}
      </div>
    </>
  );
}
