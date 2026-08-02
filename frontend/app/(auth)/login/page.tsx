"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Chrome } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, Spinner } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth-context";
import { apiError } from "@/lib/utils";

/** Tela de login. */
export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = React.useState("");
  const [senha, setSenha] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, senha);
      router.push("/dashboard");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  const loginGoogle = () => {
    // Em produção, integre o Google Identity Services / Supabase OAuth.
    setError("Login Google será habilitado após configurar o OAuth do Google no Supabase.");
  };

  return (
    <AuthLayout title="Bem-vindo de volta" subtitle="Acesse sua conta para continuar no LEX AI.">
      <form onSubmit={submit} className="space-y-5">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="voce@escritorio.com.br"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="senha">Senha</Label>
            <Link href="/recuperar-senha" className="text-xs font-medium text-gold-dark hover:underline dark:text-gold">
              Esqueci minha senha
            </Link>
          </div>
          <Input
            id="senha"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading && <Spinner />}
          Entrar
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">ou continue com</span>
        <Separator className="flex-1" />
      </div>

      <Button variant="outline" className="w-full" size="lg" onClick={loginGoogle}>
        <Chrome className="h-5 w-5" />
        Google
      </Button>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-semibold text-gold-dark hover:underline dark:text-gold">
          Cadastre-se
        </Link>
      </p>
    </AuthLayout>
  );
}
