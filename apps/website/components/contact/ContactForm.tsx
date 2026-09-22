"use client";

import { Check } from "lucide-react";
import { useRef, useState } from "react";
import { Web3FormsCaptcha } from "@/components/shared/Web3FormsCaptcha";

const WEB3FORMS_ACCESS_KEY = "9ea2eed4-81f4-4dc3-b5d8-feac9d67b566";
const FRAME_NAME = "contact-form-frame";

export function ContactForm() {
  const [sent, setSent] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const submittedRef = useRef(false);

  if (sent) {
    return (
      <div className="rounded-xl border border-line bg-surface p-8 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-good/10 text-good">
          <Check size={18} />
        </div>
        <h3 className="mt-4 font-display text-lg font-semibold text-ink">Message sent</h3>
        <p className="mt-2 text-sm text-muted">Thanks - we'll reply by email as soon as we can.</p>
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
      <input type="hidden" name="subject" value="New message from fixmind.dev/contact" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="name" label="Name" type="text" placeholder="Your name" />
        <Field id="email" label="Email" type="email" placeholder="you@example.com" />
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
      <div className="mt-5">
        <Web3FormsCaptcha onStatusChange={setCaptchaVerified} />
      </div>
      <div className="mt-5 flex justify-end">
        <button
          type="submit"
          disabled={!captchaVerified}
          className="rounded-md border border-line px-4 py-2.5 text-sm text-ink transition-colors enabled:hover:border-accent/60 enabled:hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          Send message
        </button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  type,
  placeholder,
}: {
  id: string;
  label: string;
  type: "text" | "email";
  placeholder: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required
        className="mt-2 w-full rounded-md border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none focus:border-accent"
        placeholder={placeholder}
      />
    </div>
  );
}
