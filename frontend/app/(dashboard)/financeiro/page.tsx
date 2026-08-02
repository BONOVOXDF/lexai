"use client";

import * as React from "react";
import { ArrowDownCircle, ArrowUpCircle, Landmark, Plus, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { CategoriaMovimento, MovimentoFinanceiro, ResumoFinanceiro, TipoMovimento } from "@/lib/types";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const CATEGORIAS: { value: CategoriaMovimento; label: string }[] = [
  { value: "honorarios", label: "Honorários" },
  { value: "mensalidade", label: "Mensalidade" },
  { value: "reembolso", label: "Reembolso" },
  { value: "despesa_operacional", label: "Despesa operacional" },
  { value: "custas", label: "Custas" },
  { value: "impostos", label: "Impostos" },
  { value: "outros", label: "Outros" },
];

const vazio = {
  tipo: "receita" as TipoMovimento,
  categoria: "outros" as CategoriaMovimento,
  descricao: "",
  valor: "",
  data: new Date().toISOString().slice(0, 10),
  status: "pago",
  observacoes: "",
};

/** Página financeira: receitas, despesas e resumo consolidado. */
export default function FinanceiroPage() {
  const [movimentos, setMovimentos] = React.useState<MovimentoFinanceiro[]>([]);
  const [resumo, setResumo] = React.useState<ResumoFinanceiro | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [filtro, setFiltro] = React.useState<"todos" | TipoMovimento>("todos");
  const [dialogAberto, setDialogAberto] = React.useState(false);
  const [editandoId, setEditandoId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState(vazio);

  const carregar = React.useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page_size: "200" });
    if (filtro !== "todos") params.set("tipo", filtro);
    const [lista, res] = await Promise.all([
      api.get<{ items: MovimentoFinanceiro[] }>(`/api/financeiro?${params.toString()}`),
      api.get<ResumoFinanceiro>("/api/financeiro/resumo"),
    ]);
    setMovimentos(lista.items);
    setResumo(res);
    setLoading(false);
  }, [filtro]);

  React.useEffect(() => {
    carregar();
  }, [carregar]);

  const abrirNovo = (tipo: TipoMovimento) => {
    setEditandoId(null);
    setForm({ ...vazio, tipo });
    setDialogAberto(true);
  };

  const abrirEdicao = (m: MovimentoFinanceiro) => {
    setEditandoId(m.id);
    setForm({
      tipo: m.tipo,
      categoria: m.categoria,
      descricao: m.descricao,
      valor: String(m.valor),
      data: m.data.slice(0, 10),
      status: m.status,
      observacoes: m.observacoes ?? "",
    });
    setDialogAberto(true);
  };

  const salvar = async () => {
    const valor = parseFloat(form.valor.replace(",", "."));
    if (!form.descricao.trim() || !valor || valor <= 0 || !form.data) return;
    const payload = {
      tipo: form.tipo,
      categoria: form.categoria,
      descricao: form.descricao,
      valor,
      data: form.data,
      status: form.status,
      observacoes: form.observacoes || null,
    };
    if (editandoId) {
      await api.put(`/api/financeiro/${editandoId}`, payload);
    } else {
      await api.post("/api/financeiro", payload);
    }
    setDialogAberto(false);
    carregar();
  };

  const excluir = async (id: number) => {
    if (!confirm("Excluir este lançamento?")) return;
    await api.delete(`/api/financeiro/${id}`);
    carregar();
  };

  const saldoMes = (resumo?.receitas_total ?? 0) - (resumo?.despesas_total ?? 0);

  return (
    <>
      <PageHeader title="Financeiro" description="Controle receitas, despesas e honorários do escritório.">
        <Button variant="outline" onClick={() => abrirNovo("despesa")}>
          <Plus className="h-4 w-4" /> Nova despesa
        </Button>
        <Button variant="gold" onClick={() => abrirNovo("receita")}>
          <Plus className="h-4 w-4" /> Nova receita
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Receitas</p>
            <ArrowUpCircle className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{brl.format(resumo?.receitas_total ?? 0)}</p>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Despesas</p>
            <ArrowDownCircle className="h-5 w-5 text-red-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-red-600">{brl.format(resumo?.despesas_total ?? 0)}</p>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Saldo</p>
            <Wallet className="h-5 w-5 text-gold-dark" />
          </div>
          <p className={`mt-2 text-2xl font-bold ${saldoMes >= 0 ? "text-navy dark:text-white" : "text-red-600"}`}>
            {brl.format(saldoMes)}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Pendências</p>
            <Landmark className="h-5 w-5 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold">
            {brl.format((resumo?.receitas_pendentes ?? 0) - (resumo?.despesas_pendentes ?? 0))}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Receitas pendentes: {brl.format(resumo?.receitas_pendentes ?? 0)}
          </p>
        </div>
      </div>

      <div className="mb-4 mt-6 inline-flex rounded-xl border bg-card p-1">
        {(["todos", "receita", "despesa"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              filtro === f ? "bg-gold-dark text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "todos" ? "Todos" : f === "receita" ? "Receitas" : "Despesas"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-6 w-6" /></div>
      ) : movimentos.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Nenhum lançamento"
          description="Registre receitas e despesas para acompanhar a saúde financeira."
          actionLabel="Nova receita"
          onAction={() => abrirNovo("receita")}
        />
      ) : (
        <div className="space-y-2">
          {movimentos.map((m) => (
            <div key={m.id} className="flex items-center gap-4 rounded-2xl border bg-card p-4 transition-all hover:shadow-premium">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  m.tipo === "receita"
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40"
                    : "bg-red-100 text-red-600 dark:bg-red-950/40"
                }`}
              >
                {m.tipo === "receita" ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-display font-semibold">{m.descricao}</p>
                  <Badge variant="secondary">
                    {CATEGORIAS.find((c) => c.value === m.categoria)?.label ?? m.categoria}
                  </Badge>
                  <Badge variant={m.status === "pago" ? "gold" : "outline"} className="capitalize">{m.status}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{formatDate(m.data)}</p>
              </div>
              <p className={`text-sm font-bold ${m.tipo === "receita" ? "text-emerald-600" : "text-red-600"}`}>
                {m.tipo === "receita" ? "+" : "−"} {brl.format(m.valor)}
              </p>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="iconSm">•••</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => abrirEdicao(m)}>Editar</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => excluir(m.id)} className="text-destructive">
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar lançamento" : form.tipo === "receita" ? "Nova receita" : "Nova despesa"}</DialogTitle>
            <DialogDescription>Preencha os dados do lançamento financeiro.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={form.tipo === "receita" ? "gold" : "outline"}
                onClick={() => setForm({ ...form, tipo: "receita" })}
              >
                <ArrowUpCircle className="h-4 w-4" /> Receita
              </Button>
              <Button
                variant={form.tipo === "despesa" ? "gold" : "outline"}
                onClick={() => setForm({ ...form, tipo: "despesa" })}
              >
                <ArrowDownCircle className="h-4 w-4" /> Despesa
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v as CategoriaMovimento })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex.: Honorários — caso Silva" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="0,00" inputMode="decimal" />
              </div>
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>Cancelar</Button>
            <Button variant="gold" onClick={salvar} disabled={!form.descricao.trim() || !form.valor || !form.data}>
              {editandoId ? "Salvar alterações" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
