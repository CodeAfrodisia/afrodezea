// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./styles/globals.css";
import "./styles/variables.css";
import { ThemeProvider } from "@lib/useTheme.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { WishlistProvider } from "./context/WishlistContext.jsx";
import { CartProvider } from "./context/CartContext.jsx";
import { SoulProvider } from "@context/SoulContext.jsx";
import { ToastProvider } from "@components/ui/Toast.jsx";
import { HelmetProvider } from "react-helmet-async";
import * as Sentry from "@sentry/react";

/* --------------------------- Sentry init (guarded) ---------------------------
   - Avoids duplicate init during HMR
   - Only enables Session Replay in production
--------------------------------------------------------------------------- */
const hasDsn = !!import.meta.env.VITE_SENTRY_DSN;
// v8: getClient(); v7: getCurrentHub().getClient()
const alreadyInited =
  typeof Sentry.getClient === "function"
    ? !!Sentry.getClient()
    : !!(Sentry.getCurrentHub && Sentry.getCurrentHub().getClient());

const enableReplay = import.meta.env.PROD && hasDsn;

if (!alreadyInited && hasDsn) {
  const integrations = [Sentry.browserTracingIntegration()];
  if (enableReplay && typeof Sentry.replayIntegration === "function") {
    integrations.push(Sentry.replayIntegration());
  }
  try {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations,
      tracesSampleRate: import.meta.env.PROD ? 0.15 : 0.0,
      replaysSessionSampleRate: enableReplay ? 0.05 : 0.0,
      replaysOnErrorSampleRate: enableReplay ? 1.0 : 0.0,
      environment: import.meta.env.MODE,
      release: import.meta.env.VITE_COMMIT_SHA || undefined,
    });
  } catch (e) {
    // Never let Sentry init break the app during HMR edits
    console.warn("[sentry] init skipped:", e?.message || e);
  }
}

// On HMR dispose, stop Replay (if present) so the next init doesn't double-mount
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    try {
      // Some SDK builds expose the Replay instance globally
      // @ts-ignore
      window.__SENTRY_REPLAY__?.stop?.();
    } catch {}
  });
}

/* ------------------------------- App shell -------------------------------- */
const Root = () => (
  <Sentry.ErrorBoundary fallback={<div>Something went wrong. Our team has been notified.</div>}>
    <HelmetProvider>
      <BrowserRouter>
        <ToastProvider>
          <ThemeProvider>
            <AuthProvider>
              <CartProvider>
                <WishlistProvider>
                  <SoulProvider>
                    <App />
                  </SoulProvider>
                </WishlistProvider>
              </CartProvider>
            </AuthProvider>
          </ThemeProvider>
        </ToastProvider>
      </BrowserRouter>
    </HelmetProvider>
  </Sentry.ErrorBoundary>
);

/* --------------------------- HMR-safe root mount ---------------------------
   Prevents "createRoot called twice" warnings by reusing a singleton root.
--------------------------------------------------------------------------- */
const el = document.getElementById("root");
const root = (window.__appRoot ||= ReactDOM.createRoot(el));

root.render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);

// Clean up on hot dispose so replay/sockets and the root don’t stack up
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    try { root.unmount(); } catch {}
    try { delete window.__appRoot; } catch {}
  });
}
