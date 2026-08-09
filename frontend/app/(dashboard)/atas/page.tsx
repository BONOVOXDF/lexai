"use client";

import * as React from "react";
import {
  Calendar,
  Download,
  FileText,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
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
import type { Ata, Processo } from "@/lib/types";

const TIPOS = [
  { value: "reuniao", label: "Reunião" },
  { value: "audiencia", label: "Audiência" },
  { value: "conciliacao", label: "Conciliação" },
  { value: "interna", label: "Interna" },
  { value: "cliente", label: "Cliente" },
];

interface AtaForm {
  titulo: string;
  tipo: string;
  data_evento: string;
  local: string;
  participantes: string;
  processo_id: string;
  processo_numero: string;
  conteudo: string;
  notas: string;
}

const FORM_VAZIO: AtaForm = {
  titulo: "",
  tipo: "reuniao",
  data_evento: "",
  local: "",
  participantes: "",
  processo_id: "",
  processo_numero: "",
  conteudo: "",
  notas: "",
};

const TIPO_LABEL: Record<string, string> = Object.fromEntries(TIPOS.map((t) => [t.value, t.label]));

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

/** Página de atas de audiências e reuniões, com geração via IA. */
export default function AtasPage() {
  const [atas, setAtas] = React.useState<Ata[]>([]);
  const [processos, setProcessos] = React.useState<Processo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filtro, setFiltro] = React.useState("");
  const [dialogAberto, setDialogAberto] = React.useState(false);
  const [modo, setModo] = React.useState<"manual" | "ia">("manual");
  const [salvando, setSalvando] = React.useState(false);
  const [editandoId, setEditandoId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState<AtaForm>(FORM_VAZIO);
  const [mensagem, setMensagem] = React.useState<string | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);

  const carregar = React.useCallback(async () => {
    try {
      const [a, p] = await Promise.all([
        api.get<{ items: Ata[]; total: number }>("/api/atas", { page_size: 100 }),
        api.get<{ items: Processo[] }>("/api/processos", { page_size: 100 }),
      ]);
      setAtas(a.items);
      setProcessos(p.items);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    carregar();
  }, [carregar]);

  const abrirCriar = (modoForm: "manual" | "ia") => {
    setModo(modoForm);
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setErro(null);
    setMensagem(null);
    setDialogAberto(true);
  };

  const abrirEditar = (a: Ata) => {
    setModo("manual");
    setEditandoId(a.id);
    setForm({
      titulo: a.titulo,
      tipo: a.tipo,
      data_evento: a.data_evento ?? "",
      local: a.local ?? "",
      participantes: a.participantes ?? "",
      processo_id: a.processo_id ? String(a.processo_id) : "",
      processo_numero: a.processo_numero ?? "",
      conteudo: a.conteudo,
      notas: "",
    });
    setErro(null);
    setMensagem(null);
    setDialogAberto(true);
  };

  const salvar = async () => {
    if (!form.titulo.trim()) return;
    setSalvando(true);
    setErro(null);
    try {
      const body = {
        titulo: form.titulo.trim(),
        tipo: form.tipo,
        data_evento: form.data_evento || undefined,
        local: form.local || undefined,
        participantes: form.participantes || undefined,
        processo_id: form.processo_id ? Number(form.processo_id) : null,
        processo_numero: form.processo_numero || undefined,
        conteudo: form.conteudo,
      };
      if (editandoId) {
        await api.put(`/api/atas/${editandoId}`, body);
      } else {
        await api.post("/api/atas", body);
      }
      setDialogAberto(false);
      carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao salvar a ata.");
    } finally {
      setSalvando(false);
    }
  };

  const gerarComIa = async () => {
    if (!form.titulo.trim() || form.notas.trim().length < 10) return;
    setSalvando(true);
    setErro(null);
    try {
      await api.post("/api/atas/gerar", {
        titulo: form.titulo.trim(),
        tipo: form.tipo,
        data_evento: form.data_evento || undefined,
        local: form.local || undefined,
        participantes: form.participantes || undefined,
        processo_id: form.processo_id ? Number(form.processo_id) : null,
        processo_numero: form.processo_numero || undefined,
        notas: form.notas.trim(),
      });
      setDialogAberto(false);
      setMensagem("Ata gerada com IA! Revise o conteúdo antes de usar.");
      carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao gerar a ata com IA.");
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (id: number) => {
    if (!confirm("Excluir esta ata?")) return;
    await api.delete(`/api/atas/${id}`);
    carregar();
  };

  const exportar = async (id: number, formato: "word" | "pdf") => {
    try {
      const blob = await api.download(`/api/atas/${id}/export?formato=${formato}`);
      const nome = `ata-${id}.${formato === "word" ? "docx" : "pdf"}`;
      baixar(blob, nome);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao exportar a ata.");
    }
  };

  const filtradas = atas.filter((a) => {
    if (!filtro.trim()) return true;
    const q = filtro.toLowerCase();
    return (
      a.titulo.toLowerCase().includes(q) ||
      (a.processo_numero ?? "").toLowerCase().includes(q) ||
      (a.participantes ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <PageHeader
        title="Atas"
        description="Registre audiências e reuniões, ou gere atas estruturadas com IA em segundos."
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => abrirCriar("ia")}>
            <Sparkles className="h-4 w-4 text-gold-dark" />
            Gerar com IA
          </Button>
          <Button variant="gold" onClick={() => abrirCriar("manual")}>
            <Plus className="h-4 w-4" />
            Nova ata
          </Button>
        </div>
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

      {atas.length > 0 && (
        <Input
          className="mb-4 max-w-md"
          placeholder="Buscar por título, processo ou participante…"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Spinner className="h-6 w-6" /></div>
      ) : filtradas.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={filtro ? "Nenhuma ata encontrada" : "Nenhuma ata registrada"}
          description={
            filtro
              ? "Ajuste o termo de busca."
              : "Registre audiências e reuniões ou gere atas estruturadas com IA a partir das suas anotações."
          }
          actionLabel="Gerar ata com IA"
          onAction={() => abrirCriar("ia")}
        />
      ) : (
        <div className="space-y-3">
          {filtradas.map((a) => (
            <div key={a.id} className="rounded-2xl border bg-card p-4 shadow-soft transition-all hover:shadow-premium">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-navy dark:text-white">{a.titulo}</p>
                    <Badge variant="secondary">{TIPO_LABEL[a.tipo] ?? a.tipo}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {a.data_evento && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" /> {formatDate(a.data_evento)}
                      </span>
                    )}
                    {a.processo_numero && (
                      <span className="flex items-center gap-1">
                        <Link2 className="h-3.5 w-3.5" /> {a.processo_numero}
                      </span>
                    )}
                    {a.participantes && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" /> {a.participantes}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="iconSm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => exportar(a.id, "word")}>
                        <FileText className="h-4 w-4" /> Exportar em Word
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportar(a.id, "pdf")}>
                        <Download className="h-4 w-4" /> Exportar em PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="ghost" size="iconSm" onClick={() => abrirEditar(a)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="iconSm" onClick={() => excluir(a.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {a.conteudo && (
                <div className="mt-3 line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">
                  {a.conteudo.replace(/^#+\s*/gm, "").slice(0, 300)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editandoId
                ? "Editar ata"
                : modo === "ia"
                  ? "Gerar ata com IA"
                  : "Nova ata"}
            </DialogTitle>
            <DialogDescription>
              {modo === "ia"
                ? "Cole suas anotações da reunião/audiência e a IA estrutura a ata formalmente."
                : "Preencha os dados da reunião e o conteúdo da ata."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Título</Label>
                <Input
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ex.: Audiência de conciliação - processo 0001123-45"
                />
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
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={form.data_evento}
                  onChange={(e) => setForm({ ...form, data_evento: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
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
                <Label>Local</Label>
                <Input
                  value={form.local}
                  onChange={(e) => setForm({ ...form, local: e.target.value })}
                  placeholder="Ex.: Fórum, escritório, Google Meet…"
                />
              </div>
              <div className="space-y-2">
                <Label>Participantes</Label>
                <Input
                  value={form.participantes}
                  onChange={(e) => setForm({ ...form, participantes: e.target.value })}
                  placeholder="Ex.: João (cliente), Dra. Ana (advogada)"
                />
              </div>
              {modo === "ia" ? (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Notas da reunião/audiência</Label>
                  <Textarea
                    value={form.notas}
                    onChange={(e) => setForm({ ...form, notas: e.target.value })}
                    rows={6}
                    placeholder="Descreva o que aconteceu: pauta, manifestações, propostas de acordo, prazos definidos…"
                  />
                </div>
              ) : (
                <div className="space-y-2 sm:col-span-2">
                  <Label>Conteúdo</Label>
                  <Textarea
                    value={form.conteudo}
                    onChange={(e) => setForm({ ...form, conteudo: e.target.value })}
                    rows={8}
                    placeholder="Conteúdo da ata (pode usar títulos e listas)…"
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>Cancelar</Button>
            {modo === "ia" ? (
              <Button onClick={gerarComIa} disabled={salvando || !form.titulo.trim() || form.notas.trim().length < 10}>
                {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Gerar ata
              </Button>
            ) : (
              <Button onClick={salvar} disabled={salvando || !form.titulo.trim()}>
                {salvando && <Spinner />}
                Salvar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
