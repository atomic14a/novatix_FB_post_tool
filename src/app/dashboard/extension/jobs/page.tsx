"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ExtensionNav } from "@/components/extension/extension-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type Job = {
  id: string;
  job_type: string;
  execution_mode: string;
  status: string;
  payload: Record<string, unknown>;
  error_log: string | null;
  created_at: string;
  updated_at: string;
};

export default function ExtensionJobsPage() {
  const supabase = createClient();
  const [jobs, setJobs] = useState<Job[]>([]);

  const loadJobs = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("extension_jobs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setJobs((data || []) as Job[]);
  }, [supabase]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadJobs();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadJobs]);

  async function updateJob(id: string, status: string) {
    const { error } = await supabase
      .from("extension_jobs")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success(`Job ${status}`);
    await loadJobs();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Extension Jobs" description="Manage pending, processing, completed, and failed extension jobs." />
      <ExtensionNav />
      <Card>
        <CardHeader>
          <CardTitle>Job Queue</CardTitle>
          <CardDescription>Your website creates these jobs. The extension picks them up and syncs results back.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No jobs available yet.</p>
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{job.job_type}</p>
                      <Badge variant={job.status === "completed" ? "success" : "secondary"}>{job.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">Mode: {job.execution_mode}</p>
                    <pre className="mt-3 overflow-auto rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">{JSON.stringify(job.payload || {}, null, 2)}</pre>
                    {job.error_log && <p className="mt-2 text-sm text-destructive">{job.error_log}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <Button size="sm" variant="outline" onClick={() => updateJob(job.id, "pending")}>Retry</Button>
                    <Button size="sm" variant="outline" onClick={() => updateJob(job.id, "cancelled")}>Cancel</Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
