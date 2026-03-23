"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ExtensionNav } from "@/components/extension/extension-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { RefreshCw } from "lucide-react";

type ExtensionContext = {
  id: string;
  facebook_detected: boolean;
  facebook_logged_in: boolean;
  account_name: string | null;
  page_name: string | null;
  page_id: string | null;
  detected_pages_count: number | null;
  synced_at: string;
  context_data: Record<string, unknown>;
};

const REFRESH_MS = 10000;

export default function ExtensionContextPage() {
  const supabase = createClient();
  const [context, setContext] = useState<ExtensionContext | null>(null);
  const [loading, setLoading] = useState(true);

  const loadContext = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("extension_facebook_contexts")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setContext((data as ExtensionContext | null) || null);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadContext();
    }, 0);

    const interval = window.setInterval(() => {
      void loadContext();
    }, REFRESH_MS);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, [loadContext]);

  return (
    <div className="space-y-6">
      <PageHeader title="Facebook Context" description="Latest browser-side Facebook environment detected by the extension.">
        <Button variant="outline" onClick={() => void loadContext()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh Context
        </Button>
      </PageHeader>
      <ExtensionNav />
      <Card>
        <CardHeader>
          <CardTitle>Detected Context</CardTitle>
          <CardDescription>Useful for future browser-side Facebook workflows and automation logic.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!context ? (
            <p className="text-sm text-muted-foreground">{loading ? "Checking Facebook context..." : "No Facebook context synced yet."}</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Facebook Detected</p>
                  <div className="mt-2"><Badge variant={context.facebook_detected ? "success" : "secondary"}>{context.facebook_detected ? "Detected" : "Not detected"}</Badge></div>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Login State</p>
                  <div className="mt-2"><Badge variant={context.facebook_logged_in ? "success" : "secondary"}>{context.facebook_logged_in ? "Logged in" : "Logged out"}</Badge></div>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Synced</p>
                  <p className="mt-2 font-semibold">{new Date(context.synced_at).toLocaleString()}</p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Account</p>
                  <p className="mt-2 font-semibold">{context.account_name || "Unknown"}</p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Page Name</p>
                  <p className="mt-2 font-semibold">{context.page_name || "Unknown"}</p>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Page ID</p>
                  <p className="mt-2 font-semibold">{context.page_id || "Unknown"}</p>
                </div>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-sm font-semibold">Raw Context Data</p>
                <pre className="mt-3 overflow-auto rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">{JSON.stringify(context.context_data || {}, null, 2)}</pre>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
