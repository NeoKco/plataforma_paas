import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { authErrorEvents } from "../services/api";
import {
  loginTenant,
  logoutTenant,
  refreshTenantSession,
} from "../services/tenant-api";
import type { TenantSession } from "../types";

const SESSION_STORAGE_KEY = "platform_paas.tenant_session";

type TenantAuthContextValue = {
  session: TenantSession | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  hadStoredSession: boolean;
  login: (tenantSlug: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const TenantAuthContext = createContext<TenantAuthContextValue | null>(null);

function readStoredSession() {
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return {
      hadStoredSession: false,
      session: null as TenantSession | null,
    };
  }
  try {
    return {
      hadStoredSession: true,
      session: JSON.parse(raw) as TenantSession,
    };
  } catch {
    return {
      hadStoredSession: true,
      session: null as TenantSession | null,
    };
  }
}

export function TenantAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<TenantSession | null>(null);
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
    function handleTenantAuthError() {
      setHadStoredSession(true);
      setSession(null);
    }

    window.addEventListener(authErrorEvents.tenant, handleTenantAuthError);
    return () => {
      window.removeEventListener(authErrorEvents.tenant, handleTenantAuthError);
    };
  }, []);

  const value = useMemo<TenantAuthContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session?.accessToken),
      isHydrated,
      hadStoredSession,
      async login(tenantSlug: string, email: string, password: string) {
        const response = await loginTenant(tenantSlug, email, password);
        setHadStoredSession(true);
        setSession({
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          tokenType: response.token_type,
          tenantSlug: response.tenant_slug,
          userId: response.user_id,
          email: response.email,
          role: response.role,
          fullName: response.full_name,
        });
      },
      async logout() {
        if (session?.accessToken) {
          try {
            await logoutTenant(session.accessToken);
          } catch {
            // The local tenant session must still be cleared.
          }
        }
        setSession(null);
      },
      async refresh() {
        if (!session?.refreshToken) {
          setSession(null);
          return;
        }
        const response = await refreshTenantSession(session.refreshToken);
        setSession({
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
          tokenType: response.token_type,
          tenantSlug: response.tenant_slug,
          userId: response.user_id,
          email: response.email,
          role: response.role,
          fullName: response.full_name,
        });
      },
    }),
    [hadStoredSession, isHydrated, session]
  );

  return (
    <TenantAuthContext.Provider value={value}>
      {children}
    </TenantAuthContext.Provider>
  );
}

export function useTenantAuth() {
  const context = useContext(TenantAuthContext);
  if (!context) {
    throw new Error("useTenantAuth must be used within TenantAuthProvider");
  }
  return context;
}
