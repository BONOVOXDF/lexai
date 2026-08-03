import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  iconClassName?: string;
  light?: boolean;
}

/** Logotipo da LEX AI (imagem da marca). */
export function Logo({ className, iconClassName }: LogoProps) {
  return (
    <div className={cn("flex items-center", className)}>
      <div className={cn("relative flex items-center justify-center overflow-hidden", iconClassName)}>
        <Image
          src="/logo.png"
          alt="LEX AI"
          width={56}
          height={56}
          className="h-14 w-14 object-contain"
        />
      </div>
    </div>
  );
}
