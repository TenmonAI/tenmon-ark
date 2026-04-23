import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./styles/gpt-base.css";
import App from "./App";
import { installTenmonIDBExportHook } from "./_core/idb_export";
import { installTenmonP1Hooks } from "./_core/p1_hooks";

installTenmonIDBExportHook();
installTenmonP1Hooks();

/** /mc/ は owner-only の正式入口。互換 path も /mc/vnext/* へ正規化する。 */
if (typeof window !== "undefined") {
  const p = window.location.pathname;
  if (p === "/mc") {
    window.location.replace("/mc/");
  } else if (p === "/pwa/mc/vnext" || p === "/pwa/mc/vnext/") {
    window.location.replace("/mc/vnext/");
  } else if (p.startsWith("/pwa/mc/vnext/")) {
    window.location.replace(`/mc/vnext/${p.slice("/pwa/mc/vnext/".length)}`);
  } else if (p === "/mc/quality" || p.startsWith("/mc/quality/")) {
    window.location.replace(`/mc/vnext/quality${p.slice("/mc/quality".length)}`);
  } else if (p === "/mc/alerts" || p.startsWith("/mc/alerts/")) {
    window.location.replace(`/mc/vnext/alerts${p.slice("/mc/alerts".length)}`);
  } else if (p === "/mc/acceptance" || p.startsWith("/mc/acceptance/")) {
    window.location.replace(`/mc/vnext/acceptance${p.slice("/mc/acceptance".length)}`);
  } else if (p === "/mc/sources" || p.startsWith("/mc/sources/")) {
    window.location.replace(`/mc/vnext/sources${p.slice("/mc/sources".length)}`);
  } else if (p === "/mc/repair" || p.startsWith("/mc/repair/")) {
    window.location.replace(`/mc/vnext/repair${p.slice("/mc/repair".length)}`);
  } else if (p === "/mc/history" || p.startsWith("/mc/history/")) {
    window.location.replace(`/mc/vnext/history${p.slice("/mc/history".length)}`);
  } else if (
    p.startsWith("/mc/") &&
    p !== "/mc/" &&
    !p.startsWith("/mc/vnext") &&
    !p.startsWith("/mc/classic")
  ) {
    window.location.replace(`/mc/vnext/${p.slice(4)}`.replace(/\/{2,}/g, "/"));
  } else {
    ReactDOM.createRoot(document.getElementById("root")!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
}
