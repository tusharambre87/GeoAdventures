import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App";
import "./index.css";

if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
  caches.keys().then((keys) => {
    for (const key of keys) {
      caches.delete(key);
    }
  });
}

window.addEventListener('vite:preloadError', () => {
  const lastReload = sessionStorage.getItem('chunk_reload');
  const now = Date.now();
  if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
    sessionStorage.setItem('chunk_reload', String(now));
    window.location.reload();
  }
});

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  environment: import.meta.env.MODE,
  beforeSend(event) {
    const msg = event.exception?.values?.[0]?.value || '';
    const browserExtensionPatterns = [
      'ZhcoverRight', 'CityMusic', 'itern', 'parseCharacter',
      'chrome-extension://', 'moz-extension://',
      'safari-extension://',
    ];
    if (browserExtensionPatterns.some(p => msg.includes(p))) {
      return null;
    }
    if (msg.includes('Importing a module script failed') ||
        msg.includes('Failed to fetch dynamically imported module')) {
      return null;
    }
    return event;
  },
});

createRoot(document.getElementById("root")!).render(<App />);
