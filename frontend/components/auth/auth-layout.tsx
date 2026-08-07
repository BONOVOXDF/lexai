"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Logo } from "@/components/logo";

/**
 * Layout das telas de autenticação (login, cadastro, recuperação).
 * Apresenta um painel visual à esquerda e o formulário à direita.
 */
export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Painel institucional */}
      <div className="relative hidden overflow-hidden bg-navy text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-gold/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
        </div>

        <div className="relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="mt-6 max-w-md font-display text-3xl font-semibold leading-snug"
          >
            &ldquo;A Inteligência Artificial <span className="text-gradient-gold">do Advogado</span>&rdquo;
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-4 max-w-md text-white/60"
          >
            Pesquisa fundamentada, petições, contratos e gestão do seu escritório em uma
            única plataforma — com segurança e conformidade.
          </motion.p>
        </div>

        <p className="relative z-10 text-xs text-white/40">
          © {new Date().getFullYear()} LEX AI. Todos os direitos reservados.
        </p>
      </div>

      {/* Formulário */}
      <div className="flex flex-col items-center justify-center bg-background px-6 py-12">
        <div className="mb-8 lg:hidden">
          <Link href="/">
            <Logo size="lg" />
          </Link>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </motion.div>
      </div>
    </div>
  );
}
