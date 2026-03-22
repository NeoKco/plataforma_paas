import type { PlatformSession, TenantSession } from "../types";

export const SESSION_IDLE_TIMEOUT_MS = 15 * 60 * 1000;
export const SESSION_ACTIVITY_THROTTLE_MS = 30 * 1000;
export const SESSION_REFRESH_WINDOW_MS = 2 * 60 * 1000;
export const SESSION_EXPIRY_WARNING_MS = 2 * 60 * 1000;

type SessionSecurityFields = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt?: number;
  refreshTokenExpiresAt?: number;
  lastActivityAt?: number;
};

type SecurityAwareSession = PlatformSession | TenantSession;

export function readStoredSession<T extends SessionSecurityFields>(
  storageKey: string
): {
  hadStoredSession: boolean;
  session: (T & Required<Pick<SessionSecurityFields, "accessTokenExpiresAt" | "refreshTokenExpiresAt" | "lastActivityAt">>) | null;
} {
  const sessionStorageRaw = window.sessionStorage.getItem(storageKey);
  const localStorageRaw = window.localStorage.getItem(storageKey);
  const raw = sessionStorageRaw || localStorageRaw;

  if (!raw) {
    return {
      hadStoredSession: false,
      session: null,
    };
  }

  if (localStorageRaw && !sessionStorageRaw) {
    window.sessionStorage.setItem(storageKey, localStorageRaw);
    window.localStorage.removeItem(storageKey);
  }

  try {
    const parsed = JSON.parse(raw) as T;
    const normalized = normalizeStoredSession(parsed);
    if (!normalized) {
      clearStoredSession(storageKey);
    }
    return {
      hadStoredSession: true,
      session: normalized,
    };
  } catch {
    clearStoredSession(storageKey);
    return {
      hadStoredSession: true,
      session: null,
    };
  }
}

export function persistSession(storageKey: string, session: SecurityAwareSession | null) {
  if (session) {
    window.sessionStorage.setItem(storageKey, JSON.stringify(session));
    window.localStorage.removeItem(storageKey);
    return;
  }

  clearStoredSession(storageKey);
}

export function clearStoredSession(storageKey: string) {
  window.sessionStorage.removeItem(storageKey);
  window.localStorage.removeItem(storageKey);
}

export function buildPlatformSession(payload: {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  email: string;
  role: string;
  fullName?: string | null;
}): PlatformSession {
  return withSessionSecurity(payload);
}

export function buildTenantSession(payload: {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  tenantSlug: string;
  userId: number;
  email: string;
  role: string;
  fullName?: string | null;
}): TenantSession {
  return withSessionSecurity(payload);
}

export function hasSessionExpired(session: SessionSecurityFields): boolean {
  return Date.now() >= resolveRefreshExpiry(session);
}

export function isSessionIdle(session: SessionSecurityFields): boolean {
  return Date.now() - resolveLastActivityAt(session) >= SESSION_IDLE_TIMEOUT_MS;
}

export function shouldRefreshSession(session: SessionSecurityFields): boolean {
  return resolveAccessExpiry(session) - Date.now() <= SESSION_REFRESH_WINDOW_MS;
}

export function getSessionIdleRemainingMs(session: SessionSecurityFields): number {
  return Math.max(0, SESSION_IDLE_TIMEOUT_MS - (Date.now() - resolveLastActivityAt(session)));
}

export function updateSessionActivity<T extends SessionSecurityFields>(session: T): T {
  return {
    ...session,
    lastActivityAt: Date.now(),
  };
}

function normalizeStoredSession<T extends SessionSecurityFields>(session: T) {
  const normalized = withSessionSecurity(session);

  if (hasSessionExpired(normalized) || isSessionIdle(normalized)) {
    return null;
  }

  return normalized;
}

function withSessionSecurity<T extends SessionSecurityFields>(session: T): T & {
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
  lastActivityAt: number;
} {
  const accessTokenExpiresAt =
    session.accessTokenExpiresAt || decodeJwtExpiration(session.accessToken) || Date.now();
  const refreshTokenExpiresAt =
    session.refreshTokenExpiresAt || decodeJwtExpiration(session.refreshToken) || Date.now();
  const lastActivityAt = session.lastActivityAt || Date.now();

  return {
    ...session,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
    lastActivityAt,
  };
}

function resolveAccessExpiry(session: SessionSecurityFields): number {
  return session.accessTokenExpiresAt || decodeJwtExpiration(session.accessToken) || Date.now();
}

function resolveRefreshExpiry(session: SessionSecurityFields): number {
  return session.refreshTokenExpiresAt || decodeJwtExpiration(session.refreshToken) || Date.now();
}

function resolveLastActivityAt(session: SessionSecurityFields): number {
  return session.lastActivityAt || Date.now();
}

function decodeJwtExpiration(token: string): number | null {
  try {
    const [, payloadPart] = token.split(".");
    if (!payloadPart) {
      return null;
    }

    const padded = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const payloadJson = window.atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
    const payload = JSON.parse(payloadJson) as { exp?: number };

    if (!payload.exp) {
      return null;
    }

    return payload.exp * 1000;
  } catch {
    return null;
  }
}
