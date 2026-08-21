/**
 * Entry point. createRoot is React 19's mount API; StrictMode double-invokes
 * render logic in dev to surface impure renders early and does nothing in
 * production builds.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./theme.css";

const container = document.getElementById("root");
if (container === null) {
  throw new Error("index.html has no #root element to mount into");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
