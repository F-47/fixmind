/// <reference path="../deno.d.ts" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// Supabase Edge Function: receives Polar subscription webhooks and keeps
// the `entitlements` table in sync, so `fixmind login` can check
// whether an account has an active Pro/Team subscription.
//
// Deploy: supabase functions deploy polar-webhook
// Configure (once deployed):
//   supabase secrets set POLAR_WEBHOOK_SECRET=whsec_...
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...   (from Project Settings > API)
// Then add the function's URL as a webhook endpoint in the Polar dashboard.
//
// Uses Polar's Supabase adapter helper, which verifies the webhook
// signature for you. Verify the exact event names below still match
// Polar's current docs before relying on this in production.
import { Webhooks } from "npm:@polar-sh/supabase@0.4.5";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const webhookSecret = Deno.env.get("POLAR_WEBHOOK_SECRET");

if (!supabaseUrl || !serviceRoleKey || !webhookSecret) {
  throw new Error(
    "Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or POLAR_WEBHOOK_SECRET secret.",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

interface PolarSubscription {
  customer?: { email?: string };
  product?: { name?: string };
  status?: string;
  currentPeriodEnd?: string;
}

function planFromProductName(name: string | undefined): string {
  const lower = (name ?? "").toLowerCase();
  if (lower.includes("team")) return "team";
  return "pro";
}

async function upsertEntitlement(subscription: PolarSubscription, status: string): Promise<void> {
  const email = subscription.customer?.email;
  if (!email) {
    console.error("Polar webhook: subscription event missing customer email, skipping.");
    return;
  }
  const { error } = await supabase.from("entitlements").upsert({
    email: email.toLowerCase(),
    plan: planFromProductName(subscription.product?.name),
    status,
    current_period_end: subscription.currentPeriodEnd ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error)
    console.error(`Polar webhook: failed to upsert entitlement for ${email}: ${error.message}`);
}

Deno.serve(
  Webhooks({
    webhookSecret,
    onSubscriptionActive: async (payload) => {
      await upsertEntitlement(payload.data, "active");
    },
    onSubscriptionUpdated: async (payload) => {
      const subscription = payload.data;
      await upsertEntitlement(subscription, subscription.status ?? "active");
    },
    onSubscriptionCanceled: async (payload) => {
      await upsertEntitlement(payload.data, "canceled");
    },
    onSubscriptionRevoked: async (payload) => {
      await upsertEntitlement(payload.data, "revoked");
    },
  }),
);
