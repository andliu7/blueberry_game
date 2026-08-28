/**
 * Entry point. createRoot is React 19's mount API; StrictMode double-invokes
 * render logic in dev to surface impure renders early and does nothing in
 * production builds.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./theme.css";
import "./tabs/trainer/backdrop.css";

const container = document.getElementById("root");
if (container === null) {
  throw new Error("index.html has no #root element to mount into");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// The offline shell, production only: in dev Vite serves unhashed modules
// that a cache would pin to a stale version between edits.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      /* no service worker is a slower app, not a broken one */
    });
  });
}
