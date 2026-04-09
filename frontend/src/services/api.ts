import type { ApiError, ApiErrorPayload } from "../types";

const PLATFORM_AUTH_ERROR_EVENT = "platform_paas:platform-auth-error";
const TENANT_AUTH_ERROR_EVENT = "platform_paas:tenant-auth-error";

export function getDefaultApiBaseUrl() {
  if (typeof window === "undefined") {
    return "http://127.0.0.1:8100";
  }

  const protocol = window.location.protocol === "https:" ? "https:" : "http:";
  const hostname = window.location.hostname || "127.0.0.1";

  return `${protocol}//${hostname}:8100`;
}

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ||
  getDefaultApiBaseUrl();

type RequestOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

type DownloadOptions = {
  method?: string;
  body?: unknown;
  token?: string | null;
};

export function getApiErrorDisplayMessage(error: ApiError): string {
  const detail = error.payload?.detail?.trim();
  const requestId = error.payload?.request_id?.trim();

  if (detail && requestId) {
    return `${detail} (request_id: ${requestId})`;
  }

  if (detail) {
    return detail;
  }

  if (error.status) {
    return `La solicitud fallo con estado ${error.status}.`;
  }

  return error.message;
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(options.token
          ? { Authorization: `Bearer ${options.token}` }
          : {}),
      },
      body:
        options.body === undefined
          ? undefined
          : isFormData
            ? (options.body as FormData)
            : JSON.stringify(options.body),
    });
  } catch {
    const error = new Error(
      `No se pudo conectar con la API en ${API_BASE_URL}. Revisa VITE_API_BASE_URL, CORS y que el backend esté levantado.`
    ) as ApiError;
    error.payload = {
      detail:
        `No se pudo conectar con la API en ${API_BASE_URL}. ` +
        "Revisa VITE_API_BASE_URL, CORS y que el backend esté levantado.",
      error_type: "network_error",
    };
    throw error;
  }

  if (!response.ok) {
    let payload: ApiErrorPayload | undefined;
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      payload = undefined;
    }

    if (response.status === 401 && typeof window !== "undefined") {
      if (path.startsWith("/platform/") && !path.startsWith("/platform/auth/")) {
        window.dispatchEvent(new CustomEvent(PLATFORM_AUTH_ERROR_EVENT));
      }
      if (path.startsWith("/tenant/") && !path.startsWith("/tenant/auth/")) {
        window.dispatchEvent(new CustomEvent(TENANT_AUTH_ERROR_EVENT));
      }
    }

    const error = new Error(
      payload?.detail || `Request failed with status ${response.status}`
    ) as ApiError;
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function apiDownload(
  path: string,
  options: DownloadOptions = {}
): Promise<{
  blob: Blob;
  fileName: string | null;
  contentType: string;
}> {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(options.token
          ? { Authorization: `Bearer ${options.token}` }
          : {}),
      },
      body:
        options.body === undefined
          ? undefined
          : isFormData
            ? (options.body as FormData)
            : JSON.stringify(options.body),
    });
  } catch {
    const error = new Error(
      `No se pudo conectar con la API en ${API_BASE_URL}. Revisa VITE_API_BASE_URL, CORS y que el backend esté levantado.`
    ) as ApiError;
    error.payload = {
      detail:
        `No se pudo conectar con la API en ${API_BASE_URL}. ` +
        "Revisa VITE_API_BASE_URL, CORS y que el backend esté levantado.",
      error_type: "network_error",
    };
    throw error;
  }

  if (!response.ok) {
    let payload: ApiErrorPayload | undefined;
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      payload = undefined;
    }

    if (response.status === 401 && typeof window !== "undefined") {
      if (path.startsWith("/platform/") && !path.startsWith("/platform/auth/")) {
        window.dispatchEvent(new CustomEvent(PLATFORM_AUTH_ERROR_EVENT));
      }
      if (path.startsWith("/tenant/") && !path.startsWith("/tenant/auth/")) {
        window.dispatchEvent(new CustomEvent(TENANT_AUTH_ERROR_EVENT));
      }
    }

    const error = new Error(
      payload?.detail || `Request failed with status ${response.status}`
    ) as ApiError;
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  const contentDisposition = response.headers.get("content-disposition");
  const fileNameMatch = contentDisposition?.match(/filename=\"?([^\";]+)\"?/i);

  return {
    blob: await response.blob(),
    fileName: fileNameMatch?.[1] || null,
    contentType: response.headers.get("content-type") || "application/octet-stream",
  };
}

export const authErrorEvents = {
  platform: PLATFORM_AUTH_ERROR_EVENT,
  tenant: TENANT_AUTH_ERROR_EVENT,
};
