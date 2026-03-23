"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ExtensionNav } from "@/components/extension/extension-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { Bug, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type ExtensionSession = { id: string; extension_version: string | null; is_online: boolean | null; updated_at: string };

type TestJob = { id: string; status: string; job_type: string; execution_mode: string; created_at: string };

export default function ExtensionTestLabPage() {
  const supabase = createClient();
  const [session, setSession] = useState<ExtensionSession | null>(null);
  const [jobs, setJobs] = useState<TestJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const [sessionRes, jobsRes] = await Promise.all([
      supabase
        .from("extension_sessions")
        .select("id, extension_version, is_online, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("extension_jobs")
        .select("id, status, job_type, execution_mode, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    setSession((sessionRes.data as ExtensionSession | null) || null);
    setJobs((jobsRes.data || []) as TestJob[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadData]);

  async function createJob(jobType: string) {
    setCreating(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const { error } = await supabase.from("extension_jobs").insert({
        user_id: user.id,
        job_type: jobType,
        execution_mode: "extension_test_lab",
        status: "pending",
        payload: {
          title: "Extension Test Job",
          created_from: "test_lab",
          created_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success(`${jobType} job created`);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create test job");
    } finally {
      setCreating(false);
    }
  }

  const readiness = useMemo(() => {
    if (!session) return "Extension not connected";
    return session.is_online ? "Ready for testing" : "Session found but extension is offline";
  }, [session]);

  return (
    <div className="space-y-6">
      <PageHeader title="Extension Test Lab" description="Test auth sync, job creation, extension pickup, and result sync in one place." />
      <ExtensionNav />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>System Readiness</CardTitle>
            <CardDescription>Quick status check before running extension tests.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Extension Session</span>
                <Badge variant={session?.is_online ? "success" : "secondary"}>{session?.is_online ? "Online" : "Offline"}</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{readiness}</p>
            </div>
            <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
              Use these tests to confirm the foundation works:
              <br />- extension auth sync
              <br />- backend connection
              <br />- job creation
              <br />- job pickup
              <br />- result sync
              <br />- Facebook context sync
            </div>
            <Button variant="outline" onClick={() => void loadData()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh Status
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Run Tests</CardTitle>
            <CardDescription>Create jobs that the extension can pick up and execute.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Button onClick={() => createJob("health_check")} disabled={creating} className="justify-start gap-2">
                <Play className="h-4 w-4" />
                Create Health Check Job
              </Button>
              <Button onClick={() => createJob("facebook_context_scan")} disabled={creating} className="justify-start gap-2">
                <Bug className="h-4 w-4" />
                Create Facebook Context Job
              </Button>
            </div>
            <div className="space-y-3 rounded-xl border border-border p-4">
              <p className="text-sm font-semibold">Latest Test Jobs</p>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : jobs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No test jobs yet.</p>
              ) : (
                jobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{job.job_type}</p>
                      <p className="text-xs text-muted-foreground">{new Date(job.created_at).toLocaleString()}</p>
                    </div>
                    <Badge variant={job.status === "completed" ? "success" : "secondary"}>{job.status}</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
