"use client";

import * as React from "react";
import Link from "next/link";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, Spinner } from "@/components/ui/alert";
import { apiError } from "@/lib/utils";

/** Ativação do acesso do cliente no portal (criação de senha). */
function AceitarConviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [senha, setSenha] = React.useState("");
  const [confirmar, setConfirmar] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha !== confirmar) {
      setError("As senhas não coincidem.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/portal/aceitar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, senha, confirmar_senha: confirmar }),
      });
      if (!res.ok) {
        let message = "Falha ao ativar o acesso.";
        try {
          const body = await res.json();
          if (body?.detail) message = body.detail;
        } catch {
          /* corpo não-JSON */
        }
        throw new Error(message);
      }
      setDone(true);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={done ? "Acesso ativado!" : "Ative seu acesso"}
      subtitle={
        done
          ? "Sua senha foi criada. Agora é só entrar no portal."
          : "Crie uma senha para consultar seus processos e audiências."
      }
    >
      {done ? (
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
            <CheckCircle2 className="h-6 w-6 shrink-0" />
            <p className="text-sm">
              Seu acesso foi ativado com sucesso. O link do convite já não é mais válido.
            </p>
          </div>
          <Button className="w-full" size="lg" onClick={() => router.push("/portal/login")}>
            Entrar no portal
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              placeholder="Pelo menos 6 caracteres"
              autoComplete="new-password"
              required
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmar">Confirmar senha</Label>
            <Input
              id="confirmar"
              type="password"
              placeholder="Repita a senha"
              autoComplete="new-password"
              required
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading && <Spinner />}
            Criar senha e ativar
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Já ativou antes?{" "}
            <Link href="/portal/login" className="font-semibold text-gold-dark hover:underline dark:text-gold">
              Entrar no portal
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}

export default function PortalAceitarPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <AceitarConviteForm />
    </Suspense>
  );
}
