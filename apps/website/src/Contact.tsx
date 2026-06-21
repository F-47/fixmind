import HCaptcha from "@hcaptcha/react-hcaptcha";
import { Check, Mail } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { usePageMeta } from "./router";
import { CONTACT_EMAIL, Footer, Nav, SUPPORT_EMAIL } from "./shared";

const WEB3FORMS_ACCESS_KEY = "9ea2eed4-81f4-4dc3-b5d8-feac9d67b566";
// Web3Forms' shared sitekey for free-plan hCaptcha - see their hCaptcha integration docs.
// Requires fixmind.dev to be listed in the form's Security Settings domain field.
const HCAPTCHA_SITEKEY = "50b2fe65-b00b-4b9e-ad62-3ba471098be2";

type FormStatus = "idle" | "submitting" | "success" | "error";

function ContactForm() {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const captchaRef = useRef<HCaptcha>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!captchaToken) {
      setStatus("error");
      setErrorMessage("Please complete the captcha.");
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
    formData.append("access_key", WEB3FORMS_ACCESS_KEY);
    formData.append("subject", "New message from fixmind.dev/contact");
    formData.append("h-captcha-response", captchaToken);

    try {
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
      });
      const result = (await response.json()) as { success?: boolean; message?: string };
      if (result.success) {
        setStatus("success");
        event.currentTarget.reset();
      } else {
        setStatus("error");
        setErrorMessage(result.message ?? "Something went wrong. Try emailing us directly instead.");
        captchaRef.current?.resetCaptcha();
        setCaptchaToken("");
      }
    } catch {
      setStatus("error");
      setErrorMessage("Couldn't reach the form service. Try emailing us directly instead.");
      captchaRef.current?.resetCaptcha();
      setCaptchaToken("");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-xl border border-line bg-surface p-8 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-good/10 text-good">
          <Check size={18} />
        </div>
        <h3 className="mt-4 font-display text-lg font-semibold text-ink">Message sent</h3>
        <p className="mt-2 text-sm text-muted">
          Thanks - we'll reply by email as soon as we can.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-line bg-surface p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
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
          <label htmlFor="email" className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
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
        <label htmlFor="message" className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
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
      <div className="mt-4">
        <HCaptcha
          ref={captchaRef}
          sitekey={HCAPTCHA_SITEKEY}
          reCaptchaCompat={false}
          theme="dark"
          onVerify={(token) => setCaptchaToken(token)}
          onExpire={() => setCaptchaToken("")}
        />
      </div>
      {status === "error" && <p className="mt-4 text-sm text-bad">{errorMessage}</p>}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="mt-5 rounded-md border border-line px-4 py-2.5 text-sm text-ink transition-colors hover:border-accent/60 hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "submitting" ? "Sending…" : "Send message"}
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
    description: "A bug in the CLI, the MCP server, or the dashboard - include your OS and fixmind version if you can.",
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
      <h3 className="font-display text-base font-semibold text-ink">{reason.title}</h3>
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

      <section className="relative overflow-hidden bg-grid">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-accent/15 blur-[130px]"
        />
        <div className="relative mx-auto max-w-3xl px-6 py-24 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Contact</p>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Talk to a person, not a ticket queue.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-muted">
            Fixmind is a small, solo-maintained project. Email goes straight to the person
            building it - expect a real reply, not an auto-responder.
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

      <section className="border-t border-line bg-surface/40">
        <div className="mx-auto max-w-3xl px-6 py-24">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Or send a message</p>
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
