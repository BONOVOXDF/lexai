import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  iconClassName?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const SIZES = {
  sm: { box: "h-10 w-10", img: "h-10 w-10" },
  md: { box: "h-14 w-14", img: "h-14 w-14" },
  lg: { box: "h-56 w-56", img: "h-56 w-56" },
  xl: { box: "h-64 w-64", img: "h-64 w-64" },
} as const;

/** Logotipo da LEX AI (imagem da marca). */
export function Logo({ className, iconClassName, size = "lg" }: LogoProps) {
  const s = SIZES[size];
  return (
    <div className={cn("flex items-center", className)}>
      <div className={cn("relative flex items-center justify-center overflow-hidden", s.box, iconClassName)}>
        <Image
          src="/logo.png"
          alt="LEX AI"
          width={96}
          height={96}
          className={cn("object-contain", s.img)}
        />
      </div>
    </div>
  );
}
