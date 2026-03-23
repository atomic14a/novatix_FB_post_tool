"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ExtensionNav } from "@/components/extension/extension-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { EXTENSION_ROUTES } from "@/lib/extension/constants";
import { Cable, Chrome, Clock3, Cpu, ExternalLink, Link2, RefreshCw, ShieldCheck, UserRound, Flag } from "lucide-react";

type ExtensionSession = {
  id: string;
  browser_name: string | null;
  platform: string | null;
  extension_version: string | null;
  is_online: boolean | null;
  last_seen: string | null;
  updated_at: string;
};

type ExtensionContext = {
  account_name: string | null;
  page_name: string | null;
  page_id: string | null;
  facebook_detected: boolean;
  facebook_logged_in: boolean;
  synced_at: string;
};

export default function ExtensionHubPage() {
  const supabase = createClient();
  const [session, setSession] = useState<ExtensionSession | null>(null);
  const [context, setContext] = useState<ExtensionContext | null>(null);
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setUserEmail(user.email || "");

      const [sessionRes, contextRes] = await Promise.all([
        supabase
          .from("extension_sessions")
          .select("id, browser_name, platform, extension_version, is_online, last_seen, updated_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("extension_facebook_contexts")
          .select("account_name, page_name, page_id, facebook_detected, facebook_logged_in, synced_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      setSession((sessionRes.data as ExtensionSession | null) || null);
      setContext((contextRes.data as ExtensionContext | null) || null);
    }

    void loadData();
  }, [supabase]);

  const online = session?.is_online;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Extension Hub"
        description="Manage the new browser-extension system without affecting your current publishing flow or the old app-based page connection flow."
      >
        <Button onClick={() => window.open(EXTENSION_ROUTES.post, "_self")} className="gap-2">
          <Cable className="h-4 w-4" />
          Open Extension Post
        </Button>
      </PageHeader>

      <ExtensionNav />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Connection Overview</CardTitle>
            <CardDescription>Current link between your website account and the Chrome extension.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Website User</p>
              <p className="mt-2 font-semibold">{userEmail || "Loading..."}</p>
              <p className="mt-1 text-sm text-muted-foreground">Authenticated through your existing Supabase account.</p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Extension Status</p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant={online ? "success" : "secondary"}>{online ? "Online" : "Offline"}</Badge>
                <span className="text-sm text-muted-foreground">{session ? "Extension session found" : "No extension session yet"}</span>
              </div>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Browser / Device</p>
              <p className="mt-2 font-semibold">{session?.browser_name || "Waiting for extension"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{session?.platform || "Unknown platform"}</p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Last Sync</p>
              <p className="mt-2 font-semibold">{session?.last_seen ? new Date(session.last_seen).toLocaleString() : "Not synced yet"}</p>
              <p className="mt-1 text-sm text-muted-foreground">Version {session?.extension_version || "not reported"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detected Facebook Context</CardTitle>
            <CardDescription>Auto-detected from the Facebook tab through the extension, without touching the old page-connect flow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                <UserRound className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Facebook Account</p>
                  <p className="text-xs text-muted-foreground">{context?.account_name || "Not detected yet"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                <Flag className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Current Facebook Page</p>
                  <p className="text-xs text-muted-foreground">{context?.page_name || "No page detected yet"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Login State</p>
                  <p className="text-xs text-muted-foreground">{context?.facebook_logged_in ? "Facebook is logged in" : "Facebook login not confirmed yet"}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => window.open(EXTENSION_ROUTES.context, "_self")} className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Full Context
              </Button>
              <Button onClick={() => window.open(EXTENSION_ROUTES.post, "_self")} className="gap-2">
                <Cable className="h-4 w-4" />
                Extension Post
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Flow B Instructions</CardTitle>
            <CardDescription>Extension-first login that opens the website into the same account ecosystem.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
              1. Install the new Chrome extension.
              <br />2. Sign in from the extension popup or use the existing website login.
              <br />3. The extension opens this website automatically using the shared auth bridge.
              <br />4. Jobs, logs, status, Facebook context, and extension posting will appear only in this module.
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                <Chrome className="h-4 w-4 text-primary" />
                <span className="text-sm">Popup login handled inside the extension</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-sm">Website session linked through extension auth bridge</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                <Cpu className="h-4 w-4 text-primary" />
                <span className="text-sm">Browser-side jobs executed by the extension background worker</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                <Clock3 className="h-4 w-4 text-primary" />
                <span className="text-sm">Realtime-like status through frequent sync and shared backend data</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => window.open(EXTENSION_ROUTES.jobs, "_self")} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                View Jobs
              </Button>
              <Button variant="outline" onClick={() => window.open(EXTENSION_ROUTES.logs, "_self")} className="gap-2">
                <Link2 className="h-4 w-4" />
                View Logs
              </Button>
              <Button onClick={() => window.open(EXTENSION_ROUTES.testLab, "_self")} className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Open Test Lab
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Safety Boundary</CardTitle>
            <CardDescription>This module is isolated from your old working app-based tools.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-xl border border-border p-4">Your old publish button and current create-post flow remain separate.</div>
            <div className="rounded-xl border border-border p-4">Your old page-connect flow remains separate.</div>
            <div className="rounded-xl border border-border p-4">Extension posting will live only inside the new Extension Post page.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
