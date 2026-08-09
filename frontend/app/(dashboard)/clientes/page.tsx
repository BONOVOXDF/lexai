"use client";

import * as React from "react";
import { KeyRound, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, Spinner } from "@/components/ui/alert";
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
import type { Cliente } from "@/lib/types";

interface ClienteForm {
  nome: string;
  cpf: string;
  cnpj: string;
  telefone: string;
  email: string;
  endereco: string;
  tipo: "pessoa_fisica" | "pessoa_juridica";
  anotacoes: string;
}

const FORM_VAZIO: ClienteForm = {
  nome: "",
  cpf: "",
  cnpj: "",
  telefone: "",
  email: "",
  endereco: "",
  tipo: "pessoa_fisica",
  anotacoes: "",
};

/** Página de gestão de clientes. */
export default function ClientesPage() {
  const [clientes, setClientes] = React.useState<Cliente[]>([]);
  const [total, setTotal] = React.useState(0);
  const [busca, setBusca] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [dialogAberto, setDialogAberto] = React.useState(false);
  const [salvando, setSalvando] = React.useState(false);
  const [editandoId, setEditandoId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState<ClienteForm>(FORM_VAZIO);
  const [portalMsg, setPortalMsg] = React.useState<string | null>(null);
  const [portalErro, setPortalErro] = React.useState<string | null>(null);

  const carregar = React.useCallback(async (q = "") => {
    const data = await api.get<{ items: Cliente[]; total: number }>("/api/clientes", {
      q: q || undefined,
      page_size: 100,
    });
    setClientes(data.items);
    setTotal(data.total);
    setLoading(false);
  }, []);

  React.useEffect(() => {
    carregar();
  }, [carregar]);

  const abrirCriar = () => {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setDialogAberto(true);
  };

  const abrirEditar = (c: Cliente) => {
    setEditandoId(c.id);
    setForm({
      nome: c.nome,
      cpf: c.cpf ?? "",
      cnpj: c.cnpj ?? "",
      telefone: c.telefone ?? "",
      email: c.email ?? "",
      endereco: c.endereco ?? "",
      tipo: c.tipo as ClienteForm["tipo"],
      anotacoes: c.anotacoes ?? "",
    });
    setDialogAberto(true);
  };

  const salvar = async () => {
    if (!form.nome.trim()) return;
    setSalvando(true);
    try {
      if (editandoId) {
        await api.put(`/api/clientes/${editandoId}`, form);
      } else {
        await api.post("/api/clientes", form);
      }
      setDialogAberto(false);
      carregar(busca);
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (id: number) => {
    if (!confirm("Excluir este cliente e todos os dados vinculados?")) return;
    await api.delete(`/api/clientes/${id}`);
    carregar(busca);
  };

  const convidarPortal = async (c: Cliente) => {
    setPortalMsg(null);
    setPortalErro(null);
    try {
      await api.post(`/api/portal/clientes/${c.id}/convite`);
      setPortalMsg(
        c.email
          ? `Convite enviado para ${c.email}. O link vale por 7 dias.`
          : "Convite registrado, mas o cliente não tem e-mail cadastrado."
      );
    } catch (err) {
      setPortalErro(err instanceof Error ? err.message : "Falha ao enviar convite.");
    }
  };

  return (
    <>
      <PageHeader title="Clientes" description="Cadastro e gestão dos seus clientes.">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-56 pl-9"
              placeholder="Buscar cliente…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && carregar(busca)}
            />
          </div>
          <Button variant="gold" onClick={abrirCriar}>
            <Plus className="h-4 w-4" />
            Novo cliente
          </Button>
        </div>
      </PageHeader>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner className="h-6 w-6" /></div>
      ) : (
        <>
          {portalMsg && (
            <Alert variant="info" className="mb-4">
              <AlertDescription>{portalMsg}</AlertDescription>
            </Alert>
          )}
          {portalErro && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{portalErro}</AlertDescription>
            </Alert>
          )}
        </>
      )}

      {!loading && clientes.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum cliente cadastrado"
          description="Cadastre seus clientes para vincular processos, documentos e histórico."
          actionLabel="Cadastrar cliente"
          onAction={abrirCriar}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="hidden px-4 py-3 md:table-cell">CPF/CNPJ</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Contato</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Tipo</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Cadastro</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {clientes.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{c.nome}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{c.cpf || c.cnpj || "—"}</td>
                    <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                      {c.telefone || c.email || "—"}
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      <Badge variant={c.tipo === "pessoa_juridica" ? "secondary" : "outline"}>
                        {titleCase(c.tipo)}
                      </Badge>
                    </td>
                    <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">{formatDate(c.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="iconSm">•••</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => convidarPortal(c)}>
                            <KeyRound className="h-4 w-4" /> Convidar para o portal
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => abrirEditar(c)}>
                            <Pencil className="h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => excluir(c.id)} className="text-destructive">
                            <Trash2 className="h-4 w-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
            {total} cliente(s)
          </div>
        </div>
      )}

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editandoId ? "Editar cliente" : "Novo cliente"}</DialogTitle>
            <DialogDescription>
              Preencha os dados do cliente. Todos os campos são opcionais, exceto o nome.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nome</Label>
                <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Nome do cliente" />
              </div>
              <div className="space-y-2">
                <Label>CPF</Label>
                <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} placeholder="(11) 99999-9999" />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="cliente@email.com" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Endereço</Label>
                <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} placeholder="Rua, número, bairro, cidade" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Anotações</Label>
                <Textarea value={form.anotacoes} onChange={(e) => setForm({ ...form, anotacoes: e.target.value })} rows={3} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando || !form.nome.trim()}>
              {salvando && <Spinner />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
