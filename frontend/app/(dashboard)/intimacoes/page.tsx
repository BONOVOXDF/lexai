"use client";

import * as React from "react";
import { Link2, Mail, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Spinner, Alert, AlertDescription } from "@/components/ui/alert";
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
import type { Intimacao, Processo } from "@/lib/types";

const TIPOS = [
  { value: "intimacao", label: "Intimação" },
  { value: "despacho", label: "Despacho" },
  { value: "sentenca", label: "Sentença" },
  { value: "citacao", label: "Citação" },
  { value: "acordao", label: "Acórdão" },
];

interface IntimacaoForm {
  processo_id: string;
  numero_processo: string;
  tribunal: string;
  orgao: string;
  tipo: string;
  data_publicacao: string;
  prazo: string;
  descricao: string;
  link: string;
}

const FORM_VAZIO: IntimacaoForm = {
  processo_id: "",
  numero_processo: "",
  tribunal: "",
  orgao: "",
  tipo: "intimacao",
  data_publicacao: "",
  prazo: "",
  descricao: "",
  link: "",
};

function diasAte(prazo?: string | null): number | null {
  if (!prazo) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(prazo + "T00:00:00");
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

/** Página de intimações do DJEN com registro manual integrado aos prazos. */
export default function IntimacoesPage() {
  const [intimacoes, setIntimacoes] = React.useState<Intimacao[]>([]);
  const [processos, setProcessos] = React.useState<Processo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogAberto, setDialogAberto] = React.useState(false);
  const [salvando, setSalvando] = React.useState(false);
  const [editandoId, setEditandoId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState<IntimacaoForm>(FORM_VAZIO);
  const [mensagem, setMensagem] = React.useState<string | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);

  const carregar = React.useCallback(async () => {
    try {
      const [i, p] = await Promise.all([
        api.get<Intimacao[]>("/api/intimacoes"),
        api.get<{ items: Processo[] }>("/api/processos", { page_size: 100 }),
      ]);
      setIntimacoes(i);
      setProcessos(p.items);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    carregar();
  }, [carregar]);

  const abrirCriar = () => {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setErro(null);
    setMensagem(null);
    setDialogAberto(true);
  };

  const abrirEditar = (i: Intimacao) => {
    setEditandoId(i.id);
    setForm({
      processo_id: i.processo_id ? String(i.processo_id) : "",
      numero_processo: i.numero_processo,
      tribunal: i.tribunal ?? "",
      orgao: i.orgao ?? "",
      tipo: i.tipo,
      data_publicacao: i.data_publicacao ?? "",
      prazo: i.prazo ?? "",
      descricao: i.descricao ?? "",
      link: i.link ?? "",
    });
    setErro(null);
    setMensagem(null);
    setDialogAberto(true);
  };

  const salvar = async () => {
    if (!form.numero_processo.trim()) return;
    setSalvando(true);
    setErro(null);
    try {
      const body = {
        processo_id: form.processo_id ? Number(form.processo_id) : null,
        numero_processo: form.numero_processo.trim(),
        tribunal: form.tribunal || undefined,
        orgao: form.orgao || undefined,
        tipo: form.tipo,
        data_publicacao: form.data_publicacao || undefined,
        prazo: form.prazo || undefined,
        descricao: form.descricao || undefined,
        link: form.link || undefined,
        atualizar_prazo_processo: true,
      };
      if (editandoId) {
        await api.put(`/api/intimacoes/${editandoId}`, body);
      } else {
        await api.post("/api/intimacoes", body);
      }
      setDialogAberto(false);
      setMensagem(
        body.prazo && body.processo_id
          ? "Intimação registrada e prazo do processo atualizado."
          : "Intimação registrada."
      );
      carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao salvar intimação.");
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (id: number) => {
    if (!confirm("Excluir esta intimação?")) return;
    await api.delete(`/api/intimacoes/${id}`);
    carregar();
  };

  return (
    <>
      <PageHeader
        title="Intimações"
        description="Registre intimações do DJEN e acompanhe os prazos automaticamente."
      >
        <Button variant="gold" onClick={abrirCriar}>
          <Plus className="h-4 w-4" />
          Nova intimação
        </Button>
      </PageHeader>

      {mensagem && (
        <Alert variant="info" className="mb-4">
          <AlertDescription>{mensagem}</AlertDescription>
        </Alert>
      )}
      {erro && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Spinner className="h-6 w-6" /></div>
      ) : intimacoes.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="Nenhuma intimação"
          description="Registre intimações publicadas no DJEN para acompanhar os prazos no kanban e no alerta diário."
          actionLabel="Registrar intimação"
          onAction={abrirCriar}
        />
      ) : (
        <div className="space-y-3">
          {intimacoes.map((i) => {
            const dias = diasAte(i.prazo);
            return (
              <div key={i.id} className="rounded-2xl border bg-card p-4 shadow-soft transition-all hover:shadow-premium">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-mono text-sm font-semibold text-navy">{i.numero_processo}</p>
                      <Badge variant="secondary">{i.tipo}</Badge>
                      {dias !== null && dias <= 7 && (
                        <Badge variant={dias < 0 ? "destructive" : "gold"}>
                          {dias < 0 ? `${Math.abs(dias)}d atrasado` : dias === 0 ? "prazo hoje" : `${dias}d p/ prazo`}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {i.tribunal && <span>{i.tribunal}</span>}
                      {i.orgao && <span>{i.orgao}</span>}
                      {i.cliente_nome && <span>Cliente: {i.cliente_nome}</span>}
                    </div>
                    {i.descricao && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{i.descricao}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {i.data_publicacao && <span>Publicada em {formatDate(i.data_publicacao)}</span>}
                      {i.prazo && <span>Prazo: <strong>{formatDate(i.prazo)}</strong></span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {i.link && (
                      <a
                        href={i.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-gold-dark"
                        title="Abrir no DJEN"
                      >
                        <Link2 className="h-4 w-4" />
                      </a>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="iconSm">•••</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => abrirEditar(i)}>
                          <Pencil className="h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => excluir(i.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar intimação" : "Nova intimação"}</DialogTitle>
            <DialogDescription>
              Ao informar um prazo, o processo vinculado é atualizado automaticamente no kanban e no alerta diário.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Processo</Label>
                <Select value={form.processo_id} onValueChange={(v) => setForm({ ...form, processo_id: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Vincular processo (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {processos.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.numero}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Número do processo</Label>
                <Input
                  value={form.numero_processo}
                  onChange={(e) => setForm({ ...form, numero_processo: e.target.value })}
                  placeholder="0000000-00.0000.0.00.0000"
                />
              </div>
              <div className="space-y-2">
                <Label>Tribunal</Label>
                <Input
                  value={form.tribunal}
                  onChange={(e) => setForm({ ...form, tribunal: e.target.value })}
                  placeholder="Ex.: TJSP, TRT2, JF/SP"
                />
              </div>
              <div className="space-y-2">
                <Label>Órgão / Vara</Label>
                <Input
                  value={form.orgao}
                  onChange={(e) => setForm({ ...form, orgao: e.target.value })}
                  placeholder="Ex.: 3ª Vara Cível"
                />
              </div>
              <div className="space-y-2">
                <Label>Data de publicação</Label>
                <Input
                  type="date"
                  value={form.data_publicacao}
                  onChange={(e) => setForm({ ...form, data_publicacao: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Prazo</Label>
                <Input
                  type="date"
                  value={form.prazo}
                  onChange={(e) => setForm({ ...form, prazo: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Link do DJEN</Label>
                <Input
                  value={form.link}
                  onChange={(e) => setForm({ ...form, link: e.target.value })}
                  placeholder="https://…"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Descrição</Label>
                <Textarea
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  rows={3}
                  placeholder="Resumo do conteúdo da intimação…"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando || !form.numero_processo.trim()}>
              {salvando && <Spinner />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
