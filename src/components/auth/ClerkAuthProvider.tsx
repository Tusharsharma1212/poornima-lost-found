import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ClerkProvider } from "@clerk/react";
import type { ReactNode } from "react";

// Brand Clerk here once: it styles sign-in, sign-up and the user menu.
const appearance = {
  variables: {
    colorPrimary: "#0B2545",
    colorBackground: "#ffffff",
    colorInput: "#f1f5f9",
    borderRadius: "0.625rem",
    fontFamily: "'DM Sans Variable', sans-serif",
  },
};

// Empty base keeps the call same-origin: the Vite proxy serves /api in dev,
// and a single origin serves it in production.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "";

// Starts Clerk from the backend's runtime config, so deploy's live keys need no rebuild.
// Must render inside <BrowserRouter> so Clerk navigates without reloading.
export default function ClerkAuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [config, setConfig] = useState<{ enabled: boolean; publishable_key: string; proxy_url: string } | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  // Retries while the backend restarts (e.g. right after provisioning): the app's
  // Clerk components crash if they ever render without <ClerkProvider>.
  useEffect(() => {
    let cancelled = false;
    const load = async (attempt = 0) => {
      try {
        const cfg = await (await fetch(`${BACKEND_URL}/api/clerk/config`)).json();
        if (cfg.enabled) return cancelled || setConfig(cfg);
      } catch {
        // backend not up yet — retry below
      }
      if (cancelled) return;
      if (attempt >= 20) return setUnavailable(true);
      setTimeout(() => load(attempt + 1), 1500);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (unavailable)
    return (
      <p className="p-6 text-center text-sm text-slate-500">
        Sign-in is unavailable right now. Refresh the page to try again.
      </p>
    );
  if (!config)
    return (
      <div className="flex min-h-svh items-center justify-center bg-[#F8FAFC]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#0B2545] border-t-transparent" />
      </div>
    );
  return (
    <ClerkProvider
      publishableKey={config.publishable_key}
      proxyUrl={config.proxy_url || undefined}
      appearance={appearance}
      routerPush={(to) => navigate(to)}
      routerReplace={(to) => navigate(to, { replace: true })}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
      afterSignOutUrl="/"
    >
      {children}
    </ClerkProvider>
  );
}
