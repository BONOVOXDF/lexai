"use client";

import {
  Bot,
  CalendarClock,
  FileSearch,
  FileText,
  FolderKanban,
  Landmark,
  MessageSquareText,
  Scale,
  Users,
  Wallet,
} from "lucide-react";
import { Reveal } from "@/components/reveal";
import { Card } from "@/components/ui/card";

const FEATURES = [
  {
    icon: MessageSquareText,
    title: "Assistente IA",
    description:
      "Converse com uma IA especializada em direito. Respostas em Markdown, com contexto dos seus documentos e fontes citadas.",
  },
  {
    icon: FileText,
    title: "Gerador de Petições",
    description:
      "Petição inicial, contestação, agravo, apelação, mandado de segurança, contratos, procurações e pareceres.",
  },
  {
    icon: FileSearch,
    title: "Análise de Documentos",
    description:
      "Upload de PDF, DOCX e imagens com OCR. Resumo automático, indexação vetorial e busca semântica.",
  },
  {
    icon: Landmark,
    title: "Jurisprudência e Leis",
    description:
      "Pesquisa por IA em leis, jurisprudência e súmulas, com filtros por tribunal e órgão.",
  },
  {
    icon: Users,
    title: "Gestão de Clientes",
    description:
      "Cadastro completo com histórico, documentos vinculados, anotações e relacionamento com processos.",
  },
  {
    icon: FolderKanban,
    title: "Processos",
    description:
      "Acompanhe número, tribunal, classe, prazos, status e documentos de cada processo em um só lugar.",
  },
  {
    icon: CalendarClock,
    title: "Agenda Jurídica",
    description:
      "Audiências, compromissos e prazos com calendário integrado e alertas de notificação.",
  },
  {
    icon: Wallet,
    title: "Financeiro",
    description:
      "Honorários, receitas, despesas e mensalidades com relatórios e gráficos mensais.",
  },
];

/** Seção de recursos da landing page. */
export function Features() {
  return (
    <section id="recursos" className="py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-gold-dark dark:text-gold">
            Recursos
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Tudo o que o seu escritório precisa
          </h2>
          <p className="mt-4 text-muted-foreground">
            O LEX AI reúne pesquisa, redação, gestão e análise em uma plataforma única,
            pensada para a rotina do advogado moderno.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, description }, i) => (
            <Reveal key={title} delay={i * 0.05}>
              <Card className="group relative h-full overflow-hidden p-6 transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-premium">
                <div className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-gold to-gold-light transition-transform duration-300 group-hover:scale-x-100" />
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-gold/20 bg-gold/8 text-gold-dark transition-colors group-hover:bg-gold/15 dark:text-gold-light">
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
