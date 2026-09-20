import { Download, Shield, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";

const DOWNLOAD_URL =
  process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL ?? "https://github.com/F-47/fixmind/releases/latest";

export const metadata = pageMetadata({
  title: "Fixmind - Download",
  description:
    "Download the Fixmind desktop app for local lessons, Pro sync, and native access to your learning history.",
  path: "/download",
});

const access = [
  {
    icon: Download,
    title: "Open the app",
    text: "Launch the native Fixmind shell and open your local dashboard.",
  },
  {
    icon: Shield,
    title: "Stay local by default",
    text: "Local lessons, search, export, and review work without sync.",
  },
  {
    icon: Users,
    title: "Sign in for Pro",
    text: "Pro users see synced lessons and encrypted cross-device history.",
  },
] as const;

export default function DownloadPage() {
  return (
    <main className="relative overflow-hidden mx-auto max-w-6xl px-6 py-16 sm:py-20">
      <div className="bg-grid absolute inset-0 -z-10 opacity-[0.22]" aria-hidden="true" />
      <div
        className="absolute left-[-10%] top-[-8%] -z-10 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-[-12%] right-[-8%] -z-10 h-96 w-96 rounded-full bg-accent-dim/10 blur-3xl"
        aria-hidden="true"
      />

      <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="max-w-2xl animate-rise">
          <div className="font-mono text-[11px] uppercase tracking-[.24em] text-accent">
            Desktop app
          </div>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight text-ink sm:text-6xl text-glow">
            Fixmind on your machine.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
            The desktop app is the cleanest way to use Fixmind. Local lessons stay on your device,
            and Pro users can sign in to sync the same learning history across machines.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={DOWNLOAD_URL}
              data-umami-event="download_app_click"
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-bg transition-colors hover:bg-accent-dim"
            >
              <Download size={16} />
              Download desktop app
            </a>
            <Link
              href="/docs/quickstart"
              data-umami-event="download_setup_guide_click"
              className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent/60 hover:text-accent"
            >
              Setup guide
            </Link>
          </div>

          <p className="mt-4 text-sm text-muted">
            If you already use the CLI, the app opens the same local data.
          </p>
        </div>

        <div className="rounded-3xl border border-line bg-surface-2 p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[.2em] text-muted">
                What users get
              </div>
              <div className="mt-2 text-xl font-semibold tracking-tight text-ink">
                Simple access path
              </div>
            </div>
            <Sparkles className="text-accent" size={20} />
          </div>
          <div className="mt-6 space-y-4">
            {access.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-2xl border border-line/70 bg-bg/50 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl border border-line/60 bg-surface p-2 text-accent">
                    <Icon size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-ink">{title}</h2>
                    <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-16 grid gap-4 md:grid-cols-3">
        {[
          ["Windows", "Native desktop build for Windows users."],
          ["macOS", "Native desktop build for Mac users."],
          ["Linux", "Native desktop build for Linux users."],
        ].map(([title, text]) => (
          <article key={title} className="rounded-3xl border border-line bg-surface-2 p-6">
            <h3 className="text-base font-semibold text-ink">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-muted">{text}</p>
          </article>
        ))}
      </section>

      <section className="mt-16 grid gap-4 md:grid-cols-3">
        {[
          ["Local-first", "All the basic lesson browsing and review stays on your device."],
          ["Sync when needed", "Pro users can sign in and bring encrypted sync online."],
          ["No extra clutter", "One app, one dashboard, one clean path to your lessons."],
        ].map(([title, text]) => (
          <article key={title} className="rounded-3xl border border-line bg-surface-2 p-6">
            <h3 className="text-base font-semibold text-ink">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-muted">{text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
