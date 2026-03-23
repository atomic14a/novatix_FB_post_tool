"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { createPost, updatePost } from "@/lib/actions/posts";
import { Save, Send, Loader2, Link2, Sparkles, MousePointerClick } from "lucide-react";
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

type MetaLinkOption = {
  id: string;
  short_code: string;
  meta_title: string;
  meta_description: string | null;
  image_url: string | null;
  click_count: number | null;
  destination_url: string;
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
  const metaFromQuery = searchParams.get("meta") || "";
  const supabase = createClient();

  const [loading, setLoading] = useState(Boolean(editId));
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [metaLinks, setMetaLinks] = useState<MetaLinkOption[]>([]);

  const [selectedPage, setSelectedPage] = useState("");
  const [selectedMetaLink, setSelectedMetaLink] = useState("");
  const [title, setTitle] = useState("");
  const [displayText, setDisplayText] = useState("");
  const [destinationUrl, setDestinationUrl] = useState(metaFromQuery);
  const [cta, setCta] = useState("Learn More");
  const [selectedPageName, setSelectedPageName] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const [pagesRes, metaLinksRes] = await Promise.all([
          supabase
            .from("facebook_pages")
            .select("id, page_name, is_default")
            .eq("user_id", user.id)
            .order("is_default", { ascending: false }),
          supabase
            .from("meta_links")
            .select("id, short_code, meta_title, meta_description, image_url, click_count, destination_url")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
        ]);

        const availablePages = (pagesRes.data ?? []) as FacebookPage[];
        const availableMetaLinks = (metaLinksRes.data ?? []) as MetaLinkOption[];

        setPages(availablePages);
        setMetaLinks(availableMetaLinks);

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

            const matchedMetaLink = availableMetaLinks.find(
              (item) => `${window.location.origin}/m/${item.short_code}` === post.destination_url
            );
            if (matchedMetaLink) {
              setSelectedMetaLink(matchedMetaLink.id);
            }

            if (post.facebook_page_id) {
              const page = availablePages.find((item) => item.id === post.facebook_page_id);
              if (page) {
                setSelectedPageName(page.page_name);
              }
            }
          }
        } else if (metaFromQuery) {
          const matchedMetaLink = availableMetaLinks.find(
            (item) => `${window.location.origin}/m/${item.short_code}` === metaFromQuery
          );
          if (matchedMetaLink) {
            setSelectedMetaLink(matchedMetaLink.id);
            setTitle(matchedMetaLink.meta_title || "");
          }
        }
      } catch (error) {
        console.error("Init error:", error);
      } finally {
        setLoading(false);
      }
    }

    void init();
  }, [editId, metaFromQuery, supabase]);

  const handlePageChange = (pageId: string) => {
    setSelectedPage(pageId);
    const page = pages.find((item) => item.id === pageId);
    setSelectedPageName(page?.page_name || "");
  };

  const handleMetaLinkChange = (metaLinkId: string) => {
    setSelectedMetaLink(metaLinkId);

    const link = metaLinks.find((item) => item.id === metaLinkId);
    if (!link) {
      return;
    }

    const shortUrl = `${window.location.origin}/m/${link.short_code}`;
    setDestinationUrl(shortUrl);
    setTitle((current) => current || link.meta_title || "");
  };

  const selectedMetaLinkData = useMemo(
    () => metaLinks.find((item) => item.id === selectedMetaLink) || null,
    [metaLinks, selectedMetaLink]
  );

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
        title={editId ? "Edit Post" : "Publish Post"}
        description={editId ? "Update your Facebook link-card post" : "Choose a Meta Link and publish it with a cleaner Facebook flow."}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Publishing Setup</CardTitle>
              <CardDescription>Select the page and the Meta Link you want to publish.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
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
                <Label htmlFor="metaLink">Saved Meta Link</Label>
                <Select id="metaLink" value={selectedMetaLink} onChange={(e) => handleMetaLinkChange(e.target.value)}>
                  <option value="">Choose a saved Meta Link</option>
                  {metaLinks.map((link) => (
                    <option key={link.id} value={link.id}>
                      {link.meta_title}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-muted-foreground">Pick from your saved Meta Links, or paste one manually below.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="destinationUrl">Meta Link URL</Label>
                <Input
                  id="destinationUrl"
                  placeholder="Paste the generated Meta Link here"
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Post Text</CardTitle>
              <CardDescription>These fields help you control the card headline and the small label shown above it.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title">Headline</Label>
                <Input id="title" placeholder="Text shown as the card headline" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="displayText">Small Label</Label>
                <Input
                  id="displayText"
                  placeholder="Example: main.com or custom short text"
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
            </CardContent>
          </Card>

          <div className="rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
            Best flow: choose a saved Meta Link, adjust the Headline and Small Label if needed, then publish.
          </div>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <Button variant="outline" className="h-11 flex-1 gap-2" onClick={() => handleSave("draft")} disabled={saving || publishing}>
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
          {selectedMetaLinkData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-primary" />
                  Selected Meta Link
                </CardTitle>
                <CardDescription>This is the Meta Link currently attached to this post.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{selectedMetaLinkData.meta_title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedMetaLinkData.meta_description || "No description added."}
                    </p>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <MousePointerClick className="h-3 w-3" />
                    {selectedMetaLinkData.click_count || 0}
                  </Badge>
                </div>
                <Button variant="ghost" className="px-0 text-primary" onClick={() => router.push("/dashboard/meta-links")}>
                  Manage Meta Links
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Facebook Preview
              </CardTitle>
              <CardDescription>The image will come from the selected Meta Link. This screen only controls the text wrapper.</CardDescription>
            </CardHeader>
            <CardContent>
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

                {selectedMetaLinkData?.image_url ? (
                  <div className="aspect-[1.91/1] w-full overflow-hidden border-y bg-muted">
                    <img src={selectedMetaLinkData.image_url} alt={selectedMetaLinkData.meta_title} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="flex aspect-[1.91/1] w-full items-center justify-center border-y bg-muted/70 px-6 text-center text-sm text-muted-foreground">
                    The preview image will come from the destination Meta Link you choose.
                  </div>
                )}

                <div className="space-y-1 border-t bg-muted/10 p-3">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {normalizeDisplayText(displayText || destinationUrl) || "yourdomain.com"}
                  </div>
                  <div className="text-base font-semibold">{title || selectedMetaLinkData?.meta_title || "Your headline"}</div>
                  {cta && (
                    <div className="pt-2">
                      <span className="inline-flex rounded-md bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">{cta}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
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
