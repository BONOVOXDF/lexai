"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, PlayCircle, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/landing/countdown";

const WHATSAPP_URL = "https://wa.me/5561995677033?text=" + encodeURIComponent("Olá! Vim pelo site do LEX AI e gostaria de uma demonstração.");

const HIGHLIGHTS = [
  { icon: Sparkles, text: "Respostas fundamentadas com fontes" },
  { icon: CheckCircle2, text: "Petições, atas e documentos jurídicos" },
  { icon: ShieldCheck, text: "Conformidade LGPD e isolamento de dados" },
];

/** Seção Hero da landing page: imagem no topo com texto sobreposto. */
export function Hero() {
  return (
    <section className="relative overflow-hidden pt-0">
      {/* Imagem em largura total, subindo até o topo */}
      <div className="relative h-[620px] w-full sm:h-[700px]">
        <Image
          src="/hero.jpg"
          alt="LEX AI — Inteligência Artificial para Advogados"
          fill
          priority
          className="object-cover brightness-[1.08] saturate-[0.9]"
        />
        {/* Degradês para legibilidade do texto */}
        <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-navy/80 via-navy/25 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        <div className="absolute inset-0 bg-navy/20" />

        {/* Texto acima da imagem */}
        <div className="relative z-10 mx-auto flex h-full max-w-7xl flex-col items-center justify-center px-4 text-center sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 flex flex-wrap items-center justify-center gap-3"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
              <Sparkles className="h-4 w-4 text-gold-light" />
              Inteligência Artificial feita para o Direito
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/50 bg-gold/90 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-navy">
              Até 50% OFF na pré-venda
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="max-w-4xl font-display text-4xl font-bold leading-tight tracking-tight text-white drop-shadow-[0_2px_12px_rgba(7,21,40,0.85)] sm:text-6xl lg:text-7xl"
          >
            A Inteligência Artificial <span className="italic text-gold-light drop-shadow-[0_1px_6px_rgba(7,21,40,0.8)]">do Advogado</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg font-medium leading-relaxed text-white drop-shadow-[0_2px_8px_rgba(7,21,40,0.9)]"
          >
            Pesquisa jurídica, petições, atas, controle de prazos e portal do cliente em uma
            plataforma completa — com fontes, segurança e privacidade.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link href="/cadastro">
              <Button variant="gold" size="lg" className="w-full sm:w-auto">
                Começar 14 dias grátis
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full border-white/40 bg-white/10 text-white hover:bg-white/20 sm:w-auto">
                <PlayCircle className="h-5 w-5 text-gold-light" />
                Solicitar Demonstração
              </Button>
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-medium text-white/90"
          >
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-gold-light" /> 14 dias grátis
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-gold-light" /> Sem cartão de crédito
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-gold-light" /> Profissional por R$ 47 até 15/08
            </span>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-5"
          >
            <Countdown />
          </motion.div>
        </div>
      </div>

      {/* Faixa de destaques logo abaixo da imagem */}
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-8 gap-y-3 border-y border-border/60 px-4 py-6 sm:px-6">
        {HIGHLIGHTS.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-center gap-2 text-sm font-semibold text-navy dark:text-white">
            <Icon className="h-4 w-4 text-gold-dark dark:text-gold" />
            {text}
          </div>
        ))}
      </div>
    </section>
  );
}
