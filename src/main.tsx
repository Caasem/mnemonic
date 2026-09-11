import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/index.css";

const container = document.getElementById("root")!;
createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA/offline support.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((err) => {
      console.warn("[sw] registration failed", err);
    });
  });
}
