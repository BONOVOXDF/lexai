"use client";

import * as React from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, Spinner } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { apiError } from "@/lib/utils";

const KIT_URL = "/kit/modelos-de-peticao.docx";

export function LeadMagnetForm() {
  const [nome, setNome] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [telefone, setTelefone] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/leads", {
        nome,
        email,
        telefone: telefone || undefined,
        origem: "kit-modelos",
      });
      setDone(true);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  };

  const baixarKit = () => {
    try {
      api.post("/api/leads/baixar-kit", { email });
    } catch {
      /* falha silenciosa: o download não depende do registro */
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-premium">
      {done ? (
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold/15">
            <Download className="h-7 w-7 text-gold-dark dark:text-gold" />
          </div>
          <h3 className="mt-4 font-display text-2xl font-semibold">Pronto! Seu kit está liberado</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Enviamos o link também para <strong>{email}</strong>. Clique abaixo para baixar agora.
          </p>
          <a href={KIT_URL} download onClick={baixarKit} className="mt-6 block">
            <Button className="w-full" size="lg">
              <Download className="mr-2 h-5 w-5" />
              Baixar kit de modelos
            </Button>
          </a>
          <p className="mt-4 text-xs text-muted-foreground">.docx · Word · compatível com Google Docs</p>
          <div className="mt-6 border-t border-border pt-6">
            <p className="text-sm text-muted-foreground">Quer gerar peças personalizadas em minutos?</p>
            <Link href="/cadastro" className="mt-3 block">
              <Button variant="gold" className="w-full">
                Começar grátis no LEX AI
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <h3 className="font-display text-2xl font-semibold">Baixe o kit agora</h3>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome completo</Label>
            <Input
              id="nome"
              placeholder="Seu nome"
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail profissional</Label>
            <Input
              id="email"
              type="email"
              placeholder="voce@escritorio.com.br"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefone">WhatsApp (opcional)</Label>
            <Input
              id="telefone"
              type="tel"
              placeholder="(11) 99999-9999"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading && <Spinner />}
            Quero o kit gratuito
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Sem spam. Sempre grátis. Seus dados são protegidos conforme a LGPD.
          </p>
        </form>
      )}
    </div>
  );
}
