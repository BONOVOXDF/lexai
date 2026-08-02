"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, Spinner } from "@/components/ui/alert";
import { useAuth } from "@/lib/auth-context";
import { apiError } from "@/lib/utils";

/** Tela de cadastro. */
export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = React.useState({
    nome: "",
    email: "",
    telefone: "",
    oab: "",
    senha: "",
    confirmar_senha: "",
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.senha.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (form.senha !== form.confirmar_senha) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    try {
      await register(form);
      router.push("/dashboard");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Crie sua conta" subtitle="Comece gratuitamente e eleve a produtividade do seu escritório.">
      <form onSubmit={submit} className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="nome">Nome completo</Label>
          <Input id="nome" placeholder="Dra. Maria Silva" required value={form.nome} onChange={update("nome")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input id="email" type="email" placeholder="voce@escritorio.com.br" required value={form.email} onChange={update("email")} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input id="telefone" placeholder="(11) 99999-9999" value={form.telefone} onChange={update("telefone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="oab">OAB (opcional)</Label>
            <Input id="oab" placeholder="SP 123456" value={form.oab} onChange={update("oab")} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="senha">Senha</Label>
          <Input id="senha" type="password" placeholder="Mínimo 8 caracteres" required value={form.senha} onChange={update("senha")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmar_senha">Confirmar senha</Label>
          <Input
            id="confirmar_senha"
            type="password"
            placeholder="Repita a senha"
            required
            value={form.confirmar_senha}
            onChange={update("confirmar_senha")}
          />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading && <Spinner />}
          Criar conta
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Já tem uma conta?{" "}
        <Link href="/login" className="font-semibold text-gold-dark hover:underline dark:text-gold">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  );
}
