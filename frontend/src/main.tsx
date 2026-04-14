import React from "react";
import ReactDOM from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/tokens.css";
import "./styles/bootstrap-overrides.css";
import "./styles/platform-admin.css";
import { App } from "./App";

const CHUNK_RELOAD_SESSION_KEY = "platform_paas.chunk_reload_once";

function isDynamicImportChunkError(value: unknown): boolean {
  const message =
    value instanceof Error
      ? value.message
      : typeof value === "string"
        ? value
        : typeof value === "object" && value !== null && "message" in value
          ? String((value as { message?: unknown }).message ?? "")
          : "";

  const normalized = message.toLowerCase();
  return (
    normalized.includes("error loading dynamically imported module") ||
    normalized.includes("failed to fetch dynamically imported module") ||
    normalized.includes("importing a module script failed") ||
    normalized.includes("chunkloaderror")
  );
}

function reloadOnceAfterChunkError() {
  const currentUrl = window.location.href;
  if (sessionStorage.getItem(CHUNK_RELOAD_SESSION_KEY) === currentUrl) {
    return;
  }
  sessionStorage.setItem(CHUNK_RELOAD_SESSION_KEY, currentUrl);
  const nextUrl = new URL(currentUrl);
  nextUrl.searchParams.set("__spa_reload", String(Date.now()));
  window.location.replace(nextUrl.toString());
}

window.addEventListener("error", (event) => {
  if (isDynamicImportChunkError(event.error ?? event.message)) {
    reloadOnceAfterChunkError();
  }
});

window.addEventListener("unhandledrejection", (event) => {
  if (isDynamicImportChunkError(event.reason)) {
    reloadOnceAfterChunkError();
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
