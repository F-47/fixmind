/// <reference path="../deno.d.ts" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const polarAccessToken = Deno.env.get("POLAR_ACCESS_TOKEN");
const polarProProductId = Deno.env.get("POLAR_PRO_PRODUCT_ID");
const polarServer = Deno.env.get("POLAR_SERVER") ?? "production";
const siteUrl = Deno.env.get("SITE_URL") ?? "https://fixmind.dev";

if (!supabaseUrl || !serviceRoleKey || !polarAccessToken || !polarProProductId) {
  console.error(
    "Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, POLAR_ACCESS_TOKEN, or POLAR_PRO_PRODUCT_ID secret.",
  );
}

const polarApiUrl =
  polarServer === "sandbox" ? "https://sandbox-api.polar.sh" : "https://api.polar.sh";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function bearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization");
  const match = header?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ code: "method_not_allowed", error: "Method not allowed" }, 405);
  }

  if (!supabaseUrl || !serviceRoleKey || !polarAccessToken || !polarProProductId) {
    return jsonResponse(
      {
        code: "config_missing",
        error: "Checkout is not configured yet.",
      },
      500,
    );
  }

  const token = bearerToken(request);
  if (!token) {
    return jsonResponse({ code: "not_authenticated", error: "Not authenticated" }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data, error: authError } = await supabase.auth.getUser(token);
  const user = data.user;
  if (authError || !user?.email) {
    return jsonResponse({ code: "not_authenticated", error: "Not authenticated" }, 401);
  }

  const origin = request.headers.get("Origin") ?? siteUrl;
  const checkoutResponse = await fetch(`${polarApiUrl}/v1/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${polarAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      products: [polarProProductId],
      customer_email: user.email,
      external_customer_id: user.id,
      customer_metadata: {
        supabase_user_id: user.id,
      },
      metadata: {
        supabase_user_id: user.id,
        source: "fixmind_website",
      },
      success_url: `${siteUrl}/account?checkout_id={CHECKOUT_ID}`,
      return_url: `${siteUrl}/pricing`,
      embed_origin: origin,
    }),
  }).catch((error) => {
    console.error("Polar checkout request failed", error);
    return null;
  });

  if (!checkoutResponse) {
    return jsonResponse(
      {
        code: "polar_request_failed",
        error: "Could not reach Polar checkout.",
      },
      502,
    );
  }

  const checkout = await checkoutResponse.json().catch(() => null);
  if (!checkoutResponse.ok) {
    console.error("Polar checkout create failed", checkout);
    return jsonResponse(
      {
        code: "polar_checkout_failed",
        error: "Could not create checkout.",
        detail: checkout?.detail ?? checkout?.message ?? null,
      },
      502,
    );
  }

  if (!checkout?.url) {
    console.error("Polar checkout create returned no url", checkout);
    return jsonResponse(
      {
        code: "polar_checkout_missing_url",
        error: "Could not create checkout.",
      },
      502,
    );
  }

  return jsonResponse({ url: checkout.url });
});
