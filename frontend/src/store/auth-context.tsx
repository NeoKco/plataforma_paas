import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { authErrorEvents } from "../services/api";
import { loginPlatform, logoutPlatform, refreshPlatformSession } from "../services/platform-api";
import type { PlatformSession } from "../types";

const SESSION_STORAGE_KEY = "platform_paas.platform_session";

type AuthContextValue = {
  session: PlatformSession | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  hadStoredSession: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession() {
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return {
      hadStoredSession: false,
      session: null as PlatformSession | null,
    };
  }
  try {
    return {
      hadStoredSession: true,
      session: JSON.parse(raw) as PlatformSession,
    };
  } catch {
    return {
      hadStoredSession: true,
      session: null as PlatformSession | null,
    };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<PlatformSession | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [hadStoredSession, setHadStoredSession] = useState(false);

  useEffect(() => {
    const stored = readStoredSession();
    setSession(stored.session);
    setHadStoredSession(stored.hadStoredSession);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    if (session) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      return;
    }
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  }, [isHydrated, session]);

  useEffect(() => {
    function handlePlatformAuthError() {
      setHadStoredSession(true);
      setSession(null);
    }

    window.addEventListener(authErrorEvents.platform, handlePlatformAuthError);
    return () => {
      window.removeEventListener(authErrorEvents.platform, handlePlatformAuthError);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session?.accessToken),
      isHydrated,
      hadStoredSession,
      async login(email: string, password: string) {
        const response = await loginPlatform(email, password);
        setHadStoredSession(true);
        setSession({
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          tokenType: response.token_type,
          email: response.email,
          role: response.role,
          fullName: response.full_name,
        });
      },
      async logout() {
        if (session?.accessToken) {
          try {
            await logoutPlatform(session.accessToken);
          } catch {
            // The local session must still be cleared.
          }
        }
        setSession(null);
      },
      async refresh() {
        if (!session?.refreshToken) {
          setSession(null);
          return;
        }
        const response = await refreshPlatformSession(session.refreshToken);
        setSession({
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          tokenType: response.token_type,
          email: response.email,
          role: response.role,
          fullName: response.full_name,
        });
      },
    }),
    [hadStoredSession, isHydrated, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
