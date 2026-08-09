"use client";

import {
  BellRing,
  CalendarClock,
  ClipboardList,
  FileText,
  FolderKanban,
  Landmark,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";
import { Reveal } from "@/components/reveal";
import { Card } from "@/components/ui/card";

const FEATURES = [
  {
    icon: MessageSquareText,
    title: "Assistente IA",
    description:
      "Converse com uma IA especializada em direito. Respostas com contexto dos seus documentos e fontes citadas para revisão.",
  },
  {
    icon: FileText,
    title: "Gerador de Documentos",
    description:
      "Petição inicial, contestação, apelação, contratos, procurações e pareceres — editáveis e exportáveis em Word ou PDF.",
  },
  {
    icon: ClipboardList,
    title: "Atas por IA",
    description:
      "Transforme as notas de audiências e reuniões em atas formais e estruturadas em minutos, prontas para arquivar.",
  },
  {
    icon: BellRing,
    title: "Alerta de Prazos",
    description:
      "Receba por e-mail, todos os dias às 7h, o que vence nos próximos 2 dias — e nunca mais perca um termo.",
  },
  {
    icon: CalendarClock,
    title: "Kanban de Prazos",
    description:
      "Enxergue de uma só vez os prazos atrasados, de hoje, da semana e do mês em um quadro visual de arrastar e soltar.",
  },
  {
    icon: ShieldCheck,
    title: "Portal do Cliente",
    description:
      "Convide seus clientes para acompanhar processos e prazos em um portal próprio, com acesso seguro por link.",
  },
  {
    icon: Landmark,
    title: "Jurisprudência e Leis",
    description:
      "Pesquisa por IA em leis, jurisprudência e súmulas, com filtros por tribunal e órgão para fundamentar seus pedidos.",
  },
  {
    icon: FolderKanban,
    title: "Gestão e Intimações",
    description:
      "Clientes, processos, intimações do DJEN e financeiro integrados — sua rotina jurídica inteira em um só lugar.",
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
