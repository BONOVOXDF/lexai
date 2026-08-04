import type { Metadata } from "next";
import Link from "next/link";
import { LandingNavbar } from "@/components/landing/navbar";
import { Plans } from "@/components/landing/plans";
import { Faq } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export const metadata: Metadata = {
  title: "Preços e Planos | LEX AI",
  description:
    "Planos do LEX AI para advogados e escritórios: comece grátis, Profissional por R$ 97/mês ou Escritório por R$ 297/mês. Sem fidelidade, cancele quando quiser.",
};

const COMPARACAO = [
  { recurso: "Usuários", starter: "1", pro: "3", empresa: "Ilimitados" },
  { recurso: "Consultas com IA", starter: "50/mês", pro: "30/min", empresa: "60/min" },
  { recurso: "Documentos indexados", starter: "10", pro: "Ilimitados", empresa: "Ilimitados" },
  { recurso: "Petições ilimitadas", starter: "Sim", pro: "Sim", empresa: "Sim" },
  { recurso: "Exportação Word e PDF", starter: "Não", pro: "Sim", empresa: "Sim" },
  { recurso: "Pesquisa de jurisprudência", starter: "Básica", pro: "Completa", empresa: "Completa" },
  { recurso: "Financeiro e relatórios", starter: "Básico", pro: "Completo", empresa: "Completo" },
  { recurso: "Integrações (API)", starter: "Não", pro: "Não", empresa: "Sim" },
  { recurso: "Suporte", starter: "E-mail", pro: "Prioritário", empresa: "Dedicado" },
];

/** Página dedicada de preços. */
export default function PrecosPage() {
  return (
    <>
      <LandingNavbar />
      <main className="pt-28">
        <section className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-gold-dark dark:text-gold">
              Promoção de lançamento
            </span>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Preços simples, sem fidelidade
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Comece grátis, evolua conforme o escritório cresce. No plano Profissional, o
              primeiro prazo perdido por causa da plataforma vale o ano inteiro — garantia
              incondicional de 7 dias.
            </p>
          </Reveal>
        </section>

        <Plans />

        <section className="py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Reveal className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-gold-dark dark:text-gold">
                Compare
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Escolha o plano ideal
              </h2>
            </Reveal>

            <div className="mt-10 overflow-x-auto rounded-2xl border border-border shadow-soft">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-parchment dark:bg-navy-dark">
                    <th className="px-6 py-4 text-left font-display font-semibold text-navy dark:text-white">Recurso</th>
                    <th className="px-6 py-4 text-left font-display font-semibold text-navy dark:text-white">Starter</th>
                    <th className="px-6 py-4 text-left font-display font-semibold text-gold-dark dark:text-gold">Profissional</th>
                    <th className="px-6 py-4 text-left font-display font-semibold text-navy dark:text-white">Escritório</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARACAO.map((linha, i) => (
                    <tr key={linha.recurso} className={i % 2 ? "bg-muted/40" : "bg-card"}>
                      <td className="px-6 py-3 font-medium">{linha.recurso}</td>
                      <td className="px-6 py-3 text-muted-foreground">{linha.starter}</td>
                      <td className="px-6 py-3 font-medium text-gold-dark dark:text-gold">{linha.pro}</td>
                      <td className="px-6 py-3 text-muted-foreground">{linha.empresa}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="border-y border-border/60 bg-gradient-to-b from-gold-light/20 to-transparent py-16">
          <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 text-center sm:px-6">
            <div className="flex items-center gap-2 text-gold-dark dark:text-gold">
              <Check className="h-6 w-6" />
              <h2 className="font-display text-2xl font-semibold">Garantia incondicional de 7 dias</h2>
            </div>
            <p className="max-w-2xl text-muted-foreground">
              Assine e use por 7 dias. Se não valer a pena, devolvemos 100% do valor — sem perguntas.
              E se você perder um prazo por causa da plataforma, reembolsamos o ano inteiro.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/cadastro">
                <Button size="lg">Começar grátis agora</Button>
              </Link>
              <Link href="/modelos-de-peticao">
                <Button variant="outline" size="lg">Baixar kit gratuito de modelos</Button>
              </Link>
            </div>
          </div>
        </section>

        <Faq />
      </main>
      <Footer />
    </>
  );
}
