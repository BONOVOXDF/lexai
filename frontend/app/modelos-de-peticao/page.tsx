import type { Metadata } from "next";
import Link from "next/link";
import { LandingNavbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { Reveal } from "@/components/reveal";
import { Button } from "@/components/ui/button";
import { BENEFICIOS, LeadMagnetForm } from "@/components/landing/lead-magnet";

export const metadata: Metadata = {
  title: "Kit de Modelos de Petição Grátis | LEX AI",
  description:
    "Baixe grátis um kit com 4 modelos de petição prontos (inicial consumerista, contestação trabalhista, embargos de declaração e justiça gratuita). Sem cartão de crédito.",
};

/** Página do lead magnet (captura de e-mail em troca do kit de modelos). */
export default function ModelosDePeticaoPage() {
  return (
    <>
      <LandingNavbar />
      <main className="pt-28">
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Reveal>
                <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-gold-dark dark:text-gold">
                  Grátis
                </span>
                <h1 className="mt-4 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                  Kit com 4 modelos de petição prontos para hoje
                </h1>
                <p className="mt-5 text-lg text-muted-foreground">
                  Pare de reescrever peças do zero. Estruturas completas das petições mais
                  pedidas, com campos para preencher — você economiza horas em cada uma.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {BENEFICIOS.map((beneficio) => (
                    <div key={beneficio.titulo} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                      <beneficio.icon className="mt-0.5 h-5 w-5 shrink-0 text-gold-dark dark:text-gold" />
                      <div>
                        <p className="font-display font-semibold">{beneficio.titulo}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{beneficio.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link href="/precos">
                    <Button variant="outline">Ver planos</Button>
                  </Link>
                  <Link href="/cadastro">
                    <Button variant="outline">Testar a IA grátis</Button>
                  </Link>
                </div>
              </Reveal>
            </div>

            <Reveal delay={0.1}>
              <LeadMagnetForm />
            </Reveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
