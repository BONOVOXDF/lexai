"use client";

import * as React from "react";
import {
  BadgeCheck,
  CheckCircle2,
  Copy,
  CreditCard,
  Gift,
  Lock,
  PartyPopper,
  QrCode,
  RefreshCcw,
  Rocket,
  XCircle,
} from "lucide-react";
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

const PRECO_FALLBACK: Record<string, number> = { pro: 47, empresa: 147 };
const PRECO_CHEIO: Record<string, number> = { pro: 97, empresa: 297 };
const PRE_VENDA_FIM = new Date("2026-08-15T23:59:59-03:00");

const PLANOS_BASE: Omit<PlanoCard, "preco">[] = [
  {
    id: "pro",
    nome: "Profissional",
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
  approved: { texto: "Pagamento confirmado", variant: "success" },
  pending: { texto: "Aguardando pagamento", variant: "warning" },
  cancelled: { texto: "Cancelado", variant: "destructive" },
  refunded: { texto: "Reembolsado", variant: "destructive" },
  rejected: { texto: "Pagamento recusado", variant: "destructive" },
  expired: { texto: "Expirado", variant: "destructive" },
};

export default function AssinaturaPage() {
  const { user, refresh } = useAuth();
  const [assinatura, setAssinatura] = React.useState<Assinatura | null>(null);
  const [checkout, setCheckout] = React.useState<AssinaturaCheckout | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [processando, setProcessando] = React.useState(false);
  const [copiado, setCopiado] = React.useState(false);
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

  // Polling enquanto o pagamento PIX estiver pendente.
  React.useEffect(() => {
    if (!checkout) return;
    const timer = window.setInterval(async () => {
      try {
        const data = await api.get<Assinatura>("/api/assinatura");
        setAssinatura(data);
        if (data.status === "approved") {
          setMsg("Pagamento confirmado! Seu plano está ativo.");
          setCheckout(null);
          await refresh();
        }
      } catch {
        /* mantém o polling */
      }
    }, 5000);
    return () => window.clearInterval(timer);
  }, [checkout, refresh]);

  const assinar = async (plano: string) => {
    setProcessando(true);
    setErro(null);
    setMsg(null);
    try {
      const data = await api.post<AssinaturaCheckout>("/api/assinatura/checkout", { plano });
      setCheckout(data);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao iniciar o pagamento.");
    } finally {
      setProcessando(false);
    }
  };

  const copiarPix = async () => {
    if (!checkout) return;
    try {
      await navigator.clipboard.writeText(checkout.qr_code);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErro("Não foi possível copiar o código PIX.");
    }
  };

  const cancelar = async () => {
    if (!window.confirm("Deseja encerrar seu plano? Seu acesso será rebaixado para o gratuito.")) return;
    setProcessando(true);
    setErro(null);
    setMsg(null);
    try {
      await api.post("/api/assinatura/cancelar");
      setMsg("Plano encerrado. Seu acesso voltou ao gratuito.");
      setCheckout(null);
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao encerrar o plano.");
    } finally {
      setProcessando(false);
    }
  };

  const iniciarTrial = async () => {
    setProcessando(true);
    setErro(null);
    setMsg(null);
    try {
      await api.post("/api/assinatura/trial");
      setMsg("Teste gratuito ativado! Você tem acesso completo por 14 dias.");
      await carregar();
      await refresh();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao iniciar o teste gratuito.");
    } finally {
      setProcessando(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-24"><Spinner className="h-6 w-6" /></div>;
  }

  const precos = assinatura?.precos ?? PRECO_FALLBACK;
  const planos: PlanoCard[] = PLANOS_BASE.map((p) => ({ ...p, preco: precos[p.id] ?? PRECO_FALLBACK[p.id] }));

  const planoAtual = assinatura?.plano_atual ?? "free";
  const temPlano = planoAtual !== "free" && planoAtual !== "trial";
  const trialAtivo = assinatura?.trial_ativo === true;
  const trialDisponivel =
    assinatura?.trial_habilitado === true && assinatura?.trial_usado !== true && planoAtual === "free";
  const trialUsado = assinatura?.trial_usado === true;
  const trialDias = assinatura?.trial_dias ?? 14;
  const diasRestantes = assinatura?.trial_dias_restantes ?? trialDias;
  const statusInfo = assinatura?.status ? STATUS_LABEL[assinatura.status] : undefined;

  const planosGrid = (
    <div className="grid gap-6 md:grid-cols-2">
      {planos.map((plano) => {
        const preVenda = new Date() < PRE_VENDA_FIM;
        return (
          <div
            key={plano.id}
            className={`relative flex flex-col rounded-2xl border bg-card p-6 ${
              plano.destaque ? "border-gold/40 shadow-gold ring-1 ring-gold/20" : ""
            }`}
          >
            {preVenda && (PRECO_CHEIO[plano.id] ?? 0) > plano.preco && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gold-dark px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
                Pré-venda
              </span>
            )}
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold">{plano.nome}</h2>
              {plano.destaque && <Badge variant="gold">Recomendado</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">{plano.descricao}</p>
            <div className="my-4 flex items-baseline gap-2">
              <span className="text-3xl font-semibold">
                {plano.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
              {preVenda && (PRECO_CHEIO[plano.id] ?? 0) > plano.preco && (
                <span className="text-lg font-medium text-muted-foreground line-through">
                  {(PRECO_CHEIO[plano.id] ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              )}
              <span className="text-sm text-muted-foreground">/30 dias</span>
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
        );
      })}
    </div>
  );

  return (
    <>
      <PageHeader title="Assinatura" description="Teste grátis por 14 dias ou escolha um plano e pague via PIX." />

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

      {checkout ? (
        <div className="mx-auto max-w-2xl rounded-2xl border bg-card p-6">
          <div className="mb-4 flex items-center gap-3">
            <QrCode className="h-6 w-6 text-gold-dark" />
            <h2 className="font-display text-xl font-semibold">Pague com PIX</h2>
          </div>
          <p className="mb-5 text-sm text-muted-foreground">
            Escaneie o QR Code com o app do seu banco ou copie o código PIX. O plano é ativado
            automaticamente após a confirmação do pagamento.
          </p>
          <div className="mb-5 flex justify-center">
            {checkout.qr_code_base64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/png;base64,${checkout.qr_code_base64}`}
                alt="QR Code PIX"
                className="h-56 w-56 rounded-xl border bg-white p-2"
              />
            ) : (
              <div className="flex h-56 w-56 items-center justify-center rounded-xl border bg-muted">
                <Spinner />
              </div>
            )}
          </div>
          <div className="mb-5 text-center">
            <p className="text-sm text-muted-foreground">Valor</p>
            <p className="text-2xl font-semibold">
              {(checkout.transaction_amount || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Button variant="gold" onClick={copiarPix}>
              {copiado ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiado ? "Código copiado" : "Copiar código PIX"}
            </Button>
            <Button variant="outline" onClick={() => setCheckout(null)}>
              Fechar
            </Button>
          </div>
        </div>
      ) : trialAtivo ? (
        <>
          <div className="mx-auto max-w-2xl rounded-2xl border bg-gradient-to-b from-gold-light/40 to-transparent p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Rocket className="h-6 w-6 text-gold-dark" />
                <h2 className="font-display text-xl font-semibold">Teste gratuito ativo</h2>
              </div>
              <Badge variant="gold">{diasRestantes} dia{diasRestantes !== 1 ? "s" : ""} restante{diasRestantes !== 1 ? "s" : ""}</Badge>
            </div>
            <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-gold-dark" />
                Acesso completo a todas as funcionalidades do plano Profissional.
              </li>
              {assinatura?.plano_expira_em && (
                <li className="flex items-center gap-2">
                  <RefreshCcw className="h-4 w-4 text-gold-dark" />
                  Teste válido até{" "}
                  <strong>
                    {new Date(assinatura.plano_expira_em).toLocaleDateString("pt-BR")}
                  </strong>
                </li>
              )}
              <li className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-gold-dark" /> Sem cartão de crédito. Você não será cobrado.
              </li>
            </ul>
          </div>
          <div className="mt-10">
            <div className="mb-4 flex items-center gap-2">
              <Gift className="h-5 w-5 text-gold-dark" />
              <h2 className="font-display text-lg font-semibold">Garanta o acesso antes do fim do teste</h2>
            </div>
            {planosGrid}
          </div>
        </>
      ) : temPlano ? (
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
                <BadgeCheck className="h-3.5 w-3.5" /> Acesso ativo
              </Badge>
            )}
          </div>
          <ul className="mb-6 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-gold-dark" /> Pagamento único via PIX, sem cobrança recorrente.
            </li>
            {assinatura?.plano_expira_em && (
              <li className="flex items-center gap-2">
                <RefreshCcw className="h-4 w-4 text-gold-dark" />
                Acesso válido até{" "}
                <strong>
                  {new Date(assinatura.plano_expira_em).toLocaleDateString("pt-BR")}
                </strong>
              </li>
            )}
          </ul>
          <Button variant="destructive" onClick={cancelar} disabled={processando}>
            {processando ? <Spinner /> : <XCircle className="h-4 w-4" />}
            Encerrar acesso
          </Button>
        </div>
      ) : (
        <>
          {trialDisponivel && (
            <div className="mx-auto max-w-2xl rounded-2xl border bg-gradient-to-b from-gold-light/40 to-transparent p-6 text-center">
              <Rocket className="mx-auto h-8 w-8 text-gold-dark" />
              <h2 className="mt-3 font-display text-2xl font-semibold">
                Experimente grátis por {trialDias} dias
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                Acesso completo a todas as funcionalidades, sem cartão de crédito e sem
                compromisso. Você escolhe depois se quer assinar.
              </p>
              <Button variant="gold" size="lg" className="mt-5" onClick={iniciarTrial} disabled={processando}>
                {processando ? <Spinner /> : <Gift className="h-4 w-4" />}
                Começar teste gratuito
              </Button>
            </div>
          )}
          {trialUsado && !trialDisponivel && (
            <Alert className="mb-4">
              <AlertDescription>
                Seu período de teste gratuito terminou. Escolha um plano para continuar usando o LEX AI.
              </AlertDescription>
            </Alert>
          )}
          {planosGrid}
        </>
      )}

      <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5" />
        Pagamento processado com segurança pelo Mercado Pago.
      </p>
    </>
  );
}
