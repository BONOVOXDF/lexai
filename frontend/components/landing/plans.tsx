"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    name: "Starter",
    price: "R$ 0",
    period: "/mês",
    description: "Para advogados que estão começando.",
    features: [
      "1 usuário",
      "50 consultas IA/mês",
      "10 documentos indexados",
      "Petições ilimitadas",
      "Gestão de clientes e processos",
    ],
    cta: "Começar Grátis",
    highlighted: false,
  },
  {
    name: "Profissional",
    price: "R$ 97",
    period: "/mês",
    description: "Para escritórios em crescimento.",
    features: [
      "3 usuários",
      "Consultas IA ilimitadas",
      "Documentos ilimitados",
      "Exportação Word e PDF",
      "Pesquisa de jurisprudência",
      "Financeiro e relatórios",
      "Suporte prioritário",
    ],
    cta: "Assinar Agora",
    highlighted: true,
  },
  {
    name: "Escritório",
    price: "R$ 297",
    period: "/mês",
    description: "Para escritórios e equipes completas.",
    features: [
      "Usuários ilimitados",
      "Tudo do plano Profissional",
      "Integrações (API)",
      "Treinamento dedicado",
      "Gestor de conta",
      "SLA garantido",
    ],
    cta: "Falar com Vendas",
    highlighted: false,
  },
];

/** Seção de planos da landing page. */
export function Plans() {
  return (
    <section id="planos" className="border-y border-border/60 bg-parchment py-20 text-navy sm:py-28 dark:bg-navy/95 dark:text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-gold-dark">Planos</p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Invista na sua produtividade
          </h2>
          <p className="mt-4 text-muted-foreground">
            Comece grátis e evolua conforme o seu escritório cresce. Sem fidelidade, cancele quando quiser.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 0.1}>
              <div
                className={cn(
                  "relative flex h-full flex-col rounded-2xl p-8 transition-transform duration-300",
                  plan.highlighted
                    ? "bg-gradient-to-b from-gold-light via-gold to-gold-dark text-navy shadow-gold ring-1 ring-gold-light/40 lg:-translate-y-2"
                    : "border border-border bg-card text-navy shadow-soft hover:border-gold/40 dark:text-white"
                )}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-navy px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold-light">
                    Mais popular
                  </span>
                )}
                <h3 className="font-display text-2xl font-semibold">{plan.name}</h3>
                <p className={cn("mt-1 text-sm", plan.highlighted ? "text-navy/70" : "text-muted-foreground")}>
                  {plan.description}
                </p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-display text-5xl font-semibold tracking-tight">{plan.price}</span>
                  <span className={cn("text-sm", plan.highlighted ? "text-navy/70" : "text-muted-foreground")}>
                    {plan.period}
                  </span>
                </div>

                <ul className="mt-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                      <span
                        className={cn(
                          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                          plan.highlighted ? "bg-navy text-gold-light" : "bg-gold/15 text-gold-dark"
                        )}
                      >
                        <Check className="h-3 w-3" strokeWidth={2.5} />
                      </span>
                      <span className={plan.highlighted ? "text-navy/80" : "text-navy/85 dark:text-white/80"}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href="/cadastro" className="mt-8">
                  <Button
                    variant={plan.highlighted ? "default" : "outline"}
                    className="w-full"
                    size="lg"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
