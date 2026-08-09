"use client";

import * as React from "react";
import { CalendarClock, FolderOpen, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";
import type { ColunasPrazos, PrazoKanbanItem } from "@/lib/types";

interface ColunaConfig {
  id: string;
  titulo: string;
  destaque: boolean;
}

const COLUNAS: ColunaConfig[] = [
  { id: "atrasados", titulo: "Atrasados", destaque: true },
  { id: "hoje", titulo: "Vencem hoje", destaque: true },
  { id: "7_dias", titulo: "Próximos 7 dias", destaque: false },
  { id: "30_dias", titulo: "Próximos 30 dias", destaque: false },
  { id: "depois", titulo: "Depois", destaque: false },
  { id: "sem_prazo", titulo: "Sem prazo", destaque: false },
];

function diasAte(prazo?: string | null): number | null {
  if (!prazo) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(prazo + "T00:00:00");
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

function CardPrazo({
  item,
  onDragStart,
}: {
  item: PrazoKanbanItem;
  onDragStart: (id: number) => void;
}) {
  const dias = diasAte(item.prazo);
  return (
    <div
      draggable
      onDragStart={() => onDragStart(item.id)}
      className="group cursor-grab rounded-xl border bg-card p-3 shadow-soft transition-all hover:border-gold/50 hover:shadow-premium active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate font-mono text-xs font-semibold text-navy">{item.numero}</p>
        {dias !== null && dias <= 7 && (
          <Badge
            variant={dias < 0 ? "destructive" : dias === 0 ? "warning" : "gold"}
            className="shrink-0"
          >
            {dias < 0 ? `${Math.abs(dias)}d atrasado` : dias === 0 ? "hoje" : `${dias}d`}
          </Badge>
        )}
      </div>
      {item.cliente_nome && <p className="mt-1 truncate text-xs text-muted-foreground">{item.cliente_nome}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
        {item.tribunal && (
          <span className="truncate">
            <FolderOpen className="mr-1 inline h-3 w-3" />
            {item.tribunal}
          </span>
        )}
        {item.prazo && <span>{formatDate(item.prazo)}</span>}
      </div>
    </div>
  );
}

/** Kanban de prazos: processos organizados por faixa de vencimento. */
export default function PrazosPage() {
  const [colunas, setColunas] = React.useState<ColunasPrazos>({});
  const [loading, setLoading] = React.useState(true);
  const [arrastando, setArrastando] = React.useState<number | null>(null);
  const [salvando, setSalvando] = React.useState(false);

  const carregar = React.useCallback(async () => {
    try {
      const data = await api.get<{ colunas: ColunasPrazos }>("/api/prazos/kanban");
      setColunas(data.colunas);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    carregar();
  }, [carregar]);

  const mover = async (id: number, destino: string) => {
    const origem = Object.entries(colunas).find(([, itens]) => itens.some((i) => i.id === id))?.[0];
    if (!origem || origem === destino) return;

    const card = colunas[origem].find((i) => i.id === id);
    if (!card) return;

    const copia: ColunasPrazos = {
      ...colunas,
      [origem]: colunas[origem].filter((i) => i.id !== id),
      [destino]: [...colunas[destino], card],
    };
    setColunas(copia);
    setSalvando(true);
    try {
      await api.put(`/api/prazos/${id}/mover`, { coluna: destino });
      carregar();
    } catch {
      carregar();
    } finally {
      setSalvando(false);
    }
  };

  const colunasAtivas = Object.values(colunas).reduce((s, l) => s + l.length, 0);

  return (
    <>
      <PageHeader
        title="Prazos"
        description="Quadro kanban dos processos por vencimento. Arraste os cards para reorganizar."
      >
        {salvando && (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Salvando…
          </span>
        )}
      </PageHeader>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6" />
        </div>
      ) : colunasAtivas === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Nenhum prazo cadastrado"
          description="Cadastre prazos nos processos para vê-los organizados aqui."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {COLUNAS.map((col) => {
            const itens = colunas[col.id] ?? [];
            return (
              <div
                key={col.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = Number(e.dataTransfer.getData("text/plain"));
                  if (id) mover(id, col.id);
                }}
                className={cn(
                  "flex min-h-[220px] flex-col rounded-2xl border bg-muted/30 p-2 transition-colors",
                  arrastando !== null && "ring-1 ring-gold/40"
                )}
              >
                <div className="mb-2 flex items-center justify-between px-1 pt-1">
                  <span
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide",
                      col.destaque ? "text-navy" : "text-muted-foreground"
                    )}
                  >
                    <CalendarClock className={cn("h-3.5 w-3.5", col.destaque && "text-gold-dark")} />
                    {col.titulo}
                  </span>
                  <Badge variant="secondary">{itens.length}</Badge>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">
                  {itens.length === 0 ? (
                    <p className="px-1 py-6 text-center text-xs text-muted-foreground">Nenhum processo</p>
                  ) : (
                    itens.map((item) => (
                      <CardPrazo
                        key={item.id}
                        item={item}
                        onDragStart={(id) => {
                          setArrastando(id);
                          if (typeof window !== "undefined") {
                            window.addEventListener("dragend", () => setArrastando(null), { once: true });
                          }
                        }}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
