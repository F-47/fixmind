"use client";

import { Check, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Web3FormsCaptcha } from "@/components/shared/Web3FormsCaptcha";

const ACCESS_KEY = "cef832b8-cd5d-4546-958a-0cbf46a57fdd";
const FRAME_NAME = "waitlist-form-frame";

export function WaitlistModal({ plan, onClose }: { plan: string; onClose: () => void }) {
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const submittedRef = useRef(false);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);
  return (
    // biome-ignore lint/a11y: backdrop click supplements Escape and close buttons
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/75 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* biome-ignore lint/a11y: propagation control is not an interactive action */}
      <div
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {sent ? (
          <>
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-good/10 text-good">
              <Check size={18} />
            </div>
            <h3 className="mt-4 text-center font-display text-lg font-semibold text-ink">
              You&apos;re on the waitlist
            </h3>
            <p className="mt-2 text-center text-sm text-muted">
              We&apos;ll reach out at <span className="text-ink">{email}</span> when {plan} is
              ready.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 w-full rounded-md border border-line px-4 py-2.5 text-sm text-ink transition-colors hover:border-accent/60 hover:text-accent"
            >
              Close
            </button>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent">
                  Waitlist
                </p>
                <h3 className="mt-2 font-display text-xl font-semibold text-ink">
                  Join the {plan} waitlist
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-line p-2 text-muted transition-colors hover:border-accent/60 hover:text-accent"
                aria-label="Close waitlist modal"
              >
                <X size={16} />
              </button>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Leave your email and I&apos;ll only use it for the {plan.toLowerCase()} waitlist.
            </p>
            <form
              className="mt-5 space-y-3"
              action="https://api.web3forms.com/submit"
              method="POST"
              target={FRAME_NAME}
              onSubmit={() => {
                submittedRef.current = true;
              }}
            >
              <iframe
                name={FRAME_NAME}
                className="hidden"
                title="Waitlist submission"
                onLoad={() => {
                  if (submittedRef.current) setSent(true);
                }}
              />
              <input type="hidden" name="access_key" value={ACCESS_KEY} />
              <input
                type="hidden"
                name="subject"
                value={`New ${plan} waitlist request from fixmind.dev`}
              />
              <input type="hidden" name="plan" value={plan} />
              <label className="block">
                <span className="sr-only">Email</span>
                <input
                  type="email"
                  name="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-muted focus:border-accent/60"
                />
              </label>
              <Web3FormsCaptcha onStatusChange={setCaptchaVerified} />
              <button
                type="submit"
                disabled={!captchaVerified}
                className="inline-flex w-full items-center justify-center rounded-lg border border-line bg-bg/40 px-4 py-3 text-sm font-medium text-ink transition-colors enabled:hover:border-accent/60 enabled:hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                Join waitlist
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
