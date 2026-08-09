"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "O LEX AI substitui o advogado?",
    a: "Não. O LEX AI é uma ferramenta de apoio. Ele auxilia na pesquisa, redação, organização e análise, mas toda decisão e ato processual devem ser validados por um advogado. A plataforma deixa isso claro em todas as respostas geradas por IA.",
  },
  {
    q: "Como funciona a privacidade dos meus documentos?",
    a: "Seus documentos são armazenados de forma segura e isolados por usuário. Para a busca semântica, indexamos apenas embeddings (representações numéricas) — nunca o conteúdo bruto — e seguimos as diretrizes da LGPD, incluindo exclusão completa quando solicitado.",
  },
  {
    q: "Quais tipos de documento posso enviar?",
    a: "Você pode enviar PDF, DOCX, PPTX, imagens (com reconhecimento de texto/OCR) e arquivos de texto. Após o envio, o sistema extrai o conteúdo, indexa e permite resumos automáticos e busca por IA.",
  },
  {
    q: "Posso exportar as petições geradas?",
    a: "Sim. Toda petição gerada pela IA pode ser editada na plataforma e exportada em formato Word (.docx) ou PDF.",
  },
  {
    q: "Preciso configurar minha própria chave da OpenAI?",
    a: "Não. A chave de IA já é gerenciada pela plataforma. Nas implantações on-premise/empresariais, é possível configurar a própria chave no arquivo de ambiente do backend.",
  },
  {
    q: "Como funciona o plano gratuito?",
    a: "O plano Starter é gratuito e inclui 1 usuário, 50 consultas de IA por mês e 10 documentos indexados — ideal para testar a plataforma sem compromisso.",
  },
  {
    q: "Como funciona o teste grátis de 14 dias?",
    a: "Ao se cadastrar, você ativa o teste grátis com acesso completo ao plano Profissional por 14 dias. Não pedimos cartão de crédito. Ao final, você pode assinar com desconto de pré-venda ou continuar no plano gratuito.",
  },
  {
    q: "Como é feito o pagamento?",
    a: "A assinatura é liberada via PIX (aprovação em minutos) ou cartão de crédito, processados com segurança pelo Mercado Pago. O acesso ao plano é liberado por 30 dias a cada pagamento.",
  },
  {
    q: "O que acontece depois da pré-venda?",
    a: "Até 15/08/2026 os planos Profissional e Escritório têm 50% de desconto. Depois dessa data, os preços voltam ao valor normal (R$ 97 e R$ 297), mas quem assinar durante a pré-venda mantém o valor promocional na renovação.",
  },
  {
    q: "E se eu não gostar?",
    a: "Você tem garantia incondicional de 7 dias. Se a plataforma não atender, devolvemos 100% do valor pago — sem perguntas e sem burocracia.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card transition-colors",
        open ? "border-gold/40 shadow-soft" : "border-border"
      )}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="font-display text-base font-medium">{q}</span>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-gold-dark transition-transform dark:text-gold", open && "rotate-180")} />
      </button>
      <div
        className={cn(
          "grid transition-all duration-300",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">{a}</p>
        </div>
      </div>
    </div>
  );
}

/** Seção de perguntas frequentes. */
export function Faq() {
  return (
    <section id="faq" className="py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-gold-dark dark:text-gold">
            Perguntas Frequentes
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Tire suas dúvidas
          </h2>
        </Reveal>

        <div className="mt-10 space-y-3">
          {FAQS.map((faq, i) => (
            <Reveal key={faq.q} delay={i * 0.05}>
              <FaqItem q={faq.q} a={faq.a} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
