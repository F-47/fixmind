import { invoke } from "@tauri-apps/api/core";
import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";
import { ArrowDownToLine, CheckCircle2, CircleAlert, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/components/shared/cn";

type UpdateState = "idle" | "checking" | "available" | "none" | "error" | "installing";

interface Progress {
  received: number;
  total: number;
}

const inTauri = (): boolean => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function errorMessage(error: string): string {
  if (/timed? out/i.test(error)) return "The update service did not respond in time.";
  if (/signature/i.test(error)) return "The downloaded update failed signature verification.";
  if (/permission|denied/i.test(error))
    return "The update could not be written to the install folder.";
  if (/network|connect/i.test(error)) return "Fixmind could not reach the update service.";
  return error;
}

function AppUpdateDialog() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<UpdateState>("idle");
  const [edition, setEdition] = useState<Update | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const log = useCallback((message: string) => {
    void invoke("updater_log", { message }).catch(() => {});
  }, []);

  useEffect(() => {
    if (open) {
      if (!dialogRef.current?.open) dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  const runCheck = useCallback(
    async (trigger: string) => {
      setState("checking");
      setFailure(null);
      log(`check started (trigger: ${trigger})`);
      try {
        const result = await check({ timeout: 10_000 });
        setEdition(result);
        if (result) {
          setState("available");
          log(`check found version ${result.version}`);
        } else {
          setState("none");
          log("check found no update");
        }
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        setFailure(detail);
        setState("error");
        log(`check failed: ${detail}`);
      }
    },
    [log],
  );

  useEffect(() => {
    if (open && state === "idle" && inTauri()) void runCheck("dialog-open");
  }, [open, runCheck, state]);

  const runInstall = useCallback(async () => {
    if (!edition) return;
    setState("installing");
    setProgress(null);
    setFailure(null);
    log("install started");
    try {
      await edition.downloadAndInstall(
        (event: DownloadEvent) => {
          if (event.event === "Started") {
            setProgress({ received: 0, total: event.data.contentLength ?? 0 });
            log(`download started (size: ${event.data.contentLength ?? "unknown"})`);
          } else if (event.event === "Progress") {
            setProgress((previous) =>
              previous
                ? { ...previous, received: previous.received + event.data.chunkLength }
                : { received: event.data.chunkLength, total: 0 },
            );
          } else {
            log("download finished, running the installer");
          }
        },
        { restartAfterInstall: true },
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setFailure(detail);
      setState("available");
      log(`install failed: ${detail}`);
    }
  }, [edition, log]);

  const installed = state === "installing" && progress && progress.total > 0;
  const percent = Math.min(
    100,
    Math.round(((progress?.received ?? 0) / (progress?.total || 1)) * 100),
  );

  if (!inTauri()) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-[10px] uppercase tracking-[.2em] transition-colors",
          state === "available"
            ? "border-accent/50 bg-accent/10 text-accent hover:bg-accent/20"
            : "border-line bg-surface-2 text-muted hover:border-accent/30 hover:text-ink",
        )}
      >
        {state === "available" ? (
          <ArrowDownToLine size={12} />
        ) : (
          <RefreshCw size={12} className={cn(state === "checking" && "animate-spin")} />
        )}
        {state === "available" && edition ? "Update available" : "Check updates"}
      </button>

      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the native dialog already supports keyboard dismissal */}
      <dialog
        ref={dialogRef}
        className="dialog-glass fixed top-1/2 left-1/2 z-50 w-[min(520px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 p-0"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) setOpen(false);
        }}
      >
        <div className="border border-line/80 bg-[radial-gradient(circle_at_top_right,rgba(124,92,255,0.16),transparent_36%),linear-gradient(180deg,rgba(17,20,27,0.98),rgba(11,13,19,0.98))] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[.24em] text-muted">
                App update
              </div>
              <h3 className="mt-1 text-xl font-semibold tracking-tight">
                {headline(state, edition, percent)}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={state === "installing"}
              className="rounded-full border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-[.2em] text-muted transition-colors hover:border-accent/30 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              Close
            </button>
          </div>

          <p className="mt-3 text-sm leading-relaxed text-muted">
            {subheadline(state, edition, percent)}
          </p>

          {installed && (
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-200"
                style={{ width: `${percent}%`, minWidth: "4px" }}
              />
            </div>
          )}

          {failure && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
              <CircleAlert size={15} className="mt-0.5 shrink-0" />
              <div className="min-w-0">
                {errorMessage(failure)}
                <details className="mt-1 text-[11px] text-muted">
                  <summary className="cursor-pointer uppercase tracking-[.16em]">
                    Technical details
                  </summary>
                  <code className="mt-1 block break-all">{failure}</code>
                </details>
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {state !== "available" && state !== "installing" && (
              <button
                type="button"
                onClick={() => void runCheck("button")}
                disabled={state === "checking"}
                className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[.2em] text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw size={12} className={cn(state === "checking" && "animate-spin")} />
                {state === "checking" ? "Checking" : "Check for updates"}
              </button>
            )}
            {state === "available" && edition && (
              <button
                type="button"
                onClick={() => void runInstall()}
                className="inline-flex items-center gap-2 rounded-full border border-accent bg-accent px-4 py-2 font-mono text-[10px] uppercase tracking-[.2em] font-bold transition-colors hover:opacity-90"
              >
                <ArrowDownToLine size={12} />
                Install and restart
              </button>
            )}
            {state === "installing" && (
              <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.2em] text-muted">
                <CheckCircle2 size={12} className="text-positive" />
                Do not close Fixmind yet
              </span>
            )}
            {(state === "available" || state === "none") && (
              <span className="font-mono text-[10px] uppercase tracking-[.2em] text-muted">
                Installing restarts the app
              </span>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}

function headline(state: UpdateState, edition: Update | null, percent: number): string {
  switch (state) {
    case "checking":
      return "Checking for updates";
    case "available":
      return edition ? `Fixmind ${edition.version} is ready` : "Update available";
    case "none":
      return "You are up to date";
    case "error":
      return "Updates are unavailable";
    case "installing":
      return percent > 0 ? `Installing ${percent}%` : "Starting the update";
    default:
      return "App update";
  }
}

function subheadline(state: UpdateState, edition: Update | null, percent: number): string {
  switch (state) {
    case "checking":
      return "Fixmind is asking GitHub releases whether a newer desktop build exists.";
    case "available":
      return edition
        ? "You can install now and the app restarts by itself, or close this dialog and install later. Lessons and settings are preserved either way."
        : "A newer desktop build is available. Lessons and settings are preserved either way.";
    case "none":
      return "No newer desktop build is published right now. Checks run on demand, nothing is downloaded in the background.";
    case "error":
      return "Fixmind could not complete the update check. The failure is recorded in the desktop log (Open Logs from the startup warnings screen).";
    case "installing":
      if (percent > 0) return "The new version is downloading and will verify its signature.";
      return "Download and verification finished; the installer is running. The app restarts when done.";
    default:
      return "";
  }
}

export { AppUpdateDialog };
