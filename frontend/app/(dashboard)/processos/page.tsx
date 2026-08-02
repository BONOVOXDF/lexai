"use client";

import * as React from "react";
import { FolderOpen, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import { formatDate, titleCase } from "@/lib/utils";
import type { Cliente, Processo, StatusProcesso } from "@/lib/types";

const STATUSES: { value: StatusProcesso; label: string }[] = [
  { value: "em_andamento", label: "Em andamento" },
  { value: "distribuido", label: "Distribuído" },
  { value: "suspenso", label: "Suspenso" },
  { value: "concluido", label: "Concluído" },
  { value: "arquivado", label: "Arquivado" },
];

interface ProcessoForm {
  numero: string;
  tribunal: string;
  classe: string;
  vara: string;
  comarca: string;
  advogado: string;
  status: StatusProcesso;
  prazo: string;
  observacoes: string;
  valor_causa: string;
  cliente_id: string;
}

const FORM_VAZIO: ProcessoForm = {
  numero: "",
  tribunal: "",
  classe: "",
  vara: "",
  comarca: "",
  advogado: "",
  status: "em_andamento",
  prazo: "",
  observacoes: "",
  valor_causa: "",
  cliente_id: "",
};

/** Página de gestão de processos. */
export default function ProcessosPage() {
  const [processos, setProcessos] = React.useState<Processo[]>([]);
  const [clientes, setClientes] = React.useState<Cliente[]>([]);
  const [busca, setBusca] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [dialogAberto, setDialogAberto] = React.useState(false);
  const [salvando, setSalvando] = React.useState(false);
  const [editandoId, setEditandoId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState<ProcessoForm>(FORM_VAZIO);

  const carregar = React.useCallback(async (q = "") => {
    const data = await api.get<{ items: Processo[] }>("/api/processos", {
      q: q || undefined,
      page_size: 100,
    });
    setProcessos(data.items);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    carregar();
    api.get<{ items: Cliente[] }>("/api/clientes", { page_size: 100 }).then((d) => setClientes(d.items));
  }, [carregar]);

  const abrirCriar = () => {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setDialogAberto(true);
  };

  const abrirEditar = (p: Processo) => {
    setEditandoId(p.id);
    setForm({
      numero: p.numero,
      tribunal: p.tribunal ?? "",
      classe: p.classe ?? "",
      vara: p.vara ?? "",
      comarca: p.comarca ?? "",
      advogado: p.advogado ?? "",
      status: p.status,
      prazo: p.prazo ?? "",
      observacoes: p.observacoes ?? "",
      valor_causa: p.valor_causa ? String(p.valor_causa) : "",
      cliente_id: p.cliente_id ? String(p.cliente_id) : "",
    });
    setDialogAberto(true);
  };

  const salvar = async () => {
    if (!form.numero.trim()) return;
    setSalvando(true);
    const payload = {
      numero: form.numero,
      tribunal: form.tribunal || null,
      classe: form.classe || null,
      vara: form.vara || null,
      comarca: form.comarca || null,
      advogado: form.advogado || null,
      status: form.status,
      prazo: form.prazo || null,
      observacoes: form.observacoes || null,
      valor_causa: form.valor_causa ? Number(form.valor_causa) : null,
      cliente_id: form.cliente_id ? Number(form.cliente_id) : null,
    };
    try {
      if (editandoId) await api.put(`/api/processos/${editandoId}`, payload);
      else await api.post("/api/processos", payload);
      setDialogAberto(false);
      carregar(busca);
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (id: number) => {
    if (!confirm("Excluir este processo?")) return;
    await api.delete(`/api/processos/${id}`);
    carregar(busca);
  };

  return (
    <>
      <PageHeader title="Processos" description="Acompanhe os processos do seu escritório.">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-56 pl-9"
              placeholder="Número, tribunal, classe…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && carregar(busca)}
            />
          </div>
          <Button variant="gold" onClick={abrirCriar}>
            <Plus className="h-4 w-4" />
            Novo processo
          </Button>
        </div>
      </PageHeader>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner className="h-6 w-6" /></div>
      ) : processos.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Nenhum processo cadastrado"
          description="Cadastre processos para acompanhar prazos, status e documentos."
          actionLabel="Cadastrar processo"
          onAction={abrirCriar}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {processos.map((p) => (
            <div key={p.id} className="rounded-2xl border bg-card p-5 transition-all hover:shadow-premium">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-sm font-medium">{p.numero}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{p.tribunal || "Tribunal não informado"}</p>
                </div>
                <Badge variant={p.status === "em_andamento" ? "gold" : "secondary"}>{titleCase(p.status)}</Badge>
              </div>

              <div className="mt-4 space-y-1.5 text-sm">
                <p className="text-muted-foreground">
                  Cliente: <span className="font-medium text-foreground">{p.cliente_nome || "—"}</span>
                </p>
                <p className="text-muted-foreground">
                  Classe: <span className="font-medium text-foreground">{p.classe || "—"}</span>
                </p>
                <p className="text-muted-foreground">
                  Prazo:{" "}
                  <span className={p.prazo ? "font-medium text-destructive" : "text-foreground"}>
                    {formatDate(p.prazo)}
                  </span>
                </p>
              </div>

              <div className="mt-4 flex justify-end border-t pt-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">Ações</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => abrirEditar(p)}>
                      <Pencil className="h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => excluir(p.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar processo" : "Novo processo"}</DialogTitle>
            <DialogDescription>Informe os dados do processo judicial.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Número do processo *</Label>
              <Input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} placeholder="0000000-00.0000.0.00.0000" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar cliente" /></SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as StatusProcesso })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tribunal</Label>
                <Input value={form.tribunal} onChange={(e) => setForm({ ...form, tribunal: e.target.value })} placeholder="TJSP" />
              </div>
              <div className="space-y-2">
                <Label>Classe</Label>
                <Input value={form.classe} onChange={(e) => setForm({ ...form, classe: e.target.value })} placeholder="Procedimento Comum" />
              </div>
              <div className="space-y-2">
                <Label>Vara</Label>
                <Input value={form.vara} onChange={(e) => setForm({ ...form, vara: e.target.value })} placeholder="1ª Vara Cível" />
              </div>
              <div className="space-y-2">
                <Label>Comarca</Label>
                <Input value={form.comarca} onChange={(e) => setForm({ ...form, comarca: e.target.value })} placeholder="São Paulo" />
              </div>
              <div className="space-y-2">
                <Label>Prazo</Label>
                <Input type="date" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Valor da causa</Label>
                <Input type="number" step="0.01" value={form.valor_causa} onChange={(e) => setForm({ ...form, valor_causa: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando || !form.numero.trim()}>
              {salvando && <Spinner />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
