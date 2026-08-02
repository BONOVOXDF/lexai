import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  hint?: string;
  accent?: "navy" | "gold" | "emerald" | "red";
}

const ACCENTS: Record<NonNullable<StatCardProps["accent"]>, string> = {
  navy: "bg-navy/8 text-navy",
  gold: "bg-gold/15 text-gold-dark",
  emerald: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-700",
};

/** Cartão de indicador usado no dashboard. */
export function StatCard({ label, value, icon: Icon, hint, accent = "navy" }: StatCardProps) {
  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-premium">
      <div className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-gold to-gold-light transition-transform duration-300 group-hover:scale-x-100" />
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-3xl font-semibold tracking-tight">{value}</p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/50", ACCENTS[accent])}>
            <Icon className="h-5 w-5" strokeWidth={1.8} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
