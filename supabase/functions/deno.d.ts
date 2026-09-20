declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

declare module "https://esm.sh/@supabase/supabase-js@2" {
  type SupabaseClient = {
    from(table: string): {
      upsert(values: Record<string, unknown>): Promise<{ error: { message: string } | null }>;
    };
  };
  export function createClient(url: string, key: string): SupabaseClient;
}

declare module "npm:@polar-sh/supabase@0.4.5" {
  type SubscriptionPayload = {
    data: {
      customer?: { email?: string };
      product?: { name?: string };
      status?: string;
      currentPeriodEnd?: string;
    };
  };
  type WebhookOptions = {
    webhookSecret: string;
    onSubscriptionActive(payload: SubscriptionPayload): Promise<void>;
    onSubscriptionUpdated(payload: SubscriptionPayload): Promise<void>;
    onSubscriptionCanceled(payload: SubscriptionPayload): Promise<void>;
    onSubscriptionRevoked(payload: SubscriptionPayload): Promise<void>;
  };
  export function Webhooks(
    options: WebhookOptions,
  ): (request: Request) => Response | Promise<Response>;
}
