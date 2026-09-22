import { invoke } from "@tauri-apps/api/core";
import { check, type Update } from "@tauri-apps/plugin-updater";
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
  const [availableUpdate, setAvailableUpdate] = React.useState<Update | null>(null);
  const [updateState, setUpdateState] = React.useState<
    "idle" | "checking" | "available" | "none" | "error" | "installing"
  >("idle");

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

  const checkForUpdates = React.useCallback(async () => {
    setUpdateState("checking");
    try {
      const update = await check({ timeout: 5000 });
      setAvailableUpdate(update);
      setUpdateState(update ? "available" : "none");
    } catch {
      setUpdateState("error");
    }
  }, []);

  React.useEffect(() => {
    void checkForUpdates();
  }, [checkForUpdates]);

  const installUpdate = React.useCallback(async () => {
    if (!availableUpdate) return;
    setUpdateState("installing");
    try {
      await availableUpdate.downloadAndInstall(undefined, { restartAfterInstall: true });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "The update could not be installed.");
      setUpdateState("available");
    }
  }, [availableUpdate]);

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
              <button
                type="button"
                className="secondary-action"
                onClick={() => void checkForUpdates()}
              >
                {updateState === "checking" ? "Checking for updates…" : "Check for updates"}
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
            <button type="button" className="update-link" onClick={() => void checkForUpdates()}>
              {updateState === "checking" ? "Checking…" : "Check for updates"}
            </button>
          </div>
        )}
        {updateState === "available" && availableUpdate ? (
          <div className="update-card" role="status">
            <span>Fixmind {availableUpdate.version} is ready.</span>
            <button type="button" className="secondary-action" onClick={() => void installUpdate()}>
              Install and restart
            </button>
          </div>
        ) : null}
        {updateState === "none" ? <p className="update-note">You are up to date.</p> : null}
        {updateState === "error" ? (
          <p className="update-note">Updates are unavailable right now.</p>
        ) : null}
        {updateState === "installing" ? (
          <p className="update-note">Downloading the update…</p>
        ) : null}
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
