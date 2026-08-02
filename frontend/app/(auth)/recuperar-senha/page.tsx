"use client";

import * as React from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, Spinner } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { apiError } from "@/lib/utils";

/** Tela de recuperação de senha. */
export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Recuperar senha" subtitle="Enviaremos as instruções de redefinição para o seu e-mail.">
      {sent ? (
        <Alert variant="info">
          <AlertDescription>
            Se o e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha.
            Verifique também a caixa de spam.
          </AlertDescription>
        </Alert>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">E-mail cadastrado</Label>
            <Input
              id="email"
              type="email"
              placeholder="voce@escritorio.com.br"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading && <Spinner />}
            Enviar instruções
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Lembrou sua senha?{" "}
        <Link href="/login" className="font-semibold text-gold-dark hover:underline dark:text-gold">
          Entrar
        </Link>
      </p>
    </AuthLayout>
  );
}
