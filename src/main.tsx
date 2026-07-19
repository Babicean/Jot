import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { restoreFromMirror } from "./lib/mirror";
import { loadSettings } from "./lib/settings";
import { applyAccent, applyTheme, watchSystemTheme } from "./lib/theme";
import "@fontsource-variable/inter";
import "./styles.css";

// If WebView storage was wiped (it happens), recover from the native
// mirror before the app reads localStorage.
restoreFromMirror().finally(() => {
  const settings = loadSettings();
  applyTheme(settings.theme);
  applyAccent(settings.accent);
  watchSystemTheme();
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});

// Offline support + installability. Dev builds skip it so HMR stays fresh.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline caching is a progressive enhancement — ignore failures.
    });
  });
}
