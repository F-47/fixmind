"use client";

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { type ReactNode, useEffect } from "react";
import { supabase, supabaseConfigured } from "@/lib/supabase";
import { queryKeys } from "@/services/query-keys";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthSync />
      {children}
    </QueryClientProvider>
  );
}

function AuthSync() {
  const client = useQueryClient();

  useEffect(() => {
    if (!supabaseConfigured || !supabase) {
      client.setQueryData(queryKeys.session, null);
      return;
    }

    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      client.setQueryData(queryKeys.session, data.session);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      client.setQueryData(queryKeys.session, nextSession);
      client.invalidateQueries({ queryKey: ["entitlement"] });
      client.invalidateQueries({ queryKey: ["lesson-count"] });
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [client]);

  return null;
}
