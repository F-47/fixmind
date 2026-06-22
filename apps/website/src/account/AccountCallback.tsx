import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePageMeta } from "../router";
import { supabase } from "../lib/supabase";
import { InfoPill } from "./InfoPill";

function readRedirectSession() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  return accessToken && refreshToken ? { accessToken, refreshToken } : null;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

export function AccountCallback() {
  usePageMeta("Signing you in - fixmind", "Finishing the Fixmind account handoff.");
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    const redirectSession = readRedirectSession();
    if (!client) {
      setError("Account sign-in is not configured on this deployment yet.");
      return;
    }
    if (!redirectSession) {
      navigate("/account", { replace: true });
      return;
    }

    const supabaseClient = client;
    let cancelled = false;

    void (async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const { data, error: sessionError } = await supabaseClient.auth.setSession({
          access_token: redirectSession.accessToken,
          refresh_token: redirectSession.refreshToken,
        });

        if (cancelled) return;
        if (!sessionError && data.session) {
          window.history.replaceState({}, "", `${window.location.origin}/account`);
          navigate("/account", { replace: true });
          return;
        }

        if (attempt < 2) {
          await wait(250 * (attempt + 1));
        }
      }

      const { data, error: sessionError } = await supabaseClient.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        window.history.replaceState({}, "", `${window.location.origin}/account`);
        navigate("/account", { replace: true });
        return;
      }

      setError(sessionError?.message ?? "The sign-in redirect could not be applied.");
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-2xl items-center px-6 py-24">
      <div className="w-full rounded-2xl border border-line bg-surface p-7 text-center">
        {error ? (
          <>
            <InfoPill tone="accent">Sign-in not ready</InfoPill>
            <h1 className="mt-4 font-display text-2xl font-semibold text-ink">
              We could not finish the account handoff.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">{error}</p>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Go back to <code className="text-ink">npx fixmind login</code> and try again.
            </p>
          </>
        ) : (
          <>
            <InfoPill tone="accent">Signing in</InfoPill>
            <h1 className="mt-4 font-display text-2xl font-semibold text-ink">
              Finishing your Fixmind sign-in.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Apply the encrypted sync session, then we’ll return you to your account.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
