"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { createPost, updatePost } from "@/lib/actions/posts";
import { Save, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

const CTA_OPTIONS = [
  { value: "", label: "No CTA" },
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

function CreatePostLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}

function normalizeDisplayText(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";

  try {
    const url = trimmedValue.includes("://") ? new URL(trimmedValue) : new URL(`https://${trimmedValue}`);
    return url.hostname;
  } catch {
    return trimmedValue;
  }
}

const CreatePostContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const supabase = createClient();

  const [loading, setLoading] = useState(Boolean(editId));
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [pages, setPages] = useState<FacebookPage[]>([]);

  const [selectedPage, setSelectedPage] = useState("");
  const [title, setTitle] = useState("");
  const [displayText, setDisplayText] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [cta, setCta] = useState("Learn More");
  const [selectedPageName, setSelectedPageName] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: pagesData } = await supabase
          .from("facebook_pages")
          .select("id, page_name, is_default")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false });

        const availablePages = (pagesData ?? []) as FacebookPage[];
        setPages(availablePages);

        const defaultPage = availablePages.find((page) => page.is_default);
        if (defaultPage) {
          setSelectedPage(defaultPage.id);
          setSelectedPageName(defaultPage.page_name);
        }

        if (editId) {
          const { data: post } = await supabase
            .from("posts")
            .select("facebook_page_id, title, card_description, destination_url, cta")
            .eq("id", editId)
            .eq("user_id", user.id)
            .single();

          if (post) {
            setSelectedPage(post.facebook_page_id || "");
            setTitle(post.title || "");
            setDisplayText(post.card_description || "");
            setDestinationUrl(post.destination_url || "");
            setCta(post.cta || "Learn More");

            if (post.facebook_page_id) {
              const page = availablePages.find((item) => item.id === post.facebook_page_id);
              if (page) {
                setSelectedPageName(page.page_name);
              }
            }
          }
        }
      } catch (error) {
        console.error("Init error:", error);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [editId, supabase]);

  const handlePageChange = (pageId: string) => {
    setSelectedPage(pageId);
    const page = pages.find((item) => item.id === pageId);
    setSelectedPageName(page?.page_name || "");
  };

  const handleSave = async (status: "draft" | "published") => {
    const isPublish = status === "published";

    if (isPublish) {
      setPublishing(true);
    } else {
      setSaving(true);
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const postData = {
        facebook_page_id: selectedPage || undefined,
        title: title.trim() || "\u200d",
        card_description: displayText.trim() || undefined,
        destination_url: destinationUrl.trim() || undefined,
        cta: cta || undefined,
        status,
      };

      if (editId) {
        await updatePost(editId, postData);
      } else {
        await createPost(postData);
      }

      toast.success(isPublish ? "Post published successfully to Facebook!" : "Draft saved successfully!");
      router.push(isPublish ? "/dashboard/published" : "/dashboard/drafts");
    } catch (error: unknown) {
      console.error("Save/Publish error:", error);
      const message = error instanceof Error ? error.message : `Failed to ${isPublish ? "publish" : "save"} post`;
      toast.error(message);
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  if (loading) {
    return <CreatePostLoading />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={editId ? "Edit Post" : "Create Post"}
        description={editId ? "Update your Facebook link-card post" : "Create and publish a Facebook link-card post"}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="page">Facebook Page</Label>
            <Select id="page" value={selectedPage} onChange={(e) => handlePageChange(e.target.value)}>
              <option value="">Select a page</option>
              {pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.page_name} {page.is_default ? "(Default)" : ""}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="destinationUrl">Meta Link / Destination URL</Label>
            <Input
              id="destinationUrl"
              placeholder="Paste the meta short link you created"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Headline</Label>
            <Input
              id="title"
              placeholder="Text shown as the card headline"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayText">Display Text Instead of URL</Label>
            <Input
              id="displayText"
              placeholder="Example: main.com or any custom display text"
              value={displayText}
              onChange={(e) => setDisplayText(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cta">Call to Action</Label>
            <Select id="cta" value={cta} onChange={(e) => setCta(e.target.value)}>
              {CTA_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
            This page now uses the destination link metadata for the image. The post tool only controls the Facebook page, headline,
            display text, and CTA.
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button
              variant="outline"
              className="h-11 flex-1 gap-2"
              onClick={() => handleSave("draft")}
              disabled={saving || publishing}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Draft
            </Button>
            <Button className="h-11 flex-1 gap-2" onClick={() => handleSave("published")} disabled={saving || publishing}>
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Publish Now
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
            <div className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 font-bold text-primary">
                {selectedPageName ? selectedPageName.substring(0, 1).toUpperCase() : "S"}
              </div>
              <div>
                <div className="text-sm font-semibold leading-tight">{selectedPageName || "Your Page"}</div>
                <div className="text-xs text-muted-foreground">Just now . Public</div>
              </div>
            </div>

            <div className="aspect-[1.91/1] w-full border-y bg-muted/70 px-6 text-center text-sm text-muted-foreground flex items-center justify-center">
              The preview image will come from the destination meta link you created earlier.
            </div>

            <div className="space-y-1 border-t bg-muted/10 p-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {normalizeDisplayText(displayText || destinationUrl) || "yourdomain.com"}
              </div>
              <div className="text-base font-semibold">{title || "Your headline"}</div>
              {cta && (
                <div className="pt-2">
                  <span className="inline-flex rounded-md bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">{cta}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function CreatePostPage() {
  return (
    <Suspense fallback={<CreatePostLoading />}>
      <CreatePostContent />
    </Suspense>
  );
}
