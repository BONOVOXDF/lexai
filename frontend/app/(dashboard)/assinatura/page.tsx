"use client";

import * as React from "react";
import { BadgeCheck, CreditCard, Lock, PartyPopper, RefreshCcw, XCircle } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner, Alert, AlertDescription } from "@/components/ui/alert";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Assinatura, AssinaturaCheckout } from "@/lib/types";

interface PlanoCard {
  id: string;
  nome: string;
  preco: number;
  destaque: boolean;
  descricao: string;
  recursos: string[];
}

const PLANOS: PlanoCard[] = [
  {
    id: "pro",
    nome: "Profissional",
    preco: 97,
    destaque: true,
    descricao: "Para advogados em pleno crescimento de carteira.",
    recursos: [
      "Até 30 consultas de IA por minuto",
      "Geração ilimitada de petições",
      "Análise de documentos com IA",
      "Pesquisa de jurisprudência inteligente",
      "Suporte prioritário",
    ],
  },
  {
    id: "empresa",
    nome: "Empresa",
    preco: 297,
    destaque: false,
    descricao: "Para escritórios com múltiplos advogados.",
    recursos: [
      "Até 60 consultas de IA por minuto",
      "Tudo do plano Profissional",
      "Múltiplos advogados",
      "Gerente de conta dedicado",
      "Onboarding e treinamento da equipe",
    ],
  },
];

const STATUS_LABEL: Record<string, { texto: string; variant: "success" | "warning" | "destructive" | "outline" }> = {
  authorized: { texto: "Assinatura ativa", variant: "success" },
  pending: { texto: "Aguardando pagamento", variant: "warning" },
  cancelled: { texto: "Cancelada", variant: "destructive" },
  paused: { texto: "Pausada", variant: "warning" },
};

export default function AssinaturaPage() {
  const { user, refresh } = useAuth();
  const [assinatura, setAssinatura] = React.useState<Assinatura | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [processando, setProcessando] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);

  const carregar = React.useCallback(async () => {
    try {
      const data = await api.get<Assinatura>("/api/assinatura");
      setAssinatura(data);
      if (user && data.plano_atual !== user.plano) {
        await refresh();
      }
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao carregar a assinatura.");
    } finally {
      setLoading(false);
    }
  }, [user, refresh]);

  React.useEffect(() => {
    carregar();
  }, [carregar]);

  const assinar = async (plano: string) => {
    setProcessando(true);
    setErro(null);
    setMsg(null);
    try {
      const checkout = await api.post<AssinaturaCheckout>("/api/assinatura/checkout", { plano });
      window.location.assign(checkout.init_point);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao iniciar o pagamento.");
    } finally {
      setProcessando(false);
    }
  };

  const cancelar = async () => {
    if (!window.confirm("Deseja cancelar sua assinatura? Seu plano será rebaixado para o gratuito.")) return;
    setProcessando(true);
    setErro(null);
    setMsg(null);
    try {
      await api.post("/api/assinatura/cancelar");
      setMsg("Assinatura cancelada. Seu plano voltou ao gratuito.");
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao cancelar a assinatura.");
    } finally {
      setProcessando(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-24"><Spinner className="h-6 w-6" /></div>;
  }

  const planoAtual = assinatura?.plano_atual ?? "free";
  const temAssinatura = planoAtual !== "free";
  const statusInfo = assinatura?.status ? STATUS_LABEL[assinatura.status] : undefined;

  return (
    <>
      <PageHeader title="Assinatura" description="Gerencie seu plano e pagamento da assinatura." />

      {msg && (
        <Alert className="mb-4 border-emerald-200 text-emerald-700">
          <AlertDescription>{msg}</AlertDescription>
        </Alert>
      )}
      {erro && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      {temAssinatura ? (
        <div className="mx-auto max-w-2xl rounded-2xl border bg-card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <PartyPopper className="h-6 w-6 text-gold-dark" />
              <h2 className="font-display text-xl font-semibold capitalize">Plano {planoAtual}</h2>
            </div>
            {statusInfo ? (
              <Badge variant={statusInfo.variant}>{statusInfo.texto}</Badge>
            ) : (
              <Badge variant="success">
                <BadgeCheck className="h-3.5 w-3.5" /> Assinatura ativa
              </Badge>
            )}
          </div>
          <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-gold-dark" /> Cobrança recorrente mensal via Mercado Pago.
            </li>
            <li className="flex items-center gap-2">
              <RefreshCcw className="h-4 w-4 text-gold-dark" /> Cancele quando quiser, sem multa.
            </li>
          </ul>
          <Button variant="destructive" onClick={cancelar} disabled={processando}>
            {processando ? <Spinner /> : <XCircle className="h-4 w-4" />}
            Cancelar assinatura
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {PLANOS.map((plano) => (
            <div
              key={plano.id}
              className={`flex flex-col rounded-2xl border bg-card p-6 ${
                plano.destaque ? "border-gold/40 shadow-gold ring-1 ring-gold/20" : ""
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">{plano.nome}</h2>
                {plano.destaque && <Badge variant="gold">Recomendado</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{plano.descricao}</p>
              <div className="my-4 flex items-baseline gap-1">
                <span className="text-3xl font-semibold">
                  {plano.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
                <span className="text-sm text-muted-foreground">/mês</span>
              </div>
              <ul className="mb-6 flex-1 space-y-2 text-sm">
                {plano.recursos.map((recurso) => (
                  <li key={recurso} className="flex items-start gap-2">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-dark" />
                    {recurso}
                  </li>
                ))}
              </ul>
              <Button
                variant={plano.destaque ? "gold" : "default"}
                onClick={() => assinar(plano.id)}
                disabled={processando}
              >
                {processando ? <Spinner /> : <CreditCard className="h-4 w-4" />}
                Assinar {plano.nome}
              </Button>
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5" />
        Pagamento processado com segurança pelo Mercado Pago.
      </p>
    </>
  );
}
