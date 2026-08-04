"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, Spinner } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { apiError } from "@/lib/utils";

/**
 * Tela de redefinição de senha.
 * Recebe o token de recuperação via query string (?token=...).
 */
export default function ResetarSenhaPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [novaSenha, setNovaSenha] = React.useState("");
  const [confirmarSenha, setConfirmarSenha] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (novaSenha !== confirmarSenha) {
      setError("As senhas não coincidem.");
      return;
    }
    if (novaSenha.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", { token, nova_senha: novaSenha });
      setDone(true);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout title="Link inválido" subtitle="O link de recuperação está incompleto ou expirado.">
        <Alert variant="destructive">
          <AlertDescription>
            Solicite um novo link de recuperação na tela de <strong>Esqueci minha senha</strong>.
          </AlertDescription>
        </Alert>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/recuperar-senha" className="font-semibold text-gold-dark hover:underline dark:text-gold">
            Solicitar novo link
          </Link>
        </p>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title="Senha redefinida" subtitle="Sua senha foi atualizada com sucesso.">
        <Alert variant="info">
          <AlertDescription>Você já pode acessar sua conta com a nova senha.</AlertDescription>
        </Alert>
        <Link href="/login" className="mt-6 block w-full">
          <Button className="w-full" size="lg">
            Ir para o login
          </Button>
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Definir nova senha" subtitle="Escolha uma nova senha para sua conta.">
      <form onSubmit={submit} className="space-y-5">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="nova-senha">Nova senha</Label>
          <Input
            id="nova-senha"
            type="password"
            placeholder="Mínimo de 8 caracteres"
            autoComplete="new-password"
            required
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmar-senha">Confirmar nova senha</Label>
          <Input
            id="confirmar-senha"
            type="password"
            placeholder="Repita a nova senha"
            autoComplete="new-password"
            required
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
          />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading && <Spinner />}
          Redefinir senha
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Lembrou sua senha?{" "}
        <Link href="/login" className="font-semibold text-gold-dark hover:underline dark:text-gold">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  );
}
