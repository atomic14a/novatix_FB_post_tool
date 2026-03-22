"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MediaUploader } from "@/components/media-uploader";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart3,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  MousePointerClick,
  Play,
} from "lucide-react";
import { toast } from "sonner";

type MetaLink = {
  id: string;
  user_id: string;
  name: string | null;
  short_code: string;
  destination_url: string;
  meta_title: string;
  meta_description: string | null;
  display_domain: string | null;
  cta: string | null;
  image_url: string | null;
  image_type: string | null;
  click_count: number | null;
  last_clicked_at: string | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
};

const CTA_OPTIONS = [
  { value: "", label: "No CTA" },
  { value: "Learn More", label: "Learn More" },
  { value: "Shop Now", label: "Shop Now" },
  { value: "Sign Up", label: "Sign Up" },
  { value: "Contact Us", label: "Contact Us" },
  { value: "Apply Now", label: "Apply Now" },
];

const emptyForm = {
  name: "",
  shortCode: "",
  destinationUrl: "",
  metaTitle: "",
  metaDescription: "",
  displayDomain: "",
  cta: "Learn More",
  imageUrl: "",
  imageType: "",
};

function inferMediaTypeFromUrl(url: string) {
  const normalizedUrl = url.toLowerCase().split("?")[0].split("#")[0];

  if (/\.(mp4|mov|webm|ogg|m4v)$/.test(normalizedUrl)) {
    return "video/external";
  }

  return "image/external";
}

function normalizeDisplayDomain(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";

  try {
    const url = trimmedValue.includes("://") ? new URL(trimmedValue) : new URL(`https://${trimmedValue}`);
    return url.hostname;
  } catch {
    return trimmedValue.replace(/^https?:\/\//, "").split("/")[0];
  }
}

function generateRandomCode() {
  return Math.random().toString(36).slice(2, 8);
}

export default function MetaLinksPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [links, setLinks] = useState<MetaLink[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageInputMode, setImageInputMode] = useState<"upload" | "link">("upload");
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadLinks();
  }, []);

  async function loadLinks() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("meta_links")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLinks((data || []) as MetaLink[]);
    } catch (error) {
      console.error("Failed to load meta links:", error);
      toast.error("Failed to load meta links");
    } finally {
      setLoading(false);
    }
  }

  function updateForm<K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function getUniqueShortCode(preferredCode?: string) {
    const requestedCode = preferredCode?.trim().toLowerCase();

    if (requestedCode) {
      const { data } = await supabase
        .from("meta_links")
        .select("id")
        .eq("short_code", requestedCode)
        .limit(1);

      const existing = data?.[0];
      if (existing && existing.id !== editingId) {
        throw new Error("This short code is already in use.");
      }

      return requestedCode;
    }

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const code = generateRandomCode();
      const { data } = await supabase
        .from("meta_links")
        .select("id")
        .eq("short_code", code)
        .limit(1);

      if (!data || data.length === 0) {
        return code;
      }
    }

    throw new Error("Could not generate a unique short code. Please try again.");
  }

  async function handleFileSelect(file: File) {
    setImageInputMode("upload");
    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const fileExtension = file.name.split(".").pop();
      const fileName = `${user.id}/meta-links/${Date.now()}.${fileExtension}`;

      const { data, error } = await supabase.storage
        .from("post-media")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("post-media")
        .getPublicUrl(data.path);

      setForm((current) => ({
        ...current,
        imageUrl: publicUrl,
        imageType: file.type,
      }));

      toast.success("Image uploaded!");
    } catch (error) {
      console.error("Image upload failed:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  }

  function handleUseImageLink() {
    const trimmedUrl = form.imageUrl.trim();

    if (!trimmedUrl) {
      toast.error("Please paste an image or video URL.");
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      toast.error("Please enter a valid image URL.");
      return;
    }

    setImageInputMode("link");
    setForm((current) => ({
      ...current,
      imageUrl: trimmedUrl,
      imageType: inferMediaTypeFromUrl(trimmedUrl),
    }));
    toast.success("Image link added!");
  }

  function resetForm() {
    setEditingId(null);
    setImageInputMode("upload");
    setForm(emptyForm);
  }

  async function handleSave() {
    if (!form.destinationUrl.trim() || !form.metaTitle.trim()) {
      toast.error("Destination URL and meta title are required.");
      return;
    }

    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const shortCode = await getUniqueShortCode(form.shortCode);
      const payload = {
        user_id: user.id,
        name: form.name.trim() || form.metaTitle.trim(),
        short_code: shortCode,
        destination_url: form.destinationUrl.trim(),
        meta_title: form.metaTitle.trim(),
        meta_description: form.metaDescription.trim() || null,
        display_domain: normalizeDisplayDomain(form.displayDomain || form.destinationUrl),
        cta: form.cta || null,
        image_url: form.imageUrl.trim() || null,
        image_type: form.imageType || null,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase
          .from("meta_links")
          .update(payload)
          .eq("id", editingId)
          .eq("user_id", user.id);

        if (error) throw error;
        toast.success("Meta short link updated!");
      } else {
        const { error } = await supabase
          .from("meta_links")
          .insert(payload);

        if (error) throw error;
        toast.success("Meta short link created!");
      }

      resetForm();
      loadLinks();
    } catch (error) {
      console.error("Failed to save meta link:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save meta link");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(link: MetaLink) {
    setEditingId(link.id);
    setImageInputMode("link");
    setForm({
      name: link.name || "",
      shortCode: link.short_code,
      destinationUrl: link.destination_url,
      metaTitle: link.meta_title,
      metaDescription: link.meta_description || "",
      displayDomain: link.display_domain || "",
      cta: link.cta || "",
      imageUrl: link.image_url || "",
      imageType: link.image_type || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this meta short link?")) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Unauthorized");

      const { error } = await supabase
        .from("meta_links")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) throw error;

      if (editingId === id) {
        resetForm();
      }

      toast.success("Meta short link deleted");
      loadLinks();
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete meta short link");
    }
  }

  async function copyShortLink(code: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/m/${code}`);
      toast.success("Short link copied!");
    } catch {
      toast.error("Could not copy short link");
    }
  }

  const totalClicks = links.reduce((sum, link) => sum + (link.click_count || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Skeleton className="h-[720px] rounded-xl" />
          <Skeleton className="h-[720px] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Meta Tag Editor"
        description="Create tracked meta short links with title, description, image, and redirect target."
      >
        <Button variant="outline" className="gap-2" onClick={resetForm}>
          <Plus className="h-4 w-4" />
          New Link
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Total Links</p>
              <p className="mt-1 text-2xl font-semibold">{links.length}</p>
            </div>
            <Link2 className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Tracked Clicks</p>
              <p className="mt-1 text-2xl font-semibold">{totalClicks}</p>
            </div>
            <MousePointerClick className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">Active Links</p>
              <p className="mt-1 text-2xl font-semibold">
                {links.filter((link) => link.is_active !== false).length}
              </p>
            </div>
            <BarChart3 className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Edit Meta Link" : "Create Meta Link"}</CardTitle>
            <CardDescription>
              Build a tracked short link with your redirect URL, metadata, CTA, and image.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Link Name</Label>
              <Input
                id="name"
                placeholder="Campaign name"
                value={form.name}
                onChange={(e) => updateForm("name", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="destinationUrl">Redirect URL</Label>
                <Input
                  id="destinationUrl"
                  type="url"
                  placeholder="https://your-site.com/page"
                  value={form.destinationUrl}
                  onChange={(e) => updateForm("destinationUrl", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shortCode">Short Code</Label>
                <Input
                  id="shortCode"
                  placeholder="auto-generated if empty"
                  value={form.shortCode}
                  onChange={(e) => updateForm("shortCode", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="metaTitle">Meta Title</Label>
              <Input
                id="metaTitle"
                placeholder="Your card title"
                value={form.metaTitle}
                onChange={(e) => updateForm("metaTitle", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="metaDescription">Meta Description</Label>
              <Textarea
                id="metaDescription"
                placeholder="Short card description"
                value={form.metaDescription}
                onChange={(e) => updateForm("metaDescription", e.target.value)}
                className="min-h-[110px] resize-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="displayDomain">Display Domain</Label>
                <Input
                  id="displayDomain"
                  placeholder="example.com"
                  value={form.displayDomain}
                  onChange={(e) => updateForm("displayDomain", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cta">CTA</Label>
                <Select
                  id="cta"
                  value={form.cta}
                  onChange={(e) => updateForm("cta", e.target.value)}
                >
                  {CTA_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Link Card Image</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={imageInputMode === "upload" ? "default" : "outline"}
                  onClick={() => setImageInputMode("upload")}
                >
                  Upload File
                </Button>
                <Button
                  type="button"
                  variant={imageInputMode === "link" ? "default" : "outline"}
                  onClick={() => setImageInputMode("link")}
                >
                  Paste Link
                </Button>
              </div>

              {imageInputMode === "upload" ? (
                <div className="space-y-3">
                  <MediaUploader
                    onFileSelect={handleFileSelect}
                    currentPreview={form.imageUrl || null}
                    currentType={form.imageType || null}
                    onRemove={() => setForm((current) => ({ ...current, imageUrl: "", imageType: "" }))}
                  />
                  {uploading && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Uploading image...
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={form.imageUrl}
                      onChange={(e) => updateForm("imageUrl", e.target.value)}
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" onClick={handleUseImageLink}>
                      Use Link
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use a direct public image or video file URL for your card preview.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editingId ? "Update Link" : "Create Link"}
              </Button>
              {editingId && (
                <Button variant="outline" onClick={resetForm}>
                  Cancel Edit
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
              <CardDescription>How your meta short link content is being packaged.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="bg-black/5">
                  {form.imageUrl ? (
                    <div className="relative aspect-[1.91/1] overflow-hidden bg-muted">
                      {form.imageType.startsWith("video") ? (
                        <video src={form.imageUrl} className="h-full w-full object-cover" />
                      ) : (
                        <img src={form.imageUrl} alt="Meta preview" className="h-full w-full object-cover" />
                      )}
                      {form.imageType.startsWith("video") && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/50">
                            <Play className="h-8 w-8 translate-x-0.5 text-white" fill="currentColor" />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex aspect-[1.91/1] items-center justify-center bg-muted text-sm text-muted-foreground">
                      Add an image to preview your card
                    </div>
                  )}
                </div>
                <div className="space-y-3 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {normalizeDisplayDomain(form.displayDomain || form.destinationUrl) || "yourdomain.com"}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {form.metaTitle || "Your meta title"}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {form.metaDescription || "Your meta description will appear here."}
                    </p>
                  </div>
                  {form.cta && (
                    <div className="pt-1">
                      <span className="inline-flex rounded-md bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                        {form.cta}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Meta Short Links</CardTitle>
              <CardDescription>Manage generated short links and monitor tracked clicks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {links.length === 0 ? (
                <EmptyState
                  icon={Link2}
                  title="No meta links yet"
                  description="Create your first tracked short link to start using the meta tag editor."
                />
              ) : (
                links.map((link) => {
                  const shortUrl = typeof window === "undefined"
                    ? `/m/${link.short_code}`
                    : `${window.location.origin}/m/${link.short_code}`;

                  return (
                    <div key={link.id} className="rounded-xl border border-border p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{link.meta_title}</h3>
                            <Badge variant={link.is_active === false ? "secondary" : "success"}>
                              {link.is_active === false ? "Inactive" : "Active"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {link.meta_description || "No description added."}
                          </p>
                          <div className="text-xs text-muted-foreground break-all">
                            {shortUrl}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            <span>{link.display_domain || normalizeDisplayDomain(link.destination_url)}</span>
                            <span>{link.cta || "No CTA"}</span>
                            <span>{new Date(link.created_at).toLocaleDateString("en-US")}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="gap-1">
                            <MousePointerClick className="h-3 w-3" />
                            {link.click_count || 0}
                          </Badge>
                          <Button variant="outline" size="icon" onClick={() => copyShortLink(link.short_code)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => window.open(shortUrl, "_blank")}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => handleEdit(link)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => handleDelete(link.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
