"use client";

import * as React from "react";
import { FileText, FileDown, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Spinner, Alert, AlertDescription } from "@/components/ui/alert";
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
import { Markdown } from "@/components/markdown";
import { api, API_URL } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { Peticao } from "@/lib/types";

/** Página de contratos: geração com IA, edição e exportação. */
export default function ContratosPage() {
  const [contratos, setContratos] = React.useState<Peticao[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [gerando, setGerando] = React.useState(false);
  const [gerarAberto, setGerarAberto] = React.useState(false);
  const [editorId, setEditorId] = React.useState<number | null>(null);
  const [conteudoEdicao, setConteudoEdicao] = React.useState("");
  const [erro, setErro] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    contexto: "",
    partes: "",
    tribunal: "",
    cliente_nome: "",
    cliente_documento: "",
  });

  const carregar = React.useCallback(async () => {
    const data = await api.get<{ items: Peticao[] }>("/api/peticoes?tipo=contrato", { page_size: 100 });
    setContratos(data.items);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    carregar();
  }, [carregar]);

  const gerar = async () => {
    if (!form.contexto.trim()) {
      setErro("Descreva o objeto do contrato (partes, obrigações, cláusulas, valores).");
      return;
    }
    setErro(null);
    setGerando(true);
    try {
      await api.post("/api/peticoes/gerar", { ...form, tipo: "contrato", processo_numero: "" });
      setGerarAberto(false);
      setForm({ contexto: "", partes: "", tribunal: "", cliente_nome: "", cliente_documento: "" });
      carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao gerar contrato.");
    } finally {
      setGerando(false);
    }
  };

  const abrirEditor = (p: Peticao) => {
    setEditorId(p.id);
    setConteudoEdicao(p.conteudo);
  };

  const salvarEdicao = async () => {
    if (!editorId) return;
    await api.put(`/api/peticoes/${editorId}`, { conteudo: conteudoEdicao });
    setEditorId(null);
    carregar();
  };

  const exportar = async (id: number, formato: "word" | "pdf") => {
    const token = localStorage.getItem("lexai_access_token") ?? "";
    const res = await fetch(
      `${API_URL}/api/peticoes/${id}/export?formato=${formato}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return;
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename\*=UTF-8''([^;]+)/);
    const filename = match ? decodeURIComponent(match[1]) : `contrato.${formato === "word" ? "docx" : "pdf"}`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const excluir = async (id: number) => {
    if (!confirm("Excluir este contrato?")) return;
    await api.delete(`/api/peticoes/${id}`);
    carregar();
  };

  const contratoEmEdicao = contratos.find((c) => c.id === editorId);

  return (
    <>
      <PageHeader title="Contratos" description="Gere contratos com IA e exporte em Word ou PDF.">
        <Button variant="gold" onClick={() => setGerarAberto(true)}>
          <Sparkles className="h-4 w-4" />
          Gerar contrato
        </Button>
      </PageHeader>

      {erro && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex justify-center py-20"><Spinner className="h-6 w-6" /></div>
      ) : contratos.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum contrato ainda"
          description="Gere contratos de prestação de serviços, honorários, confidencialidade e mais."
          actionLabel="Gerar contrato"
          onAction={() => setGerarAberto(true)}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {contratos.map((c) => (
            <div key={c.id} className="rounded-2xl border bg-card p-5 transition-all hover:shadow-premium">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-display font-semibold">{c.titulo}</p>
                  <Badge variant="gold" className="mt-1.5">Contrato</Badge>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="iconSm">•••</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => abrirEditor(c)}>
                      <Pencil className="h-4 w-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportar(c.id, "word")}>
                      <FileDown className="h-4 w-4" /> Exportar Word
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportar(c.id, "pdf")}>
                      <FileDown className="h-4 w-4" /> Exportar PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => excluir(c.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">
                {c.conteudo.replace(/[#*`]/g, "").slice(0, 220)}…
              </p>
              <p className="mt-3 text-xs text-muted-foreground">Atualizado em {formatDate(c.updated_at)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Diálogo de geração */}
      <Dialog open={gerarAberto} onOpenChange={setGerarAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Gerar contrato com IA</DialogTitle>
            <DialogDescription>
              Descreva o objeto e as partes. A IA redigirá um rascunho com cláusulas completas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Objeto do contrato *</Label>
              <Textarea
                rows={4}
                placeholder="Ex.: prestação de serviços advocatícios mensais — honorários, escopo, rescisão…"
                value={form.contexto}
                onChange={(e) => setForm({ ...form, contexto: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Partes</Label>
                <Input value={form.partes} onChange={(e) => setForm({ ...form, partes: e.target.value })} placeholder="Contratante: … / Contratado: …" />
              </div>
              <div className="space-y-2">
                <Label>Local / foro</Label>
                <Input value={form.tribunal} onChange={(e) => setForm({ ...form, tribunal: e.target.value })} placeholder="Foro de eleição, cidade…" />
              </div>
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Input value={form.cliente_nome} onChange={(e) => setForm({ ...form, cliente_nome: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Documento do cliente</Label>
                <Input value={form.cliente_documento} onChange={(e) => setForm({ ...form, cliente_documento: e.target.value })} />
              </div>
            </div>
            <Alert variant="warning">
              <AlertDescription>
                ⚠️ Documento gerado por IA requer revisão obrigatória de um advogado antes da assinatura.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGerarAberto(false)}>Cancelar</Button>
            <Button variant="gold" onClick={gerar} disabled={gerando}>
              {gerando && <Spinner />}
              <Sparkles className="h-4 w-4" />
              Gerar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editor */}
      <Dialog open={editorId !== null} onOpenChange={(open) => !open && setEditorId(null)}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{contratoEmEdicao?.titulo}</DialogTitle>
            <DialogDescription>Edite o conteúdo antes de exportar.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={conteudoEdicao}
            onChange={(e) => setConteudoEdicao(e.target.value)}
            rows={22}
            className="font-mono text-xs leading-relaxed"
          />
          <div className="max-h-56 overflow-y-auto rounded-xl border bg-muted/30 p-4">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Pré-visualização</p>
            <Markdown content={conteudoEdicao} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorId(null)}>Fechar</Button>
            <Button variant="gold" onClick={salvarEdicao}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
