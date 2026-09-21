import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./auth/AuthContext";
import { App } from "./App";
import { IS_DEMO } from "./api/client";
import { seedSessionFromQuery } from "./api/demo";
import { DemoBanner } from "./components/DemoBanner";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

// The static demo is hosted under a GitHub Pages sub-path, so it uses a
// HashRouter (deep links and refresh work with no server rewrite rules).
// The real app is served from the root and uses clean BrowserRouter URLs.
const Router = IS_DEMO ? HashRouter : BrowserRouter;

// Demo-only: honour a `?demo_as=admin|doctor|reception|patient|super` deep link.
if (IS_DEMO) seedSessionFromQuery();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
          {IS_DEMO && <DemoBanner />}
        </AuthProvider>
      </QueryClientProvider>
    </Router>
  </React.StrictMode>,
);
