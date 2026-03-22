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
import { loginPlatform, logoutPlatform, refreshPlatformSession } from "../services/platform-api";
import type { PlatformSession } from "../types";
import {
  buildPlatformSession,
  clearStoredSession,
  hasSessionExpired,
  isSessionIdle,
  persistSession,
  readStoredSession,
  SESSION_ACTIVITY_THROTTLE_MS,
  SESSION_IDLE_TIMEOUT_MS,
  shouldRefreshSession,
  updateSessionActivity,
} from "./session-security";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<PlatformSession | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [hadStoredSession, setHadStoredSession] = useState(false);
  const refreshInFlightRef = useRef(false);

  useEffect(() => {
    const stored = readStoredSession<PlatformSession>(SESSION_STORAGE_KEY);
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
    function handlePlatformAuthError() {
      setHadStoredSession(true);
      setSession(null);
    }

    window.addEventListener(authErrorEvents.platform, handlePlatformAuthError);
    return () => {
      window.removeEventListener(authErrorEvents.platform, handlePlatformAuthError);
    };
  }, []);

  async function login(email: string, password: string) {
    const response = await loginPlatform(email, password);
    setHadStoredSession(true);
    setSession(
      buildPlatformSession({
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        tokenType: response.token_type,
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
        await logoutPlatform(activeSession.accessToken);
      } catch {
        // The local session must still be cleared.
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
    const response = await refreshPlatformSession(activeSession.refreshToken);
    setSession(
      buildPlatformSession({
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        tokenType: response.token_type,
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

  const value = useMemo<AuthContextValue>(
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
