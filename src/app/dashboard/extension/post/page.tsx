"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ExtensionNav } from "@/components/extension/extension-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Flag, Loader2, Send, UserRound } from "lucide-react";

type FacebookPage = {
  id: string;
  page_name: string;
  page_id: string | null;
  is_default: boolean | null;
};

type ExtensionContext = {
  account_name: string | null;
  page_name: string | null;
  page_id: string | null;
  facebook_detected: boolean;
  facebook_logged_in: boolean;
  synced_at: string;
};

type ExtensionJob = {
  id: string;
  status: string;
  created_at: string;
  payload: Record<string, unknown>;
};

const CTA_OPTIONS = ["Learn More", "Shop Now", "Sign Up", "Contact Us", "Apply Now"];

export default function ExtensionPostPage() {
  const supabase = createClient();
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [context, setContext] = useState<ExtensionContext | null>(null);
  const [recentJobs, setRecentJobs] = useState<ExtensionJob[]>([]);
  const [selectedPage, setSelectedPage] = useState("");
  const [headline, setHeadline] = useState("");
  const [message, setMessage] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [cta, setCta] = useState("Learn More");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [pagesRes, contextRes, jobsRes] = await Promise.all([
        supabase
          .from("facebook_pages")
          .select("id, page_name, page_id, is_default")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false }),
        supabase
          .from("extension_facebook_contexts")
          .select("account_name, page_name, page_id, facebook_detected, facebook_logged_in, synced_at")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("extension_jobs")
          .select("id, status, created_at, payload")
          .eq("user_id", user.id)
          .eq("job_type", "extension_publish_post")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const availablePages = (pagesRes.data || []) as FacebookPage[];
      const defaultPage = availablePages.find((page) => page.is_default) || availablePages[0];

      setPages(availablePages);
      setContext((contextRes.data as ExtensionContext | null) || null);
      setRecentJobs((jobsRes.data || []) as ExtensionJob[]);
      setSelectedPage((current) => current || defaultPage?.id || "");
    }

    void loadData();
  }, [supabase]);

  const selectedPageData = useMemo(() => pages.find((page) => page.id === selectedPage) || null, [pages, selectedPage]);

  async function handleQueuePost() {
    if (!selectedPage) {
      toast.error("Select a target page first.");
      return;
    }

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const payload = {
        title: headline.trim() || "Extension Post",
        message: message.trim() || "",
        destination_url: destinationUrl.trim() || null,
        media_url: mediaUrl.trim() || null,
        cta,
        target_page_name: selectedPageData?.page_name || null,
        target_page_id: selectedPageData?.page_id || null,
        detected_facebook_account: context?.account_name || null,
        detected_facebook_page: context?.page_name || null,
        created_from: "extension_post_page",
      };

      const { error } = await supabase.from("extension_jobs").insert({
        user_id: user.id,
        page_id: selectedPage,
        job_type: "extension_publish_post",
        execution_mode: "extension_browser_publish",
        status: "pending",
        payload,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success("Extension post job queued.");
      setHeadline("");
      setMessage("");
      setDestinationUrl("");
      setMediaUrl("");

      const { data } = await supabase
        .from("extension_jobs")
        .select("id, status, created_at, payload")
        .eq("user_id", user.id)
        .eq("job_type", "extension_publish_post")
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentJobs((data || []) as ExtensionJob[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to queue extension post");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Extension Post"
        description="This is a separate extension-only posting flow. It does not change your old publish page or your old app-based page connection flow."
      >
        <Button onClick={handleQueuePost} disabled={submitting} className="gap-2">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Queue Extension Post
        </Button>
      </PageHeader>

      <ExtensionNav />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <Card>
          <CardHeader>
            <CardTitle>Detected Facebook Session</CardTitle>
            <CardDescription>The extension should keep this in sync from the Facebook tab automatically.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-3">
                <UserRound className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Facebook Account</p>
                  <p className="text-xs text-muted-foreground">{context?.account_name || "Not detected yet"}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center gap-3">
                <Flag className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Current Facebook Page</p>
                  <p className="text-xs text-muted-foreground">{context?.page_name || "No page detected yet"}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Facebook Login</p>
              <div className="mt-2">
                <Badge variant={context?.facebook_logged_in ? "success" : "secondary"}>{context?.facebook_logged_in ? "Logged in" : "Not confirmed"}</Badge>
              </div>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Switch Website Page</p>
              <div className="mt-2">
                <Select value={selectedPage} onChange={(e) => setSelectedPage(e.target.value)}>
                  <option value="">Select page</option>
                  {pages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.page_name} {page.is_default ? "(Default)" : ""}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How this stays safe</CardTitle>
            <CardDescription>This page is isolated from the old publish button and old page-connect features.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-xl border border-border p-4">Old publish page remains unchanged.</div>
            <div className="rounded-xl border border-border p-4">Old app-based Facebook page connect remains unchanged.</div>
            <div className="rounded-xl border border-border p-4">This page only queues extension jobs for the new extension system.</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <Card>
          <CardHeader>
            <CardTitle>Compose Extension Post</CardTitle>
            <CardDescription>Queue a new browser-side publish job for the extension to execute.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="headline">Post Headline</Label>
              <Input id="headline" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Headline for the extension-side post" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Post Message</Label>
              <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write the post caption or message here" rows={5} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="destinationUrl">Destination URL</Label>
              <Input id="destinationUrl" value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} placeholder="https://example.com" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mediaUrl">Media URL</Label>
              <Input id="mediaUrl" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="Paste image or media URL if needed" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cta">CTA</Label>
              <Select id="cta" value={cta} onChange={(e) => setCta(e.target.value)}>
                {CTA_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Extension Post Jobs</CardTitle>
            <CardDescription>Latest jobs queued from this extension-only page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No extension post jobs yet.</p>
            ) : (
              recentJobs.map((job) => (
                <div key={job.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{String(job.payload?.title || "Extension Post")}</p>
                      <p className="text-xs text-muted-foreground">{new Date(job.created_at).toLocaleString()}</p>
                    </div>
                    <Badge variant={job.status === "completed" ? "success" : "secondary"}>{job.status}</Badge>
                  </div>
                </div>
              ))
            )}
            <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              Current behavior: this page queues extension jobs only. The old publish flow is untouched.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
