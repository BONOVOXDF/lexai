"use client";

import * as React from "react";
import { AuthProvider } from "@/lib/auth-context";

/**
 * Layout do grupo de autenticação: login, cadastro e recuperação de senha.
 * Disponibiliza o contexto de autenticação para as telas de acesso.
 */
export default function AuthGroupLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
