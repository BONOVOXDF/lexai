"use client";

import * as React from "react";
import { KeyRound, Save, ShieldCheck, UserCog } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner, Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { setSession } from "@/lib/api";
import type { User } from "@/lib/types";

/** Página de configurações: perfil, senha e status do sistema. */
export default function ConfiguracoesPage() {
  const [user, setUser] = React.useState<User | null>(null);
  const [iaDisponivel, setIaDisponivel] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [salvando, setSalvando] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);

  const [perfil, setPerfil] = React.useState({ nome: "", telefone: "", oab: "" });
  const [senha, setSenha] = React.useState({ senha_atual: "", nova_senha: "", confirmar: "" });
  const [salvandoSenha, setSalvandoSenha] = React.useState(false);
  const [msgSenha, setMsgSenha] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const data = await api.get<{ usuario: User; sistema: { ia_disponivel: boolean; plano: string } }>("/api/settings");
        setUser(data.usuario);
        setIaDisponivel(data.sistema.ia_disponivel);
        setPerfil({ nome: data.usuario.nome, telefone: data.usuario.telefone ?? "", oab: data.usuario.oab ?? "" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const salvarPerfil = async () => {
    setSalvando(true);
    setErro(null);
    setMsg(null);
    try {
      const updated = await api.put<User>("/api/users/me", {
        nome: perfil.nome,
        telefone: perfil.telefone || null,
        oab: perfil.oab || null,
      });
      setUser(updated);
      const token = localStorage.getItem("lexai_access_token");
      const refresh = localStorage.getItem("lexai_refresh_token");
      if (token && refresh) setSession(token, refresh, { nome: updated.nome, email: updated.email });
      setMsg("Perfil atualizado com sucesso.");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao salvar perfil.");
    } finally {
      setSalvando(false);
    }
  };

  const trocarSenha = async () => {
    if (senha.nova_senha.length < 8) {
      setErro("A nova senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (senha.nova_senha !== senha.confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }
    setSalvandoSenha(true);
    setErro(null);
    setMsgSenha(null);
    try {
      await api.put("/api/users/me/password", {
        senha_atual: senha.senha_atual,
        nova_senha: senha.nova_senha,
      });
      setMsgSenha("Senha alterada com sucesso.");
      setSenha({ senha_atual: "", nova_senha: "", confirmar: "" });
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao alterar senha.");
    } finally {
      setSalvandoSenha(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-24"><Spinner className="h-6 w-6" /></div>;
  }

  return (
    <>
      <PageHeader title="Configurações" description="Gerencie seu perfil, segurança e preferências." />

      {msg && (
        <Alert className="mb-4 border-emerald-200 text-emerald-700">
          <AlertDescription>{msg}</AlertDescription>
        </Alert>
      )}
      {msgSenha && (
        <Alert className="mb-4 border-emerald-200 text-emerald-700">
          <AlertDescription>{msgSenha}</AlertDescription>
        </Alert>
      )}
      {erro && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-6 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <UserCog className="h-5 w-5 text-gold-dark" />
            <h2 className="font-display font-semibold">Dados do perfil</h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input value={perfil.nome} onChange={(e) => setPerfil({ ...perfil, nome: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input value={user?.email ?? ""} disabled />
              <p className="text-xs text-muted-foreground">O e-mail é usado para login e não pode ser alterado.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={perfil.telefone} onChange={(e) => setPerfil({ ...perfil, telefone: e.target.value })} placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-2">
                <Label>OAB</Label>
                <Input value={perfil.oab} onChange={(e) => setPerfil({ ...perfil, oab: e.target.value })} placeholder="OAB/UF 000.000" />
              </div>
            </div>
            <Button variant="gold" onClick={salvarPerfil} disabled={salvando}>
              {salvando ? <Spinner /> : <Save className="h-4 w-4" />}
              Salvar perfil
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border bg-card p-6">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-gold-dark" />
              <h2 className="font-display font-semibold">Plano e sistema</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Plano atual</span>
                <Badge variant="gold" className="capitalize">{user?.plano ?? "gratuito"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">IA disponível</span>
                <Badge variant={iaDisponivel ? "gold" : "outline"}>
                  {iaDisponivel ? "Ativa" : "Não configurada"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {iaDisponivel
                  ? "O assistente e o gerador de petições estão operacionais."
                  : "Configure OPENAI_API_KEY no servidor para habilitar a IA."}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-gold-dark" />
              <h2 className="font-display font-semibold">Alterar senha</h2>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Senha atual</Label>
                <Input type="password" value={senha.senha_atual} onChange={(e) => setSenha({ ...senha, senha_atual: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nova senha</Label>
                <Input type="password" value={senha.nova_senha} onChange={(e) => setSenha({ ...senha, nova_senha: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Confirmar nova senha</Label>
                <Input type="password" value={senha.confirmar} onChange={(e) => setSenha({ ...senha, confirmar: e.target.value })} />
              </div>
              <Button onClick={trocarSenha} disabled={salvandoSenha || !senha.senha_atual || !senha.nova_senha}>
                {salvandoSenha ? <Spinner /> : <KeyRound className="h-4 w-4" />}
                Alterar senha
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
