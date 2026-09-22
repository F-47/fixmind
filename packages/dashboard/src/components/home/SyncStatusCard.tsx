import {
  AlertTriangle,
  CheckCircle2,
  CloudOff,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/components/shared/cn";
import { formatDateTime } from "@/lib/format";
import type { SyncMeta } from "@/lib/types";

interface Props {
  syncMeta: SyncMeta | null;
  refreshing: boolean;
  onRefresh(): Promise<unknown>;
}

type SyncState =
  | "loading"
  | "local_only"
  | "up_to_date"
  | "unsynced_changes"
  | "syncing"
  | "needs_reauth"
  | "conflicts"
  | "unavailable";

export function SyncStatusCard({ syncMeta, refreshing, onRefresh }: Props) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (detailsOpen) {
      if (!dialogRef.current?.open) dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [detailsOpen]);

  const presentation = useMemo(() => describeSync(syncMeta, refreshing), [syncMeta, refreshing]);

  return (
    <>
      <section
        className={cn(
          "overflow-hidden rounded-[28px] border px-5 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:px-6",
          presentation.cardClass,
        )}
      >
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div
                className={cn(
                  "mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl border",
                  presentation.iconClass,
                )}
              >
                <presentation.icon className="size-5" />
              </div>
              <div className="min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-[.24em] text-muted">
                  Cross-device sync
                </div>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight">{presentation.title}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
                  {presentation.description}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {presentation.actionLabel && (
                <button
                  type="button"
                  onClick={() => void onRefresh()}
                  disabled={refreshing}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-[10px] uppercase tracking-[.2em] transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    "border-accent/30 bg-accent/10 text-accent hover:border-accent/50 hover:bg-accent/15",
                  )}
                >
                  <RefreshCw size={12} className={cn(refreshing && "animate-spin")} />
                  {refreshing ? "Syncing" : presentation.actionLabel}
                </button>
              )}
              <button
                type="button"
                onClick={() => setDetailsOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-2 px-4 py-2 font-mono text-[10px] uppercase tracking-[.2em] text-muted transition-colors hover:border-accent/30 hover:text-ink"
              >
                Details
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Account"
              value={syncMeta?.email ?? (syncMeta?.loggedIn ? "Signed in" : "Local only")}
            />
            <Metric label="Pending uploads" value={String(syncMeta?.pendingPushCount ?? 0)} />
            <Metric label="Last push" value={formatDateTime(syncMeta?.lastPushedAt)} />
            <Metric label="Last pull" value={formatDateTime(syncMeta?.lastPulledAt)} />
          </div>

          {syncMeta?.lastSyncError && (
            <div className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
              Latest sync issue: {humanizeError(syncMeta.lastSyncError)}
            </div>
          )}
        </div>
      </section>

      {/* biome-ignore lint/a11y/useKeyWithClickEvents: the native dialog already supports keyboard dismissal */}
      <dialog
        ref={dialogRef}
        className="dialog-glass fixed top-1/2 left-1/2 z-50 w-[min(760px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 overflow-hidden p-0"
        onClose={() => setDetailsOpen(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) setDetailsOpen(false);
        }}
      >
        <div className="border border-line/80 bg-[radial-gradient(circle_at_top_right,rgba(124,92,255,0.18),transparent_34%),linear-gradient(180deg,rgba(17,20,27,0.98),rgba(11,13,19,0.98))] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[.24em] text-muted">
                Sync details
              </div>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight">{presentation.title}</h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                {presentation.description}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDetailsOpen(false)}
              className="rounded-full border border-line px-3 py-1 font-mono text-[10px] uppercase tracking-[.2em] text-muted transition-colors hover:border-accent/30 hover:text-ink"
            >
              Close
            </button>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <DetailCard
              title="Status"
              lines={[
                `Current state: ${presentation.detailsLabel}`,
                `Last successful sync: ${formatDateTime(syncMeta?.lastSuccessfulSyncAt)}`,
                `Pending uploads on this device: ${syncMeta?.pendingPushCount ?? 0}`,
                `Conflict inbox: ${syncMeta?.conflictCount ?? 0}`,
              ]}
            />
            <DetailCard
              title="This device"
              lines={[
                syncMeta?.email ? `Account: ${syncMeta.email}` : "Account: not connected",
                `Last push: ${formatDateTime(syncMeta?.lastPushedAt)}`,
                `Last pull: ${formatDateTime(syncMeta?.lastPulledAt)}`,
                syncMeta?.syncEnabled
                  ? "Scope: all local lessons currently sync."
                  : "Scope: local-only until sync is active.",
              ]}
            />
            <DetailCard
              title="Latest issue"
              lines={[
                syncMeta?.lastSyncError
                  ? humanizeError(syncMeta.lastSyncError)
                  : "No recent sync errors were recorded on this device.",
              ]}
            />
            <DetailCard title="Next action" lines={nextActions(syncMeta, refreshing)} />
          </div>
        </div>
      </dialog>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line/80 bg-surface/80 px-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[.2em] text-muted">{label}</div>
      <div className="mt-2 text-sm font-medium text-ink">{value}</div>
    </div>
  );
}

function DetailCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <section className="rounded-2xl border border-line/80 bg-surface/70 px-4 py-4">
      <h4 className="text-sm font-semibold tracking-tight text-ink">{title}</h4>
      <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
        {lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </section>
  );
}

function describeSync(syncMeta: SyncMeta | null, refreshing: boolean) {
  const state: SyncState = resolveSyncState(syncMeta, refreshing);
  switch (state) {
    case "loading":
      return {
        state,
        title: "Checking this device",
        description: "Fixmind is loading the current sync state for this lesson store.",
        detailsLabel: "Checking status",
        actionLabel: undefined,
        icon: RefreshCw,
        cardClass:
          "border-line bg-[linear-gradient(135deg,rgba(22,26,35,0.98),rgba(10,12,18,0.98))]",
        iconClass: "border-line bg-surface-2 text-muted",
      };
    case "syncing":
      return {
        state,
        title: "Sync in progress",
        description:
          "Fixmind is pushing local lesson changes first, then pulling the latest remote updates back into this dashboard.",
        detailsLabel: "Syncing now",
        actionLabel: "Sync now",
        icon: RefreshCw,
        cardClass:
          "border-accent/30 bg-[radial-gradient(circle_at_top_right,rgba(124,92,255,0.2),transparent_32%),linear-gradient(135deg,rgba(22,26,35,0.98),rgba(10,12,18,0.98))]",
        iconClass: "border-accent/30 bg-accent/10 text-accent",
      };
    case "needs_reauth":
      return {
        state,
        title: "Reconnect this device",
        description:
          "Your saved sync session expired. Lessons stay local, but this device cannot sync again until you sign in here one more time.",
        detailsLabel: "Needs re-login",
        actionLabel: "Retry status",
        icon: ShieldAlert,
        cardClass:
          "border-warn/25 bg-[radial-gradient(circle_at_top_right,rgba(232,179,95,0.18),transparent_34%),linear-gradient(135deg,rgba(22,26,35,0.98),rgba(10,12,18,0.98))]",
        iconClass: "border-warn/30 bg-warn/10 text-warn",
      };
    case "conflicts":
      return {
        state,
        title: "Conflicts need review",
        description:
          "This device detected lesson changes that should be reviewed before a final sync choice is made.",
        detailsLabel: "Conflicts pending",
        actionLabel: "Sync now",
        icon: AlertTriangle,
        cardClass:
          "border-danger/25 bg-[radial-gradient(circle_at_top_right,rgba(255,92,114,0.14),transparent_34%),linear-gradient(135deg,rgba(22,26,35,0.98),rgba(10,12,18,0.98))]",
        iconClass: "border-danger/30 bg-danger/10 text-danger",
      };
    case "unsynced_changes":
      return {
        state,
        title: "Unsynced lesson changes",
        description: `This device has ${syncMeta?.pendingPushCount ?? 0} local lesson change(s) waiting to upload.`,
        detailsLabel: "Pending uploads",
        actionLabel: "Sync now",
        icon: AlertTriangle,
        cardClass:
          "border-accent/30 bg-[radial-gradient(circle_at_top_right,rgba(124,92,255,0.16),transparent_34%),linear-gradient(135deg,rgba(22,26,35,0.98),rgba(10,12,18,0.98))]",
        iconClass: "border-accent/30 bg-accent/10 text-accent",
      };
    case "up_to_date":
      return {
        state,
        title: "Up to date",
        description: "This device is connected and no local lesson changes are waiting to sync.",
        detailsLabel: "Healthy",
        actionLabel: "Sync now",
        icon: ShieldCheck,
        cardClass:
          "border-positive/25 bg-[radial-gradient(circle_at_top_right,rgba(74,222,128,0.16),transparent_34%),linear-gradient(135deg,rgba(22,26,35,0.98),rgba(10,12,18,0.98))]",
        iconClass: "border-positive/30 bg-positive/10 text-positive",
      };
    case "unavailable":
      return {
        state,
        title: "Sync is unavailable",
        description:
          "Fixmind could not confirm sync health for this device right now, or this account does not currently have encrypted sync active.",
        detailsLabel: "Unavailable",
        actionLabel: "Retry status",
        icon: CloudOff,
        cardClass:
          "border-line bg-[linear-gradient(135deg,rgba(22,26,35,0.98),rgba(10,12,18,0.98))]",
        iconClass: "border-line bg-surface-2 text-muted",
      };
    default:
      return {
        state,
        title: "Local-only mode",
        description: "Your lessons are saved on this device only until you connect encrypted sync.",
        detailsLabel: "Local only",
        actionLabel: undefined,
        icon: CheckCircle2,
        cardClass:
          "border-line bg-[linear-gradient(135deg,rgba(22,26,35,0.98),rgba(10,12,18,0.98))]",
        iconClass: "border-line bg-surface-2 text-muted",
      };
  }
}

function resolveSyncState(syncMeta: SyncMeta | null, refreshing: boolean): SyncState {
  if (refreshing) return "syncing";
  if (!syncMeta) return "loading";
  if (syncMeta.needsReauth) return "needs_reauth";
  if (syncMeta.conflictCount > 0) return "conflicts";
  if (syncMeta.lastSyncError && !syncMeta.syncEnabled) return "unavailable";
  if (!syncMeta.loggedIn) return "local_only";
  if (!syncMeta.syncEnabled) return "unavailable";
  if (syncMeta.pendingPushCount > 0) return "unsynced_changes";
  return "up_to_date";
}

function humanizeError(message: string): string {
  if (/Incorrect passphrase/i.test(message))
    return "Another device used a different passphrase. Reconnect with the same sync passphrase.";
  if (/active Pro or Team plan/i.test(message))
    return "This account does not currently have sync access.";
  if (/timed out/i.test(message)) return "The sync request timed out before the server responded.";
  if (
    /invalid refresh token|refresh token not found|jwt expired|session not found/i.test(message)
  ) {
    return "This device needs a fresh login before it can sync again.";
  }
  return message;
}

function nextActions(syncMeta: SyncMeta | null, refreshing: boolean): string[] {
  if (refreshing)
    return [
      "Wait for the current sync cycle to finish. The dashboard is uploading local lessons, then checking for remote updates.",
    ];
  if (!syncMeta?.loggedIn)
    return [
      "Continue in local-only mode, or reconnect this device when you want encrypted sync available in the dashboard.",
    ];
  if (syncMeta.needsReauth)
    return [
      "Reconnect this device to restore encrypted sync, then use Retry status here to confirm the session is healthy again.",
    ];
  if (!syncMeta.syncEnabled)
    return [
      "Use Retry status to check this device again after your account or connection issue is resolved.",
    ];
  if (syncMeta.pendingPushCount > 0)
    return [
      "Use Sync now to upload the pending local lesson changes and then pull back the latest remote state.",
    ];
  return [
    "No action needed right now. This device is connected and the lesson store looks current.",
  ];
}
