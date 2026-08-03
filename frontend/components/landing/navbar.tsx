"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Recursos", href: "#recursos" },
  { label: "Planos", href: "#planos" },
  { label: "Perguntas", href: "#faq" },
];

/** Navegação superior da landing page. */
export function LandingNavbar() {
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border/60 bg-background/85 py-2 shadow-soft backdrop-blur-xl"
          : "border-b border-transparent bg-transparent py-4"
      )}
    >
      {/* Filete dourado no topo */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent" />

      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6">
        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-base font-semibold text-gold-dark transition-colors hover:text-gold dark:text-gold-light dark:hover:text-gold"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login">
            <Button variant="gold">Entrar</Button>
          </Link>
          <Link href="/cadastro">
            <Button variant="gold">Começar Agora</Button>
          </Link>
        </div>

        <button
          className="rounded-md p-2 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Abrir menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="mx-4 mt-2 rounded-2xl border border-border bg-card p-4 shadow-premium md:hidden">
          <nav className="flex flex-col gap-2">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <Link href="/login">
                <Button variant="gold" className="w-full">Entrar</Button>
              </Link>
              <Link href="/cadastro">
                <Button variant="gold" className="w-full">Começar Agora</Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
