import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showText?: boolean;
  light?: boolean;
}

/** Logotipo da LEX AI (ícone de balança + marca). */
export function Logo({ className, iconClassName, textClassName, showText = true, light }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden",
          iconClassName
        )}
      >
        <Image src="/logo.png" alt="LEX AI" width={36} height={36} className="h-full w-full object-contain" />
      </div>
      {showText && (
        <div className="leading-none">
          <span
            className={cn(
              "font-display text-xl font-semibold tracking-tight",
              light ? "text-white" : "text-foreground",
              textClassName
            )}
          >
            LEX <span className="text-gradient-gold">AI</span>
          </span>
          <p
            className={cn(
              "mt-1 hidden text-[10px] font-medium uppercase tracking-[0.22em] sm:block",
              light ? "text-white/50" : "text-muted-foreground"
            )}
          >
            Inteligência para Advogados
          </p>
        </div>
      )}
    </div>
  );
}
