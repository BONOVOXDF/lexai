"use client";

import * as React from "react";
import { CalendarDays, Check, Clock, MapPin, Plus, Trash2 } from "lucide-react";
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
import type { Evento, TipoEvento } from "@/lib/types";

const TIPOS: { value: TipoEvento; label: string; color: string }[] = [
  { value: "audiencia", label: "Audiência", color: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
  { value: "prazo", label: "Prazo", color: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  { value: "compromisso", label: "Compromisso", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" },
  { value: "reuniao", label: "Reunião", color: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" },
  { value: "outro", label: "Outro", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
];

const tipoInfo = (t: string) => TIPOS.find((x) => x.value === t) ?? TIPOS[4];

const vazio = {
  titulo: "",
  tipo: "outro" as TipoEvento,
  descricao: "",
  data_inicio: "",
  hora_inicio: "",
  data_fim: "",
  hora_fim: "",
  local: "",
  notificar: true,
  concluido: false,
};

/** Página de agenda: eventos, audiências e prazos. */
export default function AgendaPage() {
  const [eventos, setEventos] = React.useState<Evento[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogAberto, setDialogAberto] = React.useState(false);
  const [editandoId, setEditandoId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState(vazio);
  const [periodo, setPeriodo] = React.useState<"semana" | "mes" | "todos">("mes");

  const carregar = React.useCallback(async () => {
    setLoading(true);
    const hoje = new Date();
    let inicio: string | undefined;
    let fim: string | undefined;
    if (periodo === "semana") {
      inicio = hoje.toISOString().slice(0, 10);
      fim = new Date(hoje.getTime() + 7 * 86400000).toISOString().slice(0, 10);
    } else if (periodo === "mes") {
      inicio = hoje.toISOString().slice(0, 10);
      fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, hoje.getDate()).toISOString().slice(0, 10);
    }
    const params = new URLSearchParams();
    if (inicio) params.set("inicio", inicio);
    if (fim) params.set("fim", fim);
    params.set("page_size", "200");
    const data = await api.get<{ items: Evento[] }>(`/api/agenda?${params.toString()}`);
    setEventos(data.items.sort((a, b) => (a.data_inicio + (a.hora_inicio ?? "")).localeCompare(b.data_inicio + (b.hora_inicio ?? ""))));
    setLoading(false);
  }, [periodo]);

  React.useEffect(() => {
    carregar();
  }, [carregar]);

  const abrirNovo = () => {
    setEditandoId(null);
    const hoje = new Date().toISOString().slice(0, 10);
    setForm({ ...vazio, data_inicio: hoje });
    setDialogAberto(true);
  };

  const abrirEdicao = (e: Evento) => {
    setEditandoId(e.id);
    setForm({
      titulo: e.titulo,
      tipo: e.tipo,
      descricao: e.descricao ?? "",
      data_inicio: e.data_inicio.slice(0, 10),
      hora_inicio: e.hora_inicio ?? "",
      data_fim: e.data_fim?.slice(0, 10) ?? "",
      hora_fim: e.hora_fim ?? "",
      local: e.local ?? "",
      notificar: e.notificar,
      concluido: e.concluido,
    });
    setDialogAberto(true);
  };

  const salvar = async () => {
    if (!form.titulo.trim() || !form.data_inicio) return;
    const payload: Record<string, unknown> = {
      ...form,
      hora_inicio: form.hora_inicio || null,
      data_fim: form.data_fim || null,
      hora_fim: form.hora_fim || null,
      local: form.local || null,
      descricao: form.descricao || null,
    };
    if (editandoId) {
      await api.put(`/api/agenda/${editandoId}`, payload);
    } else {
      await api.post("/api/agenda", payload);
    }
    setDialogAberto(false);
    carregar();
  };

  const alternarConcluido = async (e: Evento) => {
    await api.put(`/api/agenda/${e.id}`, { concluido: !e.concluido });
    carregar();
  };

  const excluir = async (id: number) => {
    if (!confirm("Excluir este evento?")) return;
    await api.delete(`/api/agenda/${id}`);
    carregar();
  };

  const porDia = React.useMemo(() => {
    const map = new Map<string, Evento[]>();
    for (const e of eventos) {
      const dia = e.data_inicio.slice(0, 10);
      if (!map.has(dia)) map.set(dia, []);
      map.get(dia)!.push(e);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [eventos]);

  return (
    <>
      <PageHeader title="Agenda" description="Audiências, prazos, reuniões e compromissos.">
        <Button variant="gold" onClick={abrirNovo}>
          <Plus className="h-4 w-4" /> Novo evento
        </Button>
      </PageHeader>

      <div className="mb-4 inline-flex rounded-xl border bg-card p-1">
        {(["semana", "mes", "todos"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              periodo === p ? "bg-gold-dark text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p === "semana" ? "Próximos 7 dias" : p === "mes" ? "Este mês" : "Todos"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner className="h-6 w-6" /></div>
      ) : eventos.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nenhum evento no período"
          description="Registre audiências e prazos para não perder nenhum compromisso."
          actionLabel="Criar evento"
          onAction={abrirNovo}
        />
      ) : (
        <div className="space-y-6">
          {porDia.map(([dia, items]) => {
            const info = tipoInfo(items[0].tipo);
            const d = new Date(dia + "T12:00:00");
            return (
              <div key={dia}>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <span className="inline-flex h-2 w-2 rounded-full bg-gold-dark" />
                  {formatDate(dia)} <span className="text-xs">({items.length})</span>
                </h3>
                <div className="space-y-2">
                  {items.map((e) => {
                    const t = tipoInfo(e.tipo);
                    return (
                      <div
                        key={e.id}
                        className={`flex items-center gap-4 rounded-2xl border bg-card p-4 transition-all hover:shadow-premium ${
                          e.concluido ? "opacity-60" : ""
                        }`}
                      >
                        <button
                          onClick={() => alternarConcluido(e)}
                          title={e.concluido ? "Marcar como pendente" : "Marcar como concluído"}
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                            e.concluido
                              ? "border-gold-dark bg-gold-dark text-white"
                              : "border-muted-foreground/40 text-transparent hover:border-gold-dark"
                          }`}
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className={`font-display font-semibold ${e.concluido ? "line-through" : ""}`}>{e.titulo}</p>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.color}`}>{t.label}</span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            {e.hora_inicio && (
                              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {e.hora_inicio}</span>
                            )}
                            {e.local && (
                              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {e.local}</span>
                            )}
                            {e.descricao && <span className="truncate text-xs">{e.descricao}</span>}
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="iconSm">•••</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => abrirEdicao(e)}>Editar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => excluir(e.id)} className="text-destructive">
                              <Trash2 className="h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar evento" : "Novo evento"}</DialogTitle>
            <DialogDescription>Preencha os dados do compromisso.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex.: Audiência inicial — processo 123" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as TipoEvento })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input type="time" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Data fim</Label>
                <Input type="date" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Hora fim</Label>
                <Input type="time" value={form.hora_fim} onChange={(e) => setForm({ ...form, hora_fim: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Local</Label>
              <Input value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} placeholder="Fórum, vara, escritório…" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea rows={3} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.notificar}
                onChange={(e) => setForm({ ...form, notificar: e.target.checked })}
                className="h-4 w-4 accent-[#D4AF37]"
              />
              Notificar antes do evento
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>Cancelar</Button>
            <Button variant="gold" onClick={salvar} disabled={!form.titulo.trim() || !form.data_inicio}>
              {editandoId ? "Salvar alterações" : "Criar evento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
