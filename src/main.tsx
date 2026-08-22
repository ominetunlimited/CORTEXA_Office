import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

/* CORTEXA bootstraps instantly; the registry persists in local storage so the
   first paint is immediate and data survives refresh, logout and restarts.   */

declare global {
  interface Window {
    __cortexaBoot?: { started: number; mounted: boolean };
  }
}

const rootEl = document.getElementById("root");

function dismissSplash() {
  if (window.__cortexaBoot) window.__cortexaBoot.mounted = true;
  const splash = document.getElementById("boot-splash");
  if (splash) splash.style.display = "none";
}

try {
  if (!rootEl) throw new Error("Missing #root mount node.");
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  /* React rendered without throwing — clear the boot splash. */
  dismissSplash();
} catch (err) {
  /* A synchronous render failure must never leave a blank page. */
  dismissSplash();
  const diag = document.getElementById("boot-error");
  const detail = document.getElementById("boot-error-detail");
  if (diag && detail) {
    detail.textContent = err instanceof Error ? err.message : String(err);
    diag.style.display = "flex";
  }
}

/* Register the CORTEXA service worker (production builds only, so the dev
   server is never hijacked by a stale cache). Registration resolves relative
   to the app base path so sub-path deployments scope correctly, and any
   failure is silent — offline support is progressive enhancement.           */
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    const base = import.meta.env.BASE_URL || "/";
    navigator.serviceWorker
      .register(`${base}sw.js`, { scope: base })
      .then((reg) => {
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener("statechange", () => {
            if (nw.state === "activated" && navigator.serviceWorker.controller) {
              window.location.reload();
            }
          });
        });
      })
      .catch(() => {
        /* offline capability is progressive enhancement — never fatal */
      });
  });
}
