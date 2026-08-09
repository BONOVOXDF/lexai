"use client";

import * as React from "react";
import { Download, FilePlus2, Loader2, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner, Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import type { Cliente } from "@/lib/types";

interface ModeloDoc {
  id: string;
  nome: string;
}

interface DocGerado {
  modelo: string;
  titulo: string;
  conteudo: string;
}

/** Modal de geração de documentos jurídicos a partir de modelos. */
export function GeradorDocumentos() {
  const [open, setOpen] = React.useState(false);
  const [modelos, setModelos] = React.useState<ModeloDoc[]>([]);
  const [clientes, setClientes] = React.useState<Cliente[]>([]);
  const [modeloId, setModeloId] = React.useState("");
  const [clienteId, setClienteId] = React.useState("");
  const [gerado, setGerado] = React.useState<DocGerado | null>(null);
  const [gerando, setGerando] = React.useState(false);
  const [baixando, setBaixando] = React.useState(false);
  const [erro, setErro] = React.useState<string | null>(null);

  const carregarDados = React.useCallback(async () => {
    try {
      const [m, c] = await Promise.all([
        api.get<{ modelos: ModeloDoc[] }>("/api/documentos/modelos"),
        api.get<{ items: Cliente[] }>("/api/clientes", { page_size: 200 }),
      ]);
      setModelos(m.modelos);
      setClientes(c.items);
      if (m.modelos.length) setModeloId(m.modelos[0].id);
      if (c.items.length) setClienteId(String(c.items[0].id));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao carregar dados.");
    }
  }, []);

  React.useEffect(() => {
    if (open) {
      setErro(null);
      setGerado(null);
      carregarDados();
    }
  }, [open, carregarDados]);

  const gerar = async () => {
    if (!modeloId || !clienteId) return;
    setErro(null);
    setGerando(true);
    try {
      const data = await api.post<DocGerado>("/api/documentos/gerar", {
        modelo: modeloId,
        cliente_id: Number(clienteId),
      });
      setGerado(data);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao gerar documento.");
    } finally {
      setGerando(false);
    }
  };

  const baixar = async () => {
    if (!modeloId || !clienteId) return;
    setErro(null);
    setBaixando(true);
    try {
      const blob = await api.download("/api/documentos/gerar/export", {
        modelo: modeloId,
        cliente_id: Number(clienteId),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cliente = clientes.find((c) => c.id === Number(clienteId));
      const nomeBase = (cliente?.nome ?? "cliente").replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase();
      a.download = `${modeloId.replace(/\s+/g, "_")}_${nomeBase}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao exportar documento.");
    } finally {
      setBaixando(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline">
        <FilePlus2 className="h-4 w-4" /> Gerar documento
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-gold-dark" />
              Gerar documento
            </DialogTitle>
            <DialogDescription>
              Modelo preenchido automaticamente com os dados do cliente e do advogado.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="modelo">Modelo</Label>
              <Select value={modeloId} onValueChange={setModeloId}>
                <SelectTrigger id="modelo" className="w-full">
                  <SelectValue placeholder="Selecione o modelo" />
                </SelectTrigger>
                <SelectContent>
                  {modelos.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cliente">Cliente</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger id="cliente" className="w-full">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={gerar} disabled={gerando || !modeloId || !clienteId}>
              {gerando && <Loader2 className="h-4 w-4 animate-spin" />}
              {gerado ? "Regenerar" : "Gerar documento"}
            </Button>
            <Button
              variant="gold"
              onClick={baixar}
              disabled={baixando || !modeloId || !clienteId}
            >
              {baixando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Baixar Word
            </Button>
          </div>

          {erro && (
            <Alert variant="destructive">
              <AlertDescription>{erro}</AlertDescription>
            </Alert>
          )}

          {gerando ? (
            <div className="flex items-center gap-3 py-6 text-muted-foreground">
              <Spinner /> <span className="text-sm">Gerando documento…</span>
            </div>
          ) : gerado ? (
            <ScrollArea className="h-72 rounded-2xl border bg-muted/40 p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{gerado.conteudo}</p>
            </ScrollArea>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
