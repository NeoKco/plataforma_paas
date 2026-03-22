import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import {
  buildTenantSession,
  clearStoredSession,
  hasSessionExpired,
  isSessionIdle,
  persistSession,
  readStoredSession,
  SESSION_ACTIVITY_THROTTLE_MS,
  shouldRefreshSession,
  updateSessionActivity,
} from "./session-security";

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

export function TenantAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<TenantSession | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [hadStoredSession, setHadStoredSession] = useState(false);
  const refreshInFlightRef = useRef(false);

  useEffect(() => {
    const stored = readStoredSession<TenantSession>(SESSION_STORAGE_KEY);
    setSession(stored.session);
    setHadStoredSession(stored.hadStoredSession);
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }
    persistSession(SESSION_STORAGE_KEY, session);
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

  async function login(tenantSlug: string, email: string, password: string) {
    const response = await loginTenant(tenantSlug, email, password);
    setHadStoredSession(true);
    setSession(
      buildTenantSession({
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        tokenType: response.token_type,
        tenantSlug: response.tenant_slug,
        userId: response.user_id,
        email: response.email,
        role: response.role,
        fullName: response.full_name,
      })
    );
  }

  async function logout() {
    const activeSession = session;
    if (activeSession?.accessToken) {
      try {
        await logoutTenant(activeSession.accessToken);
      } catch {
        // The local tenant session must still be cleared.
      }
    }
    clearStoredSession(SESSION_STORAGE_KEY);
    setSession(null);
  }

  async function refresh() {
    const activeSession = session;
    if (!activeSession?.refreshToken) {
      clearStoredSession(SESSION_STORAGE_KEY);
      setSession(null);
      return;
    }
    const response = await refreshTenantSession(activeSession.refreshToken);
    setSession(
      buildTenantSession({
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        tokenType: response.token_type,
        tenantSlug: response.tenant_slug,
        userId: response.user_id,
        email: response.email,
        role: response.role,
        fullName: response.full_name,
      })
    );
  }

  useEffect(() => {
    if (!session) {
      return;
    }

    function handleActivity() {
      setSession((current) => {
        if (!current) {
          return current;
        }

        const now = Date.now();
        if (now - current.lastActivityAt < SESSION_ACTIVITY_THROTTLE_MS) {
          return current;
        }

        return updateSessionActivity(current);
      });
    }

    const events: Array<keyof WindowEventMap> = [
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "mousemove",
    ];

    events.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
    };
  }, [session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (hasSessionExpired(session) || isSessionIdle(session)) {
        void logout();
      }
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, [logout, session]);

  useEffect(() => {
    if (!session || refreshInFlightRef.current) {
      return;
    }

    if (!shouldRefreshSession(session) || isSessionIdle(session)) {
      return;
    }

    refreshInFlightRef.current = true;
    void refresh()
      .catch(() => {
        clearStoredSession(SESSION_STORAGE_KEY);
        setSession(null);
      })
      .finally(() => {
        refreshInFlightRef.current = false;
      });
  }, [refresh, session]);

  const value = useMemo<TenantAuthContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session?.accessToken),
      isHydrated,
      hadStoredSession,
      login,
      logout,
      refresh,
    }),
    [hadStoredSession, isHydrated, login, logout, refresh, session]
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
