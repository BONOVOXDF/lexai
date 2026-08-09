"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, Spinner } from "@/components/ui/alert";
import { setPortalSession } from "@/lib/portal-api";
import { apiError } from "@/lib/utils";

/** Login do cliente no portal. */
export default function PortalLoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [senha, setSenha] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/portal/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      if (!res.ok) {
        let message = "Falha no login.";
        try {
          const body = await res.json();
          if (body?.detail) message = body.detail;
        } catch {
          /* corpo não-JSON */
        }
        throw new Error(message);
      }
      const data = await res.json();
      setPortalSession(data.access_token, data.cliente);
      router.push("/portal/processos");
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Portal do cliente"
      subtitle="Acompanhe seus processos, prazos e audiências pelo seu escritório."
    >
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
            placeholder="seu@email.com"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="senha">Senha</Label>
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
          Entrar no portal
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        É cliente e não recebeu seu acesso?{" "}
        <Link href="/" className="font-semibold text-gold-dark hover:underline dark:text-gold">
          Fale com seu escritório
        </Link>
      </p>
    </AuthLayout>
  );
}
