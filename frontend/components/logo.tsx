import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const SIZES = {
  sm: "h-9",
  md: "h-12",
  lg: "h-14",
  xl: "h-16",
} as const;

/** Logotipo da LEX AI (imagem da marca). */
export function Logo({ className, size = "lg" }: LogoProps) {
  const h = SIZES[size];
  return (
    <Image
      src="/logo.png"
      alt="LEX AI"
      width={748}
      height={240}
      priority
      className={cn("w-auto object-contain", h, className)}
    />
  );
}
