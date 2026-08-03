"use client";

import * as React from "react";
import {
  Bot,
  Copy,
  Download,
  FileDown,
  MessageSquarePlus,
  Paperclip,
  Send,
  Sparkles,
  Star,
  Trash2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Spinner, Alert, AlertDescription } from "@/components/ui/alert";
import { Markdown } from "@/components/markdown";
import { FileUpload } from "@/components/file-upload";
import { EmptyState } from "@/components/dashboard/empty-state";
import { cn } from "@/lib/utils";
import { api, api as apiClient, API_URL } from "@/lib/api";
import type { Conversa, ConversaDetail, Mensagem, MensagemAIResult } from "@/lib/types";

interface ChatMessage extends Omit<Mensagem, "fontes"> {
  fontes?: { fonte: string; trecho: string }[];
}

/**
 * Página do Assistente IA — interface de chat com histórico,
 * favoritos, upload de arquivos e exportação.
 */
export default function AssistentePage() {
  const [conversas, setConversas] = React.useState<Conversa[]>([]);
  const [conversaAtiva, setConversaAtiva] = React.useState<number | null>(null);
  const [mensagens, setMensagens] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [enviando, setEnviando] = React.useState(false);
  const [carregando, setCarregando] = React.useState(true);
  const [mostrarUpload, setMostrarUpload] = React.useState(false);
  const [analisandoArquivo, setAnalisandoArquivo] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const carregarConversas = React.useCallback(async () => {
    const data = await api.get<{ items: Conversa[] }>("/api/conversas", { page_size: 100 });
    setConversas(data.items);
    setCarregando(false);
  }, []);

  React.useEffect(() => {
    carregarConversas();
  }, [carregarConversas]);

  React.useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [mensagens]);

  const abrirConversa = async (id: number) => {
    const data = await api.get<ConversaDetail>(`/api/conversas/${id}`);
    setConversaAtiva(id);
    const m = data.mensagens.map((msg) => {
      let fontes = undefined;
      try {
        fontes = msg.fontes ? JSON.parse(msg.fontes) : undefined;
      } catch {
        /* ignora */
      }
      return { ...msg, fontes };
    });
    setMensagens(m);
  };

  const novaConversa = () => {
    setConversaAtiva(null);
    setMensagens([]);
    setInput("");
    setErro(null);
  };

  const enviar = async (texto?: string) => {
    const pergunta = (texto ?? input).trim();
    if (!pergunta || enviando) return;
    setInput("");
    setEnviando(true);
    setErro(null);

    let conversaId = conversaAtiva;
    try {
      if (!conversaId) {
        const nova = await api.post<Conversa>("/api/conversas", { titulo: pergunta.slice(0, 60) });
        conversaId = nova.id;
        setConversaAtiva(nova.id);
        setConversas((prev) => [nova, ...prev]);
      }

      setMensagens((prev) => [
        ...prev,
        { id: -Date.now(), conversa_id: conversaId!, tipo: "usuario", conteudo: pergunta, precisa_revisao: false, created_at: new Date().toISOString() },
      ]);

      const resultado = await apiClient.post<MensagemAIResult>(`/api/conversas/${conversaId}/mensagens`, {
        conteudo: pergunta,
      });

      let fontes = undefined;
      try {
        fontes = resultado.mensagem.fontes ? JSON.parse(resultado.mensagem.fontes) : undefined;
      } catch {
        /* ignora */
      }

      setMensagens((prev) => [...prev, { ...resultado.mensagem, fontes }]);
      carregarConversas();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao enviar mensagem.");
    } finally {
      setEnviando(false);
    }
  };

  const onUpload = async (files: FileList) => {
    const file = files[0];
    if (!file) return;
    setAnalisandoArquivo(true);
    setErro(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("pergunta", "Resuma este documento e destaque os pontos principais, prazos e partes envolvidas.");
      const resultado = await apiClient.post<{
        resposta: string;
        fontes?: { fonte: string; trecho: string }[];
      }>("/api/assistente/analisar-arquivo", undefined, form);

      if (!conversaAtiva) {
        const nova = await api.post<Conversa>("/api/conversas", { titulo: `Análise: ${file.name}` });
        setConversaAtiva(nova.id);
        setConversas((prev) => [nova, ...prev]);
      }

      setMensagens((prev) => [
        ...prev,
        { id: -Date.now(), conversa_id: conversaAtiva ?? 0, tipo: "usuario", conteudo: `📎 Enviado: **${file.name}**`, precisa_revisao: false, created_at: new Date().toISOString() },
        { id: -Date.now() + 1, conversa_id: conversaAtiva ?? 0, tipo: "assistente", conteudo: resultado.resposta, fontes: resultado.fontes, precisa_revisao: true, created_at: new Date().toISOString() },
      ]);
      setMostrarUpload(false);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao analisar arquivo.");
    } finally {
      setAnalisandoArquivo(false);
    }
  };

  const favoritar = async (id: number, atual: boolean) => {
    await api.put(`/api/conversas/${id}`, { is_favorita: !atual });
    carregarConversas();
  };

  const excluirConversa = async (id: number) => {
    await api.delete(`/api/conversas/${id}`);
    if (conversaAtiva === id) novaConversa();
    carregarConversas();
  };

  const exportarConversa = async () => {
    if (!conversaAtiva) return;
    const data = await api.get<{ markdown: string; titulo: string }>(`/api/conversas/${conversaAtiva}/export`);
    const blob = new Blob([data.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.titulo}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copiarResposta = (conteudo: string) => {
    navigator.clipboard?.writeText(conteudo);
  };

  const salvarRespostaPdf = async (conversaId: number, mensagemId: number) => {
    const token = localStorage.getItem("lexai_access_token") ?? "";
    const res = await fetch(
      `${API_URL}/api/conversas/${conversaId}/mensagens/${mensagemId}/export-pdf`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error("Falha ao gerar o PDF.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resposta-lex-ai-${mensagemId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const salvarConversaPdf = async () => {
    if (!conversaAtiva) return;
    const token = localStorage.getItem("lexai_access_token") ?? "";
    const res = await fetch(
      `${API_URL}/api/conversas/${conversaAtiva}/export-pdf`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) throw new Error("Falha ao gerar o PDF.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversa-lex-ai-${conversaAtiva}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const favoritas = conversas.filter((c) => c.is_favorita);
  const normais = conversas.filter((c) => !c.is_favorita);

  return (
    <div className="flex h-[calc(100vh-5rem)] overflow-hidden rounded-2xl border bg-background">
      {/* Histórico */}
      <aside className="hidden w-72 shrink-0 flex-col border-r bg-muted/20 md:flex">
        <div className="border-b p-3">
          <Button className="w-full justify-start gap-2" onClick={novaConversa}>
            <MessageSquarePlus className="h-4 w-4" />
            Nova conversa
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-4 p-3">
            {favoritas.length > 0 && (
              <div>
                <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Favoritas</p>
                <ConversaItem lista={favoritas} ativa={conversaAtiva} onOpen={abrirConversa} onFav={favoritar} onDel={excluirConversa} />
              </div>
            )}
            <div>
              <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Histórico</p>
              {normais.length === 0 && !carregando && (
                <p className="px-2 text-sm text-muted-foreground">Sem conversas ainda.</p>
              )}
              <ConversaItem lista={normais} ativa={conversaAtiva} onOpen={abrirConversa} onFav={favoritar} onDel={excluirConversa} />
            </div>
          </div>
        </ScrollArea>
      </aside>

      {/* Chat */}
      <div className="flex min-w-0 flex-1 flex-col">
        <ScrollArea className="flex-1" viewportRef={scrollRef}>
          <div className="mx-auto max-w-3xl px-4 py-6">
            {erro && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{erro}</AlertDescription>
              </Alert>
            )}

            {mensagens.length === 0 && !analisandoArquivo ? (
              <EmptyState
                icon={Sparkles}
                title="Assistente LEX AI"
                description="Pergunte sobre legislação, peça ajuda para redigir uma petição, envie documentos para análise ou pesquise jurisprudência."
              />
            ) : (
              <div className="space-y-6">
                {mensagens.map((m) => (
                  <div key={m.id} className={cn("flex gap-3", m.tipo === "usuario" && "justify-end")}>
                    {m.tipo === "assistente" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-dark text-navy">
                        <Bot className="h-4 w-4" />
                      </div>
                    )}
                    <div className={cn("max-w-[85%]", m.tipo === "usuario" && "order-first")}>
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-3",
                          m.tipo === "usuario"
                            ? "bg-navy text-white"
                            : "border bg-card"
                        )}
                      >
                        <Markdown content={m.conteudo} className={m.tipo === "usuario" ? "text-white [&_strong]:text-white" : ""} />
                      </div>
                      {m.precisa_revisao && m.tipo === "assistente" && (
                        <Badge variant="warning" className="mt-2">Revisão profissional recomendada</Badge>
                      )}
                      {m.fontes && m.fontes.length > 0 && (
                        <div className="mt-2 rounded-xl border bg-muted/30 p-3">
                          <p className="mb-2 text-xs font-semibold text-muted-foreground">📚 Fontes</p>
                          {m.fontes.slice(0, 4).map((f, i) => (
                            <p key={i} className="mb-1 text-xs text-muted-foreground">
                              <span className="font-medium text-foreground">{f.fonte}</span> — {f.trecho.slice(0, 90)}…
                            </p>
                          ))}
                        </div>
                      )}
                      {m.tipo === "assistente" && (
                        <div className="mt-1 flex items-center gap-1">
                          <Button variant="ghost" size="iconSm" onClick={() => copiarResposta(m.conteudo)} aria-label="Copiar resposta">
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          {conversaAtiva && (
                            <Button
                              variant="ghost"
                              size="iconSm"
                              onClick={() => salvarRespostaPdf(conversaAtiva, m.id)}
                              aria-label="Salvar resposta em PDF"
                            >
                              <FileDown className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {enviando && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-dark text-navy">
                      <Bot className="h-4 w-4" />
                    </div>
                    <Spinner />
                    <span className="text-sm">Pesquisando na base de conhecimento…</span>
                  </div>
                )}
                {analisandoArquivo && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Spinner />
                    <span className="text-sm">Analisando documento…</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t p-3">
          {mostrarUpload && (
            <div className="mb-3">
              <FileUpload onUpload={onUpload} label="Envie um documento para análise (PDF, DOCX ou imagem)" />
            </div>
          )}
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <Button variant="outline" size="icon" onClick={() => setMostrarUpload((v) => !v)} aria-label="Anexar arquivo">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  enviar();
                }
              }}
              placeholder="Pergunte algo sobre direito, peça uma petição ou envie um documento…"
              className="max-h-40 min-h-[44px] flex-1 resize-none"
              rows={1}
            />
            {conversaAtiva && (
              <Button variant="ghost" size="icon" onClick={exportarConversa} aria-label="Exportar conversa em Markdown" title="Exportar em Markdown">
                <Download className="h-4 w-4" />
              </Button>
            )}
            {conversaAtiva && (
              <Button
                variant="ghost"
                size="icon"
                onClick={salvarConversaPdf}
                aria-label="Salvar conversa em PDF"
                title="Salvar conversa em PDF"
              >
                <FileDown className="h-4 w-4" />
              </Button>
            )}
            <Button variant="gold" size="icon" onClick={() => enviar()} disabled={enviando || !input.trim()} aria-label="Enviar">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConversaItem({
  lista,
  ativa,
  onOpen,
  onFav,
  onDel,
}: {
  lista: Conversa[];
  ativa: number | null;
  onOpen: (id: number) => void;
  onFav: (id: number, atual: boolean) => void;
  onDel: (id: number) => void;
}) {
  return (
    <div className="space-y-1">
      {lista.map((c) => (
        <div
          key={c.id}
          className={cn(
            "group flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors",
            ativa === c.id ? "bg-navy text-white" : "hover:bg-muted"
          )}
          onClick={() => onOpen(c.id)}
        >
          <span className="min-w-0 flex-1 truncate">{c.titulo}</span>
          <button
            className={cn("hidden opacity-0 transition-opacity group-hover:opacity-100", ativa === c.id ? "text-white" : "")}
            onClick={(e) => {
              e.stopPropagation();
              onFav(c.id, c.is_favorita);
            }}
            aria-label="Favoritar"
          >
            <Star className={cn("h-3.5 w-3.5", c.is_favorita && "fill-gold text-gold")} />
          </button>
          <button
            className={cn("hidden opacity-0 transition-opacity group-hover:opacity-100", ativa === c.id ? "text-white" : "text-destructive")}
            onClick={(e) => {
              e.stopPropagation();
              onDel(c.id);
            }}
            aria-label="Excluir"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
