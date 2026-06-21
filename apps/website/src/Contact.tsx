import { Check, Mail } from "lucide-react";
import { useRef, useState } from "react";
import { usePageMeta } from "./router";
import { CONTACT_EMAIL, Footer, Nav, SUPPORT_EMAIL } from "./shared";

const WEB3FORMS_ACCESS_KEY = "9ea2eed4-81f4-4dc3-b5d8-feac9d67b566";
const FRAME_NAME = "contact-form-frame";

function ContactForm() {
  const [sent, setSent] = useState(false);
  const submittedRef = useRef(false);

  if (sent) {
    return (
      <div className="rounded-xl border border-line bg-surface p-8 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-good/10 text-good">
          <Check size={18} />
        </div>
        <h3 className="mt-4 font-display text-lg font-semibold text-ink">
          Message sent
        </h3>
        <p className="mt-2 text-sm text-muted">
          Thanks - we'll reply by email as soon as we can.
        </p>
      </div>
    );
  }

  return (
    <form
      action="https://api.web3forms.com/submit"
      method="POST"
      target={FRAME_NAME}
      onSubmit={() => {
        submittedRef.current = true;
      }}
      className="rounded-xl border border-line bg-surface p-6 sm:p-8"
    >
      <iframe
        name={FRAME_NAME}
        className="hidden"
        title="Form submission"
        onLoad={() => {
          if (submittedRef.current) setSent(true);
        }}
      />
      <input type="hidden" name="access_key" value={WEB3FORMS_ACCESS_KEY} />
      <input
        type="hidden"
        name="subject"
        value="New message from fixmind.dev/contact"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="name"
            className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted"
          >
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="mt-2 w-full rounded-md border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
            placeholder="Your name"
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-2 w-full rounded-md border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
            placeholder="you@example.com"
          />
        </div>
      </div>
      <div className="mt-4">
        <label
          htmlFor="message"
          className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted"
        >
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="mt-2 w-full resize-none rounded-md border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
          placeholder="What's going on?"
        />
      </div>
      <button
        type="submit"
        className="mt-5 rounded-md border border-line px-4 py-2.5 text-sm text-ink transition-colors hover:border-accent/60 hover:text-accent"
      >
        Send message
      </button>
    </form>
  );
}

interface Reason {
  email: string;
  title: string;
  description: string;
}

const REASONS: Reason[] = [
  {
    email: SUPPORT_EMAIL,
    title: "Something's broken",
    description:
      "A bug in the CLI, the MCP server, or the dashboard - include your OS and fixmind version if you can.",
  },
  {
    email: CONTACT_EMAIL,
    title: "Everything else",
    description: "Questions, feedback, partnerships, or Team/Enterprise plans.",
  },
];

function ReasonCard({ reason }: { reason: Reason }) {
  return (
    <a
      href={`mailto:${reason.email}`}
      className="group flex flex-col gap-3 rounded-xl border border-line bg-surface p-6 transition-colors hover:border-accent/40"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
        <Mail size={16} />
      </div>
      <h3 className="font-display text-base font-semibold text-ink">
        {reason.title}
      </h3>
      <p className="text-sm leading-relaxed text-muted">{reason.description}</p>
      <span className="font-mono text-sm text-accent transition-colors group-hover:text-ink">
        {reason.email}
      </span>
    </a>
  );
}

export default function Contact() {
  usePageMeta(
    "Contact — fixmind",
    "Get in touch with fixmind for support, feedback, or questions about Team and Enterprise plans.",
  );
  return (
    <div>
      <Nav />
      <div className="relative overflow-hidden bg-grid">
        <section>
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-accent/15 blur-[130px]"
          />
          <div className="relative mx-auto max-w-3xl px-6 py-24 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
              Contact
            </p>
            <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              Talk to a person, not a ticket queue.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-muted">
              Fixmind is a small, solo-maintained project. Email goes straight
              to the person building it - expect a real reply, not an
              auto-responder.
            </p>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-6 pb-24 pt-4">
          <div className="grid gap-5 sm:grid-cols-2">
            {REASONS.map((reason) => (
              <ReasonCard key={reason.email} reason={reason} />
            ))}
          </div>
        </section>
      </div>
      <section className="border-t border-line bg-surface/40">
        <div className="mx-auto max-w-3xl px-6 py-24">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
            Or send a message
          </p>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight text-ink">
            Prefer a form to your email client?
          </h2>
          <div className="mt-8">
            <ContactForm />
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
