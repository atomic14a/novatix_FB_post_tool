"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ExtensionNav } from "@/components/extension/extension-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

type ExtensionLog = {
  id: string;
  log_type: string;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export default function ExtensionLogsPage() {
  const supabase = createClient();
  const [logs, setLogs] = useState<ExtensionLog[]>([]);

  useEffect(() => {
    async function loadLogs() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("extension_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
      setLogs((data || []) as ExtensionLog[]);
    }

    void loadLogs();
  }, [supabase]);

  return (
    <div className="space-y-6">
      <PageHeader title="Extension Logs" description="Review login sync, session heartbeats, job updates, and extension activity." />
      <ExtensionNav />
      <Card>
        <CardHeader>
          <CardTitle>Activity Feed</CardTitle>
          <CardDescription>Recent extension-side actions synced back to your backend.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No logs yet.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{log.message}</p>
                      <Badge variant="secondary">{log.log_type}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <pre className="mt-3 overflow-auto rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">{JSON.stringify(log.metadata || {}, null, 2)}</pre>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
