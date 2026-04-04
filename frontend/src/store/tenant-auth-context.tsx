import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { authErrorEvents } from "../services/api";
import { getTenantInfo } from "../services/tenant-api";
import type { TenantInfoData, TenantUserData } from "../types";
import {
  loginTenant,
  logoutTenant,
  refreshTenantSession,
} from "../services/tenant-api";
import type { TenantSession } from "../types";
import { DEFAULT_TENANT_TIMEZONE, getBrowserTimeZone } from "../utils/timezone-options";
import {
  buildTenantSession,
  clearStoredSession,
  getSessionIdleRemainingMs,
  hasSessionExpired,
  isSessionIdle,
  persistSession,
  readStoredSession,
  SESSION_ACTIVITY_THROTTLE_MS,
  SESSION_EXPIRY_WARNING_MS,
  shouldRefreshSession,
  updateSessionActivity,
} from "./session-security";

const SESSION_STORAGE_KEY = "platform_paas.tenant_session";

type TenantAuthContextValue = {
  session: TenantSession | null;
  tenantInfo: TenantInfoData | null;
  tenantUser: TenantUserData | null;
  effectiveTimeZone: string;
  isAuthenticated: boolean;
  isHydrated: boolean;
  hadStoredSession: boolean;
  isExpiryWarningOpen: boolean;
  login: (tenantSlug: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  refreshTenantInfo: () => Promise<void>;
  continueSession: () => Promise<void>;
};

const TenantAuthContext = createContext<TenantAuthContextValue | null>(null);

export function TenantAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<TenantSession | null>(null);
  const [tenantInfo, setTenantInfo] = useState<TenantInfoData | null>(null);
  const [tenantUser, setTenantUser] = useState<TenantUserData | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [hadStoredSession, setHadStoredSession] = useState(false);
  const [isExpiryWarningOpen, setIsExpiryWarningOpen] = useState(false);
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

  const refreshTenantInfo = useCallback(async () => {
    if (!session?.accessToken) {
      setTenantInfo(null);
      setTenantUser(null);
      return;
    }

    try {
      const response = await getTenantInfo(session.accessToken);
      setTenantInfo(response.tenant);
      setTenantUser(response.user);
    } catch {
      setTenantInfo(null);
      setTenantUser(null);
    }
  }, [session?.accessToken]);

  useEffect(() => {
    if (!session?.accessToken) {
      setTenantInfo(null);
      setTenantUser(null);
      return;
    }
    void refreshTenantInfo();
  }, [refreshTenantInfo, session?.accessToken]);

  useEffect(() => {
    function handleTenantAuthError() {
      setHadStoredSession(true);
      setSession(null);
      setTenantInfo(null);
      setTenantUser(null);
    }

    window.addEventListener(authErrorEvents.tenant, handleTenantAuthError);
    return () => {
      window.removeEventListener(authErrorEvents.tenant, handleTenantAuthError);
    };
  }, []);

  const login = useCallback(async (tenantSlug: string, email: string, password: string) => {
    const response = await loginTenant(tenantSlug, email, password);
    setHadStoredSession(true);
    setIsExpiryWarningOpen(false);
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
  }, []);

  const logout = useCallback(async () => {
    const activeSession = session;
    if (activeSession?.accessToken) {
      try {
        await logoutTenant(activeSession.accessToken);
      } catch {
        // The local tenant session must still be cleared.
      }
    }
    clearStoredSession(SESSION_STORAGE_KEY);
    setIsExpiryWarningOpen(false);
    setSession(null);
    setTenantInfo(null);
    setTenantUser(null);
  }, [session]);

  const refresh = useCallback(async () => {
    const activeSession = session;
    if (!activeSession?.refreshToken) {
      clearStoredSession(SESSION_STORAGE_KEY);
      setIsExpiryWarningOpen(false);
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
  }, [session]);

  const continueSession = useCallback(async () => {
    setSession((current) => (current ? updateSessionActivity(current) : current));
    setIsExpiryWarningOpen(false);

    if (session && shouldRefreshSession(session)) {
      await refresh();
    }
  }, [refresh, session]);

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

        setIsExpiryWarningOpen(false);
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
      const idleRemainingMs = getSessionIdleRemainingMs(session);

      if (hasSessionExpired(session) || isSessionIdle(session)) {
        void logout();
        return;
      }

      setIsExpiryWarningOpen(idleRemainingMs > 0 && idleRemainingMs <= SESSION_EXPIRY_WARNING_MS);
    }, 15_000);

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
      tenantInfo,
      tenantUser,
      effectiveTimeZone:
        tenantInfo?.effective_timezone ||
        tenantUser?.effective_timezone ||
        tenantInfo?.timezone ||
        getBrowserTimeZone() ||
        DEFAULT_TENANT_TIMEZONE,
      isAuthenticated: Boolean(session?.accessToken),
      isHydrated,
      hadStoredSession,
      isExpiryWarningOpen,
      login,
      logout,
      refresh,
      refreshTenantInfo,
      continueSession,
    }),
    [
      continueSession,
      hadStoredSession,
      isExpiryWarningOpen,
      isHydrated,
      login,
      logout,
      refresh,
      refreshTenantInfo,
      session,
      tenantInfo,
      tenantUser,
    ]
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
