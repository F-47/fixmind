import { ContactForm } from "@/components/contact/ContactForm";
import { ReasonCard, type ContactReason } from "@/components/contact/ReasonCard";
import { CONTACT_EMAIL, SUPPORT_EMAIL } from "@/components/shared/constants";

const REASONS: ContactReason[] = [
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

export default function Contact() {
  return (
    <div>
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
    </div>
  );
}
