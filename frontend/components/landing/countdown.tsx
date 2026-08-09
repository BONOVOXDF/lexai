"use client";

import * as React from "react";
import { Timer } from "lucide-react";

const PRE_VENDA_FIM = new Date("2026-08-15T23:59:59-03:00");

interface Restante {
  dias: number;
  horas: number;
  minutos: number;
  segundos: number;
}

function calcularRestante(): Restante | null {
  const diff = PRE_VENDA_FIM.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    dias: Math.floor(diff / 86400000),
    horas: Math.floor((diff % 86400000) / 3600000),
    minutos: Math.floor((diff % 3600000) / 60000),
    segundos: Math.floor((diff % 60000) / 1000),
  };
}

function Bloco({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-navy/10 px-2.5 py-1.5 min-w-[52px] dark:bg-white/10">
      <span className="font-display text-lg font-bold tabular-nums leading-none">
        {String(valor).padStart(2, "0")}
      </span>
      <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider opacity-70">
        {rotulo}
      </span>
    </div>
  );
}

/** Contagem regressiva da pré-venda (até 15/08/2026). */
export function Countdown({ className }: { className?: string }) {
  const [restante, setRestante] = React.useState<Restante | null>(calcularRestante());

  React.useEffect(() => {
    const timer = window.setInterval(() => setRestante(calcularRestante()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!restante) return null;

  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <Timer className="h-4 w-4 text-gold-dark dark:text-gold" />
      <div className="flex items-center gap-1.5">
        <Bloco valor={restante.dias} rotulo="dias" />
        <span className="font-bold text-gold-dark dark:text-gold">:</span>
        <Bloco valor={restante.horas} rotulo="horas" />
        <span className="font-bold text-gold-dark dark:text-gold">:</span>
        <Bloco valor={restante.minutos} rotulo="min" />
        <span className="font-bold text-gold-dark dark:text-gold">:</span>
        <Bloco valor={restante.segundos} rotulo="seg" />
      </div>
    </div>
  );
}
