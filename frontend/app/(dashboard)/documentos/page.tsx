"use client";

import * as React from "react";
import { FileText, Loader2, Sparkles, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner, Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileUpload, DocumentDownloadButton } from "@/components/file-upload";
import { GeradorDocumentos } from "@/components/dashboard/gerador-documentos";
import { api } from "@/lib/api";
import { formatBytes, formatDate } from "@/lib/utils";
import type { Documento } from "@/lib/types";

/** Página de documentos: upload, listagem, resumo automático e exclusão. */
export default function DocumentosPage() {
  const [documentos, setDocumentos] = React.useState<Documento[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [enviando, setEnviando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const [termo, setTermo] = React.useState("");
  const [resumoDoc, setResumoDoc] = React.useState<{ id: number; nome: string; resumo: string } | null>(null);
  const [gerandoResumo, setGerandoResumo] = React.useState(false);

  const carregar = React.useCallback(async (q?: string) => {
    const params = new URLSearchParams({ page_size: "100" });
    if (q) params.set("q", q);
    const data = await api.get<{ items: Documento[] }>(`/api/documentos?${params.toString()}`);
    setDocumentos(data.items);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    carregar();
  }, [carregar]);

  const handleUpload = async (files: FileList) => {
    setEnviando(true);
    setErro(null);
    try {
      const formData = new FormData();
      for (const file of Array.from(files)) formData.append("file", file);
      await api.post<Documento>("/api/documentos/upload", undefined, formData);
      carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha no upload.");
    } finally {
      setEnviando(false);
    }
  };

  const buscar = () => {
    setLoading(true);
    carregar(termo.trim() || undefined);
  };

  const gerarResumo = async (d: Documento) => {
    setGerandoResumo(true);
    setResumoDoc(null);
    try {
      const data = await api.post<{ resumo: string }>(`/api/documentos/${d.id}/resumo`);
      setResumoDoc({ id: d.id, nome: d.nome_original, resumo: data.resumo });
      carregar();
    } finally {
      setGerandoResumo(false);
    }
  };

  const excluir = async (id: number) => {
    if (!confirm("Excluir este documento? O texto indexado também será removido (LGPD).")) return;
    await api.delete(`/api/documentos/${id}`);
    carregar();
  };

  return (
    <>
      <PageHeader title="Documentos" description="Armazene, indexe e consulte seus documentos com IA." />

      {erro && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      <FileUpload onUpload={handleUpload} multiple />
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {enviando && (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Enviando e indexando arquivo…
            </>
          )}
        </div>
        <GeradorDocumentos />
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={termo}
          onChange={(e) => setTermo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && buscar()}
          placeholder="Buscar por nome do arquivo…"
          className="max-w-sm"
        />
        <Button onClick={buscar}>Buscar</Button>
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner className="h-6 w-6" /></div>
        ) : documentos.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhum documento"
            description="Envie PDFs, DOCX ou imagens acima para indexar na base de conhecimento."
          />
        ) : (
          documentos.map((d) => (
            <div key={d.id} className="flex items-center gap-4 rounded-2xl border bg-card p-4 transition-all hover:shadow-premium">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy/10 text-navy">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-display font-semibold">{d.nome_original}</p>
                  <Badge variant="secondary">{d.tipo}</Badge>
                  {d.is_indexed && <Badge variant="gold">Indexado</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatBytes(d.tamanho_bytes)} · {formatDate(d.created_at)}
                  {d.resumo ? ` · ${d.resumo.slice(0, 80)}…` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={() => gerarResumo(d)}
                  disabled={gerandoResumo}
                  title="Gerar resumo com IA"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
                <DocumentDownloadButton documento={d} />
                <Button variant="ghost" size="iconSm" onClick={() => excluir(d.id)} className="text-destructive" title="Excluir">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={resumoDoc !== null || gerandoResumo} onOpenChange={(open) => !open && setResumoDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-gold-dark" />
              {resumoDoc?.nome ?? "Gerando resumo…"}
            </DialogTitle>
            <DialogDescription>Resumo automático gerado pela IA.</DialogDescription>
          </DialogHeader>
          {gerandoResumo ? (
            <div className="flex items-center gap-3 py-6 text-muted-foreground">
              <Spinner /> <span className="text-sm">Lendo e resumindo o documento…</span>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{resumoDoc?.resumo}</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
