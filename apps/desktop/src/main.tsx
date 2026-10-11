import { invoke } from "@tauri-apps/api/core";
import React from "react";
import ReactDOM from "react-dom/client";
import "./styles.css";

interface StartupStatus {
  state: "starting" | "ready" | "failed";
  category: "startup" | "resources" | "permissions" | "data" | "server";
  message?: string;
}

function App() {
  const [status, setStatus] = React.useState<StartupStatus>({
    state: "starting",
    category: "startup",
  });
  const [actionError, setActionError] = React.useState<string>();
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const next = await invoke<StartupStatus>("startup_status");
        if (!cancelled) setStatus(next);
      } catch {
        // The browser-only development shell has no Tauri command bridge.
      }
      if (!cancelled) window.setTimeout(poll, 500);
    };
    void poll();
    return () => {
      cancelled = true;
    };
  }, []);

  const runAction = async (action: string) => {
    setActionError(undefined);
    try {
      await invoke(action);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "That action could not be completed.",
      );
    }
  };

  const copyDiagnostics = async () => {
    setActionError(undefined);
    try {
      const report = await invoke<string>("diagnostics_report");
      await navigator.clipboard.writeText(report);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Diagnostics could not be copied.");
    }
  };

  const failed = status.state === "failed";
  const failureGuidance = {
    resources: "Some Fixmind files are missing. Reinstalling usually restores them.",
    permissions: "Windows blocked access to a required file. Check permissions or restart Fixmind.",
    data: "Fixmind could not open its local data. Existing files were left untouched.",
    server:
      "The local workspace stopped unexpectedly. Retry or restart Fixmind to launch it again.",
    startup: "Fixmind could not open the local dashboard. Retry or restart Fixmind to try again.",
  }[status.category];
  return (
    <main className="startup-shell">
      <section className="startup-panel" aria-live="polite">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <div>
            <h1>{failed ? "Your workspace is safe" : "Opening Fixmind"}</h1>
            <p className="startup-subtitle">
              {failed
                ? "Your local lessons have not been changed."
                : "Preparing your local workspace."}
            </p>
          </div>
        </div>
        {failed ? (
          <>
            <p className="recovery-copy">
              {failureGuidance} Your lessons were not changed or deleted.
            </p>
            <details className="technical-details">
              <summary>Show technical details</summary>
              <code>{status.message ?? "No additional details were recorded."}</code>
            </details>
            <div className="recovery-actions">
              <button
                type="button"
                className="primary-action"
                onClick={() => void runAction("retry_startup")}
              >
                Retry
              </button>
              <button
                type="button"
                className="secondary-action"
                onClick={() => void runAction("restart_fixmind")}
              >
                Restart Fixmind
              </button>
              <button
                type="button"
                className="secondary-action"
                onClick={() => void runAction("open_logs")}
              >
                Open Logs
              </button>
              <button
                type="button"
                className="secondary-action"
                onClick={() => void copyDiagnostics()}
              >
                {copied ? "Diagnostics copied" : "Copy Diagnostics"}
              </button>
            </div>
            {actionError ? (
              <p className="action-error" role="alert">
                {actionError}
              </p>
            ) : null}
          </>
        ) : (
          <div className="card-footer" aria-live="polite">
            <div className="pulse" aria-hidden="true" />
            <span>Launching dashboard</span>
          </div>
        )}
      </section>
    </main>
  );
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root element");

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
