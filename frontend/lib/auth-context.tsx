"use client";

/**
 * Contexto de autenticação do frontend.
 *
 * Mantém o usuário logado em estado global, com funções de login,
 * registro, logout e atualização de perfil.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  api,
  ApiError,
  clearSession,
  getAccessToken,
  getUser,
  setSession,
} from "@/lib/api";
import type { TokenResponse, User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, senha: string) => Promise<void>;
  register: (dados: {
    nome: string;
    email: string;
    telefone?: string;
    oab?: string;
    senha: string;
    confirmar_senha: string;
  }) => Promise<void>;
  loginGoogle: (token: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  refresh: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

function useAuthInternal(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth deve ser usado dentro de <AuthProvider>.");
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUserState] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Restaura a sessão do localStorage.
    if (getAccessToken()) {
      const cached = getUser();
      if (cached) {
        setUserState({
          id: 0,
          nome: cached.nome,
          email: cached.email,
          plano: "free",
          is_active: true,
          created_at: new Date().toISOString(),
        } as User);
      }
      api
        .get<User>("/api/auth/me")
        .then((me) => setUserState(me))
        .catch(() => {
          /* sessão expirada será tratada pelo cliente */
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = React.useCallback(async (email: string, senha: string) => {
    const data = await api.post<TokenResponse>("/api/auth/login", { email, senha });
    setSession(data.access_token, data.refresh_token, data.user);
    setUserState(data.user);
  }, []);

  const register = React.useCallback(
    async (dados: {
      nome: string;
      email: string;
      telefone?: string;
      oab?: string;
      senha: string;
      confirmar_senha: string;
    }) => {
      const data = await api.post<TokenResponse>("/api/auth/register", dados);
      setSession(data.access_token, data.refresh_token, data.user);
      setUserState(data.user);
    },
    []
  );

  const loginGoogle = React.useCallback(async (token: string) => {
    const data = await api.post<TokenResponse>("/api/auth/google", { token });
    setSession(data.access_token, data.refresh_token, data.user);
    setUserState(data.user);
  }, []);

  const logout = React.useCallback(() => {
    clearSession();
    setUserState(null);
    router.push("/");
  }, [router]);

  const setUser = React.useCallback((novo: User) => {
    setUserState(novo);
    setSession(getAccessToken() ?? "", getRefreshTokenUnsafe(), novo);
  }, []);

  const refresh = React.useCallback(async () => {
    try {
      const me = await api.get<User>("/api/auth/me");
      setUserState(me);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        setUserState(null);
      }
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: Boolean(getAccessToken()),
        login,
        register,
        loginGoogle,
        logout,
        setUser,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function getRefreshTokenUnsafe(): string {
  return typeof window !== "undefined" ? localStorage.getItem("lexai_refresh_token") ?? "" : "";
}

export const useAuth = useAuthInternal;
