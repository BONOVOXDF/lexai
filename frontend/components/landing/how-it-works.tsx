"use client";

import Link from "next/link";
import { ArrowRight, FileUp, CalendarCheck, Sparkles } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";

const PASSOS = [
  {
    numero: "01",
    icon: Sparkles,
    titulo: "Cadastre-se grátis",
    descricao:
      "Crie sua conta em menos de 1 minuto e ative o teste gratuito de 14 dias — sem cartão de crédito e sem compromisso.",
  },
  {
    numero: "02",
    icon: FileUp,
    titulo: "Importe sua rotina",
    descricao:
      "Cadastre clientes e processos, registre intimações do DJEN e envie documentos. O LEX AI organiza tudo para você.",
  },
  {
    numero: "03",
    icon: CalendarCheck,
    titulo: "Gere e acompanhe",
    descricao:
      "Redija petições e atas com IA, receba o alerta diário de prazos e deixe o cliente acompanhar pelo portal.",
  },
];

/** Seção "Como funciona" da landing page. */
export function HowItWorks() {
  return (
    <section className="border-y border-border/60 bg-parchment py-20 sm:py-28 dark:bg-navy/95">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-gold-dark dark:text-gold">
            Como funciona
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Em funcionamento em 3 passos
          </h2>
          <p className="mt-4 text-muted-foreground">
            Do cadastro à rotina organizada em poucos minutos — sem curva de aprendizado e sem precisar de estagiário.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {PASSOS.map((passo, i) => (
            <Reveal key={passo.numero} delay={i * 0.1}>
              <div className="relative h-full rounded-2xl border border-border bg-card p-8 shadow-soft transition-all hover:border-gold/40 hover:shadow-premium">
                <span className="font-display text-6xl font-bold text-gold/15">{passo.numero}</span>
                <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-xl border border-gold/20 bg-gold/10 text-gold-dark dark:text-gold">
                  <passo.icon className="h-6 w-6" strokeWidth={1.8} />
                </div>
                <h3 className="mt-5 font-display text-xl font-semibold">{passo.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{passo.descricao}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/cadastro">
            <Button size="lg" variant="gold">
              Começar meu teste gratuito
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
