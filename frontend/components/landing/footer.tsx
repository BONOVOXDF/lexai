"use client";

import Link from "next/link";
import { Github, Instagram, Linkedin, Twitter, Youtube } from "lucide-react";
import { Logo } from "@/components/logo";

const LINKS = {
  Produto: [
    { label: "Recursos", href: "#recursos" },
    { label: "Planos", href: "#planos" },
    { label: "Perguntas Frequentes", href: "#faq" },
    { label: "Login", href: "/login" },
  ],
  Legal: [
    { label: "Termos de Uso", href: "/termos" },
    { label: "Privacidade", href: "/privacidade" },
    { label: "LGPD", href: "/lgpd" },
  ],
  Suporte: [
    { label: "Central de Ajuda", href: "#" },
    { label: "Contato", href: "#" },
    { label: "Status", href: "#" },
  ],
};

/** Rodapé completo da landing page. */
export function Footer() {
  return (
    <footer className="border-t border-border/70 bg-parchment dark:bg-navy-dark">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo size="md" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              A Inteligência Artificial para Advogados. Pesquisa, redação e gestão jurídica
              em uma plataforma segura, moderna e escalável.
            </p>
            <div className="mt-6 flex gap-3">
              {[Twitter, Linkedin, Instagram, Youtube, Github].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-gold hover:text-gold-dark dark:hover:border-gold/50 dark:hover:text-gold-light"
                  aria-label="Rede social"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(LINKS).map(([title, items]) => (
            <div key={title}>
              <h4 className="font-display text-sm font-semibold uppercase tracking-wider text-navy dark:text-gold-light">
                {title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-navy dark:hover:text-white"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/70 pt-8 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} LEX AI. Todos os direitos reservados.
          </p>
          <p className="text-sm text-muted-foreground">
            Feito com <span className="text-gold-dark">&#9829;</span> para a advocacia brasileira.
          </p>
        </div>
      </div>
    </footer>
  );
}
