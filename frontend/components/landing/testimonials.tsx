"use client";

import { motion } from "framer-motion";
import { Quote, Star } from "lucide-react";
import { initials } from "@/lib/utils";

const DEPOIMENTOS = [
  {
    nome: "Mariana Albuquerque",
    cargo: "Advogada trabalhista · Recife/PE",
    texto:
      "O alerta diário de prazos virou meu seguro de vida profissional. Nunca mais perdi um termo e ainda gero petições em minutos, com as fontes indicadas.",
  },
  {
    nome: "Ricardo Fontes",
    cargo: "Sócio de escritório · São Paulo/SP",
    texto:
      "Juntamos todos os prazos dos nossos 300 processos em um só quadro. A equipe inteira enxerga o que vence hoje e o que está atrasado. Produtividade outro nível.",
  },
  {
    nome: "Camila Rocha",
    cargo: "Advogada autônoma · Porto Alegre/RS",
    texto:
      "Como trabalho sozinha, o LEX AI é meu estagiário de 24h. Pesquiso jurisprudência, monto contratos e organizo o financeiro sem sair da plataforma.",
  },
  {
    nome: "Ana Beatriz Duarte",
    cargo: "Advogada cível · Belo Horizonte/MG",
    texto:
      "O portal do cliente mudou meu relacionamento com o escritório: os clientes acompanham os prazos sozinhos e as atas das audiências ficam prontas antes de eu sair do fórum.",
  },
];

/** Seção de depoimentos de clientes. */
export function Testimonials() {
  return (
    <section className="bg-parchment py-20 dark:bg-navy-dark">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-gold-dark dark:text-gold">
            Depoimentos
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-navy dark:text-white sm:text-4xl">
            Quem usa, recomenda
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Advogados e escritórios de todo o Brasil já rotacionam a rotina com o LEX AI.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {DEPOIMENTOS.map((dep, i) => (
            <motion.figure
              key={dep.nome}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative flex flex-col rounded-2xl border border-border bg-card p-6 shadow-premium"
            >
              <Quote className="absolute right-6 top-6 h-8 w-8 text-gold/30" />
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="h-4 w-4 fill-gold text-gold" />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
                &ldquo;{dep.texto}&rdquo;
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-gold-light to-gold-dark text-sm font-semibold text-navy">
                  {initials(dep.nome)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy dark:text-white">{dep.nome}</p>
                  <p className="text-xs text-muted-foreground">{dep.cargo}</p>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
