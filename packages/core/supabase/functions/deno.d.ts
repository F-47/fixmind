declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export function createClient(url: string, key: string): any;
}

declare module "npm:@polar-sh/supabase@0.4.5" {
  export function Webhooks(options: any): (request: Request) => Response | Promise<Response>;
}
