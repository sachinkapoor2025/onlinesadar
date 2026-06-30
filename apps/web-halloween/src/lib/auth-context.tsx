"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  type AuthUser,
  loadStoredAuth,
  login as cognitoLogin,
  logout as cognitoLogout,
  register as cognitoRegister,
  confirmSignUp as cognitoConfirmSignUp,
  resendConfirmationCode as cognitoResendCode,
} from "./cognito";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (email: string, password: string, name?: string) => Promise<{ userConfirmed: boolean }>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  resendConfirmationCode: (email: string) => Promise<void>;
  logout: () => void;
  token: string | undefined;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(loadStoredAuth());
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const authUser = await cognitoLogin(email, password);
    setUser(authUser);
    return authUser;
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    return cognitoRegister(email, password, name);
  }, []);

  const confirmSignUp = useCallback(async (email: string, code: string) => {
    await cognitoConfirmSignUp(email, code);
  }, []);

  const resendConfirmationCode = useCallback(async (email: string) => {
    await cognitoResendCode(email);
  }, []);

  const logout = useCallback(() => {
    cognitoLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        confirmSignUp,
        resendConfirmationCode,
        logout,
        token: user?.token,
        isAdmin: user?.isAdmin ?? false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** Client-side API helper with auth + session */
export function useApiClient() {
  const { token } = useAuth();
  const sessionId =
    typeof window !== "undefined" ? localStorage.getItem("hr_ecom_session") ?? undefined : undefined;

  return useCallback(
    async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
      const { api } = await import("./api");
      return api<T>(path, { ...options, token, sessionId });
    },
    [token, sessionId]
  );
}
