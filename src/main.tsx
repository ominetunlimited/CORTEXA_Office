import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

/* ── boot diagnostics ────────────────────────────────────────────────────
   If anything throws before or during the first React mount, render an
   on-screen diagnostic card instead of leaving a blank white page. After a
   successful mount these handlers only log, so normal runtime errors never
   blow away a working session.                                             */
let mounted = false;

function bootErrorCard(title: string, detail: unknown) {
  const root = document.getElementById("root");
  if (!root) return;
  const msg =
    detail instanceof Error
      ? `${detail.name}: ${detail.message}${detail.stack ? "\n\n" + detail.stack.slice(0, 1200) : ""}`
      : String(detail ?? "Unknown error");

  root.innerHTML = "";
  const outer = document.createElement("div");
  outer.style.cssText =
    "min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f1f2ec;padding:24px;font-family:'IBM Plex Sans',system-ui,sans-serif;";
  const card = document.createElement("div");
  card.style.cssText =
    "max-width:560px;width:100%;background:#fbfbf7;border:1px solid #dee1d4;border-radius:10px;padding:28px;box-shadow:0 10px 30px rgba(27,38,34,.12);";

  const badge = document.createElement("p");
  badge.textContent = "CORTEXA · STARTUP DIAGNOSTIC";
  badge.style.cssText =
    "margin:0 0 10px;font-size:10px;font-weight:700;letter-spacing:.18em;color:#9c6b1e;";

  const h = document.createElement("h1");
  h.textContent = title;
  h.style.cssText =
    "margin:0 0 8px;font-family:Archivo,'IBM Plex Sans',sans-serif;font-size:22px;color:#1b2622;";

  const p = document.createElement("p");
  p.textContent =
    "The workspace hit a problem while starting in this environment. Your institutional data is safe — try a clean restart below, and if it persists, copy the technical detail to your developer.";
  p.style.cssText = "margin:0 0 16px;font-size:13px;line-height:1.6;color:#52605a;";

  const pre = document.createElement("pre");
  pre.textContent = msg.slice(0, 1500);
  pre.style.cssText =
    "background:#0b2b26;color:#d3e3da;border-radius:8px;padding:14px;font-size:11px;font-family:'IBM Plex Mono',monospace;overflow:auto;max-height:220px;white-space:pre-wrap;word-break:break-word;";

  const row = document.createElement("div");
  row.style.cssText = "display:flex;gap:10px;margin-top:18px;flex-wrap:wrap;";

  const mkBtn = (label: string, bg: string, fg: string, fn: () => void) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText = `border:0;border-radius:7px;padding:10px 18px;font-size:13px;font-weight:600;cursor:pointer;background:${bg};color:${fg};`;
    b.onclick = fn;
    row.appendChild(b);
  };

  mkBtn("Reload workspace", "#125045", "#edf4f0", () => window.location.reload());
  mkBtn("Clean restart (clears cached data)", "#fbfbf7", "#a8402c", () => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("cortexa"))
        .forEach((k) => localStorage.removeItem(k));
    } catch { /* storage unavailable */ }
    const done = () => window.location.reload();
    try {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .getRegistrations()
          .then((rs) => Promise.all(rs.map((r) => r.unregister())))
          .then(done)
          .catch(done);
      } else done();
    } catch {
      done();
    }
  });

  card.append(badge, h, p, pre, row);
  outer.appendChild(card);
  root.appendChild(outer);
}

window.addEventListener("error", (e) => {
  if (!mounted) bootErrorCard("Cortexa could not start", e.error ?? e.message);
});
window.addEventListener("unhandledrejection", (e) => {
  if (!mounted) bootErrorCard("Cortexa could not start", e.reason);
});

/* CORTEXA bootstraps instantly; the registry persists in local storage so the
   first paint is immediate and data survives refresh, logout and restarts. */
try {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  mounted = true;
} catch (err) {
  bootErrorCard("Cortexa could not start", err);
}

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
