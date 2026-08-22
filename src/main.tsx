import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

/* CORTEXA bootstraps instantly; the registry persists in local storage so the
   first paint is immediate and data survives refresh, logout and restarts. */
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

/* Register the CORTEXA service worker (production builds only, so the dev
   server is never hijacked by a stale cache). Registration is resolved
   relative to the app base path so sub-path deployments scope correctly, and
   any failure is silent — offline support is progressive enhancement. On a
   new deployment the fresh worker activates and reloads controlled clients
   once, so users are never trapped on an obsolete cached version.          */
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
