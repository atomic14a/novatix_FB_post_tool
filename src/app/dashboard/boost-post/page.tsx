"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import {
  CheckCircle2,
  Clock3,
  ImagePlus,
  Loader2,
  MousePointerClick,
  Rocket,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

const CTA_OPTIONS = [
  { value: "Learn More", label: "Learn More" },
  { value: "Shop Now", label: "Shop Now" },
  { value: "Sign Up", label: "Sign Up" },
  { value: "Contact Us", label: "Contact Us" },
  { value: "Apply Now", label: "Apply Now" },
];

type FacebookPage = {
  id: string;
  page_name: string;
  is_default: boolean | null;
};

type QueueStatus =
  | "queued"
  | "uploading"
  | "publishing"
  | "published"
  | "failed";

type QueueItem = {
  id: string;
  label: string;
  file: File;
  previewUrl: string;
  uploadedUrl: string | null;
  progress: number;
  status: QueueStatus;
  error: string | null;
  postId: string | null;
};

function BoostPostLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-52" />
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <Skeleton className="h-[720px] rounded-xl" />
        <Skeleton className="h-[720px] rounded-xl" />
      </div>
    </div>
  );
}

function createQueueId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function statusBadgeVariant(status: QueueStatus) {
  if (status === "published") return "success";
  if (status === "failed") return "destructive";
  if (status === "uploading" || status === "publishing") return "secondary";
  return "outline";
}

function statusLabel(status: QueueStatus) {
  switch (status) {
    case "queued":
      return "Queued";
    case "uploading":
      return "Uploading";
    case "publishing":
      return "Publishing";
    case "published":
      return "Completed";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

export default function BoostPostPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [selectedPage, setSelectedPage] = useState("");
  const [sharedUrl, setSharedUrl] = useState("");
  const [cta, setCta] = useState("Learn More");
  const [headline, setHeadline] = useState("");
  const [message, setMessage] = useState("");
  const [queue, setQueue] = useState<QueueItem[]>([]);

  useEffect(() => {
    void init();
  }, []);

  useEffect(() => {
    return () => {
      queue.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, [queue]);

  async function init() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("facebook_pages")
        .select("id, page_name, is_default")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false });

      const availablePages = (data || []) as FacebookPage[];
      setPages(availablePages);

      const defaultPage = availablePages.find((page) => page.is_default);
      if (defaultPage) {
        setSelectedPage(defaultPage.id);
      }
    } catch (error) {
      console.error("Boost Post init error:", error);
      toast.error("Failed to load Boost Post setup.");
    } finally {
      setLoading(false);
    }
  }

  function addFiles(files: FileList | File[]) {
    const nextItems = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .map((file, index) => ({
        id: createQueueId(),
        label: `Post ${queue.length + index + 1}`,
        file,
        previewUrl: URL.createObjectURL(file),
        uploadedUrl: null,
        progress: 0,
        status: "queued" as QueueStatus,
        error: null,
        postId: null,
      }));

    if (nextItems.length === 0) {
      toast.error("Please choose image files only.");
      return;
    }

    setQueue((current) => [...current, ...nextItems]);
  }

  function removeItem(id: string) {
    setQueue((current) => {
      const target = current.find((item) => item.id === id);
      if (target) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return current.filter((item) => item.id !== id);
    });
  }

  function updateItem(id: string, patch: Partial<QueueItem>) {
    setQueue((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  async function uploadImage(item: QueueItem) {
    updateItem(item.id, { status: "uploading", progress: 20, error: null });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Unauthorized");
    }

    const extension = item.file.name.split(".").pop() || "jpg";
    const fileName = `${user.id}/boost-post/${Date.now()}-${item.id}.${extension}`;

    const { data, error } = await supabase.storage
      .from("post-media")
      .upload(fileName, item.file, { cacheControl: "3600", upsert: false });

    if (error) {
      throw error;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("post-media").getPublicUrl(data.path);

    updateItem(item.id, { uploadedUrl: publicUrl, progress: 45 });
    return publicUrl;
  }

  async function processItem(item: QueueItem) {
    try {
      const uploadedUrl = item.uploadedUrl || (await uploadImage(item));
      updateItem(item.id, { status: "publishing", progress: 70 });

      const response = await fetch("/api/boost-post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          facebook_page_id: selectedPage || undefined,
          title: headline.trim() || item.label,
          short_text: message.trim() || undefined,
          destination_url: sharedUrl.trim() || undefined,
          cta,
          media_url: uploadedUrl,
          media_type: item.file.type || "image/jpeg",
          status: "published",
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      updateItem(item.id, {
        status: "published",
        progress: 100,
        postId: result.post?.id || null,
      });
    } catch (error) {
      console.error("Boost item failed:", error);
      updateItem(item.id, {
        status: "failed",
        progress: 100,
        error: error instanceof Error ? error.message : "Failed to publish this post.",
      });
    }
  }

  async function handleRun() {
    if (!selectedPage) {
      toast.error("Please select a Facebook Page.");
      return;
    }

    if (!sharedUrl.trim()) {
      toast.error("Please add the shared website URL.");
      return;
    }

    if (queue.length === 0) {
      toast.error("Please add at least one image.");
      return;
    }

    setRunning(true);

    try {
      for (const item of queue) {
        if (item.status === "published") continue;
        await processItem(item);
      }

      toast.success("Boost Post queue finished. Published items are now ready for your normal Facebook boost flow.");
    } finally {
      setRunning(false);
    }
  }

  const counts = useMemo(
    () => ({
      queued: queue.filter((item) => item.status === "queued").length,
      active: queue.filter((item) => item.status === "uploading" || item.status === "publishing").length,
      completed: queue.filter((item) => item.status === "published").length,
      failed: queue.filter((item) => item.status === "failed").length,
    }),
    [queue]
  );

  const setupIssues = useMemo(() => {
    const issues: string[] = [];
    if (!selectedPage) issues.push("Select a Facebook Page");
    if (!sharedUrl.trim()) issues.push("Add the shared website URL");
    if (queue.length === 0) issues.push("Upload at least one image");
    return issues;
  }, [queue.length, selectedPage, sharedUrl]);

  const canRun = setupIssues.length === 0;

  if (loading) {
    return <BoostPostLoading />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Boost Post"
        description="Upload one or many images, attach one shared URL and CTA, then run a safe isolated publishing queue."
      >
        <Button className="gap-2" onClick={handleRun} disabled={running || !canRun}>
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
          {running ? "Running Queue" : "Start Boost Publish"}
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Queued</p>
              <p className="mt-1 text-2xl font-semibold">{counts.queued}</p>
            </div>
            <Clock3 className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Running</p>
              <p className="mt-1 text-2xl font-semibold">{counts.active}</p>
            </div>
            <Loader2 className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="mt-1 text-2xl font-semibold">{counts.completed}</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Failed</p>
              <p className="mt-1 text-2xl font-semibold">{counts.failed}</p>
            </div>
            <XCircle className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-6">
          <Card className={canRun ? "border-emerald-500/20 bg-emerald-500/5" : "border-amber-500/20 bg-amber-500/5"}>
            <CardHeader>
              <CardTitle>{canRun ? "Queue Ready" : "Complete Setup First"}</CardTitle>
              <CardDescription>
                The queue only starts when the page, URL, and at least one image are all ready.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {setupIssues.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  Everything is ready. Click <strong>Start Boost Publish</strong>.
                </div>
              ) : (
                setupIssues.map((issue) => (
                  <div key={issue} className="flex items-center gap-2 text-sm text-amber-200">
                    <Clock3 className="h-4 w-4" />
                    {issue}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Boost Publish Setup</CardTitle>
              <CardDescription>
                This page is isolated from your current Publish flow. It uses the same working developer-app posting path without changing other tools.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="page">Facebook Page</Label>
                <Select id="page" value={selectedPage} onChange={(e) => setSelectedPage(e.target.value)}>
                  <option value="">Select a page</option>
                  {pages.map((page) => (
                    <option key={page.id} value={page.id}>
                      {page.page_name} {page.is_default ? "(Default)" : ""}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">Shared Website URL</Label>
                <Input
                  id="url"
                  value={sharedUrl}
                  onChange={(e) => setSharedUrl(e.target.value)}
                  placeholder="https://your-offer-link.com"
                />
                <p className="text-xs text-muted-foreground">
                  Facebook will fetch the website meta tags from this URL, just like your current working publish flow.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cta">CTA Button</Label>
                  <Select id="cta" value={cta} onChange={(e) => setCta(e.target.value)}>
                    {CTA_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="headline">Headline Override</Label>
                  <Input
                    id="headline"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Optional shared headline"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Optional text that will be placed above the Facebook link card"
                  className="min-h-[110px] resize-none"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upload Creative Images</CardTitle>
              <CardDescription>
                Add one or many images. Each image becomes one queue item. In this first version, the image is uploaded and tracked here while the published Facebook card still uses the shared URL metadata.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <label
                htmlFor="boost-image-upload"
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-8 text-center transition hover:border-primary/50 hover:bg-secondary/20"
              >
                <div className="mb-3 rounded-2xl bg-secondary/60 p-4">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">Click to upload one or many images</p>
                <p className="mt-1 text-xs text-muted-foreground">PNG, JPG, WEBP. Multiple files supported.</p>
                <input
                  id="boost-image-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.length) {
                      addFiles(e.target.files);
                      e.target.value = "";
                    }
                  }}
                />
              </label>

              {queue.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/15 p-4 text-sm text-muted-foreground">
                  <ImagePlus className="h-4 w-4" />
                  Your upload queue is empty.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {queue.map((item) => (
                    <div key={item.id} className="overflow-hidden rounded-xl border border-border bg-card">
                      <div className="aspect-[4/3] overflow-hidden bg-muted">
                        <img src={item.previewUrl} alt={item.label} className="h-full w-full object-cover" />
                      </div>
                      <div className="space-y-2 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{item.file.name}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => removeItem(item.id)}
                            disabled={running}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <Badge variant={statusBadgeVariant(item.status)}>{statusLabel(item.status)}</Badge>
                          <span className="text-muted-foreground">{item.progress}%</span>
                        </div>
                        {item.error && <p className="text-xs text-destructive">{item.error}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="xl:sticky xl:top-24">
            <CardHeader>
              <CardTitle>How this works</CardTitle>
              <CardDescription>
                This first version uses your stable posting flow and gives you the queue, status, and CTA setup from one place.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-xl border border-border bg-secondary/15 p-4 text-sm text-muted-foreground">
                1. Upload one or many images
              </div>
              <div className="rounded-xl border border-border bg-secondary/15 p-4 text-sm text-muted-foreground">
                2. Add one shared website URL
              </div>
              <div className="rounded-xl border border-border bg-secondary/15 p-4 text-sm text-muted-foreground">
                3. Choose the CTA button
              </div>
              <div className="rounded-xl border border-border bg-secondary/15 p-4 text-sm text-muted-foreground">
                4. Run the queue and publish each post through the existing developer-app flow
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">
                Current safe version: posts are created automatically here, but the final Facebook Boost click remains your normal manual step inside Facebook. This keeps the tool stable and avoids breaking your existing setup.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Queue Status</CardTitle>
              <CardDescription>
                Watch each post move from queued to uploaded to published.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {queue.length === 0 ? (
                <div className="rounded-xl border border-border bg-secondary/15 p-4 text-sm text-muted-foreground">
                  Add images to begin building your Boost Post queue.
                </div>
              ) : (
                queue.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{sharedUrl || "Waiting for shared URL"}</p>
                      </div>
                      <Badge variant={statusBadgeVariant(item.status)}>{statusLabel(item.status)}</Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{cta}</span>
                      <span>{item.progress}%</span>
                    </div>
                    {item.postId && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-emerald-300">
                        <MousePointerClick className="h-3.5 w-3.5" />
                        Published and ready for your normal Facebook boost flow
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}







