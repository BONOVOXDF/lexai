"use client";

import { motion } from "framer-motion";

const STATS = [
  { valor: "10 mil+", rotulo: "peças jurídicas geradas" },
  { valor: "40 mil+", rotulo: "prazos sob controle" },
  { valor: "3 min", rotulo: "tempo médio por petição" },
  { valor: "24/7", rotulo: "disponibilidade e suporte" },
];

/** Faixa de estatísticas da landing page. */
export function Stats() {
  return (
    <section className="border-b border-border/60 bg-navy text-white">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-10 px-4 py-14 sm:px-6 lg:grid-cols-4">
        {STATS.map((stat, i) => (
          <motion.div
            key={stat.rotulo}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="text-center"
          >
            <p className="font-display text-4xl font-bold text-gold-light sm:text-5xl">{stat.valor}</p>
            <p className="mt-2 text-sm text-white/70">{stat.rotulo}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
